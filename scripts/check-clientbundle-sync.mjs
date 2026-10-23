#!/usr/bin/env node
/**
 * check-clientbundle-sync.mjs —— vendored clientBundle.ts 与宿主 monorepo
 * 工厂的平台种子漂移检测（E-8）。
 *
 * scripts/clientBundle.ts 的 PLATFORM_MODULES 注释声明「verbatim 拷贝自宿主
 * packages/client/web/src/platform.ts」。此前没有校验：宿主改平台种子时，我们
 * 只能靠运行时炸了才发现种子落后。
 *
 * ── 参照物（2026-10 加固）────────────────────────────────────────────
 * **主参照 = 本仓已声明的最新宿主版本对应的 tag**：从 package.json 的
 * dsh.compatibility.dshReleases 取最大版本 → `dsh-v<version>`，用
 * `git show <tag>:packages/client/web/src/platform.ts` 读出该 tag 的种子。
 * 种子必须对着**我们声称兼容的那一代宿主**校准——对着任意 HEAD 校准没有意义
 * （本机检出停在旧 ref 时会报假警报，见 docs/store-benchmark-2026-10.md §3.2）。
 *
 * tag 在本地不可得时：
 * - 设了 DSH_FETCH_HOST_TAG=1 → 尝试 `git fetch --depth 1 origin tag <tag>`
 *   再读（CI 每日任务用这个开关，保证权威校验在 CI 里也生效）；
 * - 否则退回读宿主仓**工作区**的 platform.ts，并降级为**参考性**比对（只提示、
 *   不失败）——工作区 ref 不是我们声明的兼容面，据此判失败会制造假警报。
 *
 * ── 判定方向（2026-10 复核后修正）────────────────────────────────────
 * CLIENT_EXTERNALS 里的模块在浏览器端保持 `require()`（不内联），宿主 loader 的
 * 模块表必须答得上，否则运行时抛错。故：
 * - 本仓 ⊋ 参照（多出条目）→ **失败**：多出的条目一旦被 import，就是 require 到
 *   目标宿主答不了的 spec → 运行时抛错。**这是危险方向**。
 * - 本仓 ⊊ 参照（少了条目）→ **失败（权威模式）**：宿主种子扩张未镜像；日后
 *   import 该模块会被内联，可能产生第二份共享运行时实例。
 * - 集合相同、顺序不同 → **失败**：verbatim 语义要求顺序也一致。
 *
 * ── 行为 ─────────────────────────────────────────────────────────────
 * - 定位宿主 monorepo：`--repo <path>` > `$DSH_HARNESS_REPO` > 兄弟目录
 *   `../deepseek-harness` > `~/deepseek-harness`。
 * - 找不到 monorepo：打 skip 提示退出 0（CI 无 monorepo checkout 时正常）。
 * - 一致：打印参照来源 + 宿主 HEAD 佐证，退出 0。
 *
 * watch-dsh-releases 每日任务会 clone 宿主仓跑本脚本，漂移自动开
 * label=clientbundle-drift 的 issue。
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const repoArgIdx = args.indexOf('--repo')
const candidates = [
  repoArgIdx >= 0 ? args[repoArgIdx + 1] : undefined,
  process.env.DSH_HARNESS_REPO,
  resolve('..', 'deepseek-harness'),
  join(homedir(), 'deepseek-harness'),
].filter(Boolean)

const harnessRepo = candidates.find(path => existsSync(join(path, 'packages', 'client', 'web', 'src', 'platform.ts')))
if (harnessRepo === undefined) {
  console.log('[bundle-sync] skip：本地无宿主 monorepo（设 DSH_HARNESS_REPO 或 --repo 指向 deepseek-harness 克隆可启用）')
  process.exit(0)
}

const HOST_PLATFORM_PATH = 'packages/client/web/src/platform.ts'

/** 抽取源码里 `export const PLATFORM_MODULES = [ ... ] as const` 的字符串字面量列表。 */
function extractSeed(text, label) {
  const match = /PLATFORM_MODULES\s*(?::[^=]+)?=\s*\[([\s\S]*?)\]/.exec(text)
  if (match === null) {
    console.error(`[bundle-sync] ${label} 里找不到 PLATFORM_MODULES 数组`)
    process.exit(1)
  }
  return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1])
}

/**
 * 轻量 semver 比较（不引依赖，避免守卫脚本因依赖缺失而失效）：
 * 主版本号按数字段比；预发布段按 semver 规则比（数字段按数值、字典段按字典序、
 * 预发布整体低于正式版）。
 */
function compareVersions(a, b) {
  const split = (v) => {
    const [main, ...rest] = v.split('-')
    return { nums: main.split('.').map(n => Number.parseInt(n, 10) || 0), pre: rest.join('-') }
  }
  const pa = split(a)
  const pb = split(b)
  for (let i = 0; i < Math.max(pa.nums.length, pb.nums.length); i++) {
    const diff = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0)
    if (diff !== 0) return diff
  }
  if (pa.pre === '' && pb.pre === '') return 0
  if (pa.pre === '') return 1
  if (pb.pre === '') return -1
  const as = pa.pre.split('.')
  const bs = pb.pre.split('.')
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = as[i]
    const y = bs[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      const diff = Number.parseInt(x, 10) - Number.parseInt(y, 10)
      if (diff !== 0) return diff
    } else if (xn !== yn) {
      return xn ? -1 : 1
    } else if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return 0
}

/** 本仓声明的最新宿主版本（兼容矩阵的边界）→ 对应宿主 tag。 */
function declaredTargetTag() {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
  } catch {
    return undefined
  }
  const releases = pkg?.dsh?.compatibility?.dshReleases
  if (releases === undefined || typeof releases !== 'object') return undefined
  const versions = Object.keys(releases)
  if (versions.length === 0) return undefined
  let newest = versions[0]
  for (const v of versions) {
    if (compareVersions(v, newest) > 0) newest = v
  }
  return { version: newest, tag: `dsh-v${newest}` }
}

/** 宿主仓某个 git 对象里的 platform.ts；对象不可得返回 undefined。 */
function readHostPlatformAtRef(repo, ref) {
  try {
    return execFileSync('git', ['-C', repo, 'show', `${ref}:${HOST_PLATFORM_PATH}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 1024 * 1024,
    })
  } catch {
    return undefined
  }
}

/** 宿主仓 HEAD 的 ref 名（仅作佐证打印）。 */
function headRef(repo) {
  try {
    return execFileSync('git', ['-C', repo, 'rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

/** 宿主仓是否已有某个 tag（本地对象库可解析）。 */
function hasTag(repo, tag) {
  try {
    execFileSync('git', ['-C', repo, 'rev-parse', '--verify', `refs/tags/${tag}`], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

const target = declaredTargetTag()
let referenceSeed
let referenceLabel
let authoritative = false

if (target !== undefined) {
  // CI 的宿主检出是 shallow clone（默认分支、无 tag）：显式授权时先补取目标 tag，
  // 让权威比对在 CI 里也成立，而不是退化成对着工作区猜。
  if (!hasTag(harnessRepo, target.tag) && process.env.DSH_FETCH_HOST_TAG === '1') {
    try {
      execFileSync('git', ['-C', harnessRepo, 'fetch', '--depth', '1', 'origin', 'tag', target.tag], {
        stdio: 'ignore',
      })
    } catch {
      // 取不到就退回工作区参照（下方统一处理）
    }
  }
  const taggedText = readHostPlatformAtRef(harnessRepo, target.tag)
  if (taggedText !== undefined) {
    referenceSeed = extractSeed(taggedText, `宿主 platform.ts（${target.tag}）`)
    referenceLabel = `tag ${target.tag}（本仓声明的最新兼容版本 ${target.version}）`
    authoritative = true
  }
}

if (referenceSeed === undefined) {
  referenceSeed = extractSeed(
    readFileSync(join(harnessRepo, HOST_PLATFORM_PATH), 'utf8'),
    '宿主 platform.ts（工作区）',
  )
  referenceLabel = `工作区参照（检出 ${headRef(harnessRepo)}，非本仓声明的兼容面）`
}

const ours = extractSeed(readFileSync('scripts/clientBundle.ts', 'utf8'), '本仓 clientBundle.ts')

const sameOrder = JSON.stringify(referenceSeed) === JSON.stringify(ours)
const sameSet = referenceSeed.length === ours.length && referenceSeed.every(m => ours.includes(m)) && ours.every(m => referenceSeed.includes(m))
const oursSuperset = ours.length > referenceSeed.length && referenceSeed.every(m => ours.includes(m))

if (sameOrder) {
  console.log(`[bundle-sync] 平台种子一致（${String(ours.length)} 模块）；参照 ${referenceLabel}；宿主 HEAD ${headRef(harnessRepo)}`)
  process.exit(0)
}

console.error(`  参照来源: ${referenceLabel}`)
console.error(`  参照种子: ${JSON.stringify(referenceSeed)}`)
console.error(`  本仓种子: ${JSON.stringify(ours)}`)

if (!authoritative) {
  // 工作区参照不是我们声称的兼容面，据此判失败只会制造假警报（例：本机检出停在
  // 目标 tag 之前的工作区）。降级为提示：真正的门禁是「声明的 tag ↔ 本仓种子」。
  console.error('[bundle-sync] 参考性差异（未取到本仓声明的目标 tag，无法作权威判定）：')
  console.error('           目标 tag 不可得时无法区分「本仓漂移」与「本机检出过旧」。')
  console.error('           取到 tag 后重跑可作权威判定（设 DSH_FETCH_HOST_TAG=1 可自动补取）。')
  process.exit(0)
}

if (sameSet) {
  console.error('[bundle-sync] 平台种子集合相同、顺序不同——verbatim 语义要求顺序也一致')
  process.exit(1)
}

if (oursSuperset) {
  console.error('[bundle-sync] 平台种子漂移！本仓多出目标宿主没有的条目——bundle 可能 require() 到')
  console.error('           目标宿主模块表应答不了的 spec，运行时抛错。请把多出的条目移出')
  console.error('           PLATFORM_MODULES（改为内联），或确认该宿主版本确实没有它。')
  process.exit(1)
}

console.error('[bundle-sync] 平台种子漂移！本仓缺少目标宿主已有的条目——宿主种子扩张未镜像。')
console.error('           后果：本仓 import 该宿主模块时它会被内联，可能产生第二份共享运行时')
console.error('           实例。请把缺少的条目补进 scripts/clientBundle.ts 的 PLATFORM_MODULES。')
process.exit(1)

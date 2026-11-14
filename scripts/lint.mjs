#!/usr/bin/env node
/**
 * lint.mjs —— 本仓纪律守卫（E-5 + S-5）。
 *
 * 本仓没引 ESLint/Prettier：650+ 用例与 0 错 tsc 已是主防线，此刻引入全量
 * linter 会带来整仓 reformat 噪音，收益不配代价。这里只守**已确立的纪律**，
 * 防回归而非挑新刺：
 *
 * 1. 类型纪律：`as any` / `: any` / `@ts-ignore` / `@ts-expect-error` 零容忍
 *    （2026-10 审计基线：全仓 0 个；任何新增都该走 `as unknown as` 收窄）。
 * 2. 日志纪律：src/ 禁 `console.log`——本仓门面是 `[usage-billing]` 前缀的
 *    info/warn/error，log 会绕过宿主日志过滤习惯。
 * 3. 可观察性纪律：空 catch 必须带注释——83 处 `catch {}` 多数是有意的
 *    「缺失=未配置」语义，但每一处都得说清为什么静默；真空 catch（连注释
 *    都没有）一律打回。
 * 4. CSS↔TSX 类名 parity（S-5）：import UsageBilling.module.css 的文件里
 *    `css.X` 引用必须在 .module.css 有 `.X` 定义——类名哈希在模块内解析，
 *    缺定义不报错只静默无效（v1.5.2 清出 8 个历史死引用）。
 * 5. 令牌 parity（#100）：模块样式 var(--x) 引用的令牌必须有定义或属宿主
 *    --dsw-* 别名族——缺定义使 var() 替换失败、属性静默退化。
 * 6. 字体纪律（#100 复验）：font-family 只能引用令牌或关键字，font 简写只允许
 *    关键字，TSX 内联 fontFamily 只能是 var()——硬编码字体栈在 Windows 落到
 *    宋体，且绕过令牌统一调整。
 * 7. 面板压缩防线：列向 flex 容器（.dashboardBody / .tabPanel）的直系子块必须
 *    声明 flex-shrink: 0——否则卡片被纵向压扁而不是让容器滚动。
 * 8. 费率表 sticky 表头契约（#113）：.ubTablewrapPricing 必须有 max-height
 *    （自建滚动容器），表头必须 position:sticky + top:0 + 不透明底色。
 * 9. 座位浮层 portal 契约（#117）：注册进 conversation.* 座位的组件，其宿主
 *    Tooltip/Menu 必须显式带 portal（否则浮层被 composerSeat 的 transform 吃掉）。
 * 10. 全局偏好属性与动效作用域（#124）：写 <html> 上的偏好属性必须命名空间化
 *    （data-dsh-billing-*），且动效压制选择器必须带 .dsh-billing-root 作用域类。
 *
 * 全绿退出 0；违规打印 文件:行 退出 1。CI 与 `pnpm lint` 共用本脚本。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = relative('.', fileURLToPath(new URL('.', import.meta.url)))
const SCAN_DIRS = ['src', 'tests']
const EXTS = new Set(['.ts', '.tsx'])
const VIOLATIONS = []

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) yield* walk(path)
    else if (EXTS.has(name.slice(name.lastIndexOf('.')))) yield path
  }
}

/** 同 walk，但只产出 .css（守卫 6 的字体纪律按样式文件扫）。 */
function* walkCss(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) yield* walkCss(path)
    else if (name.endsWith('.css')) yield path
  }
}

/** 提取匹配大括号块的 body（含注释原文）。 */
function braceBlock(text, openEnd) {
  let depth = 1
  let i = openEnd
  while (i < text.length && depth > 0) {
    if (text[i] === '{') depth += 1
    else if (text[i] === '}') depth -= 1
    i += 1
  }
  return text.slice(openEnd, i - 1)
}

for (const dir of SCAN_DIRS) {
  for (const path of walk(dir)) {
    const rel = relative(ROOT, path) || path
    const text = readFileSync(path, 'utf8')
    const lines = text.split('\n')

    // 守卫 1：类型纪律（逐行，模式精确避免评论误报由人工复核兜底）
    const typePatterns = [
      { re: /\bas any\b/, label: '`as any`' },
      { re: /:\s*any\b/, label: '`: any`' },
      { re: /@ts-ignore/, label: '`@ts-ignore`' },
      { re: /@ts-expect-error/, label: '`@ts-expect-error`' },
    ]
    for (const [index, line] of lines.entries()) {
      for (const { re, label } of typePatterns) {
        if (re.test(line)) VIOLATIONS.push(`${rel}:${index + 1}  类型纪律：${label}（走 as unknown as 收窄或修类型）`)
      }
    }

    // 守卫 2：src/ 禁 console.log
    if (dir === 'src') {
      for (const [index, line] of lines.entries()) {
        if (/console\.log\(/.test(line)) VIOLATIONS.push(`${rel}:${index + 1}  日志纪律：console.log（用 console.info/warn/error 带 [usage-billing] 门面）`)
      }
    }

    // 守卫 3：真空 catch（body 无任何内容——注释都没有）
    const catchRe = /catch\s*(?:\(\s*\w*\s*\))?\s*\{/g
    let match
    while ((match = catchRe.exec(text)) !== null) {
      const body = braceBlock(text, match.index + match[0].length)
      const withoutComments = body.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').trim()
      if (withoutComments === '' && !body.includes('//') && !body.includes('/*')) {
        const line = text.slice(0, match.index).split('\n').length
        VIOLATIONS.push(`${rel}:${line}  可观察性：真空 catch 无注释（说明为什么静默，或改成 warn）`)
      }
    }
  }
}

// 守卫 4（S-5）：CSS↔TSX 类名 parity——UsageBilling.module.css 的消费方里
// `css.X` 引用必须在模块里有 `.X` 定义（缺失 = 静默无效样式，历史上积累过
// 8 个死引用）。CSS 独有类（供内部后代选择器用）不在此列，仅提示计数。
{
  const cssText = readFileSync(join('src', 'client', 'UsageBilling.module.css'), 'utf8')
  const defined = new Set([...cssText.matchAll(/\.([A-Za-z][A-Za-z0-9]*)/g)].map(m => m[1]))
  const used = new Map()
  for (const path of walk('src/client')) {
    const text = readFileSync(path, 'utf8')
    if (!text.includes('UsageBilling.module.css')) continue
    const rel = relative('.', path)
    for (const [index, line] of text.split('\n').entries()) {
      for (const m of line.matchAll(/css\.([A-Za-z][A-Za-z0-9]*)/g)) {
        if (!used.has(m[1])) used.set(m[1], `${rel}:${index + 1}`)
      }
    }
  }
  for (const [name, firstUse] of used) {
    if (!defined.has(name)) VIOLATIONS.push(`${firstUse}  CSS parity：css.${name} 在 UsageBilling.module.css 无定义（删引用或补样式）`)
  }
  console.log(`[lint] CSS parity：${String(used.size)} 个 TSX 引用类全部有定义（CSS 独有 ${String(defined.size - used.size)} 个供内部选择器）`)
}

// 守卫 5（#100）：CSS 自定义属性引用/定义 parity——模块样式里 var(--x) 引用的
// 令牌必须在文件内有定义，或属于宿主运行时提供的 --dsw-* 别名族。缺失令牌使
// var() 替换失败、属性退化为继承/初始值：--font-num 缺失让 Windows 中文区所有
// 数字渲染成宋体/Times（macOS 默认无衬线，验收不可见）；--dsb-1 笔误让币种按钮
// 选中态背景静默变透明。两起同源，故此守卫按引用侧收口。
{
  const cssText = readFileSync(join('src', 'client', 'UsageBilling.module.css'), 'utf8')
  // 剥掉注释再扫：修复说明里常会引用问题令牌的旧写法，注释不应触发违规。
  const cssCode = cssText.replace(/\/\*[\s\S]*?\*\//g, '')
  const defined = new Set([...cssCode.matchAll(/(--[A-Za-z][A-Za-z0-9-]*)\s*:/g)].map(m => m[1]))
  const hostProvided = (name) => name.startsWith('--dsw-')
  const referenced = new Map()
  for (const [index, line] of cssCode.split('\n').entries()) {
    for (const m of line.matchAll(/var\((--[A-Za-z][A-Za-z0-9-]*)/g)) {
      if (!referenced.has(m[1])) referenced.set(m[1], `src/client/UsageBilling.module.css:${index + 1}`)
    }
  }
  for (const [name, firstUse] of referenced) {
    if (!defined.has(name) && !hostProvided(name)) {
      VIOLATIONS.push(`${firstUse}  CSS parity：var(${name}) 引用的令牌无定义且非宿主 --dsw-* 别名（补定义或改用既有令牌）`)
    }
  }
  const own = [...referenced.keys()].filter(name => defined.has(name)).length
  console.log(`[lint] 令牌 parity：${String(referenced.size)} 个 var() 引用全部可解析（自有 ${String(own)} + 宿主 ${String(referenced.size - own)}）`)
}

// 守卫 6（#100 复验）：字体纪律——模块样式里 font-family 只能引用令牌
// （var(--font-num) / var(--mono)）或写 CSS 关键字，font 简写只允许关键字，
// TSX 内联 fontFamily 只能是 var() 字串。v1.6.5 补了令牌定义却漏改 12 处硬编码
// 字体栈（侧栏主数字、hero 大数字、KPI 等全在其中），Windows 上 monospace 落到
// 宋体，主视觉等于没修——守卫 5 看引用侧，这里按声明侧收口：硬编码栈一处不留。
{
  const KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer'])
  const isToken = (value) => /^var\(--[A-Za-z][A-Za-z0-9-]*\)$/.test(value)
  let declarations = 0
  for (const path of walkCss('src/client')) {
    const rel = relative('.', path)
    const cssCode = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [index, line] of cssCode.split('\n').entries()) {
      for (const m of line.matchAll(/(?<![-A-Za-z])(font-family|font)\s*:\s*([^;}]*)/g)) {
        const [, property, raw] = m
        const value = raw.trim()
        declarations += 1
        if (KEYWORDS.has(value)) continue
        if (property === 'font-family' && isToken(value)) continue
        VIOLATIONS.push(property === 'font'
          ? `${rel}:${index + 1}  字体纪律：font 简写只允许关键字，字体族请拆成 font-family: var(--font-num)（现为「${value}」）`
          : `${rel}:${index + 1}  字体纪律：font-family 不得硬编码字体栈，只能引用令牌 var(--font-num)/var(--mono) 或 inherit（现为「${value}」）`)
      }
    }
  }
  for (const path of walk('src/client')) {
    const rel = relative('.', path)
    for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      for (const m of line.matchAll(/fontFamily\s*[=:]\s*["'{]+\s*([^"'}]*)/g)) {
        declarations += 1
        const value = m[1].trim()
        if (isToken(value) || KEYWORDS.has(value)) continue
        VIOLATIONS.push(`${rel}:${index + 1}  字体纪律：内联 fontFamily 只能是 var(--font-num)/var(--mono)（现为「${value}」）`)
      }
    }
  }
  console.log(`[lint] 字体纪律：${String(declarations)} 处 font/font-family/fontFamily 声明全部走令牌或关键字`)
}

/**
 * 守卫 7：面板压缩防线——列向 flex 容器（.dashboardBody / .tabPanel）的直系子块
 * 必须声明 flex-shrink: 0。
 *
 * 背景（2026-10-23 用户反馈）：列向 flex 容器默认 flex-shrink:1，容器高度受限时
 * **子块会被纵向压扁而不是让容器滚动**——上下文分区的卡片（两张卡 + 构成条，内
 * 容最高）首当其冲，被压成一条。overflow-y:auto 并不能阻止 flex 子项收缩。
 * 该规则只护住「高度由内容决定」，jsdom 不做布局、无法用单测覆盖，故在此加守卫，
 * 防止将来重构把这条规则删掉。
 */
function checkPanelShrinkGuard() {
  const css = readFileSync('src/client/UsageBilling.module.css', 'utf8')
  const required = ['.dashboardBody > *', '.tabPanel > *']
  let checked = 0
  for (const selector of required) {
    const at = css.indexOf(selector)
    if (at < 0) {
      VIOLATIONS.push(`src/client/UsageBilling.module.css  面板压缩防线：缺少选择器 ${selector}（列向 flex 子块会被压扁）`)
      continue
    }
    // 选择器所在规则块内必须有 flex-shrink: 0
    const block = css.slice(at, css.indexOf('}', at))
    if (!/flex-shrink\s*:\s*0/.test(block)) {
      VIOLATIONS.push(`src/client/UsageBilling.module.css  面板压缩防线：${selector} 必须声明 flex-shrink: 0（否则卡片被纵向压扁）`)
      continue
    }
    checked += 1
  }
  if (checked === required.length) {
    console.log(`[lint] 面板压缩防线：${String(checked)} 处面板直系子块均声明 flex-shrink: 0`)
  }
}
checkPanelShrinkGuard()

/**
 * 守卫 8：费率表 sticky 表头契约（issue #113）——
 * ①.ubTablewrapPricing 必须带高度上限（max-height）：没有上限它就不是滚动
 *    容器，position:sticky 相对「最近的滚动容器」定位时会失效，表头随面板滚走；
 * ②..ubTablewrapPricing .ubTable thead th 必须 position:sticky + top:0；
 * ③.表头底色必须是不透明实色——半透明会让滚过去的行从表头底下透出来。
 *
 * jsdom 不做布局、无法单测覆盖（表头粘不粘住属于真机视觉），故在 CSS 文本层
 * 把契约钉死，防止将来重构把这三行删掉。
 */
function checkStickyRateHeaderGuard() {
  const css = readFileSync('src/client/UsageBilling.module.css', 'utf8')
  const blockOf = (selector) => {
    const at = css.indexOf(selector)
    if (at < 0) return null
    return css.slice(at, css.indexOf('}', at))
  }
  const wrap = blockOf('.ubTablewrapPricing {')
  if (wrap === null) {
    VIOLATIONS.push('src/client/UsageBilling.module.css  费率表 sticky 表头：缺少 .ubTablewrapPricing 规则（费率表需自建滚动容器）')
  } else if (!/max-height\s*:/.test(wrap)) {
    VIOLATIONS.push('src/client/UsageBilling.module.css  费率表 sticky 表头：.ubTablewrapPricing 必须声明 max-height（否则不构成滚动容器，sticky 失效）')
  }
  const head = blockOf('.ubTablewrapPricing .ubTable thead th')
  if (head === null) {
    VIOLATIONS.push('src/client/UsageBilling.module.css  费率表 sticky 表头：缺少 .ubTablewrapPricing .ubTable thead th 规则')
  } else {
    if (!/position\s*:\s*sticky/.test(head)) {
      VIOLATIONS.push('src/client/UsageBilling.module.css  费率表 sticky 表头：表头必须 position: sticky')
    }
    if (!/top\s*:\s*0\b/.test(head)) {
      VIOLATIONS.push('src/client/UsageBilling.module.css  费率表 sticky 表头：表头必须 top: 0（贴在滚动容器顶边）')
    }
    const bg = /background\s*:\s*([^;}]*)/.exec(head)
    if (bg === null || /transparent/i.test(bg[1])) {
      VIOLATIONS.push('src/client/UsageBilling.module.css  费率表 sticky 表头：表头底色必须不透明（transparent 会让滚过的行透出来）')
    }
  }
  if (wrap !== null && head !== null) {
    console.log('[lint] 费率表 sticky 表头：容器高度上限与表头粘性声明齐备')
  }
}
checkStickyRateHeaderGuard()

/**
 * 守卫 9：宿主会话座位里的浮层必须 portal（issue #117）——
 * 宿主槽位契约（ui-conversation/src/client/contract/slots.ts）对 conversation.*
 * 每个座位都写着同一句：「fixed overlays must portal to the document body
 * because the docked composer contains them」。原因是宿主 .composerSeat 带
 * will-change:transform，会成为 fixed 后代的包含块；浮层不 portal 就会按视口
 * 坐标写进 seat 下方——既错位，又把会话滚动区撑开，消息列表随之塌陷成 0 高
 * （输入框跳到顶部、画面闪一下，issue #117 的现象）。
 *
 * 宿主 Tooltip / Menu 的 portal 默认都是 false，所以「忘了写」不会有任何本地
 * 报错，只会在真机上闪。故在源码层把契约钉死：注册进 conversation.* 座位的
 * 组件，其宿主浮层必须显式带 portal。
 */
function checkSeatOverlayPortalGuard() {
  const apply = readFileSync('src/client/apply.ts', 'utf8')
  // conversation.* 座位上注册的组件名（register 的最后一个参数）
  const comps = new Set()
  for (const m of apply.matchAll(/ctx\.slots\.inject\('conversation\.[^']+'[\s\S]*?,\s*([A-Z][A-Za-z0-9]*)\)\)/g)) {
    comps.add(m[1])
  }
  if (comps.size === 0) {
    VIOLATIONS.push('src/client/apply.ts  座位浮层 portal 守卫：解析不到 conversation.* 座位注册（守卫本身失效，请检查注册写法）')
    return
  }
  // 组件名 → 源文件
  const files = [...walk('src/client')]
  const fileOf = new Map()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const comp of comps) {
      if (new RegExp(`export (function|const) ${comp}\\b`).test(text)) fileOf.set(comp, { file, text })
    }
  }
  for (const comp of comps) {
    if (!fileOf.has(comp)) {
      VIOLATIONS.push(`src/client/apply.ts  座位浮层 portal 守卫：组件 ${comp} 未在 src/client/*.tsx 中找到定义（座位注册与实现对不上）`)
    }
  }
  // 取 JSX 开标签文本（跳过字符串里的 '>'，并排除箭头函数 '=>'）
  const openTag = (text, from) => {
    let quote = null
    for (let i = from; i < text.length; i++) {
      const ch = text[i]
      if (quote !== null) {
        if (ch === quote && text[i - 1] !== '\\') quote = null
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
      if (ch === '>' && text[i - 1] !== '=') return text.slice(from, i + 1)
    }
    return null
  }
  let checked = 0
  const seen = new Set()
  for (const [comp, { file, text }] of fileOf) {
    for (const m of text.matchAll(/<(Tooltip|Menu)\b/g)) {
      const tag = openTag(text, m.index)
      if (tag === null) continue
      if (!/\bportal\b/.test(tag)) {
        const key = `${file}:${m.index}`
        if (!seen.has(key)) {
          seen.add(key)
          VIOLATIONS.push(`${file}  座位浮层 portal 守卫：<${m[1]}> 未声明 portal（宿主 conversation.* 座位要求 fixed 浮层 portal 到 body，否则会撑塌会话消息列表，issue #117）`)
        }
        continue
      }
      checked += 1
    }
  }
  console.log(`[lint] 座位浮层 portal：${String(comps.size)} 个会话座位组件的 ${String(checked)} 处宿主浮层均带 portal`)
}
checkSeatOverlayPortalGuard()

/**
 * 守卫 10（issue #124）：全局偏好属性必须命名空间化，且动效压制只在本插件根
 * 容器内生效。
 *
 * 背景（报告者实测）：「动效强度」设置把 data-motion 写在 <html> 上，配
 * `[data-motion="off"] *` 通配符 + !important —— 选择器从 <html> 起算又是通配
 * 符，页面上**每一个元素**的动画时长被压成 .001ms，宿主自己的右键菜单/对话框
 * 与第三方插件的动画全部失效；其他插件同为 !important 也无法覆盖。
 *
 * 三条契约：
 * ① 属性名必须带命名空间（data-dsh-billing-*）——通用名会被宿主或第三方插件
 *    的同名属性互相覆盖（谁后写谁赢）；
 * ② 凡提到动效属性的 CSS 选择器必须同时带 .dsh-billing-root 作用域类——否则
 *    又退回「插件设置影响整个页面」；
 * ③ TSX 侧不再写 dataset.density / dataset.motion 旧写法。
 */
function checkMotionScopeGuard() {
  const ROOT_CLASS = 'dsh-billing-root'
  let cssChecked = 0
  for (const path of walkCss('src/client')) {
    const rel = relative('.', path)
    const cssCode = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [index, line] of cssCode.split('\n').entries()) {
      // ① 通用属性名：密度/动效只允许命名空间化写法
      for (const m of line.matchAll(/\[data-(density|motion)[=\]]/g)) {
        VIOLATIONS.push(`${rel}:${index + 1}  全局属性命名空间：属性选择器 [data-${m[1]}] 必须写成 [data-dsh-billing-${m[1]}]（通用名会被宿主/第三方插件的同名属性覆盖，issue #124）`)
      }
      // ② 动效压制必须限定在本插件根容器内
      if (line.includes('[data-dsh-billing-motion')) {
        cssChecked += 1
        if (!line.includes(ROOT_CLASS)) {
          VIOLATIONS.push(`${rel}:${index + 1}  动效作用域：提到 [data-dsh-billing-motion] 的选择器必须同时带 .${ROOT_CLASS}（裸通配符会把宿主与其他插件的动画一起压平，issue #124）`)
        }
      }
    }
  }
  // ③ TSX 侧禁止旧写法：documentElement.dataset.density / .motion
  for (const path of walk('src/client')) {
    const rel = relative('.', path)
    for (const [index, line] of readFileSync(path, 'utf8').split('\n').entries()) {
      for (const m of line.matchAll(/dataset\.(density|motion)\b/g)) {
        VIOLATIONS.push(`${rel}:${index + 1}  全局属性命名空间：dataset.${m[1]} 必须写成 dataset.dshBilling${m[1][0].toUpperCase()}${m[1].slice(1)}（issue #124）`)
      }
    }
  }
  console.log(`[lint] 动效作用域：${String(cssChecked)} 处动效选择器均限定在 .${ROOT_CLASS} 内，全局属性已命名空间化`)
}
checkMotionScopeGuard()

if (VIOLATIONS.length > 0) {
  console.error(`[lint] ${VIOLATIONS.length} 项纪律违规：`)
  for (const v of VIOLATIONS) console.error(`  ${v}`)
  process.exit(1)
}
console.log('[lint] 纪律守卫全绿（类型 / 日志 / 空 catch 注释 / CSS parity / 令牌 parity / 字体纪律 / 面板压缩防线 / 费率表 sticky 表头 / 座位浮层 portal / 全局属性与动效作用域）')

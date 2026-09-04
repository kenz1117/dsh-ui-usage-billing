#!/usr/bin/env node
/**
 * 宿主版本 ↔ 兼容矩阵一致性校验。
 *
 * 数据源：npm registry 上 @deepseek-ai/dsh 的发布元数据（versions + dist-tags），
 * 对照本仓 package.json 的 dsh.compatibility（dsh SemVer 区间 + dshReleases 逐版本声明）。
 *
 * 失败条件（任一命中即退出码 1）：
 * 1. 宿主 dist-tag（latest/next/alpha）指向的版本落在本线 dsh 区间内，但 dshReleases 没有逐版本声明（issue #31 类事故的预防闸）；
 * 2. 落在本线区间内的已发布宿主版本存在「区间覆盖但未逐版本声明」的新版本（宿主漂移）；
 * 3. dshReleases 声明了 registry 上不存在的版本（笔误），或标 compatible 的版本不满足 dsh 区间（矩阵自洽）；
 * 4. 双线联查模式（--peer）下，存在两条线区间都不覆盖的宿主版本（无人认领）。
 *
 * 用法：
 *   node scripts/check-compat.mjs                 # 校验当前分支 package.json
 *   node scripts/check-compat.mjs --pkg <path>    # 校验指定 package.json（如 compat 分支 worktree）
 *   node scripts/check-compat.mjs --peer <path>   # 联查另一条线，报告无人认领的宿主版本
 *   node scripts/check-compat.mjs --report <path> # 失败时把可读报告写到文件（CI watcher 用）
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { satisfies, valid, compare } from 'semver';

const HOST_PACKAGE = '@deepseek-ai/dsh';
const REGISTRY_URL = `https://registry.npmjs.org/${HOST_PACKAGE.replace('/', '%2F')}`;

/** 命令行参数解析（--pkg/--peer/--report 各取一个路径值） */
function parseArgs(argv) {
  const opts = { pkg: 'package.json', peer: null, report: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--pkg') opts.pkg = argv[++i];
    else if (argv[i] === '--peer') opts.peer = argv[++i];
    else if (argv[i] === '--report') opts.report = argv[++i];
  }
  return opts;
}

/** 读取一份 package.json，抽出 dsh.compatibility 声明 */
function readCompat(pkgPath) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const compat = pkg.dsh?.compatibility;
  if (!compat) throw new Error(`${pkgPath} 缺少 dsh.compatibility 字段`);
  return { pkgPath, range: compat.dsh ?? null, releases: compat.dshReleases ?? {} };
}

/** 拉取宿主 npm 元数据：全部版本与 dist-tags */
async function fetchHostMeta() {
  const res = await fetch(REGISTRY_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`npm registry 请求失败：HTTP ${res.status}`);
  const meta = await res.json();
  return { versions: Object.keys(meta.versions), distTags: meta['dist-tags'] ?? {} };
}

/**
 * 单线校验：返回 { errors, warnings }。
 * range 为 null 时只做自洽性检查（稳定线历史上曾不带 dsh 区间）。
 */
function checkLine(line, host) {
  const errors = [];
  const warnings = [];
  const declared = Object.keys(line.releases);

  // 自洽：compatible 的必须落在区间内；声明的版本在 registry 查不到时降级为警告（可能已下架，如 0.1.2-alpha.1）
  for (const [version, status] of Object.entries(line.releases)) {
    if (!valid(version)) errors.push(`dshReleases 键 ${version} 不是合法 SemVer`);
    else if (!host.versions.includes(version)) warnings.push(`dshReleases 声明的 ${version} 已不在 npm registry（可能已下架，旧装用户不受影响）`);
    if (status === 'compatible' && line.range && !satisfies(version, line.range, { includePrerelease: true })) {
      errors.push(`${version} 声明为 compatible 但不满足 dsh 区间 ${line.range}`);
    }
  }

  if (line.range) {
    // 区间覆盖但未逐版本声明的已发布宿主版本 = 漂移
    const undeclared = host.versions
      .filter((v) => satisfies(v, line.range, { includePrerelease: true }))
      .filter((v) => !declared.includes(v))
      .sort(compare);
    if (undeclared.length > 0) {
      errors.push(`区间内存在未逐版本声明的宿主版本：${undeclared.join(', ')}（区间 ${line.range}）`);
    }
    // dist-tag 指向的版本落在区间内就必须有声明（安装入口拦截闸）
    for (const [tag, target] of Object.entries(host.distTags)) {
      if (satisfies(target, line.range, { includePrerelease: true }) && !declared.includes(target)) {
        errors.push(`宿主 dist-tag ${tag} → ${target} 落在本线区间内但未声明`);
      }
    }
  } else {
    warnings.push(`${line.pkgPath} 未声明 dsh SemVer 区间，市场无法按区间拦截`);
  }
  return { errors, warnings };
}

const opts = parseArgs(process.argv.slice(2));
const lines = [readCompat(opts.pkg)];
if (opts.peer) lines.push(readCompat(opts.peer));

let host;
try {
  host = await fetchHostMeta();
} catch (err) {
  console.error(`[check-compat] 无法获取宿主元数据：${err.message}`);
  process.exit(2);
}

const report = [];
const failures = [];
report.push(`宿主 ${HOST_PACKAGE} 已发布版本：${host.versions.length} 个`);
report.push(`宿主 dist-tags：${Object.entries(host.distTags).map(([t, v]) => `${t}=${v}`).join(', ')}`);

for (const line of lines) {
  const { errors, warnings } = checkLine(line, host);
  report.push(`\n[${line.pkgPath}] 区间 ${line.range ?? '(无)'}，逐版本声明 ${Object.keys(line.releases).length} 个`);
  for (const w of warnings) report.push(`  [警告] ${w}`);
  for (const e of errors) {
    report.push(`  [失败] ${e}`);
    failures.push(e);
  }
}

// 双线联查：找出两条线区间都不认领的宿主版本；只关心不早于双线最早声明的版本（插件诞生前的远古版本不算漂移）
if (lines.length === 2 && lines.every((l) => l.range)) {
  const floor = lines.flatMap((l) => Object.keys(l.releases)).sort(compare)[0];
  const orphan = host.versions
    .filter((v) => compare(v, floor) >= 0)
    .filter((v) => !lines.some((l) => satisfies(v, l.range, { includePrerelease: true })))
    .sort(compare);
  if (orphan.length > 0) {
    report.push(`\n[失败] 两条线区间都未覆盖的宿主版本：${orphan.join(', ')}`);
    failures.push(`无人认领的宿主版本：${orphan.join(', ')}`);
  }
}

console.log(report.join('\n'));
if (failures.length > 0) {
  if (opts.report) writeFileSync(opts.report, `# 宿主版本漂移报告\n\n\`\`\`\n${report.join('\n')}\n\`\`\`\n`);
  process.exit(1);
}
console.log('\n[check-compat] 全部通过');

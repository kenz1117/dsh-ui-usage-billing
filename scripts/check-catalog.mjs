#!/usr/bin/env node
/**
 * check-catalog.mjs —— DSH Community Market 目录（Path A 标准来源）本地校验。
 *
 * 为什么自己校验而不拉官方 schema：官方 schema 在 dsh-desktop 仓里，CI 每次拉会
 * 引入网络依赖与版本漂移；本脚本把**契约里真正会拒收来源的约束**固化成可离线
 * 跑的检查，字段清单来自 catalog-adapter-guide.zh.md + catalog-source.schema.json
 * v1.0.0 + catalog-provider-page.schema.json v1.0.0（2026-10 取样确证）。
 *
 * 市场的判定是 **strict**（additionalProperties: false）：多一个字段整个来源被拒，
 * 且不回退其他来源、不影响应用启动。所以本检查的重点是「不多字段」与「endpoint
 * 形状正确」。
 *
 * 用法：node scripts/check-catalog.mjs [--json <file>]
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const jsonArgIdx = args.indexOf('--json')
const sourcePath = resolve(jsonArgIdx >= 0 ? args[jsonArgIdx + 1] : 'catalog/catalog-source.json')
const pagePath = resolve('catalog/v1/plugins.json')

const problems = []

function fail(where, message) {
  problems.push(`${where}: ${message}`)
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function checkKeys(where, obj, required, optional) {
  for (const key of required) {
    if (!(key in obj)) fail(where, `缺少必填字段 ${key}`)
  }
  const allowed = new Set([...required, ...optional])
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) fail(where, `多余字段 ${key}（strict schema：多余字段会让整个来源被拒）`)
  }
}

function checkString(where, value, { min = 0, max = Number.MAX_SAFE_INTEGER, pattern } = {}) {
  if (typeof value !== 'string') {
    fail(where, `期望字符串，实际 ${typeof value}`)
    return
  }
  if (value.length < min) fail(where, `长度 ${String(value.length)} < 最小 ${String(min)}`)
  if (value.length > max) fail(where, `长度 ${String(value.length)} > 上限 ${String(max)}`)
  if (pattern !== undefined && !pattern.test(value)) fail(where, `不匹配模式 ${pattern.source}`)
}

function checkHttpsUri(where, value, { mustEndWith } = {}) {
  if (typeof value !== 'string') {
    fail(where, '期望字符串 URI')
    return
  }
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    fail(where, `不是合法 URI：${value}`)
    return
  }
  if (parsed.protocol !== 'https:') fail(where, `必须是 https（实际 ${parsed.protocol}）`)
  if (parsed.username !== '' || parsed.password !== '') fail(where, '不得携带凭据')
  if (parsed.search !== '' || parsed.hash !== '') fail(where, '不得带 query / fragment')
  if (mustEndWith !== undefined && !parsed.pathname.endsWith(mustEndWith)) {
    fail(where, `path 必须以 ${mustEndWith} 结尾（实际 ${parsed.pathname}）`)
  }
}

function checkDateTime(where, value) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    fail(where, `不是合法 date-time：${String(value)}`)
  }
}

// ── catalog-source.json ────────────────────────────────────────────────

const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
if (!isPlainObject(source)) {
  fail('catalog-source.json', '顶层必须是对象')
} else {
  checkKeys('catalog-source.json', source,
    ['manifestVersion', 'providerId', 'name', 'attribution', 'transport', 'query'],
    ['description', 'homepage'])
  if (source.manifestVersion !== '1.0.0') fail('catalog-source.json', 'manifestVersion 必须为 "1.0.0"')
  checkString('catalog-source.json.providerId', source.providerId, {
    min: 3, max: 128, pattern: /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/,
  })
  checkString('catalog-source.json.name', source.name, { min: 1, max: 120 })
  if (source.description !== undefined) checkString('catalog-source.json.description', source.description, { max: 500 })
  if (source.homepage !== undefined) checkHttpsUri('catalog-source.json.homepage', source.homepage)

  const attribution = source.attribution
  if (!isPlainObject(attribution)) {
    fail('catalog-source.json.attribution', '必须是对象')
  } else {
    checkKeys('catalog-source.json.attribution', attribution, ['name', 'url'], ['notice'])
    checkString('catalog-source.json.attribution.name', attribution.name, { min: 1, max: 120 })
    checkHttpsUri('catalog-source.json.attribution.url', attribution.url)
    if (attribution.notice !== undefined) checkString('catalog-source.json.attribution.notice', attribution.notice, { max: 500 })
  }

  const transport = source.transport
  if (!isPlainObject(transport)) {
    fail('catalog-source.json.transport', '必须是对象')
  } else {
    checkKeys('catalog-source.json.transport', transport, ['kind', 'endpoint', 'method'], [])
    if (transport.kind !== 'https-json') fail('catalog-source.json.transport.kind', '必须为 "https-json"')
    if (transport.method !== 'GET') fail('catalog-source.json.transport.method', '必须为 "GET"')
    checkHttpsUri('catalog-source.json.transport.endpoint', transport.endpoint, { mustEndWith: '/v1/plugins' })
  }

  const query = source.query
  if (!isPlainObject(query)) {
    fail('catalog-source.json.query', '必须是对象')
  } else {
    checkKeys('catalog-source.json.query', query, ['supported', 'defaultLimit', 'maxLimit', 'sorts'], [])
    const allowedQuery = ['q', 'category', 'capability', 'cursor', 'limit', 'sort', 'locale']
    if (!Array.isArray(query.supported)) fail('catalog-source.json.query.supported', '必须是数组')
    else {
      if (query.supported.length > 7) fail('catalog-source.json.query.supported', '最多 7 项')
      for (const item of query.supported) {
        if (!allowedQuery.includes(item)) fail('catalog-source.json.query.supported', `未知查询维度 ${String(item)}`)
      }
    }
    for (const key of ['defaultLimit', 'maxLimit']) {
      const value = query[key]
      if (!Number.isInteger(value) || value < 1 || value > 200) {
        fail(`catalog-source.json.query.${key}`, '必须是 1..200 的整数')
      }
    }
    if (Number.isInteger(query.defaultLimit) && Number.isInteger(query.maxLimit) && query.maxLimit < query.defaultLimit) {
      fail('catalog-source.json.query.maxLimit', '必须 ≥ defaultLimit')
    }
    if (!Array.isArray(query.sorts)) fail('catalog-source.json.query.sorts', '必须是数组')
    else {
      if (query.sorts.length > 4) fail('catalog-source.json.query.sorts', '最多 4 项')
      for (const item of query.sorts) {
        if (!['relevance', 'updated', 'name', 'downloads'].includes(item)) {
          fail('catalog-source.json.query.sorts', `未知排序 ${String(item)}`)
        }
      }
    }
  }
}

// ── catalog/v1/plugins.json ────────────────────────────────────────────

const page = JSON.parse(readFileSync(pagePath, 'utf8'))
if (!isPlainObject(page)) {
  fail('plugins.json', '顶层必须是对象')
} else {
  checkKeys('plugins.json', page, ['schemaVersion', 'items', 'page'], ['generatedAt', 'revision'])
  if (page.schemaVersion !== '1.0.0') fail('plugins.json', 'schemaVersion 必须为 "1.0.0"')
  if (page.generatedAt !== undefined) checkDateTime('plugins.json.generatedAt', page.generatedAt)
  if (page.revision !== undefined) checkString('plugins.json.revision', page.revision, { min: 1, max: 160 })
  if (!isPlainObject(page.page)) fail('plugins.json.page', '必须是对象（无下一页写 {}）')

  if (!Array.isArray(page.items)) {
    fail('plugins.json.items', '必须是数组')
  } else {
    if (page.items.length > 200) fail('plugins.json.items', '最多 200 项')
    const seenIds = new Set()
    page.items.forEach((item, index) => {
      const where = `plugins.json.items[${String(index)}]`
      if (!isPlainObject(item)) {
        fail(where, '必须是对象')
        return
      }
      checkKeys(where, item,
        ['id', 'name', 'displayName', 'summary'],
        ['description', 'homepage', 'latestVersion', 'license', 'categories', 'keywords', 'repository', 'installSource', 'package', 'publisher', 'media', 'capabilities', 'compatibility', 'updatedAt'])
      // id 不能以 @ 开头（schema pattern），与 npm 包名不是一回事。
      checkString(`${where}.id`, item.id, { min: 1, max: 200, pattern: /^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/ })
      if (seenIds.has(item.id)) fail(`${where}.id`, `重复的条目 id：${String(item.id)}`)
      seenIds.add(item.id)
      checkString(`${where}.name`, item.name, { min: 1, max: 160 })
      checkString(`${where}.displayName`, item.displayName, { min: 1, max: 120 })
      checkString(`${where}.summary`, item.summary, { min: 1, max: 1000 })
      if (item.description !== undefined) checkString(`${where}.description`, item.description, { max: 5000 })
      if (item.homepage !== undefined) checkHttpsUri(`${where}.homepage`, item.homepage)
      if (item.latestVersion !== undefined) checkString(`${where}.latestVersion`, item.latestVersion, { min: 1, max: 64 })
      if (item.license !== undefined) checkString(`${where}.license`, item.license, { min: 1, max: 80 })
      if (item.categories !== undefined) {
        if (!Array.isArray(item.categories)) fail(`${where}.categories`, '必须是数组')
        else {
          if (item.categories.length > 32) fail(`${where}.categories`, '最多 32 项')
          for (const category of item.categories) {
            checkString(`${where}.categories[]`, category, { pattern: /^[a-z0-9][a-z0-9._:-]*$/ })
          }
        }
      }
      if (item.keywords !== undefined) {
        if (!Array.isArray(item.keywords)) fail(`${where}.keywords`, '必须是数组')
        else {
          if (item.keywords.length > 64) fail(`${where}.keywords`, '最多 64 项')
          for (const keyword of item.keywords) checkString(`${where}.keywords[]`, keyword, { min: 1, max: 64 })
        }
      }
      if (item.repository !== undefined) {
        if (!isPlainObject(item.repository)) fail(`${where}.repository`, '必须是对象')
        else {
          checkKeys(`${where}.repository`, item.repository, ['url'], [])
          checkHttpsUri(`${where}.repository.url`, item.repository.url)
        }
      }
      if (item.installSource !== undefined) {
        if (!isPlainObject(item.installSource)) fail(`${where}.installSource`, '必须是对象')
        else {
          checkKeys(`${where}.installSource`, item.installSource, ['kind', 'commit'], [])
          if (item.installSource.kind !== 'github') fail(`${where}.installSource.kind`, '只支持 "github"')
          checkString(`${where}.installSource.commit`, item.installSource.commit, { pattern: /^[0-9a-f]{40}$/ })
        }
      }
      if (item.package !== undefined) {
        if (!isPlainObject(item.package)) fail(`${where}.package`, '必须是对象')
        else {
          checkKeys(`${where}.package`, item.package, ['registry', 'name'], [])
          if (item.package.registry !== 'npm') fail(`${where}.package.registry`, '只支持 "npm"（市场托管安装只认 npm）')
          checkString(`${where}.package.name`, item.package.name, {
            pattern: /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/,
          })
        }
      }
      if (item.publisher !== undefined) {
        if (!isPlainObject(item.publisher)) fail(`${where}.publisher`, '必须是对象')
        else {
          checkKeys(`${where}.publisher`, item.publisher, [], ['name', 'url'])
          if (item.publisher.name !== undefined) checkString(`${where}.publisher.name`, item.publisher.name, { max: 120 })
          if (item.publisher.url !== undefined) checkHttpsUri(`${where}.publisher.url`, item.publisher.url)
        }
      }
      if (item.media !== undefined) {
        if (!isPlainObject(item.media)) fail(`${where}.media`, '必须是对象')
        else {
          checkKeys(`${where}.media`, item.media, [], ['icon'])
          if (item.media.icon !== undefined) {
            if (!isPlainObject(item.media.icon)) fail(`${where}.media.icon`, '必须是对象')
            else {
              checkKeys(`${where}.media.icon`, item.media.icon, ['url'], [])
              checkHttpsUri(`${where}.media.icon.url`, item.media.icon.url)
            }
          }
        }
      }
      if (item.compatibility !== undefined) {
        if (!isPlainObject(item.compatibility)) fail(`${where}.compatibility`, '必须是对象')
        else {
          checkKeys(`${where}.compatibility`, item.compatibility, [], ['hosts'])
          if (item.compatibility.hosts !== undefined) {
            if (!Array.isArray(item.compatibility.hosts)) fail(`${where}.compatibility.hosts`, '必须是数组')
            else if (item.compatibility.hosts.length > 32) fail(`${where}.compatibility.hosts`, '最多 32 项')
          }
        }
      }
      if (item.updatedAt !== undefined) checkDateTime(`${where}.updatedAt`, item.updatedAt)
      // 条目必须能落到一个可安装源：repository 或 package 二选一。
      if (item.repository === undefined && item.package === undefined) {
        fail(where, '必须提供 repository 或 package 之一（否则不可安装）')
      }
    })
  }
}

if (problems.length > 0) {
  console.error(`[catalog] 目录校验失败（${String(problems.length)} 项）：`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log('[catalog] 目录校验通过：catalog-source.json + catalog/v1/plugins.json 符合 DSH Community Market Path A 契约')
process.exit(0)

/**
 * 剧本 1（API）：GET /api/billing/usage-stats 合同（v1.5.2 P0-4）。
 *
 * 3080 dev host 走 token auth 保护 UI 路径，但 API 路径无 auth（curl 实测 200）。
 * 用 @playwright/test 的 `request` fixture 直接打 3080，验核心 9 字段都有
 * 合理类型（不写死值，避免 3080 数据飘移）。
 */

import { test, expect } from '@playwright/test'

test('GET /api/billing/usage-stats 返回 200 + 核心聚合字段', async ({ request }) => {
  const res = await request.get('/api/billing/usage-stats')
  expect(res.status()).toBe(200)

  const doc = await res.json() as Record<string, unknown>
  // 必备字段：服务端聚合文档的「全量合同」——9 条路由最热的入口
  for (const key of ['total', 'byModel', 'byDay', 'byDayModels', 'bySession', 'bySite']) {
    expect(doc).toHaveProperty(key)
  }
  // total 子结构：v1.5.1 增 searchCalls / cacheWrite 可选字段，至少 4 个核心
  const total = doc.total as Record<string, unknown>
  expect(total).toHaveProperty('calls')
  expect(total).toHaveProperty('input')
  expect(total).toHaveProperty('output')
  expect(total).toHaveProperty('cacheHit')
  expect(total).toHaveProperty('cacheMiss')
  expect(total).toHaveProperty('cost')
  // 类型断言：calls 是 number（即便 0 会话也是 0，不为 undefined）
  expect(typeof total.calls).toBe('number')
  expect(typeof total.cost).toBe('number')
  // bySessionTotal（1.8.7）：会话真实总数（bySession 封顶 100，真实总数另下发）。
  expect(typeof doc.bySessionTotal).toBe('number')
  expect(doc.bySessionTotal as number).toBeGreaterThanOrEqual((doc.bySession as unknown[]).length)
})

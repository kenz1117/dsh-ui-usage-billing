import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则聚合/计价消费方读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

/**
 * 提供商（通道）优先分组（P2/P3 合并后）：厂商区块的一级归属是调用实际发生的
 * llm 入口（腾讯云 TokenHub / 腾讯云 Token Plan / 未知路由），模型品牌只是行内
 * 徽标 + 副标；订阅通道行显示「订阅包含 ≈目录价预估」。
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const makeProps = (): ComponentProps<typeof UsageBilling> => {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t,
    checkModels: async () => ({ checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [] }),
    publishCosts: () => {},
    registerOpen: () => () => {},
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

async function openProvidersTab() {
  const { container } = render(<UsageBilling {...makeProps()} />)
  fireEvent.click(container.querySelector('button')!)
  await screen.findByText('使用统计')
  fireEvent.click(await screen.findByTestId('billing-tab-providers'))
  await screen.findByTestId('billing-panel-providers')
  return screen.getByTestId('billing-panel-providers')
}

describe('provider-first channel grouping', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3-flash': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0, plan: false } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3-flash': { 'site:https://tokenhub.tencentmaas.com': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('groups models under their gateway channel inside the providers section', async () => {
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain('腾讯云 TokenHub')
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const tokenhub = groups.find(group => group.textContent?.includes('腾讯云 TokenHub'))
    expect(tokenhub).toBeDefined()
    // 厂商组默认收起（issue #77）：点击组头展开后才能断言模型明细与费用行。
    fireEvent.click(tokenhub!.querySelector('[data-testid="billing-provider-group-head"]')!)
    expect(tokenhub!.textContent).toContain('GLM-5.3-Flash')
    expect(tokenhub!.textContent).toContain('¥1.00')
  })

  it('labels unknown routes via locale instead of a raw bucket key', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3-flash': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0, plan: false } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3-flash': { unknown: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const panel = await openProvidersTab()
    await waitFor(() => {
      // 未知入口组：组头渲染「未知」徽章，徽章即文案（不再重复「未知路由」名字）。
      expect(panel.querySelector('[data-testid="billing-kind-badge"]')?.textContent).toBe(t('unknownTag'))
    })
  })
})

describe('subscription channel shows catalog-price estimate (P3)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0, plan: true } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3': { 'site:https://api.lkeap.cloud.tencent.com': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  })

  it('shows the ≈ estimate followed by a plan badge for plan-channel model rows', async () => {
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain('腾讯云 Token Plan')
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const plan = groups.find(group => group.textContent?.includes('腾讯云 Token Plan'))
    expect(plan).toBeDefined()
    // 厂商组默认收起（issue #77）：展开后模型行才渲染。
    fireEvent.click(plan!.querySelector('[data-testid="billing-provider-group-head"]')!)
    expect(plan!.textContent).toContain('GLM-5.3')
    // 订阅通道行：金额在前 + 「订阅」短标签在后（glm-5.3：输入 ¥8 / 输出 ¥28 → 0.22 元）。
    const badge = plan!.querySelector('[data-testid="billing-plan-badge"]')
    expect(badge).not.toBeNull()
    expect(badge!.textContent).toBe('订阅')
    expect(plan!.textContent).toContain('≈¥0.22')
  })

  it('shows the group-head recharge link on the plan channel even without balance data (issue #47 反馈)', async () => {
    // 订阅型组余额槽隐藏，充值入口与余额状态解耦：只要厂商收录了充值页就显示。
    // site 桶（经中转站点）组头渲染「中转」徽章 + 品牌名整名。
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain('腾讯云 Token Plan')
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const plan = groups.find(group => group.textContent?.includes('腾讯云 Token Plan'))
    expect(plan).toBeDefined()
    expect(plan!.querySelector('[data-testid="billing-kind-badge"]')?.textContent).toBe(t('relayTag'))
    const recharge = plan!.querySelector('[data-testid="billing-group-recharge"]') as HTMLAnchorElement | null
    expect(recharge).not.toBeNull()
    expect(recharge!.href).toBe('https://console.cloud.tencent.com/expense/recharge')
  })

  it('falls back to the ≈ estimate when the cell cost is 0 and the model is not marked plan (mixed-channel model)', async () => {
    // 同一模型在其它通道按量付费过 → 全局 plan 缺省为 false；本格全部走订阅通道
    // → cell.cost=0。此前实际列只剩「—」，现回退目录价估算；本 fixture 为旧快照
    // 形态（格级 plan 字段缺失、全局非 true）→ 不挂「订阅」徽标。
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0, plan: false } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3': { 'site:https://api.lkeap.cloud.tencent.com': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain('腾讯云 Token Plan')
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const plan = groups.find(group => group.textContent?.includes('腾讯云 Token Plan'))
    expect(plan).toBeDefined()
    fireEvent.click(plan!.querySelector('[data-testid="billing-provider-group-head"]')!)
    expect(plan!.textContent).toContain('GLM-5.3')
    // 回退估算：≈¥0.22（glm-5.3：输入 10000×¥8 + 输出 5000×¥28 → 0.22），不再是「—」。
    expect(plan!.textContent).toContain('≈¥0.22')
    expect(plan!.textContent).not.toContain('—')
    expect(plan!.querySelector('[data-testid="billing-plan-badge"]')).toBeNull()
    // 组头按估算兜底（issue #34：actual ?? (plan ? 0 : estimated)）计入 0.22。
    expect(plan!.textContent).toContain('¥0.22')
  })

  it('keeps the — dash for unknown-channel cells with zero cost (issue #82 不回退估算)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, reasoning: 0, officialCalls: 0, officialCost: 0, plan: false } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3': { unknown: { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0 } },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.querySelector('[data-testid="billing-kind-badge"]')?.textContent).toBe(t('unknownTag'))
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const unknown = groups.find(group => group.querySelector('[data-testid="billing-kind-badge"]')?.textContent === t('unknownTag'))
    expect(unknown).toBeDefined()
    fireEvent.click(unknown!.querySelector('[data-testid="billing-provider-group-head"]')!)
    // 未知通道数据面已强制归零，estimated 同步为 0 → 不触发回退，仍显示「—」。
    expect(unknown!.textContent).toContain('—')
    expect(unknown!.textContent).not.toContain('≈')
  })

  it('reads plan from the site cell so mixed-channel models still badge their subscription rows', async () => {
    // 混通道模型（全局无 plan）+ 本格全订阅（格级 plan:true）：徽标按格判，不再借
    // 模型全局口径（其它提供商的按量历史会把全局 plan 压成 false）。
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/api/billing/pricing')
        ? { source: 'builtin' }
        : {
            total: { calls: 4, input: 20000, output: 10000, cacheHit: 0, cacheMiss: 20000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0 },
            byModel: { 'glm-5.3': { calls: 4, input: 20000, output: 10000, cacheHit: 0, cacheMiss: 20000, cost: 1, reasoning: 0, officialCalls: 0, officialCost: 0 } },
            byDayModelsSite: {
              '2026-09-05': {
                'glm-5.3': {
                  'site:https://api.lkeap.cloud.tencent.com': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 0, plan: true },
                  'site:https://tokenhub.tencentmaas.com': { calls: 2, input: 10000, output: 5000, cacheHit: 0, cacheMiss: 10000, cost: 1 },
                },
              },
            },
            updatedAt: 0,
          }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    const panel = await openProvidersTab()
    await waitFor(() => {
      expect(panel.textContent).toContain('腾讯云 Token Plan')
    })
    const groups = screen.getAllByTestId('billing-provider-group')
    const planGroup = groups.find(group => group.textContent?.includes('腾讯云 Token Plan'))
    expect(planGroup).toBeDefined()
    fireEvent.click(planGroup!.querySelector('[data-testid="billing-provider-group-head"]')!)
    // 订阅格：格级 plan=true → 「订阅」徽标 + ≈估算（glm-5.3 → 0.22），不看全局。
    expect(planGroup!.querySelector('[data-testid="billing-plan-badge"]')).not.toBeNull()
    expect(planGroup!.textContent).toContain('≈¥0.22')

    const hubGroup = groups.find(group => group.textContent?.includes('腾讯云 TokenHub'))
    expect(hubGroup).toBeDefined()
    fireEvent.click(hubGroup!.querySelector('[data-testid="billing-provider-group-head"]')!)
    // 同一模型的按量格：无格级 plan → 回退全局（缺省 = false）→ 实付金额、无徽标。
    expect(hubGroup!.textContent).toContain('¥1.00')
    expect(hubGroup!.querySelector('[data-testid="billing-plan-badge"]')).toBeNull()
  })
})

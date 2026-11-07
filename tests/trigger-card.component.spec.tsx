// @vitest-environment jsdom
/**
 * UI 剧本 1（jsdom + @testing-library）：侧栏触发卡存在（v1.5.2 P0-4）。
 *
 * v1.5.0 视觉大改版后，billing-trigger testid 是 sidebar footer 触发卡
 * 的稳定 hook（v1.5.0 alpha.3 锁定）。本剧本仅断言渲染存在 + 宽栏（wide）
 * 模式下触发卡可见、点击能展开 Modal 容器。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { notifiedKeys } from '../src/client/domain/notify.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  localStorage.clear()
  notifiedKeys.clear()
})

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

describe('侧栏触发卡', () => {
  it('wide 模式渲染 billing-trigger testid + 点击打开 Modal 容器', async () => {
    // stub fetch：返回最小 stats（空聚合），仪表盘打开即可
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        return new Response(JSON.stringify({
          total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
          byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch)

    const budgetStore = createBillingBudgetStore().create()
    const props = {
      wide: true,
      t,
      checkModels: async () => ({
        checked: true, available: true, models: 0, failures: 0, okProviders: [], badProviders: [],
      }),
      publishCosts: () => {},
      registerOpen: () => () => {},
      renderSlot: () => null,
      useStore: bindSnapshotSelector(budgetStore),
      actions: budgetStore.actions,
    } as unknown as Parameters<typeof UsageBilling>[0]

    const { getByTestId } = render(<UsageBilling {...props} />)

    // 触发卡 testid 存在
    const trigger = getByTestId('billing-trigger')
    expect(trigger).toBeTruthy()

    // 点击触发卡：openDashboard 状态切换 → billing-dashboard 容器渲染
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(getByTestId('billing-dashboard')).toBeTruthy()
    })
  })

  it('v1.5.x 老持久化状态（缺 modelBudgets 键）下触发卡仍渲染（v1.6.2 回归）', async () => {
    // 事故现场：宿主 store 引擎 rehydrate 按整体替换恢复（不与 init() 合并），
    // v1.5.x 写入的持久化状态没有 v1.6.0 新增的 modelBudgets / modelTierAlertDays
    // 两键，读取点拿到 undefined 即崩，被槽位错误边界弹出——左下角胶囊消失。
    localStorage.setItem('dsh.ui-usage-billing.budget', JSON.stringify({
      enabled: false,
      amount: 0,
      tierAlertDays: {},
      lastBalanceAlertDay: '',
      lastTierSwitchAt: 0,
    }))

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      total: { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 },
      byModel: {}, byDay: {}, byDayModels: {}, byDayModelsSite: {},
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch)

    // create() 同步 rehydrate localStorage（整体替换 + 深冻结），复刻宿主装载路径
    const budgetStore = createBillingBudgetStore().create()
    const props = {
      wide: true,
      t,
      checkModels: async () => ({
        checked: true, available: true, models: 0, failures: 0, okProviders: [], badProviders: [],
      }),
      publishCosts: () => {},
      registerOpen: () => () => {},
      renderSlot: () => null,
      useStore: bindSnapshotSelector(budgetStore),
      actions: budgetStore.actions,
    } as unknown as Parameters<typeof UsageBilling>[0]

    // 修复前：Object.entries(undefined) 在 effect 抛 TypeError，render() 直接失败
    const { getByTestId } = render(<UsageBilling {...props} />)
    expect(getByTestId('billing-trigger')).toBeTruthy()
  })

  it('取数失败时显示「读取失败」而不是一片 0（issue #119）', async () => {
    // 服务端回 403（回环守卫：Host 头非回环且未列入 trustedHosts）——此前
    // 客户端把失败吞成空统计，用户只看到 ¥0，分不清没花钱还是没读到。
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        return new Response(
          JSON.stringify({ error: 'forbidden: loopback only (host "mybox.local:3080" not in trustedHosts)' }),
          { status: 403, headers: { 'content-type': 'application/json' } },
        )
      }
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch)

    const budgetStore = createBillingBudgetStore().create()
    const props = {
      wide: true,
      t,
      checkModels: async () => ({
        checked: true, available: true, models: 0, failures: 0, okProviders: [], badProviders: [],
      }),
      publishCosts: () => {},
      registerOpen: () => () => {},
      renderSlot: () => null,
      useStore: bindSnapshotSelector(budgetStore),
      actions: budgetStore.actions,
    } as unknown as Parameters<typeof UsageBilling>[0]

    const { getByTestId, findByTestId } = render(<UsageBilling {...props} />)
    // 速览弹层里的失败提示（hover 打开）：文案 + 服务端给出的原因。
    const notice = await findByTestId('billing-stats-error')
    expect(notice.textContent).toContain(t('statsLoadFailed'))
    expect(notice.textContent).toContain('not in trustedHosts')
    // 触发卡本身仍在（不崩），标题带失败标记。
    expect(getByTestId('billing-trigger')).toBeTruthy()
  })
})

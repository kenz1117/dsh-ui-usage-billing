// @vitest-environment jsdom
/**
 * 轮询在途闸门 + 余额滞后提示（issue #104）。
 *
 * 背景：报告者环境里客户端 30s 轮询把浏览器同源连接占满（每源 6 条上限），
 * 多个标签页各挂一条长时间不落地的响应，宿主自己的资源请求排队，整个 DSH
 * 界面卡死。客户端侧的两道防线：
 * 1. 取数超时（见 tests/billing-fetch-timeout.spec.ts）——单条请求不长期占连接；
 * 2. 在途闸门——上一轮没落地就跳过本轮，不叠请求。
 * 另外，服务端刷新超预算时回旧余额并标 stale，面板据此提示「余额来自上次查询」。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { notifiedKeys } from '../src/client/domain/notify.ts'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

beforeEach(() => {
  localStorage.clear()
  notifiedKeys.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** 面板 props（与其它客户端用例同构）。 */
function makeProps(): ComponentProps<typeof UsageBilling> {
  const budgetStore = createBillingBudgetStore().create()
  return {
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
  } as unknown as ComponentProps<typeof UsageBilling>
}

/** 余额响应（stale 决定服务端是否标记「来自上一次查询」）。 */
function stubBalance(stale: boolean): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/billing/balance')) {
      return new Response(JSON.stringify({
        balances: [{ provider: 'deepseek', displayName: 'DeepSeek', totalBalance: 100 }],
        ...(stale ? { stale: true } : {}),
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  }) as unknown as typeof fetch)
}

describe('轮询在途闸门与余额滞后提示（issue #104）', () => {
  it('shows a notice when the balance comes from the last completed query', async () => {
    stubBalance(true)
    const view = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(view.getByTestId('billing-trigger'))
    await waitFor(() => {
      expect(view.getByTestId('billing-balance-stale')).toBeTruthy()
    })
    expect(view.getByTestId('billing-balance-stale').textContent).toContain(t('balanceStaleNotice'))
  })

  it('does not show the notice when the balance is fresh', async () => {
    stubBalance(false)
    const view = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(view.getByTestId('billing-trigger'))
    await waitFor(() => {
      expect(view.getByTestId('billing-dashboard')).toBeTruthy()
    })
    expect(view.queryByTestId('billing-balance-stale')).toBeNull()
  })

  it('skips the next poll round while the previous one is still in flight', async () => {
    vi.useFakeTimers()
    let statsCalls = 0
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/billing/usage-stats')) {
        statsCalls += 1
        // 永不落地：模拟服务端被上游拖住（连接被长期占住）。
        return new Promise<Response>(() => {})
      }
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }))
    }) as unknown as typeof fetch)

    const view = render(<UsageBilling {...makeProps()} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    // 挂载后第一轮：usage-stats 发出并一直挂着。
    expect(statsCalls).toBe(1)

    // 面板关闭时的轮询节拍是 5 分钟：上一轮仍在途 → 跳过本轮，不叠请求。
    await act(async () => { await vi.advanceTimersByTimeAsync(301_000) })
    expect(statsCalls).toBe(1)

    // 用户显式打开面板：允许强制补一轮（宁可多打一轮，也不让用户对着旧数据）。
    fireEvent.click(view.getByTestId('billing-trigger'))
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(statsCalls).toBe(2)

    // 面板打开后的节拍是 30 秒：上一轮仍在途 → 同样跳过。
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000) })
    expect(statsCalls).toBe(2)
  })
})

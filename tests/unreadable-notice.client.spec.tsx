import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

// 测试套件承担宿主注入角色：目录与别名表在模块加载时全量注入（宿主 activate
// 同一入口），否则聚合/计价消费方读到空目录。
applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

// @vitest-environment jsdom
/**
 * 未统计会话通知（issue #84）：聚合侧拒读的会话进 unreadableSessions /
 * unreadableFormatSessions，面板据此刻画两行提示——总数一行、格式拒读子集
 * 一行（行动指引：过新升级宿主、过旧需迁移），让今日/累计偏低可自助归因。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => { localStorage.clear() })

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

/** 组件 props：数据桥 stub 空实现 + 真实预算 store 实例。 */
function makeProps(): ComponentProps<typeof UsageBilling> {
  const budgetStore = createBillingBudgetStore().create()
  return {
    wide: true,
    t,
    checkModels: async () => ({
      checked: true, available: true, models: 1, failures: 0, okProviders: [], badProviders: [],
    }),
    publishCosts: () => {},
    registerOpen: () => () => {},
    renderSlot: () => null,
    useStore: bindSnapshotSelector(budgetStore),
    actions: budgetStore.actions,
  } as unknown as ComponentProps<typeof UsageBilling>
}

/** 快照最小形状：加载器要求 total 字段（缺失按无效快照丢弃）。 */
const EMPTY_TOTAL = { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0, reasoning: 0 }

describe('unreadable session notices (issue #84)', () => {
  it('shows the total count plus the format-refused subset with action guidance', async () => {
    // 旧格式会话场景（issue #84 实测：1664 个 V0 + 689 个 V3 拒读）。
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ total: EMPTY_TOTAL, unreadableSessions: 2353, unreadableFormatSessions: 2353 }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')

    const notice = await screen.findByTestId('billing-sessions-unreadable')
    expect(notice.textContent).toContain('2353')
    expect(notice.textContent).toContain('暂未计入统计')
    // 格式拒读子集单独成行：旧格式需迁移、新格式升级宿主，归因不再写死「较新」。
    const format = await screen.findByTestId('billing-sessions-format-unsupported')
    expect(format.textContent).toContain('2353')
    expect(format.textContent).toContain('需先迁移')
  })

  it('omits the format line when the snapshot predates the field', async () => {
    // 旧快照只有 unreadableSessions（甚至没有）：总数行渲染、格式行不渲染。
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ total: EMPTY_TOTAL, unreadableSessions: 3 }), {
        status: 200, headers: { 'content-type': 'application/json' },
      })))
    const { container } = render(<UsageBilling {...makeProps()} />)
    fireEvent.click(container.querySelector('button')!)
    await screen.findByText('使用统计')

    expect(await screen.findByTestId('billing-sessions-unreadable')).not.toBeNull()
    expect(screen.queryByTestId('billing-sessions-format-unsupported')).toBeNull()
  })
})

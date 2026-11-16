// @vitest-environment jsdom
/**
 * issue #126 需求：提供商 / 通道可见性 + 用量行标注提供方。
 *
 * 1. 设置里逐通道勾选显示；隐藏的通道**不参与统计口径**——账单分组少掉该通道，
 *    概览累计随之扣除；
 * 2. 用量分区的模型行标注该模型走过的通道（同名模型、不同提供方据此区分）。
 *
 * 过滤的纯函数口径由 tests/channel-visibility.spec.ts 覆盖；本文件钉界面联动。
 */

import { applyBuiltinCatalog } from '../src/client/pricing.ts'
import { BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES } from '../src/builtin-catalog.ts'

applyBuiltinCatalog(BUILTIN_MODEL_CATALOG, BUILTIN_MODEL_KEY_ALIASES)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from './bind-snapshot-selector'
import { UsageBilling } from '../src/client/UsageBilling.tsx'
import { createBillingBudgetStore } from '../src/client/budget-store.ts'
import { zh } from '../src/client/locales.ts'

const t = (key: string): string => (zh as Record<string, string>)[key] ?? key

const RELAY = 'relay.example'
const OFFICIAL = 'DeepSeek 官方'

/** 两通道的统计样本：relay 20 元 / 官方 10 元，模型键同为 flash。 */
function statsStub(): unknown {
  return {
    total: { calls: 3, input: 3000, output: 1500, cacheHit: 0, cacheMiss: 3000, cost: 30, reasoning: 0 },
    byModel: {
      flash: { calls: 3, input: 3000, output: 1500, cacheHit: 0, cacheMiss: 3000, cost: 30, reasoning: 0 },
    },
    byDay: {
      '2026-11-14': { calls: 3, input: 3000, output: 1500, cacheHit: 0, cacheMiss: 3000, cost: 30, reasoning: 0 },
    },
    byDayModels: {
      '2026-11-14': {
        flash: { calls: 3, input: 3000, output: 1500, cacheHit: 0, cacheMiss: 3000, cost: 30 },
      },
    },
    byDayModelsSite: {
      '2026-11-14': {
        flash: {
          [`site:https://${RELAY}`]: { calls: 2, input: 2000, output: 1000, cacheHit: 0, cacheMiss: 2000, cost: 20 },
          'direct:deepseek': { calls: 1, input: 1000, output: 500, cacheHit: 0, cacheMiss: 1000, cost: 10 },
        },
      },
    },
    bySite: {
      [`site:https://${RELAY}`]: { calls: 2, input: 2000, output: 1000, cacheHit: 0, cacheMiss: 2000, cost: 20, reasoning: 0 },
      'direct:deepseek': { calls: 1, input: 1000, output: 500, cacheHit: 0, cacheMiss: 1000, cost: 10, reasoning: 0 },
    },
    updatedAt: 0,
  }
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function makeProps(): ComponentProps<typeof UsageBilling> {
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

function stubFetch(): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const body = url.includes('/api/billing/pricing') ? { source: 'builtin' } : statsStub()
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }))
}

async function openDashboard(): Promise<void> {
  render(<UsageBilling {...makeProps()} />)
  fireEvent.click(screen.getByTestId('billing-trigger'))
  await screen.findByTestId('billing-dashboard')
}

describe('issue #126 通道可见性', () => {
  it('设置里逐通道列出并可勾选隐藏，隐藏后账单分组与概览累计同步扣除', async () => {
    stubFetch()
    await openDashboard()

    // 设置分区：通道清单列出两个通道。
    fireEvent.click(screen.getByTestId('billing-tab-settings'))
    const cell = await screen.findByTestId('billing-channel-visibility-setting')
    await waitFor(() => {
      expect(cell.textContent).toContain(RELAY)
      expect(cell.textContent).toContain(OFFICIAL)
    })

    // 隐藏中转站：账单分组少掉该通道，概览累计由 ¥30 变 ¥10。
    fireEvent.click(screen.getByTestId(`billing-channel-toggle-${RELAY}`))
    await waitFor(() => {
      expect(screen.getByTestId('billing-channel-visibility-hint').textContent).toContain('1')
    })

    fireEvent.click(screen.getByTestId('billing-tab-providers'))
    const providers = await screen.findByTestId('billing-panel-providers')
    await waitFor(() => {
      expect(providers.textContent).not.toContain(RELAY)
      expect(providers.textContent).toContain(OFFICIAL)
    })

    fireEvent.click(screen.getByTestId('billing-tab-overview'))
    await screen.findByTestId('billing-tab-panel-overview')
    await waitFor(() => {
      // 只钉 Hero 主读数（概览累计）：被隐藏的中转站扣掉后 ¥30 → ¥10。
      // 不扫整块面板文本——面板里还有「本月预计」（本月已发生 + 近 7 日节奏 ×
      // 本月剩余天数），它随当天日期变，整块扫会在某些日子撞上同一个数字
      // （2026-11-16 恰好外推出 ¥30.0，让老断言假失败）。
      const hero = screen.getByTestId('billing-hero-range-value').textContent ?? ''
      expect(hero).toContain('10')
      expect(hero).not.toContain('30')
    })
  })

  it('通道可见性卡整行铺开、通道名整名呈现（issue #126 复访：名称被截成「a...」）', async () => {
    stubFetch()
    await openDashboard()
    fireEvent.click(screen.getByTestId('billing-tab-settings'))
    const cell = await screen.findByTestId('billing-channel-visibility-setting')

    // ① 整行铺开：三列网格里 1/3 格放不下通道名，卡必须横跨整行。
    expect(cell.className).toContain('channelVisCell')

    // ② 名称整名呈现：CSS 侧不再 text-overflow 截断（lint 守卫 11 钉住契约）。
    // CSS 模块类名带内容哈希，用属性子串匹配（不写死 .channelVisName）。
    const name = cell.querySelector('[class*="channelVisName"]')
    expect(name?.textContent).toBe(RELAY)
    expect(cell.textContent).toContain(OFFICIAL)
  })

  it('用量分区的模型行标注该模型走过的通道', async () => {
    stubFetch()
    await openDashboard()
    fireEvent.click(screen.getByTestId('billing-tab-token'))
    const panel = await screen.findByTestId('billing-token-panel')
    await waitFor(() => {
      const tags = panel.querySelector('[data-testid="billing-token-model-channels-flash"]')
      expect(tags?.textContent).toContain(OFFICIAL)
      expect(tags?.textContent).toContain(RELAY)
    })
  })
})

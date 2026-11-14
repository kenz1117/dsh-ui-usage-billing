// @vitest-environment jsdom
/**
 * LiveCostBar derivation unit test: the pure helpers `sessionCostOf` and
 * `turnCostOf` map the usage-stats slice onto the current session's cumulative
 * and latest-turn cost; `lowQuotaChips` picks the subscription windows running
 * low. All degrade cleanly on missing input.
 *
 * Also covers the live-cost capsule display pref (设置 Tab「平价消耗胶囊」开关):
 * `loadLiveCostBarPrefs` degrade-to-default parsing and the component's
 * visibility gate driven by localStorage + the cross-tree CustomEvent, plus the
 * seat gate (issue #101): the bar is mounted on both host seats (composer.dock
 * below / input.dock above) and renders in exactly the one the pref selects.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { LiveCostBar, LiveCostChip, isBlankPhase, lowQuotaChips, sessionCostOf, sessionSubCostOf, turnCostOf, type LiveStats, type QuotaSlice, type SessionPhaseSlice } from '../src/client/live-cost.tsx'
import css from '../src/client/UsageBilling.module.css'
import {
  LIVE_COST_BAR_PREF_EVENT,
  LIVE_COST_BAR_STORAGE_KEY,
  loadLiveCostBarPrefs,
  saveLiveCostBarPrefs,
} from '../src/client/usage-billing-settings.ts'
import { zh } from '../src/client/locales.ts'

beforeEach(() => { localStorage.clear() })

afterEach(() => { cleanup() })

const t = ((key: string): string => (zh as Record<string, string>)[key] ?? key) as (key: keyof typeof zh) => string

const BASE: LiveStats = {
  bySession: [
    { id: 'sess-1', cost: 2.4 },
    { id: 'sess-2', cost: 0.5 },
  ],
  byTurn: [
    { sessionId: 'sess-1', turn: 2, cost: 1.2 },
    { sessionId: 'sess-1', turn: 1, cost: 1.2 },
    { sessionId: 'sess-2', turn: 1, cost: 0.5 },
  ],
}

describe('sessionCostOf', () => {
  it('returns the matching session cumulative cost', () => {
    expect(sessionCostOf(BASE, 'sess-1')).toBe(2.4)
  })

  it('adds descendant subagent spend (subCost) into the session figure', () => {
    // 子智能体是宿主的独立会话：其费用经服务端 subCost 并入本对话口径。
    const withSubs: LiveStats = {
      bySession: [
        { id: 'sess-1', cost: 2.4, subCost: 3.26 },
        { id: 'sess-2', cost: 0.5 },
      ],
    }
    expect(sessionCostOf(withSubs, 'sess-1')).toBeCloseTo(5.66, 10)
    // 无后代的行不受影响。
    expect(sessionCostOf(withSubs, 'sess-2')).toBe(0.5)
  })

  it('returns 0 for an absent session or when stats is null', () => {
    expect(sessionCostOf(BASE, 'sess-3')).toBe(0)
    expect(sessionCostOf(null, 'sess-1')).toBe(0)
    expect(sessionCostOf(BASE, undefined)).toBe(0)
  })
})

describe('sessionSubCostOf', () => {
  it('returns the descendant subagent spend for the session', () => {
    const withSubs: LiveStats = {
      bySession: [{ id: 'sess-1', cost: 2.4, subCost: 3.26 }],
    }
    expect(sessionSubCostOf(withSubs, 'sess-1')).toBeCloseTo(3.26, 10)
    expect(sessionSubCostOf(BASE, 'sess-1')).toBe(0)
    expect(sessionSubCostOf(null, 'sess-1')).toBe(0)
    expect(sessionSubCostOf(BASE, undefined)).toBe(0)
  })
})

describe('turnCostOf', () => {
  it('returns the latest turn cost for the session', () => {
    expect(turnCostOf(BASE, 'sess-1')).toBe(1.2)
    expect(turnCostOf(BASE, 'sess-2')).toBe(0.5)
  })

  it('returns 0 for an absent session, no turns, or no stats', () => {
    expect(turnCostOf(BASE, 'sess-3')).toBe(0)
    expect(turnCostOf({ bySession: BASE.bySession ?? [], byTurn: [] }, 'sess-1')).toBe(0)
    expect(turnCostOf(null, 'sess-1')).toBe(0)
    expect(turnCostOf(BASE, undefined)).toBe(0)
  })
})

describe('lowQuotaChips', () => {
  const quotas: QuotaSlice[] = [
    { displayName: 'Kimi For Coding', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 70 }] },
    { displayName: 'Z.ai GLM', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 12 }, { kind: 'weekly', remainingPercent: 5 }] },
    { displayName: '小米 Token', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 25 }] },
  ]

  it('keeps only windows at or below the threshold, sorted ascending, capped at 3', () => {
    const chips = lowQuotaChips(quotas)
    expect(chips.map(c => c.pct)).toEqual([5, 12])
  })

  it('skips failed / unconfigured plans and takes the default threshold', () => {
    const bad: QuotaSlice[] = [
      { displayName: 'Unconfigured', status: 'not-configured', windows: [{ kind: 'monthly', remainingPercent: 0 }] },
      { displayName: 'Healthy', status: 'ok', windows: [{ kind: 'monthly', remainingPercent: 80 }] },
    ]
    expect(lowQuotaChips(bad)).toEqual([])
  })
})

describe('loadLiveCostBarPrefs / saveLiveCostBarPrefs (平价消耗胶囊显隐与位置)', () => {
  it('defaults to shown + toolbar (inside the composer, issue #47) when the key is missing', () => {
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'toolbar' })
  })

  it('round-trips an explicit hide through save + load (legacy below stays intact)', () => {
    saveLiveCostBarPrefs({ show: false, position: 'below' })
    expect(loadLiveCostBarPrefs()).toEqual({ show: false, position: 'below' })
    saveLiveCostBarPrefs({ show: true, position: 'below' })
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'below' })
  })

  it('round-trips the below/above positions and rejects invalid values back to the default (toolbar)', () => {
    saveLiveCostBarPrefs({ show: true, position: 'above' })
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'above' })
    saveLiveCostBarPrefs({ show: true, position: 'below' })
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'below' })
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"sideways"}')
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'toolbar' })
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true}')
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'toolbar' })
  })

  it('falls back to shown on corrupt JSON or non-boolean values (only explicit false hides)', () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{broken json')
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'toolbar' })
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":"yes"}')
    expect(loadLiveCostBarPrefs()).toEqual({ show: true, position: 'toolbar' })
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":false}')
    expect(loadLiveCostBarPrefs()).toEqual({ show: false, position: 'toolbar' })
  })
})

describe('LiveCostBar visibility gate (设置 Tab 开关跨树生效)', () => {
  const sessionId = 'sess-1' as SessionId

  it('renders nothing when the pref hides the capsule (pure display gate)', () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":false}')
    const view = render(<LiveCostBar sessionId={sessionId} t={t} seat="below" />)
    // 关闭后整条不渲染（返回 null，dock 槽位安全）。
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    view.unmount()
  })

  it('renders the capsule when positioned below and re-reads the pref on the broadcast CustomEvent (same document) and the storage event (cross tab)', async () => {
    // 默认位置已是 toolbar（bar 让位给输入框内的 chip）；bar 形态在此用 below 位置验证显隐门控。
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"below"}')
    const view = render(<LiveCostBar sessionId={sessionId} t={t} seat="below" />)
    // 显示中：fee-bar 胶囊条在 dock 上常驻。
    expect(screen.getByTestId('billing-live-cost-bar')).toBeTruthy()
    // 设置 Tab 关闭：写 localStorage + 广播 CustomEvent → 胶囊条即时消失。
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":false}')
    await act(async () => { window.dispatchEvent(new Event(LIVE_COST_BAR_PREF_EVENT)) })
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    // 其它标签页同步：storage 事件也能驱动重读。
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"below"}')
    await act(async () => { window.dispatchEvent(new StorageEvent('storage')) })
    expect(screen.getByTestId('billing-live-cost-bar')).toBeTruthy()
    view.unmount()
  })

  it('swaps the bar for the inline chip when position is toolbar (mutual exclusion by pref)', () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"toolbar"}')
    // bar 侧：toolbar 时两个座位都不渲染（dock 槽拿到 null）。
    const belowView = render(<LiveCostBar sessionId={sessionId} t={t} seat="below" />)
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    belowView.unmount()
    const aboveView = render(<LiveCostBar sessionId={sessionId} t={t} seat="above" />)
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    aboveView.unmount()
    // chip 侧：紧凑 chip 渲染，档位 + 会话费用在行内；完整信息在 aria-label
    // （宿主 Tooltip 消费 hover 渲染；原生 title 在 webview 不渲染，不用）。
    const chipView = render(<LiveCostChip sessionId={sessionId} t={t} />)
    const chip = screen.getByTestId('billing-live-cost-chip')
    expect(chip.getAttribute('aria-label')).toContain('会话')
    chipView.unmount()
    // 非 toolbar 位置时 chip 让位（input.right 槽拿到 null）。
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"below"}')
    const offView = render(<LiveCostChip sessionId={sessionId} t={t} />)
    expect(screen.queryByTestId('billing-live-cost-chip')).toBeNull()
    offView.unmount()
  })
})

describe('LiveCostBar seat gate (issue #101：「上方」挂 input.dock，「下方」挂 composer.dock，按偏好二选一)', () => {
  const sessionId = 'sess-1' as SessionId
  /** 已有内容的会话快照（非 hero）。 */
  const ACTIVE: SessionPhaseSlice = { blank: false, running: false, promptAttempted: true, awaitingFirstTurn: false }

  it('renders only the above seat when the pref is above, carrying the above class and seat marker', () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"above"}')
    const above = render(<LiveCostBar sessionId={sessionId} t={t} seat="above" session={ACTIVE} />)
    const bar = screen.getByTestId('billing-live-cost-bar')
    // above 座位挂第二个类（feeBarAbove：在 composerStack 整行座位里居中）。
    expect(bar.className).toMatch(/feeBarAbove|Above/)
    expect(bar.getAttribute('data-seat')).toBe('above')
    // issue #124：即时代费条挂本插件根容器标记——动效压制只在本插件内生效，
    // 少了它这条 bar 的 tick 脉冲就不会被「克制」档压住。
    expect(bar.className.split(/\s+/)).toContain('dsh-billing-root')
    above.unmount()
    // 同一偏好下 below 座位让位：composer.dock 槽拿到 null，不会两处同时出现。
    const below = render(<LiveCostBar sessionId={sessionId} t={t} seat="below" />)
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    below.unmount()
  })

  it('renders only the below seat when the pref is below (no above class)', () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"below"}')
    const above = render(<LiveCostBar sessionId={sessionId} t={t} seat="above" session={ACTIVE} />)
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    above.unmount()
    const below = render(<LiveCostBar sessionId={sessionId} t={t} seat="below" />)
    const bar = screen.getByTestId('billing-live-cost-bar')
    expect(bar.className).not.toMatch(/Above/)
    expect(bar.getAttribute('data-seat')).toBe('below')
    below.unmount()
  })

  it('switches seats live when the pref changes (same document CustomEvent)', async () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"below"}')
    render(<LiveCostBar sessionId={sessionId} t={t} seat="above" session={ACTIVE} />)
    render(<LiveCostBar sessionId={sessionId} t={t} seat="below" />)
    expect(screen.getAllByTestId('billing-live-cost-bar').map(el => el.getAttribute('data-seat'))).toEqual(['below'])
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"above"}')
    await act(async () => { window.dispatchEvent(new Event(LIVE_COST_BAR_PREF_EVENT)) })
    // 两个座位同时挂着，任一时刻只有偏好选中的那一个在 DOM 里。
    expect(screen.getAllByTestId('billing-live-cost-bar').map(el => el.getAttribute('data-seat'))).toEqual(['above'])
  })

  it('above seat mirrors the host hero gate: hidden on a blank session, shown once a prompt is attempted', async () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"above"}')
    // 空白新会话（宿主 hero 页）：宿主不出 composer.dock，上方座位同样不出。
    const BLANK: SessionPhaseSlice = { blank: true, running: false, promptAttempted: false, awaitingFirstTurn: true }
    const view = render(<LiveCostBar sessionId={sessionId} t={t} seat="above" session={BLANK} />)
    expect(screen.queryByTestId('billing-live-cost-bar')).toBeNull()
    // 用户提交首条消息：宿主切出 hero，胶囊随之出现。
    view.rerender(<LiveCostBar sessionId={sessionId} t={t} seat="above" session={{ ...BLANK, promptAttempted: true }} />)
    expect(screen.getByTestId('billing-live-cost-bar')).toBeTruthy()
    view.unmount()
    // 没有 owner 快照（composer.dock 座位或老宿主）时不做 hero 门控——宿主自己已门控。
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"above"}')
    const noSnapshot = render(<LiveCostBar sessionId={sessionId} t={t} seat="above" />)
    expect(screen.getByTestId('billing-live-cost-bar')).toBeTruthy()
    noSnapshot.unmount()
  })

  it('isBlankPhase replays ui-conversation conversationPhase blank branch', () => {
    const base: SessionPhaseSlice = { blank: true, running: false, promptAttempted: false, awaitingFirstTurn: true }
    expect(isBlankPhase(base)).toBe(true)
    // 任一「活跃」信号即离开 blank：正在运行 / 已尝试提交 / 已有内容且不等首轮。
    expect(isBlankPhase({ ...base, running: true })).toBe(false)
    expect(isBlankPhase({ ...base, promptAttempted: true })).toBe(false)
    expect(isBlankPhase({ ...base, blank: false, awaitingFirstTurn: false })).toBe(false)
    // 已非空白但仍等首轮（且未尝试提交）仍算 blank——与宿主口径一致。
    expect(isBlankPhase({ ...base, blank: false, awaitingFirstTurn: true })).toBe(true)
  })

  it('the above class no longer relies on CSS order to escape its container (issue #101 root cause)', () => {
    // 宿主 0.2.1 起 composer.dock 被包进卡片下方的独立容器，order 跨不出容器；
    // 「上方」改挂 input.dock 后，feeBarAbove 只做居中，源码层面锁死不再回到 order 方案。
    //（jsdom 下 import.meta.url 不是 file: 协议，按 vitest 的工作目录定位源码。）
    const cssSource = readFileSync(resolve(process.cwd(), 'src/client/UsageBilling.module.css'), 'utf8')
    const rule = /\.feeBarAbove\s*\{([^}]*)\}/.exec(cssSource)
    expect(rule).not.toBeNull()
    expect(rule![1]).not.toMatch(/\border\s*:/)
    expect(rule![1]).toMatch(/align-self\s*:\s*center/)
  })
})

describe('LiveCostChip quota tint stacks on the pill base class (告警态红底变矩形溢出的修复)', () => {
  const sessionId = 'sess-1' as SessionId
  /** 两端点同时打桩：usage-stats 给会话费用（让金额渲染），subscriptions 给额度窗口。 */
  const stubEndpoints = (windows: readonly { kind: string; remainingPercent: number }[]): void => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input)
      const body = url.includes('/api/billing/subscriptions')
        ? { quotas: windows.length === 0 ? [] : [{ displayName: 'MiniMax Token Plan（国内）', status: 'ok', windows }] }
        : BASE
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
  }

  afterEach(() => { vi.unstubAllGlobals() })

  it('keeps feeInline and adds feeInlineError when a window is at or below 10%', async () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"toolbar"}')
    stubEndpoints([{ kind: 'session', remainingPercent: 0 }])
    render(<LiveCostChip sessionId={sessionId} t={t} />)
    const chip = screen.getByTestId('billing-live-cost-chip')
    await waitFor(() => { expect(chip.classList.contains(css.feeInlineError)).toBe(true) })
    // 基础类承载 inline-flex / 999px 圆角 / 高度 / 内距：丢了它，红底就是一块
    // 紧贴文字、与档位 chip 不对齐并溢出轮廓的矩形（此前三元表达式整类替换）。
    expect(chip.classList.contains(css.feeInline)).toBe(true)
    expect(chip.classList.contains(css.feeInlineAlert)).toBe(false)
  })

  it('keeps feeInline and adds feeInlineAlert between 10% and 20%', async () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"toolbar"}')
    stubEndpoints([{ kind: 'weekly', remainingPercent: 19.8 }])
    render(<LiveCostChip sessionId={sessionId} t={t} />)
    const chip = screen.getByTestId('billing-live-cost-chip')
    await waitFor(() => { expect(chip.classList.contains(css.feeInlineAlert)).toBe(true) })
    expect(chip.classList.contains(css.feeInline)).toBe(true)
    expect(chip.classList.contains(css.feeInlineError)).toBe(false)
  })

  it('renders the plain base class with no tint when every window is healthy', async () => {
    localStorage.setItem(LIVE_COST_BAR_STORAGE_KEY, '{"show":true,"position":"toolbar"}')
    stubEndpoints([{ kind: 'weekly', remainingPercent: 87 }])
    render(<LiveCostChip sessionId={sessionId} t={t} />)
    const chip = screen.getByTestId('billing-live-cost-chip')
    // 等到费用金额出现，说明两端点都已回包、着色已按最终数据决定。
    await waitFor(() => { expect(chip.querySelector(`.${css.feeInlineNum}`)).not.toBeNull() })
    expect(chip.classList.contains(css.feeInline)).toBe(true)
    expect(chip.classList.contains(css.feeInlineAlert)).toBe(false)
    expect(chip.classList.contains(css.feeInlineError)).toBe(false)
  })
})

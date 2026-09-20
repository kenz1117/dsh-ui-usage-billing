/**
 * 峰谷指示点状态（issue #65 / dots）：把 `channelCountdown` 的结果映射成三种
 * 展示状态。纯函数，便于无 DOM 单测；无峰谷的模型返回 null —— 不渲染任何东西，
 * 绝不为「没有档位」的模型臆造一个状态。
 */

import type { PriceTierId } from './pricing.ts'

/** 指示点状态：低谷 / 即将切换 / 高峰。 */
export type BandState = 'offPeak' | 'soon' | 'peak'

/**
 * 由倒计时推导指示点状态。
 * @param band - `channelCountdown` 的返回值；null/undefined = 该模型无峰谷。
 * @param leadMs - 「即将切换」的提前量（复用峰谷提醒的 `leadMin`）。
 * @returns 展示状态；无峰谷时为 null。
 */
export function bandStateOf(
  band: { tier: PriceTierId; nextSwitchInMs: number } | null | undefined,
  leadMs: number,
): BandState | null {
  if (band === null || band === undefined) return null
  // 临近切换优先于当前档位：此时「马上要变」比「现在是什么」更有用。
  if (Number.isFinite(band.nextSwitchInMs) && band.nextSwitchInMs <= leadMs) return 'soon'
  return band.tier === 'peak' ? 'peak' : 'offPeak'
}

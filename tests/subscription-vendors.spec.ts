/**
 * 订阅 provider → 厂商映射守卫：凡有独立显示名的订阅 provider id，必须列在
 * SUBSCRIPTION_VENDORS 中，否则 subscriptionVendorOf() 会回退并让订阅卡在
 * 「厂商」列直接把 provider id 原样显示，破坏按厂商归并。
 *
 * 本守卫源自 @ciphoo 的 PR #6（fix(client): 把 minimax-token-plan 也归到
 * Minimax 厂商），由其提议并实现；作者采纳并作为 v0.9.9 之后的后续 commit 并入。
 */

import { describe, expect, it } from 'vitest'
import { SUBSCRIPTION_VENDORS_FOR_TEST } from '../src/client/UsageBilling.tsx'

describe('SUBSCRIPTION_VENDORS', () => {
  it('maps every MiniMax subscription id to the MiniMax vendor', () => {
    // 修复记录（PR #6）：v0.9.8 起 SUBSCRIPTION_VENDORS 漏掉 'minimax-token-plan'，
    // 仅 'minimax' 与 'minimax-token-plan-cn' 列在其中，导致用 'minimax-token-plan'
    // 作 provider id 的部署在订阅卡里被回退为显示原始 id。补全后三条必须同口径映射。
    expect(SUBSCRIPTION_VENDORS_FOR_TEST['minimax']).toBe('MiniMax')
    expect(SUBSCRIPTION_VENDORS_FOR_TEST['minimax-token-plan']).toBe('MiniMax')
    expect(SUBSCRIPTION_VENDORS_FOR_TEST['minimax-token-plan-cn']).toBe('MiniMax')
  })
})

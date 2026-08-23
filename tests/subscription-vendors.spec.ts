/**
 * Subscription provider → vendor mapping: every subscription provider id
 * that has a distinct display name from its existing siblings must be
 * listed in SUBSCRIPTION_VENDORS, otherwise subscriptionVendorOf() falls
 * through and the card lists the provider id verbatim in the "vendor"
 * column, breaking the per-vendor aggregation.
 */

import { describe, expect, it } from 'vitest'
import { SUBSCRIPTION_VENDORS_FOR_TEST } from '../src/client/UsageBilling.tsx'

describe('SUBSCRIPTION_VENDORS', () => {
  it('maps every MiniMax subscription id to the MiniMax vendor', () => {
    // 历史修复（见 PR #6）: v0.9.8 起 SUBSCRIPTION_VENDORS 漏掉了
    // 'minimax-token-plan'，仅 'minimax' 与 'minimax-token-plan-cn' 列在其中，
    // 导致用 'minimax-token-plan' 作 provider id 的部署在订阅卡片里被回退到
    // 显示原始 id 而不是「MiniMax」。补全后三条 provider id 必须同口径映射。
    expect(SUBSCRIPTION_VENDORS_FOR_TEST['minimax']).toBe('MiniMax')
    expect(SUBSCRIPTION_VENDORS_FOR_TEST['minimax-token-plan']).toBe('MiniMax')
    expect(SUBSCRIPTION_VENDORS_FOR_TEST['minimax-token-plan-cn']).toBe('MiniMax')
  })
})

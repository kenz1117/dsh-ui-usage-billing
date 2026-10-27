/**
 * Dashboard tab definitions: the sections render in a fixed order and
 * every label key has zh/en copy. Decor anchors land in their tabs — covered
 * by the anchor test in usage-billing-realdata.client.spec.tsx.
 */

import { describe, expect, it } from 'vitest'
import { DASHBOARD_TABS } from '../src/client/domain/types.ts'
import { en, zh } from '../src/client/locales.ts'

describe('DASHBOARD_TABS', () => {
  it('defines the sections in display order', () => {
    // 2026-10：新增「上下文」（宿主 token-meter 投影）与「智能体」（委派网络）两个一级分区。
    expect(DASHBOARD_TABS.map(tab => tab.id)).toEqual([
      'overview', 'queue', 'providers', 'token', 'trends', 'context', 'agents', 'pricing', 'settings',
    ])
  })

  it('has zh and en copy for every tab label', () => {
    for (const tab of DASHBOARD_TABS) {
      expect(zh[tab.labelKey]).toBeTruthy()
      expect(en[tab.labelKey]).toBeTruthy()
    }
  })
})

describe('locale dictionaries', () => {
  it('carry identical key sets in zh and en (a missing entry renders the raw key)', () => {
    // 防线：zh/en 词典必须键集一致。历史上 zh 条目曾静默丢失导致界面混出
    // 英文 key（issue 验收抓到过）——这里让缺失直接红灯。
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })
})

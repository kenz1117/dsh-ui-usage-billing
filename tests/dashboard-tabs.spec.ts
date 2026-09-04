/**
 * Dashboard tab definitions: the four sections render in a fixed order and
 * every label key has zh/en copy. Decor anchors land in their tabs — covered
 * by the anchor test in usage-billing-realdata.client.spec.tsx.
 */

import { describe, expect, it } from 'vitest'
import { DASHBOARD_TABS } from '../src/client/UsageBilling.tsx'
import { en, zh } from '../src/client/locales.ts'

describe('DASHBOARD_TABS', () => {
  it('defines the six sections in display order', () => {
    expect(DASHBOARD_TABS.map(tab => tab.id)).toEqual(['overview', 'providers', 'token', 'trends', 'pricing', 'settings'])
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

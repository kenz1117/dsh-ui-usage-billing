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
    expect(DASHBOARD_TABS.map(tab => tab.id)).toEqual(['overview', 'token', 'trends', 'providers', 'pricing', 'settings'])
  })

  it('has zh and en copy for every tab label', () => {
    for (const tab of DASHBOARD_TABS) {
      expect(zh[tab.labelKey]).toBeTruthy()
      expect(en[tab.labelKey]).toBeTruthy()
    }
  })
})

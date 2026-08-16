/**
 * Usage billing surface plugin, browser half: compact cost/token metrics
 * displayed in the session header utilities.
 *
 * Shows real-time cost, token usage, cache hit rate, and model breakdown.
 * Expands to a detailed dashboard panel on click.
 */

export { inject, apply } from './apply.ts'
export { UsageBilling } from './UsageBilling.tsx'
export type { UsageBillingKey } from './locales.ts'

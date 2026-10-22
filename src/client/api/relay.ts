/**
 * GET /api/billing/relay-quotas：中转站额度（New API / Sub2API）。
 * 失败抛出（调用方据此保留旧快照）。
 */

import type { RelayQuota, RelayResponse } from '../../pricing-shared.ts'
import { fetchBilling } from './http.ts'

/** Path to the relay-site quota endpoint served by this plugin's node half. */
export const RELAY_PATH = '/api/billing/relay-quotas'

/**
 * 拉取中转站额度（New API / Sub2API 的余额与滚动窗口）；失败抛出（调用方据此保留旧快照）。
 * @returns the relay-site quota rows（成功但无中转配置时为空数组）。
 */
export async function fetchRelayQuotas(): Promise<readonly RelayQuota[]> {
  const response = await fetchBilling(RELAY_PATH)
  if (!response.ok) throw new Error(`relay-quotas HTTP ${String(response.status)}`)
  const text = await response.text()
  const parsed = JSON.parse(text) as unknown
  if (parsed !== null && typeof parsed === 'object' && 'quotas' in parsed) {
    return (parsed as RelayResponse).quotas
  }
  throw new Error('relay-quotas: invalid response')
}

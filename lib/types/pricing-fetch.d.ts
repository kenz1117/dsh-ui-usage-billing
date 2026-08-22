/**
 * One-shot live pricing refresh for the billing dashboard.
 *
 * Fetches the USD → CNY mid rate and the OpenRouter model price list, maps
 * matched models onto the built-in catalog keys, and returns the combined
 * LivePricing. Every fetch failure degrades to the built-in values: the node
 * half caches whatever succeeded and the browser dashboard falls back to the
 * catalog for the rest — a total outage answers `{ source: 'builtin' }`.
 */
import type { ExtraModelPrice, LivePricing } from './pricing-shared.ts';
/**
 * models.dev 响应 → 目录外补充条目。不再按厂商白名单过滤：凡是有有效
 * cost 的模型都纳入（探活模型可能来自任何预制厂商，白名单会漏掉）。厂商
 * 显示名优先取映射，未命中用 provider id。导出供测试：纯函数。
 * @param data - `https://models.dev/api.json` 的响应体。
 * @returns 补充条目（按 provider 顺序稳定；仅含可计价的模型）。
 */
export declare function buildExtraModels(data: unknown): ExtraModelPrice[];
/**
 * Fetch the live pricing once at boot. Both upstreams run in parallel; a
 * failure in either degrades independently to the built-in value.
 * @returns the live pricing snapshot (builtin when everything failed).
 */
export declare function fetchLivePricing(): Promise<LivePricing>;
//# sourceMappingURL=pricing-fetch.d.ts.map
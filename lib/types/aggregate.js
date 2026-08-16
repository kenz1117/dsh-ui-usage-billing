/**
 * Real-usage aggregation: folds every persisted session log into the
 * usage-stats document the dashboard renders.
 *
 * Each LLM call is attributed to the model of the `request/header` event that
 * precedes its `assistant/message` usage event. Costs are estimated with the
 * shared billing catalog (`pricing.ts`, in CNY), so only models the catalog
 * prices incur a cost — subscription-plan routes and unknown models price
 * zero while their tokens still count. Pure functions only: the persistence
 * handle is injected, so the fold is unit-testable without a host.
 */
import { MODEL_CATALOG, computeCost, modelOf } from "./client/pricing.js";
/**
 * Real provider model ids map to their billing-catalog keys. Unknown ids stay
 * as-is and price zero (they are not in the catalog; subscription-plan routes
 * like kimi-coding / token plans fall here and therefore cost nothing).
 */
export const MODEL_KEY_ALIASES = {
    'deepseek-v4-flash': 'flash',
    'deepseek-v4-pro': 'pro',
    'glm-5.2': 'glm',
    'qwen3.8-max': 'qwen-3.8-max',
    'qwen3.7-max': 'qwen-max',
    'qwen-max': 'qwen-max',
    'hunyuan-t1': 'hunyuan-t1',
    'step-3.7-flash': 'step',
    'seed-2.0-mini': 'doubao-mini',
};
/** Zeroed usage accumulator. */
export function emptyUsage() {
    return { calls: 0, input: 0, output: 0, cacheHit: 0, cacheMiss: 0, cost: 0 };
}
/**
 * Fold one token usage event into an accumulator and re-price its cost.
 * The stats `input` is the TOTAL prompt tokens (cacheHit + cacheMiss), so the
 * miss bucket is uncached input plus cache writes.
 * @param acc - the accumulator to mutate.
 * @param usage - the provider-reported usage of one call.
 * @param key - the billing-catalog key this call belongs to.
 */
export function foldUsage(acc, usage, key) {
    const cacheHit = usage.cacheReadTokens ?? 0;
    const cacheMiss = usage.inputTokens + (usage.cacheWriteTokens ?? 0);
    acc.calls += 1;
    acc.input += usage.inputTokens + cacheHit + (usage.cacheWriteTokens ?? 0);
    acc.output += usage.outputTokens;
    acc.cacheHit += cacheHit;
    acc.cacheMiss += cacheMiss;
    // Only catalog-priced models cost money; unknown / subscription models price 0.
    acc.cost = MODEL_CATALOG.some(entry => entry.key === key)
        ? computeCost(modelOf(key), {
            input: acc.input,
            cacheHit: acc.cacheHit,
            cacheMiss: acc.cacheMiss,
            output: acc.output,
        })
        : 0;
}
/** Local-time date stamp (the host runs in the user's timezone). */
export function dayStamp(time) {
    const date = new Date(time);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/**
 * Aggregate real usage from every persisted session log.
 * @param persistence - the session persistence service.
 * @returns the usage-stats document (same shape the dashboard expects).
 */
export async function aggregateUsage(persistence) {
    const total = emptyUsage();
    const byModel = new Map();
    const byDay = new Map();
    for (const meta of await persistence.list()) {
        const { events } = await persistence.readFrom(meta.id, 0);
        let key = 'other';
        for (const event of events) {
            if (event.type === 'request/header') {
                const model = event.data.header.config.model;
                key = MODEL_KEY_ALIASES[model] ?? model;
                continue;
            }
            if (event.type !== 'assistant/message' || event.data.usage === undefined)
                continue;
            // 归属到最近的 request/header 记录的模型，token 按缓存分桶累加。
            const modelKey = key;
            const day = dayStamp(event.time);
            foldUsage(total, event.data.usage, modelKey);
            foldUsage(byModel.get(modelKey) ?? byModel.set(modelKey, emptyUsage()).get(modelKey), event.data.usage, modelKey);
            const dayCell = byDay.get(day) ?? byDay.set(day, emptyUsage()).get(day);
            foldUsage(dayCell, event.data.usage, modelKey);
        }
    }
    const toRecord = (map) => Object.fromEntries(map);
    return {
        version: 1,
        updatedAt: Date.now(),
        source: 'session-logs',
        total,
        byModel: toRecord(byModel),
        byDay: toRecord(byDay),
    };
}
//# sourceMappingURL=aggregate.js.map
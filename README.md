# @kenz1117/dsh-ui-usage-billing

Usage billing dashboard for DeepSeek Harness: a sidebar trigger above Settings opens a full billing dashboard — hero total, KPI tiles, a dependency-free SVG daily trend chart, a per-model billing table priced from a current multi-provider catalog, and a pricing table. No chart library, no external CDN, fully offline.

## Features

- **Sidebar trigger**: a pill above the Settings button showing the running total; a compact icon in collapsed-rail mode
- **Centered dashboard modal**:
  - Hero: gradient total card with today's cost and a day-over-day delta
  - KPI tiles: cache hit rate, total tokens, average cost per call, call count
  - Daily trend chart: SVG cost area-line + call-volume bars with hover crosshair and tooltip
  - Model billing table: per-model calls, input/output tokens, cache hit rate, estimated cost (from the price catalog) and actual cost
  - Pricing table: input / cache-hit / output prices per 1M tokens for every supported model
- **Model health dots**: each model row's dot turns green when that provider's catalog loads (live credentials), red on probe failure, gray when not connected — probed through the host's `llm.models`
- **Real usage**: the node half aggregates every persisted session log into `/api/billing/usage-stats` — no hand-written stats file needed
- **Subscription plans**: models served through a coding/token plan (not in the catalog) still count their tokens but price ¥0
- **Dark/light aware**: every color rides the `--dsw-*` token system, no literal colors
- **Self-contained**: dependency-free SVG chart, works offline, no CDN

## Display Location

Registered in `sidebar.footer.action` — the left sidebar footer, directly above Settings. Wide sidebar renders the pill; collapsed rail renders an icon button.

## How It Works

Two halves:

- **Node half** (`src/index.ts`) injects `webServer` + `sessionPersistence` and registers `GET /api/billing/usage-stats`. Each request folds every persisted session log (`aggregate.ts`): an LLM call is attributed to the model of the `request/header` that precedes its `assistant/message` usage event, tokens split into cache-hit / cache-miss buckets, and the day stamp is local time.
- **Browser half** (`src/client/`) fetches that endpoint, renders the dashboard, and probes `llm.models` for the health dots. Before real data arrives (or when the endpoint is unavailable) it shows an empty snapshot — zeros, never fabricated samples.

## Billing Engine

[`pricing.ts`](src/client/pricing.ts) owns the per-model price tables and cost estimation. Each model's price table uses its **native currency**: domestic providers (DeepSeek, 智谱, 通义…) store RMB prices directly; overseas providers (OpenAI, Google, xAI, Meta) store USD. Cost is always computed and displayed in CNY — only USD-priced models pass through the CFETS mid-rate (6.79, 2026-08-14), never domestic ones.

```
cost (CNY) = (missInput×p_input + cacheHit×p_cacheHit + output×p_output) per 1M tokens
           — prices already in CNY, or USD × 6.79 for overseas models
```

The stats `input` field is the TOTAL prompt tokens (cacheHit + cacheMiss), so the estimator splits it — the hit share prices at the hit rate, the rest at the miss rate. No double counting.

**Supported models (2026-08-16 current lineup, OpenAI-API compatible — retired ones removed):**

| Provider | Models |
|---|---|
| DeepSeek | V4 Flash, V4 Pro — **peak/off-peak by time of day** (peak 09:00-12:00 / 14:00-18:00 Beijing = 2× off-peak, from 2026-08-17) |
| 智谱 AI | GLM-5.3, GLM-5.2, GLM-4.6 |
| 阿里通义 | Qwen3.8 Max, Qwen3.7-Max, Qwen3.5-Plus, Qwen3.5-Flash |
| 字节豆包 | Doubao Seed-2.0 Pro, Seed-2.0 Mini, Seed-1.6 (cache hits free) |
| 月之暗面 | Kimi K3, K2.7 Code, K2.7 Code HighSpeed, K2.6 |
| MiniMax | MiniMax-M3 |
| 百度 | ERNIE-5.1 |
| 腾讯 | 混元 T1, 混元 Hy3 |
| 零一万物 | Yi-Lightning |
| 阶跃星辰 | Step 3.7 Flash |
| 科大讯飞 | Spark 4.0 Ultra (套餐制, ~约价) |
| 商汤 | SenseNova 6.5 (公测中, ~约价) |
| 百川智能 | Baichuan M3-Plus |
| OpenAI | GPT-5.6 Sol / Terra / Luna |
| Google | Gemini 3.1 Pro, 3.6 Flash — **Standard / Flex tiers** (Flex = -50% on spare-capacity traffic; NOT time-of-day billing) |
| xAI | Grok 4.6, Grok 4.3 |
| Meta | Llama 4 Maverick, Scout |
| Custom | `other` fallback for unknown model keys |

- **Estimated** is computed from the catalog; **Actual** is the cost aggregated from real session usage. The model table shows both.
- **Two-band models**: DeepSeek prices peak traffic at 2× off-peak; Gemini prices Standard at 2× Flex. The estimator mixes both bands by `DEFAULT_PEAK_SHARE` (0.5) — edit the constant or the per-model tables in `pricing.ts`.
- To price a model not in the catalog, add an entry to `MODEL_CATALOG` (the node half maps real model ids via `MODEL_KEY_ALIASES` in `aggregate.ts`).
- The `other` fallback prices any unknown model key.

## Composition

```yaml
- name: '@kenz1117/dsh-ui-usage-billing'
```

Optional configuration:

| Field | Default | Meaning |
|---|---|---|
| `statsPath` | unset | Absolute path to a `.dsh-usage-stats.json` fallback file when `sessionPersistence` is unavailable |

## Development

```sh
pnpm install
pnpm --filter @kenz1117/dsh-ui-usage-billing bundle   # emits lib/index.js + lib/client.js
npx vitest run packages/client/ui-usage-billing/tests  # unit tests
```

## Installation (publish to GitHub / npm)

The package is a complete standalone npm package.

1. Publish from this directory:

   ```sh
   npm publish --access public
   ```

2. Consumers install it into their profile:

   ```sh
   dsh plugin --profile web add @kenz1117/dsh-ui-usage-billing
   ```

   or add the row to their `cordis.patch.yml`:

   ```yaml
   - insert:
       - id: ui-usage-billing
         name: '@kenz1117/dsh-ui-usage-billing'
   ```

The host discovers the browser half through the `dsh.client` declaration in `package.json` (`platform: web`) plus the `exports["./client"]` bundle — no registry-side registration is required.

## Model Experience

None — the surface only reads and displays usage data; it does not send model requests or affect prompt assembly.

## Known Limitations and Deferred Work

- **Aggregation cost is linear in total log volume** — every request re-reads all session logs. A future version could persist an incremental counter per session.
- **Prices are snapshot values** — catalog prices were aligned to provider list prices at authoring time; providers change pricing, so deployments should review `pricing.ts` for their effective rates.
- **Chart is bars + one line** — the trend view shows cost (line) and calls (bars); multi-model series would need a categorical legend.

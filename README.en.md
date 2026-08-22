<div align="center">

# dsh-ui-usage-billing

<p align="center">A billing dashboard plugin for DeepSeek Harness — aggregates model usage in real time from persisted session logs and estimates cost against current multi-provider prices, shown in a one-click dashboard from the sidebar.</p>

<p align="center">
  [![GitHub license](https://img.shields.io/github/license/kenz1117/dsh-ui-usage-billing)](https://github.com/kenz1117/dsh-ui-usage-billing/blob/main/LICENSE)
  [![GitHub stars](https://img.shields.io/github/stars/kenz1117/dsh-ui-usage-billing)](https://github.com/kenz1117/dsh-ui-usage-billing)
  [![GitHub last commit](https://img.shields.io/github/last-commit/kenz1117/dsh-ui-usage-billing)](https://github.com/kenz1117/dsh-ui-usage-billing)
  [![npm version](https://img.shields.io/npm/v/@kenz1117/dsh-ui-usage-billing)](https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing)
  [![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
</p>

[English](README.en.md) · [中文](README.md)

</div>

---

> **Peak/off-peak pricing update (from 2026-08-23 (Sun) 00:00 Beijing)**: DeepSeek models follow the new official rule — **weekdays (Mon–Fri)** keep the original peak/off-peak split (peak 09:00–12:00 / 14:00–18:00, ×2); **weekends (Sat/Sun)** are no longer split and are billed at the **off-peak price** all day. The plugin's billing engine, rate table and per-turn peak/off-peak bands all reflect this.

## Features

- **Sidebar entry**: a dashboard-style trigger card above the Settings button — month cost as the headline number (monospace) with a 7-day sparkline mini-trend, second line "Today / This week"; collapses to an icon button; hover reveals a quick-look card.
- **Billing dashboard (tabbed)**: Overview / Trends / Providers / Stats / Rates / Settings — hero figures + YoY/DoD + month projection + KPI×4 + heatmap; 7/30-day trend; provider billing & subscriptions; export / cost breakdown / workspaces / session detail; model rate table; budget & peak alerts. Restrained tones, `--dsw-*` tokens, dark/light adaptive.
- **Live cost bar**: below the composer, persistent "This turn ¥x · Session ¥y" plus the peak/off-peak tier & switch countdown and subscription low-quota chips (≤20% appear, ≤10% red).
- **Peak/off-peak switch alert**: a popover before a tier switch plus an optional system notification (lead time / position / mode / preview configurable), distinguishing "About to enter peak ×2 — can wait" / "About to enter off-peak, price halves".
- **Live-priced rate table**: models.dev fetched pricing + live-model alignment — the models actually configured are all included; peak/off-peak split (weekdays 9-12 / 14-18 peak ×2, weekends off-peak all day) plus a live USD→CNY rate, refreshed every 6 hours.
- **Official vs third-party buckets**: the detail cost column is split by official DeepSeek direct / third-party relay ("official x / third y" when mixed); the Stats tab has an official/third-party summary card.
- **Monthly budget + tier alerts**: a budget bar (on/off / amount / progress, ≥80% amber, over red pulse); notifies once per tier crossing 50/80/100%; a balance below the threshold (in CNY) alerts once a day.
- **Subscription quota**: detects subscription providers in `llm-pi-ai` (Kimi / Z.ai / OpenCode Go / MiniMax / OpenRouter / Xiaomi / Volcano…); those with a quota API show remaining % and reset time live, exhausted in red, no API shown as "not wired"; subscription-channel model cost is 0.
- **Custom provider balance**: configure any HTTP endpoint for balance (`extract` supports constant / dot-path / add-subtract / divide, header `{{ENV}}` via the credentials seam); DeepSeek / Kimi / StepFun / SiliconFlow have built-in official balances, and the balance column estimates "≈N days" from the 7-day daily burn.
- **Real usage aggregation**: the server aggregates from session logs on demand (incremental cache recomputes only written sessions), with per-session corruption tolerance and snapshot fallback; the `usage_stats` tool lets the model query today / month spend.
- **Multi-language + dual currency**: the ¥/$ switch is bilingual (USD→English, CNY→Chinese, this plugin only); the rate table converts to the selected currency.
- **Model health + uncatalogued annotation**: provider connection dots (green / red / grey); a model id not in the catalog is marked "uncatalogued" priced at the fallback, with provider inferred (e.g. `mi-mimo-2.5` → Xiaomi); estimated-price models are marked "estimated".
- **Session detail + cost spikes + heatmap**: sessions sorted by cost (title / project / calls / cost / last active); per-turn cost bars (last 40 turns, amount at bar top, peak/off-peak background bands, >2× spike flagged with attribution); a monthly calendar heatmap (5-color scale, hover detail).
- **Export + offline self-contained**: the Stats tab exports daily / per-session CSV and full JSON; no chart library, no external CDN, pure design tokens.

## Screenshots

![Overview: month cost hero, budget progress, KPIs and usage heatmap](screenshots/1.png)

![Trends: daily cost trend, per-turn costs and peak/off-peak share](screenshots/2.png)

![Providers: provider billing & subscriptions (balance, plan quota, model usage)](screenshots/3.png)

![Stats: export, cost breakdown, workspaces and session detail](screenshots/4.png)

![Rates: model rate table (peak/off-peak split and live rate)](screenshots/5.png)

### Demo video

<video src="screenshots/demo.mp4" poster="screenshots/1.png" controls width="100%"></video>

## Quick start

Add to the host `cordis.patch.yml`:

```yaml
- insert:
    - id: ui-usage-billing
      name: '@kenz1117/dsh-ui-usage-billing'
```

Or install via a package manager:

```sh
npm install @kenz1117/dsh-ui-usage-billing
```

After the host starts, the billing entry appears above the sidebar Settings. No extra configuration is needed; when `sessionPersistence` is available it aggregates real usage automatically.

## How it works

The plugin has a server side and a browser side:

```
Browser                                   Server (Node)
  │                                        │
  ├─ GET /api/billing/usage-stats ────────▶ ├─ sessionPersistence walks persisted session logs
  │                                        ├─ attributes a call to its preceding request/header model
  │                                        ├─ buckets tokens by cache hit / miss
  │                                        └─ estimates cost (CNY) from the live rate table
  ├─ GET /api/billing/pricing ────────────▶ ├─ live USD→CNY rate and model prices
  ├─ GET /api/billing/balance ────────────▶ ├─ DeepSeek official balance API (credentials seam)
  ├─ llm.models health probe ─────────────▶ └─ returns aggregated stats JSON
  └─ renders the dashboard
```

- **Server** (`src/index.ts`): injects `webServer`, `sessionPersistence` and `credentials`, and registers `GET /api/billing/usage-stats`, `/api/billing/pricing`, `/api/billing/balance`. The aggregator caches folded results per session: each LLM call is attributed to the model of its preceding `request/header`, tokens split into cache-hit / cache-miss buckets, dates bucketed by the local timezone; a log file with unchanged mtime+size reuses its cached fold, only written sessions are re-folded, and the whole document has a 5s TTL to coalesce heavy polling. Aggregation logic lives in `src/aggregate.ts`.
- **Browser** (`src/client/`): requests the endpoints above to render the dashboard and probes each provider connection via `llm.models`. Until real data arrives it shows an all-zero empty snapshot, never fabricated samples.

## Theme collaboration

This plugin **depends on no theme package** and runs standalone. The dashboard modal declares a `billing.dashboard.decor` decoration slot (head / hero / trend / models / footer anchors) and registers a real-time cost summary as the `ctx.billingMetrics` service: theme plugins (e.g. acid-zine) inject their own decoration visuals (MacDots, tape, torn notes…) and subscription-cost data into their sticker layer. Plugin and theme load/unload independently — with no theme the default visuals apply; without billing the theme still runs.

## Billing engine

The rate table (`src/client/pricing.ts`) stores each model in its **native currency**: domestic providers enter CNY directly, overseas providers enter USD. Cost is computed and displayed in CNY uniformly — USD models convert via the **live rate**, domestic models never pass through a rate. At startup the server fetches the live rate and model prices (`src/pricing-fetch.ts`): USD→CNY prefers the Tencent Finance quote (keyless, reachable in China), falling back to open.er-api then the built-in default; it then refreshes every 6 hours, and the rate-table modal shows a "today's rate" marker plus live / built-in badge. The **display currency follows the user**: switching ¥ / $ converts each per-1M-token unit price via `convertUnitPrice` at the live rate (falling back to the native currency when the rate is unavailable).

```
cost (CNY) = (missInput × p_input + cacheHit × p_cacheHit + output × p_output) / 10⁶
           —— prices in native currency; USD models convert at the live USD → CNY rate
```

`input` in the stats is total input (cacheHit + cacheMiss); estimation splits it into hit / miss to avoid double counting. Models with two-band billing are mixed by `DEFAULT_PEAK_SHARE` (default 0.5); weekends (Beijing Sat/Sun) are charged at the off-peak rate all day.

### Supported models (2026-08-21 lineup, OpenAI-compatible)

| Provider  | Models                                                                                       |
| -------- | ------------------------------------------------------------------------------------------- |
| DeepSeek | V4 Flash, V4 Flash Vision (Exp), V4 Pro (peak/off-peak billing: weekdays peak 09:00-12:00 / 14:00-18:00 Beijing = 2× off-peak; weekends off-peak all day) |
| Zhipu AI  | GLM-5.3, GLM-5.2, GLM-4.6                                                                    |
| Aliyun    | Qwen3.8 Max, Qwen3.7-Max, Qwen3.5-Plus, Qwen3.5-Flash                                        |
| Doubao    | Seed-2.0 Pro, Seed-2.0 Mini, Seed-1.6                                                         |
| Moonshot  | Kimi K3, K2.7 Code, K2.7 Code HighSpeed, K2.6                                                 |
| Xiaomi    | MiMo V2.5 (exempt when billed via a token-plan subscription channel)¹                         |
| MiniMax   | MiniMax-M3                                                                                  |
| Baidu     | ERNIE-5.1                                                                                   |
| Tencent   | Hunyuan T1, Hunyuan Hy3                                                                     |
| 01.AI     | Yi-Lightning                                                                                |
| StepFun   | Step 3.7 Flash                                                                              |
| iFlytek   | Spark 4.0 Ultra (plan-based)¹                                                                |
| SenseTime | SenseNova 6.5 (beta)¹                                                                        |
| Baichuan  | Baichuan M3-Plus                                                                            |
| OpenAI    | GPT-5.6 Sol / Terra / Luna                                                                  |
| Google    | Gemini 3.1 Pro, 3.6 Flash (Standard / Flex two-band, Flex = −50%)                            |
| xAI       | Grok 4.6, Grok 4.3                                                                          |
| Meta      | Llama 4 Maverick, Scout                                                                     |
| Other     | Unified fallback pricing for uncatalogued models                                             |

> ¹ iFlytek, SenseTime and Xiaomi have not published per-token prices — the table shows estimates; cost is 0 when these models go through a subscription channel (coding / token plan / opencode), and recalibrates automatically when official pricing is published. Subscription channels align with pi-ai built-in providers (kimi-coding, zai-coding-cn, opencode, opencode-go, qwen/xiaomi token-plan regional variants), overridable via `subscriptionProviders`.

To add a model: append an entry to `MODEL_CATALOG` and map its real id in `MODEL_KEY_ALIASES` in `src/client/pricing.ts` (shared by the aggregation layer and the client renderer).

## HTTP API

The public HTTP endpoints and field definitions are documented in source: `GET /api/billing/pricing`, `/api/billing/balance`, `/api/billing/usage-stats` (see `src/index.ts`, `src/aggregate.ts`).

## Configuration

| Field                    | Default                                  | Description                                                                                                           |
| ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `statsPath`             | unset                                   | Absolute path to a fallback `.dsh-usage-stats.json` (used when `sessionPersistence` is unavailable)                    |
| `balanceApiKeyEnv`      | `DEEPSEEK_API_KEY`                      | Credential ref for the DeepSeek balance query; only used as a fallback when llm-pi-ai has no `apiKeyEnv` for deepseek |
| `subscriptionProviders` | `kimi-coding`, `xiaomi-token-plan-cn`   | Subscription (coding / token plan) provider id list — tokens counted, cost 0                                        |
| `monthlyBudget`         | unset                                   | Default monthly budget (CNY); sent with usage-stats as the budget bar's initial amount (user UI settings take precedence and persist locally) |
| `lowBalanceThreshold`   | `50`                                    | Low-balance alert threshold (CNY); sent with usage-stats, alerts once a day when any provider's CNY balance is below it |
| `subscriptionPlans`     | auto-detect                             | Subscription quota adapter whitelist (`{ provider, baseUrl?, region? }`); when unset, auto-detects all subscription providers from `llm-pi-ai` (queries those with a quota API, marks the rest) |

## Development

Requirements: Node.js ^22.19 || >=24, pnpm.

```sh
pnpm install
pnpm --filter @kenz1117/dsh-ui-usage-billing bundle   # builds lib/index.js and lib/client.js
npx vitest run packages/client/ui-usage-billing/tests  # unit tests
```

## Release

This package is a standalone npm package that other DeepSeek Harness hosts can install once published.

```sh
npm publish --access public
```

The host discovers the browser side automatically via the `dsh.client` declaration (`platform: web`) and the `exports["./client"]` bundle in `package.json` — no registry registration needed.

## Model Experience

None. This plugin is a pure UI surface: it registers no tools, injects no system prompt, writes no model-visible events to the session log, and touches no session KV cache; usage statistics are aggregated by the server from existing session logs, whose content is owned by other packages.

## Known Limitations and Deferred Work

- **Balance queries cover DeepSeek / Moonshot (Kimi) / StepFun**: these three use a standard Bearer API key. Other providers expose no public balance API or need non-Bearer auth (Xiaomi MiMo via console Cookie, SenseTime via AccessKey signing, MiniMax/Doubao via quota or AK/SK), so they currently show "not configured"; the extension point is `src/balance.ts` (add a querier per provider balance API).
- **Overspend notifications rely on the browser Notification API**: when permission is denied or the platform lacks support, only the in-UI red-pulse fallback remains — no host-level notification channel; notifications are capped at once per day.
- **Session rows are not navigable**: clicking a session row does not open that session (cross-plugin navigation needs a host session-selection channel); sessions are capped at 100 rows and the panel shows the top 20.
- **Cost is a catalog estimate**: models without published per-token pricing (iFlytek, SenseTime, Xiaomi) use estimates (feature-list footnote ¹); official billing is authoritative.
- **The 30-day trend is bounded by log retention**: dates outside the persisted log retention window are shown as zeros in the window, not backfilled.

## License

[MIT](LICENSE) © 2026 KenZ (kenz1117)

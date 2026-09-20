<div align="center">

# dsh-ui-usage-billing

<p align="center">See every cent of your model spend — at a glance.</p>

<p align="center">
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/kenz1117/dsh-ui-usage-billing?logo=github"></a>
  <a href="https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing"><img alt="npm version" src="https://img.shields.io/npm/v/@kenz1117/dsh-ui-usage-billing?logo=npm"></a>
  <a href="https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@kenz1117/dsh-ui-usage-billing?logo=npm"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/kenz1117/dsh-ui-usage-billing/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/blob/main/LICENSE"><img alt="License MIT" src="https://img.shields.io/github/license/kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing"><img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/kenz1117/dsh-ui-usage-billing?logo=github"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/graphs/contributors"><img alt="GitHub contributors" src="https://img.shields.io/github/contributors/kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://awesome-dsh-plugin.com"><img alt="Awesome DSH Plugin" src="https://awesome-dsh-plugin.com/badge.svg"></a>
</p>

[English](README.en.md) · [中文](README.md)

</div>

---

<div align="center">
  <img src="screenshots/demo.png" alt="dsh-ui-usage-billing — billing dashboard overview" width="80%">
</div>

### Demo GIF

![Demo](screenshots/demo.gif)

## ✨ Why this plugin

Most billing plugins stop at "token count × unit price". dsh-ui-usage-billing turns billing into a **reconcilable ledger pipeline** — real usage, live prices, and peak/off-peak awareness that follows the model.

### Real usage you can reconcile
Usage is aggregated live from persisted session logs — never fabricated (an empty snapshot shows until real data arrives); daily official-balance deltas are cross-checked against the local ledger, and deviations beyond the threshold prompt a review — a bill that survives scrutiny.

### Live prices, history never rewritten
A live models.dev catalog + a built-in catalog of 77 models across 24 vendors + user-defined prices in the settings panel (bindable per relay origin) mean new models never wait for a release; DeepSeek time-of-day prices are **segmented by official change boundaries** (base price before 08-17, weekend peak hours 08-17~08-23, weekend all-day off-peak from 08-23) and later price changes never rewrite old bills.

### Peak/off-peak aware, alerts follow the model
The billing channel is detected from the current session's model: DeepSeek metered uses time-of-day prices (weekday 9-12 / 14-18 peak ×2, weekend all-day off-peak), Zhipu Coding Plan uses credit windows (weekday 14-18 peak at full rate, off-peak at **50% of base credits**) — the channel layer is extensible for more providers; a popover / system notification fires automatically before each switch, and only sessions whose current model actually involves peak/off-peak get alerted or show the tier section — no watching the clock.

### Subscriptions, balances and quotas on one screen
7 official provider balances (DeepSeek / Kimi / Zhipu GLM / Tencent Cloud TokenHub / …), Coding Plan quotas, relay-station rolling quota windows, self-declared endpoints, plus balance-delta reconciliation — what the plan deducted and what the balance deducted, verifiable side by side.

### Details few peers offer

- Not just "how much" but "on what": input split by cache hit/miss (including reasoning), official vs third-party buckets, drill-down by workspace/session/relay site, per-turn cost-spike attribution.
- A performance panel: per-model TTFT mean/P50/P90 and generation speed.
- Uncatalogued models are explicitly marked and never silently billed 0; one alias entry prices an out-of-catalog model.
- An optional `usage_stats` tool lets the model answer "what did I spend today" or "which site used the most".
- A pure UI surface: no tools registered, no system-prompt injection, no model-visible log events.
- Chinese / English and ¥ / ≈$ toggles; no chart library, no external CDN, offline & self-contained.

## 📊 Dashboard

- **Sidebar trigger card**: persistent above the Settings button — month cost as the headline number with a 7-day sparkline mini-trend, second line "Today / This week"; collapses to an icon button; hover reveals a quick-look card.
- **Six-tab dashboard**: Overview / Trends / Detail / Stats / Rates / Settings — hero figures + comparisons + month projection + KPIs + usage heatmap, 7/30-day trends switching cost / tokens, plus the model rate table, budget and peak/off-peak alerts; restrained tones, dark/light adaptive.

  ![Overview: month cost hero, budget progress, KPIs and usage heatmap](screenshots/1.png)
- **Live cost bar**: persistent "this turn / session" cost below the composer; the peak/off-peak tier & countdown section appears only when the current model involves peak/off-peak pricing; subscription low-quota chips appear at ≤20% remaining, red at ≤10%; hideable via the settings-tab toggle (display-only preference persisted locally; stats and alerts unaffected).
- **Peak/off-peak switch alert**: a popover plus an optional system notification before a switch; lead time / position / mode / preview configurable; copy differs by billing channel (DeepSeek price halves, Zhipu credits at 50%).
- **Plugin info card**: a persistent "About" card in the Settings tab — version read server-side from the package's `package.json` (single source of truth, correct on publish), author / repo / npm / license one click away.

## 💰 Billing engine

- **Provider-first grouping**: usage is grouped by the llm entry the calls actually went through (channel) — Tencent Cloud TokenHub / Token Plan / DeepSeek official / direct:<route> / unknown routes; the model brand stays as a row logo + sub-line. Official judgement follows the channel origin (`api.deepseek.com`) instead of the route name, so gateway routes named `deepseek-*` no longer count as official. `routeAliases` relocates renamed/deleted historical routes; `modelKeyAliases` binds uncatalogued model ids to catalog keys (date suffixes, org prefixes and the TokenHub short id `hy3` are recognized out of the box).
- **Live rate table**: models.dev fetched pricing + live-model alignment — all configured models included; peak/off-peak split (weekdays 9-12 / 14-18 peak ×2, weekends off-peak all day; history priced per official change boundaries, see "Billing details") + a live USD→CNY rate, auto-refreshed every 6 hours; the rate strip shows the last sync time with a **one-click "Sync now"** button (no host restart needed).

  ![Rates: model rate table (peak/off-peak split and live rate)](screenshots/5.png)
- **Custom unit prices**: set real paid prices (miss / cache-hit / output, optional USD and off-peak columns) for uncatalogued or repriced models; bindable per relay origin; an out-of-catalog model is priced as soon as you fill it in.
- **Official vs third-party buckets**: the detail cost column splits official direct / third-party relay ("official x / third y" when mixed); the Stats tab has a summary card; web-search assist calls count as official.
- **Monthly budget + tier alerts**: budget bar ≥80% amber, over-budget red pulse; one alert per 50/80/100% crossing; a balance below the CNY threshold alerts once a day.
- **Cost-spike attribution**: last-40-turn cost bars, amount at bar top, peak/off-peak background bands, >2× spikes flagged with attribution.

## 🔌 Subscriptions & balance

- **Subscription quota**: auto-detects subscription providers (Kimi / Z.ai / OpenCode Go / MiniMax / OpenRouter / Xiaomi / Volcano…); those with a quota API show remaining % and reset time live, exhausted in red, otherwise "not wired"; subscription-channel model cost is 0, and plan tiers are recognized by the built-in knowledge base (e.g. OpenCode Go $10/mo + $30 weekly). **MiniMax note**: use `minimax-token-plan-cn` for the CN domain (`api.minimaxi.com`), `minimax` / `minimax-token-plan` international; override `baseUrl` per provider if needed.
- **Multi-provider balance**: built-in official balances for DeepSeek / Kimi / StepFun / SiliconFlow / xAI / Zhipu GLM, with an "≈N days" estimate from the 7-day daily burn; **Tencent Cloud TokenHub Token Plan** goes through the cloud-API control plane (TC3-signed, `src/tc3.ts`) — set the credential to a `<SecretId>:<SecretKey>` key pair (not the inference key) and name the route `tencent-tokenhub` / `tokenhub` / `tencent` / `tencentcloud`; a percentage window is produced only when both remaining and total quotas parse (never guessed).
- **Custom provider balance**: configure any HTTP endpoint (`extract` supports constant / dot-path / arithmetic, header `{{ENV}}` via the credentials seam).
- **Declared endpoints + balance reconcile**: `declaredEndpoints` self-declares balance/quota interfaces for vendors absent from the built-in table — dot-paths only ("where the number is"), no expressions; safety bounds (single-slash absolute path, GET only, no cross-origin redirects, response-size/timeout caps, credentials from the matched provider only) are enforced by `src/declarative.ts`; a wrong path is marked `declared` with a reason. **Balance reconcile** (`reconcilePath`) cross-checks the official balance change against the local ledger, flagging drift above the threshold (0.3 CNY and >15%); top-ups / grants / currency changes reset the baseline instead of alerting, and a flat balance (subscription spend) stays silent.
- **Relay-site attribution & quota**: usage is grouped by `baseURL` origin — multiple keys on one relay merge into a row named by its domain; New API (`/api/status`) and Sub2API (`/v1/usage`) are auto-detected for balance and rolling quota windows, labeled "no quota" when unreadable, <20% remaining in red; recognition caches for 5 minutes (per-key fuse-breaking), and the `relay-quotas` endpoint attaches `diagnostics` for "why is my relay not showing"; project attribution prefers the workspace title.

  ![Providers: provider billing & subscriptions (balance, plan quota, model usage)](screenshots/3.png)

> For the full adapter matrix per channel (detection / endpoints / credentials / troubleshooting), see [docs/adapters.md](docs/adapters.md).

## 📈 Usage visualizations

- **Session detail + heatmap**: sessions sorted by cost (title / project / calls / cost / last active); month / half-year / year calendar heatmap (5-color scale, hover detail; the year view is ~52 weeks, GitHub-style, and the **half-year view uses 26 weeks of large cells** — half a year of intensity in one screenshot-ready chart) with a **cost / tokens metric switch**; total, active-day and streak counts on top.
- **Performance metrics**: per-model TTFT mean / P50 / P90, generation speed (tokens/s), total-latency mean; per-hour × per-model comparison curves — metric tabs, clickable model chips (top-5 by samples lit by default), hover snapping to the nearest hour with a crosshair and per-model values, broken lines for missing-sample hours (never fabricated); view preferences persist locally.
- **Token insights**: the daily token chart switches between two views — "Structure" (cache-miss / cache-hit / output, including reasoning) and "By model" (the toggle hides itself when snapshots lack per-day-per-model detail); hover shows the day's exact breakdown (thousand-separated); clicking a legend swatch or a model-table row focuses that model (click again to release); structural KPIs (cache-hit rate / reasoning share / input-output ratio / peak day); per-day CSV and JSON export (JSON includes per-day-per-model detail).

  ![Trends: daily cost trend, per-turn costs and peak/off-peak share](screenshots/2.png)
- **Export + drill-down**: daily / per-session / per-site CSV and full JSON from the Stats tab; cost breakdown / workspaces / session detail drillable (click a project row to expand its sessions); no chart library, no external CDN, pure design tokens.

  ![Stats: export, cost breakdown, workspaces and session detail](screenshots/4.png)

## 🛡️ Robustness & privacy

- **Real usage aggregation**: incremental server-side aggregation (only written sessions recompute), per-session corruption tolerance, snapshot fallback; the optional `usage_stats` tool queries today / month / current session / cumulative spend, plus `bySite` (relay-attributed) and `relay` (relay-only) summaries.
- **Model health + uncatalogued annotation**: provider connection dots (green / red / grey); uncatalogued models are marked and priced at the fallback, with the provider inferred (e.g. `mi-mimo-2.5` → Xiaomi); estimated-price models are labeled "estimated".
- **Multi-language + dual currency**: the ¥/$ switch is bilingual (USD→English, CNY→Chinese, this plugin only — it never leaks into the host UI); the rate table, the sidebar card and the composer capsule all convert to the selected currency, and the choice is persisted locally (it survives reopening the dashboard).
- **Security hardening**: every HTTP endpoint enforces loopback-only access via a dual check of the peer socket address and an exact Host-header match, rejecting `127.0.0.1.evil.com`-style DNS-rebinding names; write paths additionally validate a loopback Origin and Content-Type with a body-size cap against cross-site rewrites; balance / subscription / pricing fetches carry bounded retries with per-upstream circuit breaking (auth failures are config issues and do not trip the breaker).
- **Export injection guard**: CSV cells starting with `=` / `+` / `-` / `@` get a leading single quote and full escaping, so they cannot execute as formulas in Excel / WPS.
- **Privacy baseline**: a pure UI surface — registers no tools, injects no system prompt, writes no model-visible events; it only aggregates from existing session logs, whose content is owned by other packages.

## 🚀 Quick start

Check your host generation first (`dsh --version`), then pick the matching install command — **a mismatched line is rejected by the DSH Store via the `engines.dsh` declaration** (declared since v1.0.41). Note that `dsh plugin add` requires an explicit `--profile` (otherwise it fails with `required option '--profile <name>' not specified`), and prefer **pinning an exact version** over `@latest` (pnpm's `minimumReleaseAge` cooldown skips freshly published versions and may fall back to the other line):

- **DSH 0.1.2 ~ 0.1.6 era** (0.1.2-alpha.1 and later; npm `latest` currently at 0.1.5-rc.2, with the alpha preview moved to 0.1.6-alpha.2; `npm ls -g @deepseek-ai/dsh` shows 0.1.2-* ~ 0.1.6-*):

  ```sh
  dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@latest
  ```

- **DSH 0.1.0-rc.8 ~ 0.1.1-rc.2** (legacy hosts; **this line is frozen** — `stable` points permanently at the final v1.1.17, so existing installs keep working but receive no further releases; rationale and the formal EOL trigger are in [COMPATIBILITY.md](COMPATIBILITY.md)):

  ```sh
  dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@stable
  ```

Alternatively, add it to the host `cordis.patch.yml` by hand:

```yaml
- insert:
    - id: ui-usage-billing
      name: '@kenz1117/dsh-ui-usage-billing'
```

After the host starts, the billing entry appears above the sidebar Settings. No extra configuration is needed; when `sessionPersistence` is available it aggregates real usage automatically.

## ⚙️ How it works

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

- **Server** (`src/index.ts`): injects `webServer`, `sessionPersistence` and `credentials`, and registers `GET /api/billing/usage-stats`, `/api/billing/pricing`, `/api/billing/balance`, `/api/billing/subscriptions`, `/api/billing/relay-quotas`. The aggregator caches folded results per session: each LLM call is attributed to the model of its preceding `request/header`, tokens split into cache-hit / cache-miss buckets, dates bucketed by the local timezone; a log file with unchanged mtime+size reuses its cached fold, only written sessions are re-folded, and the whole document has a 5s TTL to coalesce heavy polling. Every successfully folded session is also atomically written to an independent durable usage ledger, so permanently deleting a session no longer removes its historical cost or tokens. Aggregation logic lives in `src/aggregate.ts`.
- **Browser** (`src/client/`): requests the endpoints above to render the dashboard and probes each provider connection via `llm.models`. Until real data arrives it shows an all-zero empty snapshot, never fabricated samples.

## 💡 Billing details

The rate table (`src/client/pricing.ts`) stores each model in its **native currency**: domestic providers enter CNY directly, overseas providers enter USD. Cost is computed and displayed in CNY uniformly — USD models convert via the **live rate**, domestic models never pass through a rate. At startup the server fetches the live rate and model prices (`src/pricing-fetch.ts`): USD→CNY prefers the Tencent Finance quote (keyless, reachable in China), falling back to open.er-api then the built-in default; it then refreshes every 6 hours, and the rate-table modal shows a "today's rate" marker plus live / built-in badge. The **display currency follows the user**: switching ¥ / $ converts each per-1M-token unit price via `convertUnitPrice` at the live rate (falling back to the native currency when the rate is unavailable).

```
cost (CNY) = (missInput × p_input + cacheHit × p_cacheHit + output × p_output) / 10⁶
           —— prices in native currency; USD models convert at the live USD → CNY rate
```

`input` in the stats is total input (cacheHit + cacheMiss); estimation splits it into hit / miss to avoid double counting. Models with two-band billing are mixed by `DEFAULT_PEAK_SHARE` (default 0.5); weekends (Beijing Sat/Sun) are charged at the off-peak rate all day.

### Supported models (2026-08-21 lineup, OpenAI-compatible)

| Provider  | Models                                                                                       |
| -------- | ------------------------------------------------------------------------------------------- |
| DeepSeek | V4.1 Flash, V4 Pro (priced per official change boundary: base tier → peak/off-peak v1 → weekend off-peak) |
| Zhipu AI  | GLM-5.3, GLM-5.2, GLM-5.1, GLM-5-Turbo, GLM-4.7, GLM-4.6, GLM-4.5-Air, GLM-5V-Turbo                                       |
| Aliyun    | Qwen3.8 Max, Qwen3.7-Max, Qwen3.5-Plus, Qwen3.5-Flash                                        |
| Doubao    | Seed-2.0 Pro, Seed-2.0 Mini, Seed-1.6                                                         |
| Moonshot  | Kimi K3, K2.7 Code, K2.7 Code HighSpeed, K2.6, K2.8 Preview                                  |
| Xiaomi    | MiMo V2.5 (exempt when billed via a token-plan subscription channel)¹                         |
| MiniMax   | MiniMax-M3, MiniMax-M2.7, MiniMax-M2.7-highspeed                                            |
| Baidu     | ERNIE-5.1                                                                                   |
| Tencent   | Hunyuan T1, Hunyuan Hy3                                                                     |
| 01.AI     | Yi-Lightning                                                                                |
| StepFun   | Step 3.7 Flash                                                                              |
| iFlytek   | Spark 4.0 Ultra (plan-based)¹                                                                |
| SenseTime | SenseNova 6.5 (beta)¹                                                                        |
| Baichuan  | Baichuan M3-Plus                                                                            |
| OpenAI    | GPT-6 Astra, GPT-5.6 Sol / Terra / Luna                                                     |
| Google    | Gemini 3.1 Pro, 3.6 Flash (Standard / Flex two-band, Flex = −50%)                            |
| xAI       | Grok 4.6, Grok 4.3                                                                          |
| Meta      | Llama 4 Maverick, Scout                                                                     |
| Other     | Unified fallback pricing for uncatalogued models                                             |

> ¹ iFlytek, SenseTime and Xiaomi have not published per-token prices — the table shows estimates; cost is 0 when these models go through a subscription channel (coding / token plan / opencode), and recalibrates automatically when official pricing is published. Subscription channels align with pi-ai built-in providers (kimi-coding, zai-coding-cn, opencode, opencode-go, qwen/xiaomi token-plan regional variants), overridable via `subscriptionProviders`.

To add a model: append an entry to `MODEL_CATALOG` and map its real id in `MODEL_KEY_ALIASES` in `src/client/pricing.ts` (shared by the aggregation layer and the client renderer).

## 🔌 HTTP API

The public HTTP endpoints and field definitions are documented in source: `GET /api/billing/pricing`, `/api/billing/balance`, `/api/billing/usage-stats`, `/api/billing/subscriptions`, `/api/billing/relay-quotas` (see `src/index.ts`, `src/aggregate.ts`, `src/relay.ts`). The `usage-stats` payload carries `bySite` (relay-attributed usage distribution: `site:<origin>` / `direct:<provider>` / `unknown`) and `unpricedModels` (ids of models with no price); `relay-quotas` returns `quotas` plus `diagnostics` (per-route origin / kind classification, for "why is my relay not showing"). All endpoints accept loopback requests only (peer socket address + Host header verified).

## ⚙️ Configuration

| Field                    | Default                                  | Description                                                                                                           |
| ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `statsPath`             | unset                                   | Absolute path to a fallback `.dsh-usage-stats.json` (used when `sessionPersistence` is unavailable)                    |
| `ledgerPath`            | `<harness home>/.dsh-usage-ledger.json` | Independent durable ledger path; stores folded metrics only (no message bodies or session titles), so deletion does not erase recorded usage. The default root follows the host harness home (`DSH_HOME` env first, falling back to `~/.dsh`), so isolated environments never share ledger data (issue #52) |
| `balanceApiKeyEnv`      | `DEEPSEEK_API_KEY`                      | Credential ref for the DeepSeek balance query; only used as a fallback when llm-pi-ai has no `apiKeyEnv` for deepseek |
| `subscriptionProviders` | 11 built-ins (incl. `tencent-token-plan`) | Subscription (coding / token plan) provider id list — tokens counted, cost 0; aligned with the subscription-card recognition      |
| `routeAliases`          | not set                                | Historical route aliases (old provider route name -> current route): renamed/deleted routes relocate into their channel instead of the "unknown" bucket. Example: `{ "deepseek-official": "tencent" }` |
| `modelKeyAliases`       | not set                                | User model aliases (log model id -> billing catalog key, value must be an existing `MODEL_CATALOG` key): bind uncatalogued ids without waiting for a release. Example: `{ "hy4-preview": "hunyuan" }` |
| `monthlyBudget`         | unset                                   | Default monthly budget (CNY); sent with usage-stats as the budget bar's initial amount (user UI settings take precedence and persist locally) |
| `lowBalanceThreshold`   | `50`                                    | Low-balance alert threshold (CNY); sent with usage-stats, alerts once a day when any provider's CNY balance is below it |
| `subscriptionPlans`     | auto-detect                             | Subscription quota adapter whitelist (`{ provider, baseUrl?, region? }`); when unset, auto-detects all subscription providers from `llm-pi-ai` (queries those with a quota API, marks the rest) |
| `declaredEndpoints`     | unset                                   | Declared endpoints (`{ displayName, origin, path, fields?, windows?, raw? }`): self-declare balance/quota interfaces for providers absent from the built-in table, writing only dot-paths ("where the number is") with no expressions; the request URL is built from the matched same-origin provider's `origin` and safety bounds (single-slash absolute path, GET only, reject cross-origin redirects, response-size/timeout caps, credentials only from the matched provider's own `apiKeyEnv`) are enforced by `src/declarative.ts` |
| `reconcilePath`         | `<harness home>/.dsh-usage-reconcile.json` | Balance-delta reconcile baseline path (default root also follows `DSH_HOME` / `~/.dsh`); cross-checks the official (DeepSeek-direct only) balance change against the local ledger's official-channel cost for the day, and flags a drift above the threshold (0.3 CNY and >15%); top-ups / grants / currency changes reset the baseline instead of alerting |

## 🛠 Development

Requirements: Node.js ^22.19 || >=24, pnpm.

```sh
pnpm install
pnpm --filter @kenz1117/dsh-ui-usage-billing bundle   # builds lib/index.js and lib/client.js
npx vitest run packages/client/ui-usage-billing/tests  # unit tests
```

## 📦 Release

This package is a standalone npm package that other DeepSeek Harness hosts can install once published.

```sh
npm publish --access public
```

The host discovers the browser side automatically via the `dsh.client` declaration (`platform: web`) and the `exports["./client"]` bundle in `package.json` — no registry registration needed.

## 🔐 Permissions & Compatibility (DSH STORE)

- **Permission level: high**: reads durable session logs (files), calls official multi-vendor / subscription / balance / pricing APIs (network), reads `apiKeyEnv` via the credentials seam (credentials), writes the ledger and stats snapshot under the harness home (`DSH_HOME` / `~/.dsh`) (persistent state); **no** command execution / shell.
- **Update channel: `user-reviewed`**: with file / network / credential capabilities, DSH STORE requires local manual confirmation on every install; review the repo, pinned commit, lifecycle scripts, and impact scope before installing.
- **Compatibility**: the preview line (npm `latest`/`alpha`, 1.2.x — kept above the stable line to kill the version inversion) targets DSH `0.1.2` ~ `0.1.6` (host `latest` currently at 0.1.5-rc.2, verified on real hardware; 0.1.6-alpha.1/2 declared compatible — zero code changes in the plugin's dependency packages); the stable line (npm `stable`, 1.1.x, **frozen**, final v1.1.17) targets legacy hosts `0.1.0-rc.8` ~ `0.1.1-rc.2`. Per-version declarations live in `package.json` under `dsh.compatibility`; the two-line mapping and monitoring mechanism are documented in [COMPATIBILITY.md](COMPATIBILITY.md). Node.js `^22.19.0 || >=24.0.0`.
- **Lifecycle**: no `preinstall` / `install` / `postinstall` / `prepare` (ready on install).
- **No impersonation**: adds only its own entry id `ui-usage-billing`; `@deepseek-ai/dsh-*` packages are `peerDependencies` only (no reinstall / replace / shadowing of official components); the package uses the third-party namespace `@kenz1117/*`.
- **Build artifacts**: runtime files `lib/*` and `cordis.patch.yml` are committed at the pinned commit and declared in `files`.
- **Source anchor**: sources are locked to a pinned commit on the GitHub default branch and traceable. DSH STORE automation re-reads the default-branch HEAD roughly every 8 hours as the new pinned commit and decides re-review by SemVer change.

## 🤖 Model Experience

None. This plugin is a pure UI surface: it registers no tools, injects no system prompt, writes no model-visible events to the session log, and touches no session KV cache; usage statistics are aggregated by the server from existing session logs, whose content is owned by other packages.

## ⚠️ Known Limitations and Deferred Work

- **Balance queries cover DeepSeek / Moonshot (Kimi) / StepFun / SiliconFlow / xAI / Zhipu GLM (Z.ai CN region) / Tencent Cloud TokenHub (token-plan quota)**: the first six use a standard Bearer API key; Tencent Cloud uses the cloud-API key pair (`<SecretId>:<SecretKey>`, TC3-signed management API). Other providers expose no public balance API or need non-Bearer auth (Xiaomi MiMo via console Cookie, SenseTime via AccessKey signing, MiniMax/Doubao via quota or AK/SK), so they currently show "not configured"; the extension point is `src/balance.ts` (add a querier per provider balance API).
- **Relay quota depends on upstream private schemas**: New API / Sub2API interface fields are not public, so an unreadable station is labeled "no quota" rather than fabricating an amount; if a station's response fields differ, extend the parsers in `src/relay.ts`. An "unknown route" means that route no longer exists in the current provider config (renamed / deleted); historical call data is not lost — re-adding the same-named route restores attribution automatically.
- **Overspend notifications rely on the browser Notification API**: when permission is denied or the platform lacks support, only the in-UI red-pulse fallback remains — no host-level notification channel; notifications are capped at once per day.
- **Session rows are not navigable**: clicking a session row does not open that session (cross-plugin navigation needs a host session-selection channel); sessions are capped at 100 rows and the panel shows the top 20.
- **Cost is a catalog estimate**: models without published per-token pricing (iFlytek, SenseTime, Xiaomi) use estimates (feature-list footnote ¹); official billing is authoritative.
- **The ledger starts at its first successful aggregation**: sessions permanently deleted before the upgrade and absent from the old snapshot cannot be recovered. Manually deleting `.dsh-usage-ledger.json` and its `.bak` clears independently retained history. Only calls successfully observed by this plugin are retained.

## ❤️ Contributors

- [@ciphoo](https://github.com/ciphoo) — MiniMax CN Token Plan quota support (PR #5), `minimax-cn` subscription key wiring (PR #12), a concurrent-ledger-write `MoveFileExW EPERM` fix on Windows (PR #11)
- [@fabulousyuann-tech](https://github.com/fabulousyuann-tech) — durable ledger that retains usage after session deletion (PR #8)
- [@hi-fangj](https://github.com/hi-fangj) — hover tooltip with the exact per-day token breakdown on the token daily chart (PR #21), the live-cost capsule toggle (PR #22), the per-model view and legend focus for the token daily chart (PR #23), and the per-model comparison curve in the perf panel (PR #24)

## 📄 License

[MIT](LICENSE) © 2026 KenZ (kenz1117)

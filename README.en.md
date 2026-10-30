<div align="center">
  <img src="screenshots/demo.png" alt="dsh-ui-usage-billing — See every cent of your model spend" width="100%">

  <p><strong>Real usage · Historical ledger · Peak/off-peak pricing · Subscription quotas</strong></p>

  <p>
    <a href="https://github.com/kenz1117/dsh-ui-usage-billing/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/kenz1117/dsh-ui-usage-billing/actions/workflows/ci.yml/badge.svg"></a>
    <a href="https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing"><img alt="npm version" src="https://img.shields.io/npm/v/@kenz1117/dsh-ui-usage-billing?logo=npm"></a>
    <a href="https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@kenz1117/dsh-ui-usage-billing?logo=npm"></a>
    <a href="https://github.com/kenz1117/dsh-ui-usage-billing/blob/main/COMPATIBILITY.md"><img alt="DSH compat" src="https://img.shields.io/badge/DSH-0.1.2_%7E_0.2.1--rc.4-blue"></a>
    <a href="https://github.com/kenz1117/dsh-ui-usage-billing/blob/main/LICENSE"><img alt="License MIT" src="https://img.shields.io/github/license/kenz1117/dsh-ui-usage-billing"></a>
  </p>

  [English](README.en.md) · [中文](README.md) · [Quick start](#-quick-start) · [Compatibility](COMPATIBILITY.md)
</div>

---

### Demo GIF

The eight dashboard tabs in turn (Overview / Queue / Billing / Usage / Trends / Agents / Rates / Settings):

![Demo](screenshots/demo.gif)

## ✨ Why this plugin

Most billing plugins stop at "token count × unit price". dsh-ui-usage-billing turns billing into a **reconcilable ledger pipeline** — real usage, live prices, and peak/off-peak awareness that follows the model.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Real usage you can reconcile</h3>
      <p>Usage is aggregated live from persisted session logs — never fabricated (an empty snapshot shows until real data arrives); daily official-balance deltas are cross-checked against the local ledger, and deviations beyond the threshold prompt a review — a bill that survives scrutiny.</p>
    </td>
    <td width="50%" valign="top">
      <h3>Live prices, history never rewritten</h3>
      <p>A live models.dev catalog + a built-in catalog of 241 models across 25 vendors + user-defined prices in the settings panel (bindable per relay origin) mean new models never wait for a release; DeepSeek time-of-day prices are <strong>segmented by official change boundaries</strong> (base price before 08-17, weekend peak hours 08-17~08-23, weekend all-day off-peak from 08-23) and later price changes never rewrite old bills.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Peak/off-peak aware, alerts follow the model</h3>
      <p>The billing channel is detected from the current session's model: DeepSeek metered uses time-of-day prices (weekday 9-12 / 14-18 peak ×2, weekend all-day off-peak), Zhipu Coding Plan uses credit windows (weekday 14-18 peak at full rate, off-peak at <strong>50% of base credits</strong>) — the channel layer is extensible for more providers; a popover / system notification fires automatically before each switch, and only sessions whose current model actually involves peak/off-peak get alerted or show the tier section — no watching the clock.</p>
    </td>
    <td width="50%" valign="top">
      <h3>Subscriptions, balances and quotas on one screen</h3>
      <p>7 official provider balances (DeepSeek / Kimi / Zhipu GLM / Tencent Cloud TokenHub / …), Coding Plan quotas, relay-station rolling quota windows, self-declared endpoints, plus balance-delta reconciliation — what the plan deducted and what the balance deducted, verifiable side by side.</p>
    </td>
  </tr>
</table>

### More capability, one place

| Cost attribution | Automation & entry points |
| --- | --- |
| Drill down through cache hits, official / third-party spend, workspaces, Sessions and relays; agent chains, TTFT, generation speed and cost spikes stay traceable. | Queue composer drafts or JSON batches for off-peak hours; jump from a Session row to the host, or open the dashboard with `/usage`. |
| **Pricing & models** | **Experience & privacy** |
| Uncatalogued models are explicit, with aliases and custom prices to fill the gaps; the optional read-only `usage_stats` tool is off by default. | Independent Chinese / English and ¥ / $ / € controls; no chart library or external CDN, and no system-prompt injection by default. |

## 📊 Dashboard

### Sidebar and live feedback

- **Trigger card**: today / week / month headline, 7-day trend and daily gauge; choose a full card, compact icon or hidden entry, with a quick look on hover.
- **Cost bar and alerts**: live turn / Session cost, model-aware peak and quota warnings, plus optional system notifications for tier switches and Session completion.

![Sidebar trigger card: today's spend, delta badge and mini-trend](screenshots/sidebar.png)

### Eight sections, one consistent ledger

Overview / Queue / Billing / Usage / Trends / Agents / Rates / Settings. The hero and KPIs cover today, 7 days, week, month, all time and custom dates; trends, heatmaps, budgets, rates and searchable settings all read the same real ledger.

![Overview: range-based hero, year/today/month projection, KPIs and usage heatmap](screenshots/overview.png)

<details>
<summary><strong>Queue, agent and settings details</strong></summary>

- **Queue**: price-band countdown and queued / running / needs-review / completed tasks; up to 50 JSON items per batch, validated atomically. Locks and leases prevent duplicate submission across instances sharing one `DSH_HOME`.
- **Agents**: a parent conversation → sub-agent tree with own cost and chain total including every descendant.
- **Settings**: full-text search, global and per-model budgets, peak alerts, custom prices, native host settings and plugin information; a hidden sidebar entry can be restored from host Settings.

</details>

## 💰 Billing engine

- **Channel attribution**: official, direct, relay and unknown routes stay separate; route and model aliases repair historical attribution.
- **Time-based pricing**: live models.dev data, 241 built-in models across 25 vendors, segmented peak pricing and live FX; later changes never rewrite history.
- **Real-cost overrides**: set relay-specific prices for the same model and fill gaps for uncatalogued models.
- **Budget controls**: global and per-model budgets, 50 / 80 / 100% alerts, balance warnings and last-40-turn spike attribution.

![Rates: model rate table (peak/off-peak split and live rate)](screenshots/pricing.png)

## 🔌 Subscriptions & balance

- **Subscription quotas**: detect Kimi, Z.ai, OpenCode Go, MiniMax, Claude, CommandCode and more, with remaining quota and reset times; subscription-channel model cost is 0.
- **Official balances**: DeepSeek, Kimi, StepFun, SiliconFlow, xAI, Zhipu GLM and Tencent Cloud TokenHub, with days remaining estimated from the last 7 days.
- **Relays and reconciliation**: merge keys by site, read New API / Sub2API rolling quotas, and cross-check custom endpoints or official balance deltas against the ledger.

![Billing: provider billing & subscriptions (balance, plan quota, model usage) and session detail](screenshots/billing.png)

> Detection, endpoints, credentials and troubleshooting for every channel live in the [adapter matrix](docs/adapters.md).

## 📈 Usage visualizations

- **Drill down**: inspect Sessions, projects, workspaces and sites; month / half-year / year heatmaps show cost or token intensity.
- **Analyze**: daily tokens by structure or model, tool-call ranking, TTFT / P50 / P90, generation speed and cost composition.
- **Trend**: 7 / 30-day cost and calls, the last 40 turns, peak/off-peak share and off-peak savings.
- **Export**: daily / Session / site CSV, daily-token CSV and full JSON; no chart library or external CDN.

![Trends: daily cost trend, per-turn costs and peak/off-peak share](screenshots/trends.png)

## 🛡️ Robustness & privacy

- **Real aggregation**: incremental Session-log reads, per-session corruption tolerance, snapshots and a durable ledger; uncatalogued and estimated prices stay explicit.
- **Read-only by default**: no system-prompt injection, Session creation or Prompt submission; only explicit enqueueing writes a new Session, still under host permissions.
- **Loopback security**: peer-socket and Host checks on HTTP, plus Origin, Content-Type and body limits on writes; CSV formula-injection protection.
- **Complete experience**: independent language and three-currency preferences, keyboard focus, and provider health expressed through shape, color and text.

## 🚀 Quick start

One codebase currently supports DSH `0.1.2-alpha.1` through `0.2.2-alpha.2`. Stable and preview releases share the same compatibility matrix: stable releases use npm `latest`, while previews use `alpha`. npm `latest` currently points to the stable `1.8.1` release, while `alpha` points to `1.8.1-alpha.2`.

`dsh plugin add` requires an explicit `--profile`. Pinning an exact version is recommended so a package manager's release cooldown cannot resolve a different version. Install the current stable release with:

```sh
dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@1.8.1
```

Default installations can also use `@latest`. Check the host with `dsh --version` or `npm ls -g @deepseek-ai/dsh`.

Alternatively, add it to the host `cordis.patch.yml` by hand:

```yaml
- insert:
    - id: ui-usage-billing
      name: '@kenz1117/dsh-ui-usage-billing'
```

After the host starts, the billing entry appears above the sidebar Settings. No extra configuration is needed; when `sessionPersistence` is available it aggregates real usage automatically.

### 🛒 Install from the DSH Community Market

This plugin also publishes a catalog entry using the Market's **Path A standard source**. Paste the manifest URL below into *Settings → Plugins → Plugin Store → Source management → Add source*, then browse and install with one click:

```
https://kenz1117.github.io/dsh-ui-usage-billing/catalog-source.json
```

Market-hosted installs resolve an exact registry release from npm (the Host resolves the install target from npm `latest`; the version listed in the catalog is display-only). The catalog files live in `catalog/` in this repository and are validated in CI before being published by GitHub Pages.

## 📚 Advanced reference

<details>
<summary><strong>Architecture, billing details, model catalog, HTTP API, configuration, development, releases, permissions and limitations</strong></summary>

## ⚙️ How it works

The plugin has a server side and a browser side:

```
Browser                                   Server (Node)
  │                                        │
  ├─ GET /api/billing/usage-stats ────────▶ ├─ sessionPersistence walks persisted session logs
  │                                        ├─ attributes a call to its preceding request/header model
  │                                        ├─ buckets tokens by cache hit / miss
  │                                        └─ estimates cost (CNY) from the live rate table
  ├─ GET /api/billing/pricing ────────────▶ ├─ models.dev model prices + Tencent Finance FX (tiered fallback)
  ├─ GET /api/billing/balance ────────────▶ ├─ DeepSeek official balance API (credentials seam)
  ├─ llm.models health probe ─────────────▶ └─ returns aggregated stats JSON
  └─ renders the dashboard
```

- **Server** (`src/index.ts`): injects `webServer`, `sessionPersistence` and `credentials`, and registers loopback endpoints for usage, pricing, balances, subscriptions, relays, notification claims, the tool switch and `GET/POST /api/billing/task-queue`. The aggregator incrementally folds Session logs into a durable usage ledger. The queue probes optional `sessionController` / `workspaceRegistry` capabilities through `ctx.get()` rather than startup injection, so missing capabilities never block the host or dashboard.
- **Browser** (`src/client/`): requests the endpoints above to render the dashboard and probes each provider connection via `llm.models`. Until real data arrives it shows an all-zero empty snapshot, never fabricated samples.

## 💡 Billing details

The rate table (`src/client/pricing.ts`) stores each model in its **native currency**: domestic providers enter CNY directly, overseas providers enter USD. Cost is computed and displayed in CNY uniformly — USD models convert via the **live rate**, domestic models never pass through a rate. At startup the server fetches the live rate and model prices (`src/pricing-fetch.ts`): USD→CNY prefers the Tencent Finance quote (keyless, reachable in China), falling back to open.er-api, then the keyless AllRatesToday endpoint (ECB reference rates, [Exchange rates by AllRatesToday](https://allratestoday.com)), then the built-in default; it then refreshes every 6 hours, and the rate-table modal shows a "today's rate" marker plus live / built-in badge. The **display currency follows the user**: switching ¥ / $ converts each per-1M-token unit price via `convertUnitPrice` at the live rate (falling back to the native currency when the rate is unavailable).

```
cost (CNY) = (missInput × p_input + cacheHit × p_cacheHit + output × p_output) / 10⁶
           —— prices in native currency; USD models convert at the live USD → CNY rate
```

`input` in the stats is total input (cacheHit + cacheMiss); estimation splits it into hit / miss to avoid double counting. Models with two-band billing are mixed by `DEFAULT_PEAK_SHARE` (default 0.5); weekends (Beijing Sat/Sun) are charged at the off-peak rate all day.

**Month-to-date forecast**: month-to-date spend + last-7-calendar-day pace × the days still left in the month. Only the days that have not happened yet are extrapolated, so a quiet recent week never inflates the number — earlier versions averaged over the month's *recorded* days and multiplied by the whole month length, which inflated sparsely used months several times over.

### Supported models (2026-10 lineup, OpenAI-compatible series, 241 models)

The full catalog lives in the Rates tab and in `BUILTIN_MODEL_CATALOG` of `src/builtin-catalog.ts` (240 active + 1 retired model kept for historical repricing); representative models per vendor below.

| Provider  | Representatives                                        |
| -------- | -------------------------------------------- |
| DeepSeek | V4.1 Flash, V4 Pro (3 models; priced per official change boundary: base tier → peak/off-peak v1 → weekend off-peak) |
| Zhipu AI  | GLM-5.3, GLM-5.2 (17 models)                     |
| Aliyun    | Qwen3.8 Max, Qwen3-Coder 480B (27 models)        |
| Doubao    | Doubao Seed-2.1 Pro, Doubao Seed-2.0 Pro (13 models) |
| Moonshot  | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3, Kimi K2.7 Code (18 models) |
| Xiaomi    | MiMo V2.6 Pro (6 models)                         |
| MiniMax   | MiniMax-M3, MiniMax-M2.7 (8 models)              |
| Unisound  | U2 Flash, Unisound U2 (3 models)                 |
| Baidu     | ERNIE-5.1, ERNIE-4.5 300B (2 models)             |
| Tencent   | Hunyuan Hy3, Hunyuan T1 (3 models)                       |
| Anthropic | Claude Opus 5, Claude Sonnet 5 (14 models)    |
| Mistral AI | Mistral Large 3, Mistral Small 4 (30 models)     |
| Cohere    | Command A, Command R (7 models)                 |
| OpenAI    | GPT-6 Astra, GPT-5.6 Sol / Terra / Luna (38 models) |
| Google    | Gemini 3.1 Pro, Gemini 3.6 Flash (25 models)      |
| xAI       | Grok 4.7, Grok 4.20 (8 models)                     |
| Meta      | Llama 4 Maverick, Muse Spark 1.3 (8 models)                     |
| Meituan   | LongCat 2.0 (estimated)                             |
| ModelBest | MiniCPM-V 4.5 (estimated)                           |
| Xiaohongshu | Dots3-Note Preview (estimated)                      |
| 01.AI     | Yi-Lightning                                  |
| StepFun   | Step 3.7 Flash, Step 5 Preview (3 models)                                |
| iFlytek   | Spark 4.0 Ultra (plan-based)¹                       |
| SenseTime | SenseNova 6.5 (beta)¹                         |
| Baichuan  | Baichuan M3-Plus                              |
| Other     | Unified fallback pricing for uncatalogued models (cost 0)                      |

> ¹ iFlytek and SenseTime have not published per-token prices — the table shows estimates; cost is 0 when these models go through a subscription channel (coding / token plan / opencode), and recalibrates automatically when official pricing is published. Subscription channels align with pi-ai built-in providers (kimi-coding, zai-coding-cn, opencode, opencode-go, qwen/xiaomi token-plan regional variants), overridable via `subscriptionProviders`.

To add a model: append an entry to `BUILTIN_MODEL_CATALOG` in `src/builtin-catalog.ts` (key aliases live in `BUILTIN_MODEL_KEY_ALIASES` in the same file; the catalog is built only into the node half and served to the client from the host via `/api/billing/pricing`).

## 🔌 HTTP API

The public HTTP endpoints and field definitions are documented in source, including usage, pricing, balances, subscriptions, relay quotas, `GET/POST /api/billing/task-queue` and `GET /api/billing/task-queue-summary` (see `src/index.ts`, `src/aggregate.ts`, `src/relay.ts`, `src/routes/task-queue.ts`). The queue returns host capability, workspaces, official models and durable tasks; mutations are `enqueue` / `enqueueMany`, remove-not-started and clear-finished. The summary returns only the price-band state and queued count, never Prompts. All endpoints accept loopback requests only; queue writes additionally require a loopback Origin, JSON Content-Type and a body no larger than 10 MiB.

## ⚙️ Configuration

| Field                    | Default                                  | Description                                                                                                           |
| ----------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `statsPath`             | unset                                   | Absolute path to a fallback `.dsh-usage-stats.json` (used when `sessionPersistence` is unavailable)                    |
| `ledgerPath`            | `<harness home>/.dsh-usage-ledger.json` | Independent durable ledger path; stores folded metrics only (no message bodies or session titles), so deletion does not erase recorded usage. The default root follows the host harness home (`DSH_HOME` env first, falling back to `~/.dsh`), so isolated environments never share ledger data (issue #52) |
| `taskQueuePath`         | `<harness home>/.dsh-usage-task-queue.json` | Absolute off-peak queue path; stores explicitly submitted Prompts, workspaces, models and execution state. Writes are atomic with mode 0600 and a `.bak` backup; separate `DSH_HOME` environments never share a queue |
| `balanceApiKeyEnv`      | `DEEPSEEK_API_KEY`                      | Credential ref for the DeepSeek balance query; only used as a fallback when llm-pi-ai has no `apiKeyEnv` for deepseek |
| `subscriptionProviders` | built-in channel list (incl. `tencent-token-plan`) | Subscription (coding / token plan) provider id list — tokens counted, cost 0; aligned with the subscription-card recognition. Note it **replaces** the built-in list rather than appending to it — when customizing, list the built-in entries too, otherwise removed subscription channels fall back to pay-as-you-go |
| `routeAliases`          | not set                                | Historical route aliases (old provider route name -> current route): renamed/deleted routes relocate into their channel instead of the "unknown" bucket. Example: `{ "deepseek-official": "tencent" }` |
| `modelKeyAliases`       | not set                                | User model aliases (log model id -> billing catalog key, value must be an existing `MODEL_CATALOG` key): bind uncatalogued ids without waiting for a release. Example: `{ "hy4-preview": "hunyuan" }` |
| `monthlyBudget`         | unset                                   | Default monthly budget (CNY); sent with usage-stats as the budget bar's initial amount (user UI settings take precedence and persist locally) |
| `lowBalanceThreshold`   | `50`                                    | Low-balance alert threshold (CNY); sent with usage-stats, alerts once a day when any provider's CNY balance is below it |
| `trustedHosts`          | unset                                   | Extra host names allowed through the Host-header check when DSH runs behind a reverse proxy (e.g. `['llm.example.com']`); **empty by default = behaviour identical to previous releases**. Consulted only after the peer-socket loopback check has passed, so it widens only the second, defence-in-depth layer; exact host match, case- and port-insensitive, with no suffix or wildcard semantics |
| `subscriptionPlans`     | auto-detect                             | Subscription quota adapter whitelist (`{ provider, baseUrl?, region? }`); when unset, auto-detects all subscription providers from `llm-pi-ai` (queries those with a quota API, marks the rest) |
| `declaredEndpoints`     | unset                                   | Declared endpoints (`{ displayName, origin, path, fields?, windows?, raw? }`): self-declare balance/quota interfaces for providers absent from the built-in table, writing only dot-paths ("where the number is") with no expressions; the request URL is built from the matched same-origin provider's `origin` and safety bounds (single-slash absolute path, GET only, reject cross-origin redirects, response-size/timeout caps, credentials only from the matched provider's own `apiKeyEnv`) are enforced by `src/declarative.ts` |
| `reconcilePath`         | `<harness home>/.dsh-usage-reconcile.json` | Balance-delta reconcile baseline path (default root also follows `DSH_HOME` / `~/.dsh`); cross-checks the official (DeepSeek-direct only) balance change against the local ledger's official-channel cost for the day, and flags a drift above the threshold (0.3 CNY and >15%); top-ups / grants / currency changes reset the baseline instead of alerting |
| `searchCallEstimateCny` | `0.02`                                  | Per-call cost estimate for web-search requests (`web/deepseek-search-llm-request`, which log no usage events) in CNY; set to 0 to disable the estimate (calls still counted, not billed) |

## 🛠 Development

Requirements: Node.js ^22.19 || >=24, pnpm.

```sh
pnpm install
pnpm test          # unit + API-contract mock + UI component tests (vitest + jsdom)
pnpm lint          # discipline guards: types / logging / empty catch / CSS↔TSX class parity
pnpm run build     # tsc -b && tsdown, produces lib/index.js and lib/client.js
```

For on-machine debugging: `dsh plugin --profile web add "link:<absolute path to this repo>"` points the host at this working tree — afterwards edit code → `pnpm run build` → restart the host, no npm publish needed (see [docs/DEV-MODE.md](docs/DEV-MODE.md) for the loading chain). HTTP-contract e2e: `pnpm test:e2e` (needs a local dev host running). Engineering conventions (two-line release strategy, host-upgrade SOP, acceptance checklists) live in [AGENTS.md](AGENTS.md).

## 📦 Release

This standalone npm package maintains one `main` codebase. Stable releases use non-prerelease versions and npm `latest`; previews use prerelease versions and npm `alpha`. npm `latest` currently points to the stable `1.8.1` release, while `alpha` points to `1.8.1-alpha.2`; see [COMPATIBILITY.md](COMPATIBILITY.md).

```sh
pnpm test && pnpm run build   # full tests + build before release
npm publish --access public
npm dist-tag add @kenz1117/dsh-ui-usage-billing@<version> alpha   # preview
npm dist-tag add @kenz1117/dsh-ui-usage-billing@<version> latest  # stable
```

The host discovers the browser side automatically via the `dsh.client` declaration (`platform: web`) and the `exports["./client"]` bundle in `package.json` — no registry registration needed. The compatibility matrix is declared per version from actual verification (`dsh.compatibility.dshReleases`); run `node scripts/check-compat.mjs` before and after publishing to re-verify.

## 🔐 Permissions & Compatibility (DSH STORE)

- **Permission level: high**: reads durable Session logs, calls vendor / subscription / balance / pricing APIs, reads `apiKeyEnv` through the credentials seam, and writes the ledger, snapshots and task queue under the harness home. The plugin itself has **no** command-execution / shell capability; only explicit enqueueing creates a host Session and submits a Prompt, while Agent tools remain governed by the host's existing permissions and approvals.
- **Update channel: `user-reviewed`**: with file / network / credential capabilities, DSH STORE requires local manual confirmation on every install; review the repo, pinned commit, lifecycle scripts, and impact scope before installing.
- **Compatibility**: stable and preview releases from the current `main` share one matrix covering DSH `0.1.2-alpha.1` through `0.2.2-alpha.2`, with 31 per-version declarations. The current stable release is `1.8.1` (npm `latest`), and the current preview is `1.8.1-alpha.2` (npm `alpha`). Release channels and monitoring are documented in [COMPATIBILITY.md](COMPATIBILITY.md). Node.js `^22.19.0 || >=24.0.0`.
- **Lifecycle**: no `preinstall` / `install` / `postinstall` / `prepare` (ready on install).
- **No impersonation**: adds only its own entry id `ui-usage-billing`; `@deepseek-ai/dsh-*` packages are `peerDependencies` only (no reinstall / replace / shadowing of official components); the package uses the third-party namespace `@kenz1117/*`.
- **Build artifacts**: runtime files `lib/*` and `cordis.patch.yml` are committed at the pinned commit and declared in `files`.
- **Source anchor**: sources are locked to a pinned commit on the GitHub default branch and traceable. DSH STORE automation re-reads the default-branch HEAD roughly every 8 hours as the new pinned commit and decides re-review by SemVer change.

## 🤖 Model Experience

**None by default.** The plugin exposes no tool to the model out of the box: the "inject usage query" setting is off by default, and while it is off the model can neither see a tool nor read any data from this plugin.

After the user explicitly enables that setting, exactly **one** read-only tool is registered:

| Tool | Parameters | Behaviour |
| --- | --- | --- |
| `usage_stats` | `range`: `today` / `month` / `session` / `all` / `bySite` / `relay` | Queries the usage and estimated cost this plugin already aggregated (CNY, estimated from the official price catalog — not a bill); `session` requires an agent session context |

Boundaries: the tool reads only this plugin's own aggregates — never Session bodies or Prompts — and never writes back to the log or touches Session KV cache. The plugin injects no system prompt. The off-peak queue is not a model tool: it is a separate, explicitly authorized action whose Prompt becomes a user message in a new Session, so it must not be confused with this read-only tool boundary. The tool consumes context on every request, which is why it stays off by default.

## ⚠️ Known Limitations and Deferred Work

- **The off-peak queue is still a preview**: it accepts only time-of-day models on the host's built-in `deepseek-official` route; relays and custom routes are excluded. There is no automatic pause, cancellation or retry. After host shutdown, a dropped result stream or lease expiry, the task becomes "Needs review"; open its Session and decide manually whether to enqueue a new task.
- **Balance queries cover DeepSeek / Moonshot (Kimi) / StepFun / SiliconFlow / xAI / Zhipu GLM (Z.ai CN region) / Tencent Cloud TokenHub (token-plan quota)**: the first six use a standard Bearer API key; Tencent Cloud uses the cloud-API key pair (`<SecretId>:<SecretKey>`, TC3-signed management API). Other providers expose no public balance API or need non-Bearer auth (Xiaomi MiMo via console Cookie, SenseTime via AccessKey signing, MiniMax/Doubao via quota or AK/SK), so they currently show "not configured"; the extension point is `src/balance.ts` (add a querier per provider balance API).
- **Relay quota depends on upstream private schemas**: New API / Sub2API interface fields are not public, so an unreadable station is labeled "no quota" rather than fabricating an amount; if a station's response fields differ, extend the parsers in `src/relay.ts`. An "unknown route" means that route exists neither in the current provider config nor in the host llm registry (deleted config, logs older than the install, …); historical call data is not lost — re-adding the same-named route restores attribution automatically. Cost in the unknown-route bucket is always 0 (issue #82): the spending party cannot be verified — same posture as uncatalogued models and subscription channels — while tokens are still counted, and the panel shows "—" for the group cost with an explanatory note. Channels registered by another plugin through `ctx.llm.registerAdapter` (e.g. CommandCode) are **not** unknown routes: the plugin discovers them from the host llm registry and bills them in the `direct:<provider>` bucket at the model's official catalog price (issue #91); the registry is read through `ctx.get('llm')` (no `inject` requirement), and an unreadable or empty registry warns once (panel numbers and the unknown policy are unchanged) so this class of failure is never silent again.
- **Overspend notifications rely on the browser Notification API**: when permission is denied or the platform lacks support, only the in-UI red-pulse fallback remains — no host-level notification channel; notifications are capped at once per day.
- **Session-row navigation depends on a host channel**: clicking a session title in the panel opens that conversation in the host (both generations of the host's session-selection channel are probed); on very old hosts, or when the session was deleted / is not in the current session list, the UI shows a readable notice instead of silently doing nothing. The panel shows the top 20 by default and the "view all" full-screen viewer is capped at 100 rows.
- **Cost is a catalog estimate**: models without published per-token pricing (iFlytek, SenseTime, Xiaomi) use estimates (feature-list footnote ¹); official billing is authoritative.
- **The ledger starts at its first successful aggregation**: sessions permanently deleted before the upgrade and absent from the old snapshot cannot be recovered. Manually deleting `.dsh-usage-ledger.json` and its `.bak` clears independently retained history. Only calls successfully observed by this plugin are retained.

</details>

## ❤️ Contributors

<p align="center">
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=kenz1117/dsh-ui-usage-billing" alt="DSH Usage Billing contributors" />
  </a>
</p>

<details>
<summary>View contribution notes</summary>

- [@lucagiftzek](https://github.com/lucagiftzek) — rate-table CSS polish (PR #59), `trustedHosts` reverse-proxy support (PR #60), currency preference persistence (PR #58), rate-table search (PR #67), peak/off-peak indicator dots with pin-to-composer (PR #68), the EUR display currency with language decoupling (PR #70), the first pricing fetch moved ahead of the warmup replay (PR #55), evidence-based models.dev listings (PR #56), and hardcoded UI strings routed through locale dictionaries (PR #61)
- [@hwangjunjie](https://github.com/hwangjunjie) — Tencent Cloud TokenHub / Token Plan subscription quota adaptation (`src/tc3.ts`), provider-first channel grouping with gateway badges, the `routeAliases` / `modelKeyAliases` config (PR #35), and subscription badges decided per channel on the day × model × site cells (PR #83)
- [@ciphoo](https://github.com/ciphoo) — MiniMax CN Token Plan quota support (PR #5), `minimax-cn` subscription key wiring (PR #12), a concurrent-ledger-write `MoveFileExW EPERM` fix on Windows (PR #11)
- [@fabulousyuann-tech](https://github.com/fabulousyuann-tech) — durable ledger that retains usage after session deletion (PR #8)
- [@hi-fangj](https://github.com/hi-fangj) — hover tooltip with the exact per-day token breakdown on the token daily chart (PR #21), the live-cost capsule toggle (PR #22), the per-model view and legend focus for the token daily chart (PR #23), and the per-model comparison curve in the perf panel (PR #24)
- [@aizhimoran](https://github.com/aizhimoran) — peak/off-peak tiering for Chinese statutory holidays and shifted workdays: DeepSeek usage-based pricing bills holidays entirely at the off-peak rate (official 2026-09-19), with a 10-day countdown scan window (issue #73, PR #74)
- [@kidbird](https://github.com/kidbird) — wired up the international Z.ai Coding Plan (`zai-coding`) subscription quota, pinning each route to its own region with split key fields (PR #79)
- [@yuxu4468-hash](https://github.com/yuxu4468-hash) — cataloging for bare relay-exposed model ids: Grok 4.5/4.6, GPT-5.5, GPT-6.1 Sol, Claude Opus 4.7/4.8 and Fable 5 (PR #87), plus the GPT image models `gpt-image-2` / `gpt-image-2.5-sunburst` (PR #88)
- [@JinruiWang](https://github.com/JinruiWang) — workbuddy adapter channel pricing and the fold-before-live-catalog dual-caliber fix: the known-channel list, three lazy-reprice gates (ledger, cache hit, incremental cursor) and the stable-stamp reproduction test (issue #90)
- [@gitfangj](https://github.com/gitfangj) — `sync.sh` brace-variable compatibility under the macOS default bash 3.2

</details>

## 📄 License

[MIT](LICENSE) © 2026 KenZ (kenz1117)

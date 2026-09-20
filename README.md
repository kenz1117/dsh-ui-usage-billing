<div align="center">

# dsh-ui-usage-billing

<p align="center">把每一分模型开销，看得清清楚楚。</p>

<p align="center">
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/kenz1117/dsh-ui-usage-billing/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/kenz1117/dsh-ui-usage-billing?logo=github"></a>
  <a href="https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing"><img alt="npm version" src="https://img.shields.io/npm/v/@kenz1117/dsh-ui-usage-billing?logo=npm"></a>
  <a href="https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@kenz1117/dsh-ui-usage-billing?logo=npm"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/blob/main/LICENSE"><img alt="License MIT" src="https://img.shields.io/github/license/kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing"><img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/kenz1117/dsh-ui-usage-billing?logo=github"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/graphs/contributors"><img alt="GitHub contributors" src="https://img.shields.io/github/contributors/kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://awesome-dsh-plugin.com"><img alt="Awesome DSH Plugin" src="https://awesome-dsh-plugin.com/badge.svg"></a>
</p>

[中文](README.md) · [English](README.en.md)

</div>

---

<div align="center">
  <img src="screenshots/demo.png" alt="dsh-ui-usage-billing — 计费仪表盘总览" width="80%">
</div>

### 演示动图

![演示](screenshots/demo.gif)

## ✨ 为什么选它

市面计费插件大多停在「token 数 × 单价」。dsh-ui-usage-billing 把计费做成一条**可对账的账本链路**——用量是真的、价格是活的、峰谷跟着模型走。

### 账是真的，还能对账
用量从持久化会话日志实时聚合，绝不伪造样本（数据到达前显示空快照）；官方余额当日变动与本地账本交叉对账，偏差超阈值主动提示核对——账单经得起质疑。

### 价格是活的，历史不重算
models.dev 实时目录 + 内置 24 厂商 77 款模型 + 设置面板自定义单价（可按中转站绑定同模型不同价），新模型无需等发版；DeepSeek 分时价按官方变更节点**分段计价**（8-17 前基础价、8-17~8-23 周末计峰、8-23 起周末全谷），价格调整永不回写旧账。

### 峰谷全感知，提醒跟着模型走
计费通道按当前会话使用的模型自动识别：DeepSeek 按量走分时价（工作日 9-12 / 14-18 高峰 ×2、周末全天低谷），智谱 Coding Plan 走积分峰谷（工作日 14-18 高峰全额、非高峰**积分 5 折**），通道层可扩展、更多厂商逐步接入；切档前弹窗 / 系统通知自动提醒，且只有当前模型真正涉及峰谷才会提醒、费用条才显示档位——不用你盯时间表。

### 订阅、余额、额度一屏闭环
DeepSeek / Kimi / 智谱 GLM / 腾讯云 TokenHub 等 7 家官方余额、Coding Plan 额度、中转站滚动额度窗口、自声明端点，再加余额差对账——订阅扣的和余额扣的同屏可查、交叉验证。

### 还有这些同类少见的细节

- 不止「花了多少」还答「花在哪」：输入按缓存命中 / 未命中分桶（含 reasoning）、官方 / 三方分桶、按工作区 / 会话 / 中转站下钻、每轮费用突增归因。
- 性能面板：各模型首字延时（TTFT）均值 / P50 / P90 与生成速度，同类少有。
- 未收录模型显著标注「未收录」、绝不静默计 0；目录外模型配一条别名即完成识别与计价。
- 可选的 `usage_stats` 工具让模型直接回答「今天花了多少」「哪个站点用得最多」。
- 纯 UI surface：不注册工具、不注入系统提示、不写模型可见事件。
- 中文 / English、¥ / ≈$ 双语双币切换；无图表库、无外部 CDN、离线自包含。

## 📊 仪表盘

- **侧边栏触发卡**：设置按钮上方常驻本月费用主数字 + 近 7 天 sparkline 迷你趋势，副行「今日 / 本周」；折叠栏自动切为图标钮，悬停浮现速览卡。
- **六区仪表盘**：概览 / 趋势 / 明细 / 统计 / 费率 / 设置——Hero 大数字 + 环比 + 本月预计 + KPI + 用量热力图，趋势 7/30 天可切费用 / Token，模型单价表、预算与峰谷提醒都在；克制冷调、深浅主题自适应。

  ![概览：本月费用 Hero、预算进度、KPI 与用量热力图](screenshots/1.png)
- **即时代费用条**：输入框下方常驻「本轮 / 会话」费用；峰谷档位与切换倒计时只在当前模型涉及峰谷时出现；订阅额度预警 chips 剩余 ≤20% 浮现、≤10% 标红；可在设置 Tab 整条隐藏（偏好本地持久化，统计与提醒不受影响）。
- **峰 / 谷切换提醒**：切档前弹窗 + 可选系统通知，提前量 / 位置 / 模式 / 预览均可配；文案按计费通道区分（DeepSeek 价格减半、智谱积分 5 折）。
- **插件信息卡**：设置 Tab 常驻「关于」卡——版本号服务端读自包 `package.json`（单一来源，发布自动正确），作者 / 仓库 / npm / 许可证一键可达。

## 💰 计费引擎

- **提供商优先分组**：费用按调用实际发生的 llm 入口（通道）分组——腾讯云 TokenHub / Token Plan / DeepSeek 官方 / 直连·路由名 / 未知路由，模型品牌只是行内徽标 + 副标；官方判定按通道 origin（`api.deepseek.com`）而非路由名，`deepseek-*` 网关路由不再被误算官方。`routeAliases` 归位改名 / 删除的历史路由，`modelKeyAliases` 把目录外模型 id 绑定到计费键（日期后缀、组织前缀、TokenHub 短 id `hy3` 已内置识别）。
- **实时费率表**：models.dev 抓价 + 探活模型对标，系统实际配置的模型全纳入；峰谷分时（工作日 9-12 / 14-18 高峰 ×2、周末全天低谷，历史费用按官方变更节点分段，见下方「计费细节」）+ 实时汇率（USD→CNY），每 6 小时自动刷新；费率条显示「上次同步」时间并可**一键立即同步**（无需重启宿主）。
- **自定义单价**：设置面板为未收录或变价模型填实付价（未命中 / 缓存命中 / 输出，可选 USD 与低谷价），总览与日趋势按用户价重估；支持按中转站来源绑定同模型不同价，目录外模型填价即生效。

  ![费率：模型单价表（峰谷分时与实时汇率）](screenshots/5.png)
- **官方 vs 三方分桶**：明细费用列按官方直连 / 第三方中转分解（混合时「官 x / 三 y」），统计 Tab 有汇总卡；联网搜索辅助请求计入官方。
- **月度预算 + 分档提醒**：预算条 ≥80% 琥珀、超支红脉；跨 50 / 80 / 100% 各提醒一次；余额折算 CNY 低于阈值每天提醒一次。
- **成本突增归因**：最近 40 轮费用柱状图，金额贴柱顶、峰谷背景分带、超 2 倍红标归因。

## 🔌 订阅与余额

- **订阅套餐额度**：自动识别订阅类 provider（Kimi / Z.ai / OpenCode Go / MiniMax / OpenRouter / Claude / CommandCode / 小米 / 火山…），有额度 API 的实时显示剩余 % 与重置时间、用尽标红，无 API 标「未接入」；订阅通道模型费用记 0，档位月费与周期额度由内置知识库识别（如 OpenCode Go $10/月 + 周 $30 额度）。**MiniMax 注意**：国内用 `minimax-token-plan-cn`（自动对接 `api.minimaxi.com`），国际用 `minimax` / `minimax-token-plan`；可在该 provider 设置覆盖 `baseUrl`。**Claude 订阅**：本机登录 Claude Code 后自动发现（读 `~/.claude/.credentials.json` 的 OAuth token），显示 5 小时 / 周窗口用量；llm-pi-ai 里按量 `anthropic` 路由不会被误识别，费用照常按 token 计。**CommandCode**：在 llm-pi-ai 给 `commandcode` 路由配 `apiKeyEnv`（`user_` 前缀 key），显示 5 小时 / 周窗口与月度 Credits。
- **多厂商余额**：DeepSeek / Kimi / 阶跃星辰 / 硅基流动 / xAI / 智谱 GLM 内置官方余额，按近 7 天日均折算「约可撑 N 天」；**腾讯云 TokenHub Token Plan** 余量与订阅额度走云 API 管控面（TC3 签名，`src/tc3.ts`）——凭据填 `<SecretId>:<SecretKey>` 密钥对（非推理 key），路由命名 `tencent-tokenhub` / `tokenhub` / `tencent` / `tencentcloud` 任一即可命中，剩余与总额度都可解析时才产出百分比窗口（绝不猜总额度）。
- **自定义 Provider 余额**：配置任意 HTTP 端点查余额（`extract` 支持常量 / 点路径 / 四则运算，请求头 `{{ENV}}` 经凭据 seam）。
- **声明端点 + 余额对账**：内置表没有的供应商用 `declaredEndpoints` 自声明余额接口——只写「数字在哪里」的点路径、无表达式；安全边界（单斜杠绝对路径、仅 GET、拒跨源重定向、响应体 / 超时上限、凭据只取本 provider）由 `src/declarative.ts` 强制执行，取错路径在界面标 `declared` 与 reason。**余额差对账**（`reconcilePath`）用官方余额当日变动与本地账本交叉校验，偏差超阈值（0.3 元且 >15%）提示核对；充值 / 授信 / 币种变化重置基准而非告警，余额未减少（走订阅扣费）静默。
- **中转站归组与额度**：按 `baseURL` 归一化 origin 归组，同站多把 key 合并一行、站名即域名；自动识别 New API 系（`/api/status`）与 Sub2API（`/v1/usage`）的余额与滚动额度窗口，读不出标「未读出额度」、剩余 <20% 标红；识别结果 5 分钟指纹缓存（同站多 key 独立熔断），`relay-quotas` 端点附 `diagnostics` 供「为什么不显示」自查；项目归属优先用工作区标题命名。

  ![明细：厂商计费与订阅（余额、套餐额度、模型用量）](screenshots/3.png)

> 全部渠道的适配矩阵（识别方式 / 端点 / 凭据要求 / 排查顺序）见 [docs/adapters.md](docs/adapters.md)。

## 📈 用量可视化

- **会话明细 + 热力图**：按会话费用倒序（标题 / 项目 / 调用 / 费用 / 最后活跃）；月 / 半年 / 年三档日历热力图（5 档色阶、悬停明细，年视图近 52 周 GitHub 风格，**半年视图 26 周大格**——一张图看完近半年强度，截图即用），**费用 / Token 双口径**切换，头部显示区间合计、活跃天数 / 连续使用天数。
- **性能指标**：每模型 TTFT 均值 / P50 / P90、生成速度（tokens/s）、总延迟均值；按小时 × 模型对比曲线——指标 tab 切换、模型 chip 点击开关曲线（默认点亮样本数前 5）、悬停吸附最近小时显示十字线与逐模型数值，缺失样本小时断线不造假；视图偏好本地持久化。
- **Token 统计洞察**：每日 token 堆叠双视角——「按结构」（输入未命中 / 命中 / 输出三桶，含 reasoning）与「按模型」（旧快照缺明细时自动隐藏切换）；悬停显示当日精确明细（千分位不缩写），点击图例色块或 Token 表行聚焦单模型（再点解除）；结构 KPI（缓存命中率 / 思考占比 / 输入输出比 / 峰值日）；按日 CSV 与 JSON 导出（JSON 含按日 × 模型明细）。

  ![趋势：每日费用趋势、每轮费用与峰谷时段占比](screenshots/2.png)
- **数据导出 + 下钻**：统计 Tab 导出按日 / 按会话 / 按站点 CSV 与全量 JSON；费用构成 / 工作区 / 会话明细可下钻（点项目行展开该项目的会话）；无图表库、无外部 CDN、纯设计令牌。

  ![统计：导出、费用构成、工作区与会话明细](screenshots/4.png)

## 🛡️ 健壮性与隐私

- **真实用量聚合**：服务端增量聚合（只重算写过的会话），单会话损坏容错、快照落盘回退；`usage_stats` 工具让模型自查今天 / 本月 / 当前会话 / 累计费用，还可查 `bySite`（按站点归组）与 `relay`（只看中转站）汇总。
- **模型健康 + 未收录标注**：厂商接入状态圆点（绿 / 红 / 灰）；未收录模型显著标注、按兜底价估算、厂商自动推断（如 `mi-mimo-2.5` → 小米）；估算价模型标注「估算价」。
- **多语种 + 双币种**：¥ / $ 切换随币种双语（USD→英文、CNY→中文，仅本插件生效，不影响宿主全局 UI）；费率表、侧边栏卡片与输入框胶囊均按所选币种换算，选择本地持久化（重开仪表盘仍保留）。
- **安全加固**：全部 HTTP 端点强制回环访问——peer socket 地址 + Host 头精确匹配双重校验，拒绝 `127.0.0.1.evil.com` 形式的 DNS rebinding（反向代理部署可用 `trustedHosts` 显式放行特定主机名，peer socket 校验仍为强制）；写操作额外校验 Origin 回环与 Content-Type 并限制 body 上限，杜绝跨站改写；余额 / 订阅 / 定价拉取带有限重试与按上游维度熔断（鉴权失败属配置问题、不计入熔断）。
- **导出防注入**：CSV 对 `=` / `+` / `-` / `@` 开头单元格前置单引号并完整转义，防止在 Excel / WPS 中被当作公式执行。
- **隐私底线**：纯 UI surface，不注册工具、不注入系统提示、不向会话日志写模型可见事件；仅从既有会话日志聚合，日志内容由其他包负责。

## 🚀 快速开始

先确认宿主代际（`dsh --version`），再按代际选安装命令——**装错线会在市场侧被 `engines.dsh` 声明拦截**（v1.0.41 起声明生效）。注意 `dsh plugin add` 需要显式 `--profile`（缺省会报 `required option '--profile <name>' not specified`），且建议**钉具体版本号**而非 `@latest`（pnpm 的 `minimumReleaseAge` 冷静期会让刚发布的版本被跳过、回退到旧线）：

- **DSH 0.1.2 ~ 0.1.6 系**（0.1.2-alpha.1 起，现行 latest 为 0.1.5-rc.2（alpha 预览已前移 0.1.6-alpha.2）；`npm ls -g @deepseek-ai/dsh` 显示 0.1.2-* ~ 0.1.6-*）：

  ```sh
  dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@latest
  ```

- **DSH 0.1.0-rc.8 ~ 0.1.1-rc.2**（旧宿主，**该线已冻结**——`stable` 永久指向终版 v1.1.17，存量用户照常安装使用，但不再有新版本；冻结依据与正式停用时机见 [COMPATIBILITY.md](COMPATIBILITY.md)）：

  ```sh
  dsh plugin --profile web add npm:@kenz1117/dsh-ui-usage-billing@stable
  ```

也可以在宿主 `cordis.patch.yml` 中手动加入：

```yaml
- insert:
    - id: ui-usage-billing
      name: '@kenz1117/dsh-ui-usage-billing'
```

启动宿主后，侧边栏设置上方即出现计费入口。无需额外配置；`sessionPersistence` 可用时自动聚合真实用量。

## ⚙️ 工作原理

插件由服务端与浏览器端两部分组成：

```
浏览器端                                  服务端（Node）
  │                                        │
  ├─ GET /api/billing/usage-stats ────────▶ ├─ sessionPersistence 遍历持久化会话日志
  │                                        ├─ 按 request/header 归属模型
  │                                        ├─ token 按缓存命中 / 未命中分桶
  │                                        └─ 按实时单价表估算费用（人民币）
  ├─ GET /api/billing/pricing ────────────▶ ├─ 腾讯财经 / OpenRouter 实时汇率与模型价
  ├─ GET /api/billing/balance ────────────▶ ├─ DeepSeek 官方余额 API（凭据 seam 取 key）
  ├─ llm.models 健康探测 ─────────────────▶ └─ 返回聚合统计 JSON
  └─ 渲染仪表盘
```

- **服务端**（`src/index.ts`）：注入 `webServer`、`sessionPersistence` 与 `credentials`，注册 `GET /api/billing/usage-stats`、`/api/billing/pricing`、`/api/billing/balance`、`/api/billing/subscriptions`、`/api/billing/relay-quotas`。聚合器按会话缓存折叠结果：一次 LLM 调用归属到其前置 `request/header` 记录的模型，token 拆分到缓存命中 / 未命中桶，日期按本机时区归天；日志文件 mtime+size 不变则直接复用缓存，只有写过的会话重新折叠，整份文档另有 5 秒 TTL 合并密集轮询。每个成功折叠的会话同时原子写入独立的持久用量账本，永久删除会话后历史费用与 token 仍保留。
- **浏览器端**（`src/client/`）：请求上述接口渲染仪表盘，通过 `llm.models` 探测各厂商连接状态。真实数据到达前显示全零空快照，不展示伪造样本。

## 💡 计费细节

单价表（`src/client/pricing.ts`）采用**原生币种**存储：国内厂商直接录入人民币价格，国外厂商录入美元价格。费用统一以人民币计算与展示——美元模型按**实时汇率**折算，国内模型全程不经过汇率换算。启动时服务端拉取实时汇率与模型价（`src/pricing-fetch.ts`）：USD→CNY 优先腾讯财经行情（免 key、国内可达），失败依次降级 open.er-api 与内置默认值；之后每 6 小时后台刷新，单价表弹窗标注「今日汇率」与实时 / 内置徽标。金额与费率表的**展示币种跟随用户所选**：切 ¥ / $ 时把每条每百万 token 单价经 `convertUnitPrice` 按实时汇率换算到目标币种再显示（汇率缺失时回退原生币种）。

```
cost（CNY）= (missInput × p_input + cacheHit × p_cacheHit + output × p_output) / 10⁶
           —— 价格为原生币种；美元模型按实时 USD → CNY 汇率折算
```

统计中的 `input` 为总输入（cacheHit + cacheMiss），估算按命中 / 未命中分拆计价，避免重复计费。支持双档计费的模型按 `DEFAULT_PEAK_SHARE`（默认 0.5）混合高峰与低谷档；周末（北京时间周六 / 周日）全天按低谷价计费。

**联网搜索请求按次估算**（issue #15）：DSH 的联网搜索绕过对话通道直连官方 `api.deepseek.com`，会话日志只记请求、无用量事件，而开放平台照常计费。插件对这类 `web/deepseek-search-llm-request` 事件按次估值计入费用（默认 0.02 元/次，配置 `searchCallEstimateCny` 可调整；设 0 关闭），并单独累计 `searchCalls` 供面板提示估算口径。

**自定义单价（设置 Tab，issue #16）**：结构化条目表（模型 + 可选来源 + 输入/缓存命中/输出 + 币种），不再手编 JSON。来源（中转站域名）留空 = 该模型默认价；填入中转站域名（如 `https://api.my-relay.com`）= 仅该来源的同名模型用此价（同名模型可同时存在默认价与多个来源价，互不覆盖）。显示层按「模型 × 来源」精确匹配重算，命中不到来源时回落该模型默认价，再无则用内置目录价。

### 支持模型（2026-09 主流阵容，OpenAI 兼容系列，共 77 款）

完整目录见费率 Tab 及源码 `src/client/pricing.ts` 的 `MODEL_CATALOG`，此处每厂商仅列代表型号。

| 厂商       | 代表模型                                        |
| -------- | -------------------------------------------- |
| DeepSeek | V4.1 Flash、V4 Pro（等 3 款；按官方变更节点分段计价：基础价 → 峰谷 v1 → 周末全谷） |
| 智谱 AI    | GLM-5.3、GLM-5.2（等 11 款）                     |
| 阿里通义     | Qwen3.8 Max、Qwen3-Coder 480B（等 8 款）         |
| 字节豆包     | Doubao Seed-2.1 Pro、Doubao-Seed-Evolving（等 8 款） |
| 月之暗面     | Kimi K3、Kimi K2.7 Code（等 10 款）              |
| 小米       | MiMo V2.5（等 2 款）¹                            |
| MiniMax  | MiniMax-M3、MiniMax-M2.7（等 3 款）              |
| 百度文心     | ERNIE-5.1、ERNIE-4.5 300B（等 2 款）             |
| 腾讯混元     | 混元 T1、混元 Hy3（等 2 款）                       |
| Anthropic | Claude Opus 4.6、Claude Sonnet 4.6（等 5 款）    |
| Mistral AI | Mistral Large 3、Mistral Small 4（等 3 款）     |
| Cohere    | Command A、Command R（等 2 款）                 |
| OpenAI   | GPT-6 Astra、GPT-5.6 Sol / Terra / Luna（等 4 款） |
| Google   | Gemini 3.1 Pro、Gemini 3.6 Flash（等 2 款）      |
| xAI      | Grok 4.6（等 2 款）                             |
| Meta     | Llama 4 Maverick（等 2 款）                     |
| 美团       | LongCat 2.0（估算价）                             |
| 面壁智能     | MiniCPM-V 4.5（估算价）                           |
| 小红书      | Dots3-Note Preview（估算价）                      |
| 零一万物     | Yi-Lightning                                  |
| 阶跃星辰     | Step 3.7 Flash                                |
| 科大讯飞     | Spark 4.0 Ultra（套餐制）¹                       |
| 商汤       | SenseNova 6.5（公测中）¹                         |
| 百川智能     | Baichuan M3-Plus                              |
| 其他       | 未收录模型的统一回退定价（费用记 0）                      |

> ¹ 讯飞、商汤、小米及美团 / 面壁智能 / 小红书等未公布官方按量单价的模型，表内为估算价（`estimated`）；这些模型走订阅通道（coding / token plan / opencode）时费用记 0。订阅通道与 pi-ai 内置提供方对齐（kimi-coding、zai-coding-cn、opencode、opencode-go、qwen / xiaomi 的 token-plan 各区域变体），可按 `subscriptionProviders` 配置覆盖。

新增模型：在 `MODEL_CATALOG` 追加条目，并在 `src/client/pricing.ts` 的 `MODEL_KEY_ALIASES` 中映射真实模型 id（聚合层与客户端渲染共用同一张表）。

## 🔌 HTTP API

对外 HTTP 接口与字段定义详见源码：`GET /api/billing/pricing`、`/api/billing/balance`、`/api/billing/usage-stats`、`/api/billing/subscriptions`、`/api/billing/relay-quotas`（见 `src/index.ts`、`src/aggregate.ts`、`src/relay.ts`）。其中 `usage-stats` 返回的 `bySite` 字段为按中转站归组后的用量分布（`site:<origin>` / `direct:<provider>` / `unknown`），`unpricedModels` 为未计价模型的 id 列表；`relay-quotas` 返回 `quotas`（各中转站额度）与 `diagnostics`（每条路由的 origin / kind 归类，供「为什么不显示」自查）。全部端点仅接受回环请求（peer socket 地址 + Host 头校验）。

## ⚙️ 配置

| 字段                      | 默认                                   | 说明                                                                                                           |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `statsPath`             | 未设置                                  | 回退统计文件 `.dsh-usage-stats.json` 的绝对路径（`sessionPersistence` 不可用时生效）                                            |
| `ledgerPath`            | `<harness home>/.dsh-usage-ledger.json` | 独立持久用量账本的绝对路径；只保存折叠后的统计（不保存消息正文或会话标题），永久删除会话不会删除已记录的费用与 token。**默认根跟随宿主 harness home**（`DSH_HOME` 环境变量优先，回退 `~/.dsh`），自定义 `DSH_HOME` 的多套隔离环境互不污染（issue #52）                           |
| `balanceApiKeyEnv`      | `DEEPSEEK_API_KEY`                   | DeepSeek 余额查询的凭据引用；仅在 llm-pi-ai 未配置 deepseek 的 `apiKeyEnv` 时兜底使用                                             |
| `subscriptionProviders` | 内置 11 项（含 `tencent-token-plan`） | 订阅制（coding / token 套餐）provider id 列表，照常统计 token、费用记 0；与订阅卡识别口径对齐                                   |
| `routeAliases`          | 未设置                                  | 历史路由别名（旧 provider 路由名 → 当前路由名）：改名/删除过的路由，其历史用量原落「未知路由」桶且订阅/官方判定失效；配置后按目标路由归位。例：`{ "deepseek-official": "tencent", "tencent-cloud": "tencent" }` |
| `modelKeyAliases`       | 未设置                                  | 用户自定义模型别名（真实日志 model id → 计费目录键，值须为 `MODEL_CATALOG` 既有 key）：目录外新模型无需等发版，配一条别名即完成识别与计价。例：`{ "hy4-preview": "hunyuan" }` |
| `monthlyBudget`         | 未设置                                  | 月度预算默认金额（人民币元）；随 usage-stats 下发，作为仪表盘预算条的初始金额（用户在界面上的设置优先并本地持久化）                                             |
| `lowBalanceThreshold`   | `50`                                 | 余额不足告警阈值（人民币元）；随 usage-stats 下发，任一厂商余额折算人民币低于此值时每天提醒一次                                                       |
| `subscriptionPlans`     | 自动识别                                 | 订阅额度适配器白名单（`{ provider, baseUrl?, region? }`）；缺省时自动从 `llm-pi-ai` 设置识别所有订阅类 provider（有额度 API 的查额度，无 API 的仅标识） |
| `declaredEndpoints`     | 未设置                                  | 声明端点（`{ displayName, origin, path, fields?, windows?, raw? }`）：为内置表没有的供应商自声明余额/额度接口，只写「数字在哪里」的点路径、无表达式；请求由匹配到同源 provider 的 origin 构造，安全边界（单斜杠绝对路径、仅 GET、拒绝跨源重定向、响应体/超时上限、凭据只取匹配 provider 自有的 apiKeyEnv）由 `src/declarative.ts` 强制执行 |
| `reconcilePath`         | `<harness home>/.dsh-usage-reconcile.json` | 余额差对账基准的绝对路径（默认根同样跟随 `DSH_HOME` / `~/.dsh`）；用官方（仅 DeepSeek 官方方向）余额当日变动与本地账本当日的官方渠道费用做交叉校验，偏差超阈值（0.3 元且 >15%）时提示核对；充值/授信/币种变化重置基准而非告警 |
| `searchCallEstimateCny` | `0.02`                               | 联网搜索请求（`web/deepseek-search-llm-request`，日志无用量事件）的单次费用估算（人民币元）；设 0 关闭估算（调用仍计数、不计费）                            |
| `trustedHosts`          | 未设置                                  | 反向代理场景下允许通过 Host 头校验的额外主机名（如 `['llm.example.com']`）；**缺省空 = 与历史版本行为完全一致**。仅在 peer socket 回环校验通过后才参考，只放宽「纵深防御」的第二层；精确主机名匹配（忽略大小写与端口），无后缀 / 通配符语义 |

## 🛠 开发

环境要求：Node.js ^22.19 || >=24，pnpm。

```sh
pnpm install
pnpm --filter @kenz1117/dsh-ui-usage-billing bundle   # 构建 lib/index.js 与 lib/client.js
npx vitest run packages/client/ui-usage-billing/tests  # 单元测试
```

## 📦 发布

本包为独立 npm 包，发布后即可被其他 DeepSeek Harness 宿主安装。

```sh
npm publish --access public
```

宿主通过 `package.json` 的 `dsh.client` 声明（`platform: web`）与 `exports["./client"]` bundle 自动发现浏览器端，无需注册中心登记。

## 🔐 权限与兼容声明（DSH STORE）

- **权限等级：high**：读取持久会话日志（文件）、访问多厂商官方 / 订阅 / 余额 / 定价 API（网络）、经凭据 seam 读取 `apiKeyEnv`（凭据）、写入 harness home（`DSH_HOME` / `~/.dsh`）下的账本与快照（持久状态）；**不含**命令执行 / Shell。
- **更新通道：`user-reviewed`**：本插件具备文件 / 网络 / 凭据能力，DSH STORE 采用每次安装需本机人工确认的通道；安装前请复核仓库、固定 Commit、生命周期脚本与影响范围。
- **兼容范围**：预览线（npm `latest`/`alpha`，1.2.x，自 v1.2.0 起恒高于稳定线以消除版本号倒挂）适配 DSH `0.1.2` ~ `0.1.6` 系（宿主 `latest` 现指向 0.1.5-rc.2，已真机验证；0.1.6-alpha.1/2 已声明兼容，插件依赖包零代码变更）；稳定线（npm `stable`，1.1.x，**已冻结**，终版 v1.1.17）适配旧宿主 `0.1.0-rc.8` ~ `0.1.1-rc.2`。逐版本声明见 `package.json` 的 `dsh.compatibility`，双线对照与监控机制见 [COMPATIBILITY.md](COMPATIBILITY.md)。Node.js `^22.19.0 || >=24.0.0`。
- **生命周期**：无 `preinstall` / `install` / `postinstall` / `prepare`（安装即用）。
- **不冒用官方**：仅新增自有 entry id `ui-usage-billing`；对 `@deepseek-ai/dsh-*` 仅为 `peerDependencies` 依赖（不重复安装 / 不替换 / 不遮蔽官方组件），包名使用第三方命名空间 `@kenz1117/*`。
- **打包产物**：运行文件 `lib/*` 与 `cordis.patch.yml` 已随固定 Commit 提交并声明在 `files`。
- **源码锚点**：源码以 GitHub 默认分支上的固定 Commit 锁定并可追溯；例如 v1.0.13 对应 `efd67dea133a4fee0aacfee8dff416f1ce418b14`。DSH STORE 自动化每约 8 小时重新读取默认分支 HEAD 作为新的固定 Commit，并按 SemVer 变更判定是否重新审查。

## 🤖 Model Experience

无。本插件是纯 UI surface：不注册工具、不注入系统提示、不向会话日志写入模型可见事件，也不触及会话 KV 缓存；用量统计由服务端从既有会话日志聚合，日志内容由其他包各自负责。

## ⚠️ Known Limitations and Deferred Work

- **余额查询已接入 DeepSeek / 月之暗面（Kimi）/ 阶跃星辰（StepFun）/ 硅基流动 / xAI / 智谱 GLM（Z.ai 国内域）/ 腾讯云 TokenHub（Token Plan 余量）**：前六家用标准 Bearer API key，腾讯云用云 API 密钥对（TC3 签名）。其余厂商因无公开余额接口或需非 Bearer 鉴权（小米 MiMo 走控制台 Cookie、商汤走 AccessKey 签名、MiniMax/字节豆包走额度制或 AK/SK），暂显示「未配置」；扩展点在 `src/balance.ts`（按厂商余额 API 增加查询器）。
- **中转站额度依赖上游私有 schema**：New API / Sub2API 的接口字段未公开，读不出时标「未读出额度」而非臆造金额；若某中转站响应字段不同，需按 `src/relay.ts` 的解析器扩展。未知路由表示该路由在当前 provider 配置里已不存在（改过名 / 删除过），历史调用数据未丢，重新配置同名路由即可自动归位。
- **超支通知依赖浏览器 Notification**：权限被拒绝或平台不支持时只有界面红色脉冲兜底，没有宿主级通知通道；通知上限为每天一次。
- **会话明细不可跳转**：点击会话行不会打开对应会话（跨插件导航需要宿主会话选择通道）；会话数封顶 100 行、面板只显示前 20 行。
- **费用为目录价估算**：讯飞 / 商汤 / 小米等未公布按量单价的模型使用估算价（特性表脚注 ¹），正式定价以厂商账单为准。
- **账本从首次成功聚合开始生效**：升级前已经永久删除且不在旧快照中的会话无法恢复；手动删除 `.dsh-usage-ledger.json` 及其 `.bak` 会清空独立保留的历史。账本只保留本插件已经成功观测过的调用。
- **历史回放预热**：插件加载 3 秒后台自动全量折叠宿主全部历史会话日志（账本幂等，重复折叠不重复计数），首次打开面板即可看到完整历史统计，无需等一遍首次折叠。历史会话按「首次折叠时的模型单价」计价；厂商改价前的历史消耗不会按新价重算（价格目录无历史时点价，属估算口径）。

## ❤️ Contributors

- [@hwangjunjie](https://github.com/hwangjunjie) — 腾讯云 TokenHub / Token Plan 订阅额度适配（`src/tc3.ts`）、提供商优先通道分组与网关徽标、`routeAliases` / `modelKeyAliases` 配置（PR #35）
- [@ciphoo](https://github.com/ciphoo) — MiniMax 国内域 Token Plan 订阅额度支持（PR #5）、`minimax-cn` 订阅凭据接线（PR #12）、Windows 下账本并发写入 `MoveFileExW EPERM` 修复（PR #11）
- [@fabulousyuann-tech](https://github.com/fabulousyuann-tech) — 会话删除后用量保留的持久 ledger 功能（PR #8）
- [@hi-fangj](https://github.com/hi-fangj) — Token 每日图悬停精确明细（PR #21）、平价消耗胶囊开关（PR #22）、Token 每日图按模型视角与图例聚焦（PR #23）、性能面板按模型对比曲线（PR #24）

## 📄 许可证

[MIT](LICENSE) © 2026 KenZ (kenz1117)

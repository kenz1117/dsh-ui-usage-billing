<div align="center">

# dsh-ui-usage-billing

<p align="center">把每一分模型开销，看得清清楚楚。</p>

<p align="center">
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

> **自定义单价可靠性 + 峰谷价 + 腾讯云 TokenHub（v1.0.13，2026-08-29）**：修复带「来源（中转站）」的自定义价静默失效——来源现按规范化 origin（补协议 / 去路径 / 忽略大小写）宽松比对，三维站点数据缺失时回落为该价重估；模型输入新增下拉候选（目录键 + 探活模型 id）。自定义价新增可选「低谷价」三栏（峰/谷 50% 比例混合估算）。余额表接入腾讯云 TokenHub Token Plan 余量（云 API 管控面 TC3 签名，凭据填 `<SecretId>:<SecretKey>`）。

> **兼容底线提升至 DSH `0.1.2-alpha.1`（v1.0.12，2026-08-29）**：宿主在该版本移除了 `dsh-client-runtime` 等客户端半区依赖，插件已完整迁移（`dsh-client-store` / `dsh-api-session-controller` / 新 LLM Remote 面）；旧宿主（`0.1.0-rc.8` ~ `0.1.1-rc.2`）请停留在 v1.0.11。

> **费率表展示规则更新（2026-08-27）**：models.dev 聚合的补充价目**不再整表渲染**——此前费率表会把 158 个网关厂商的全部约 5900 个模型一并铺出，淹没实际在用的条目；现在表格只包含内置目录与系统探活命中的模型。计费能力不受影响：目录外但 models.dev 有价的模型命中时仍按其官方 USD 价正常估算，只是不再出现在表格里。

> **千问（Qwen）系列价格更新（2026-08-27）**：对齐阿里云百炼最新官方刊例——**Qwen3.7-Max** 更正为官方原价（输入 ¥12 / 显式缓存命中 ¥1.2 / 输出 ¥36，此前误录活动折后价），当前官方限时 5 折且**未公布截止时间**，费率表按折后价显示并挂红色促销徽章（悬停提示活动性质），公告截止后补填日期即自动恢复原价展示；Qwen 全系补充**附加计价参考行**（Batch File 长期半价档、Batch Chat、显式缓存创建/命中，纯展示不参与估算计费）；Qwen3-Coder Plus 官方明确不支持批量推理，仅列显式缓存两行。

> **峰谷计费规则更新（自 2026-08-23（周日）00:00 起）**：DeepSeek 模型按官方新规计费——**工作日（周一至周五）** 继续执行原峰谷分段计费（高峰 09:00–12:00 / 14:00–18:00，×2）；**周末（周六、周日）** 全天不再区分峰谷时段，统一按**低谷价**计费。插件计费引擎、费率表与每轮费用峰谷分带均已同步生效。

<div align="center">
  <img src="screenshots/demo.png" alt="dsh-ui-usage-billing — 计费仪表盘总览" width="80%">
</div>

### 演示动图

![演示](screenshots/demo.gif)

## ✨ 核心亮点

- **真实用量，不伪造样本** — 服务端从持久化会话日志实时聚合，按实时多厂商官方价估算；数据到达前显示空快照，绝不展示假数据。
- **一屏看懂一切** — 侧边栏触发卡 + 全屏仪表盘（概览 / 趋势 / 明细 / 统计 / 费率 / 设置）六区，本月/今日/预计/热力图/趋势全在。
- **订阅 · 余额 · 额度 · 对账** — 订阅套餐额度、多厂商余额、中转站额度、声明端点、余额差对账，形成可交叉验证的计费闭环。
- **峰谷计价 + 切换提醒** — 工作日峰谷分时、周末全天低谷，切档前弹窗/系统通知，提前量可配。
- **离线自包含** — 无图表库、无外部 CDN、纯设计令牌；依赖极轻，随装随用。
- **多语种 + 双币种** — 中文/English、¥/≈$ 切换，只对本插件生效。

## 📊 仪表盘

- **侧边栏入口**：设置按钮上方的仪表盘式触发卡——本月费用主数字（等宽字体）+ 近 7 天 sparkline 迷你趋势，副行「今日 / 本周」；折叠栏自动切为图标钮；悬停浮现速览卡。
- **计费仪表盘（分区 Tab）**：概览 / 趋势 / 明细 / 统计 / 费率 / 设置 六区——Hero 大数字 + 本年/今日环比 + 本月预计 + KPI×4 + 热力图；趋势图 7/30 天（可切费用 / Token）；厂商计费与订阅；导出 / 费用构成 / 工作区 / 会话明细；模型单价表；预算与峰谷提醒。克制冷调、`--dsw-*` 令牌、深浅主题自适应。

  ![概览：本月费用 Hero、预算进度、KPI 与用量热力图](screenshots/1.png)
- **即时代费用条**：输入框下方常驻「本轮 ¥x · 会话 ¥y」+ 峰谷档位与切换倒计时 + 订阅额度预警 chips（≤20% 浮现、≤10% 红）；可在设置 Tab 以「平价消耗胶囊」开关整条隐藏（显示偏好本地持久化，统计与提醒不受影响）。
- **峰/谷切换提醒**：切档前弹窗 + 可选系统通知（提前量 / 位置 / 模式 / 预览可配），区分「即将进峰时 ×2 可稍等」/「即将进平价 价格减半」。
- **插件信息卡**：设置 Tab 常驻「关于」卡——插件名、描述、作者（可跳 GitHub）、源码仓库、npm、许可证 MIT、版本号（服务端读自包 `package.json`，单一来源，发布自动正确）。

## 💰 计费引擎

- **实时定价费率表**：models.dev 抓价 + 探活模型对标——系统实际配置模型全纳入；峰谷分时（工作日 9-12 / 14-18 高峰 ×2，周末全天低谷）+ 实时汇率（USD→CNY），每 6 小时刷新。
- **自定义单价**：设置面板为未收录或变价模型填入实付价（未命中 / 缓存命中 / 输出，可选 USD 与低谷价三栏），总览与日趋势按用户价重估显示；支持按中转站来源绑定同模型不同价（origin 规范化宽松匹配），目录外模型填价即生效。

  ![费率：模型单价表（峰谷分时与实时汇率）](screenshots/5.png)
- **官方 vs 三方分桶**：明细费用列按官方 DeepSeek 直连 / 第三方中转分解（混合时「官 x / 三 y」），统计 Tab 有「官方/三方」汇总卡。
- **月度预算 + 分档提醒**：预算条（开关 / 金额 / 进度，≥80% 琥珀、超支红脉）；跨 50 / 80 / 100% 各提醒一次；余额折算 CNY 低于阈值每天提醒一次。
- **成本突增归因**：每轮费用柱状图（最近 40 轮、金额贴柱顶、峰谷背景分带、超 2 倍红标归因）。

## 🔌 订阅与余额

- **订阅套餐额度**：识别 `llm-pi-ai` 里的订阅类 provider（Kimi / Z.ai / OpenCode Go / MiniMax / OpenRouter / 小米 / 火山…），有额度 API 的实时显示剩余%与重置时间、用尽标红，无 API 标「未接入」；订阅通道模型费用记 0。档位月费与周期额度口径由内置知识库自动识别（如 OpenCode Go $10/月 + 周 $30 额度）。**MiniMax 用户注意**：国内开发者环境请用 `minimax-token-plan-cn`（自动对接 `https://api.minimaxi.com`）；国际保留 `minimax` / `minimax-token-plan`（默认 `https://www.minimaxi.com`）；需要自配中转或 staging 时可在该 provider 设置里覆盖 `baseUrl`。
- **多厂商余额**：DeepSeek / Kimi / 阶跃星辰 / 硅基流动 / xAI / 智谱 GLM（Z.ai 国内域）内置官方余额，余额列按近 7 天日均折算「约可撑 N 天」；**腾讯云 TokenHub Token Plan** 余量已接入（云 API 管控面，TC3 签名）——凭据值填 `<SecretId>:<SecretKey>`（云 API 密钥对，非 TokenHub 推理 key），推理路由命名为 `tencent-tokenhub` / `tokenhub` / `tencent` / `tencentcloud` 任一即可命中。
- **自定义 Provider 余额**：配置任意 HTTP 端点查余额（`extract` 支持常量 / 点路径 / add-subtract / divide，请求头 `{{ENV}}` 经凭据 seam）。
- **声明端点 + 余额对账**：**声明端点**（`declaredEndpoints`）为内置表没有的供应商自声明余额/额度接口——只写「数字在哪里」的点路径、无表达式；请求由匹配到同源 provider 的 origin 构造，安全边界（单斜杠绝对路径、仅 GET、拒跨源重定向、响应体/超时上限、凭据只取匹配 provider 自有 `apiKeyEnv`）由 `src/declarative.ts` 强制执行，取错路径在界面标注 `declared` 与 reason。**余额差对账**（`reconcilePath`）用官方（仅 DeepSeek 官方方向）余额当日变动与本地账本当日的官方渠道费用交叉校验，偏差超阈值（0.3 元且 >15%）时提示核对价格表或近期账单；充值 / 授信 / 币种变化重置基准而非告警、余额未减少（走订阅扣费）静默。
- **中转站归组与额度**：按 provider 的 `baseURL` 归一化 origin 归组——同一中转站的多把 key 合并成一行，站名即域名；对配了 `baseURL` 的路由自动识别 New API 系（`/api/status`）与 Sub2API（`/v1/usage`）的**余额与滚动额度窗口**，读不出标「未读出额度」，剩余 <20% 标红；识别结果有 5 分钟指纹缓存（同站多把 key 独立熔断），`relay-quotas` 端点附 `diagnostics` 供「我的中转站为什么不显示」自查。项目归属优先用工作区标题命名。**未计价的模型**（目录外/无价）费用按 0 计，Hero 下会提示「N 个模型未收录计价」。

  ![明细：厂商计费与订阅（余额、套餐额度、模型用量）](screenshots/3.png)

## 📈 用量可视化

- **会话明细 + 成本突增 + 热力图**：按会话费用倒序（标题 / 项目 / 调用 / 费用 / 最后活跃）；每轮费用柱状图（峰谷背景分带、超 2 倍红标归因）；月 / 年日历热力图（5 档色阶、悬停明细；年视图近 52 周、GitHub 风格），头部显示活跃天数 / 连续使用天数。
- **性能指标**：每个模型首字延时（TTFT）均值 / P50 / P90、生成速度（tokens/s）、总延迟均值，另按北京时间小时聚合 TTFT 与速度曲线；统计 Tab 渲染为按模型性能表 + 按小时 TTFT/速度双折线。
- **Token 统计洞察**：独立「Token」分区——每日 token 堆叠双视角切换：「按结构」按「输入（缓存未命中）/ 输入（缓存命中）/ 输出」三桶分色（含 reasoning 思考），「按模型」每天按模型堆叠（分色与趋势页一致，旧快照缺按日×模型明细时自动隐藏切换）；悬停柱状图显示当日精确明细（结构视角给三桶逐项，模型视角给逐模型「命中/未命中/输出」，千分位不缩写）；点击图例色块或模型 Token 表行可聚焦单个模型（其余段弱化、y 轴不变，再点解除），模型 token 总量与占比，结构 KPI（缓存命中率 / 思考占比 / 输入输出比 / 峰值日）；按日 token CSV 与 JSON 导出（JSON 含按日×模型明细）。

  ![趋势：每日费用趋势、每轮费用与峰谷时段占比](screenshots/2.png)
- **数据导出 + 离线自包含**：统计 Tab 导出按日 / 按会话 / 按站点 CSV 与全量 JSON；费用构成 / 工作区 / 会话明细分区可下钻（点项目行展开该项目的会话）；无图表库、无外部 CDN、纯设计令牌。

  ![统计：导出、费用构成、工作区与会话明细](screenshots/4.png)

## 🛡️ 健壮性与隐私

- **真实用量聚合**：服务端从会话日志实时聚合（增量缓存只重算写过的会话），单会话损坏容错、快照落盘回退；`usage_stats` 工具让模型自查今天 / 本月 / 当前会话 / 累计费用，还可查 `bySite`（按站点归组）与 `relay`（只看中转站）的汇总。
- **模型健康 + 未收录标注**：厂商接入状态圆点（绿 / 红 / 灰）；模型 id 不在目录时标「未收录」按兜底价估算、厂商自动推断（如 `mi-mimo-2.5` → 小米）；估算价模型标注「估算价」。
- **多语种 + 双币种**：¥ / $ 切换随币种双语（USD→英文、CNY→中文，仅本插件生效）；费率表按所选币种换算。
- **安全加固**：全部 HTTP 端点强制回环访问——peer socket 地址 + Host 头精确匹配（回环 IP 字面量，而非前缀）双重校验，拒绝 `127.0.0.1.evil.com` 形式的 DNS rebinding 域名；`/api/billing/usage-tool` 的写操作额外校验 Origin 回环与 Content-Type 为 `application/json` 并限制 body 上限，杜绝跨站改写；余额 / 订阅 / 中转站查询与定价拉取均带有限重试与按上游维度熔断（鉴权失败属配置问题、不计入熔断）。
- **数据导出防注入**：按日 / 按会话 / 按站点 CSV 对以 `=` / `+` / `-` / `@` 开头的单元格前置单引号，并完整转义逗号 / 引号 / 换行 / 回车，防止在 Excel / WPS 中被当作公式执行。
- **隐私底线**：纯 UI surface，不注册工具、不注入系统提示、不向会话日志写入模型可见事件；仅从既有会话日志聚合，日志内容由其他包负责。

## 🚀 快速开始

在宿主 `cordis.patch.yml` 中加入：

```yaml
- insert:
    - id: ui-usage-billing
      name: '@kenz1117/dsh-ui-usage-billing'
```

或通过包管理器安装：

```sh
npm install @kenz1117/dsh-ui-usage-billing
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

## 🧩 主题协作

本插件**不依赖任何主题包**，可独立安装运行。仪表盘弹窗声明 `billing.dashboard.decor` 装饰孔位（head / hero / trend / models / footer 锚点），并将实时费用摘要注册为 `ctx.billingMetrics` 服务：主题插件（如 acid-zine）主动注入 MacDots / 胶带 / 撕角便签等装饰视觉、订阅费用数据渲染自己的贴纸层。插件与主题各自独立装卸——主题不存在时走默认视觉，billing 不存在时主题照常运行。

## 💡 计费细节

单价表（`src/client/pricing.ts`）采用**原生币种**存储：国内厂商直接录入人民币价格，国外厂商录入美元价格。费用统一以人民币计算与展示——美元模型按**实时汇率**折算，国内模型全程不经过汇率换算。启动时服务端拉取实时汇率与模型价（`src/pricing-fetch.ts`）：USD→CNY 优先腾讯财经行情（免 key、国内可达），失败依次降级 open.er-api 与内置默认值；之后每 6 小时后台刷新，单价表弹窗标注「今日汇率」与实时 / 内置徽标。金额与费率表的**展示币种跟随用户所选**：切 ¥ / $ 时把每条每百万 token 单价经 `convertUnitPrice` 按实时汇率换算到目标币种再显示（汇率缺失时回退原生币种）。

```
cost（CNY）= (missInput × p_input + cacheHit × p_cacheHit + output × p_output) / 10⁶
           —— 价格为原生币种；美元模型按实时 USD → CNY 汇率折算
```

统计中的 `input` 为总输入（cacheHit + cacheMiss），估算按命中 / 未命中分拆计价，避免重复计费。支持双档计费的模型按 `DEFAULT_PEAK_SHARE`（默认 0.5）混合高峰与低谷档；周末（北京时间周六 / 周日）全天按低谷价计费。

**联网搜索请求按次估算**（issue #15）：DSH 的联网搜索绕过对话通道直连官方 `api.deepseek.com`，会话日志只记请求、无用量事件，而开放平台照常计费。插件对这类 `web/deepseek-search-llm-request` 事件按次估值计入费用（默认 0.02 元/次，配置 `searchCallEstimateCny` 可调整；设 0 关闭），并单独累计 `searchCalls` 供面板提示估算口径。

**自定义单价（设置 Tab，issue #16）**：结构化条目表（模型 + 可选来源 + 输入/缓存命中/输出 + 币种），不再手编 JSON。来源（中转站域名）留空 = 该模型默认价；填入中转站域名（如 `https://api.my-relay.com`）= 仅该来源的同名模型用此价（同名模型可同时存在默认价与多个来源价，互不覆盖）。显示层按「模型 × 来源」精确匹配重算，命中不到来源时回落该模型默认价，再无则用内置目录价。

### 支持模型（2026-08 主流阵容，OpenAI 兼容系列，共 73 款）

完整目录见费率 Tab 及源码 `src/client/pricing.ts` 的 `MODEL_CATALOG`，此处每厂商仅列代表型号。

| 厂商       | 代表模型                                        |
| -------- | -------------------------------------------- |
| DeepSeek | V4 Flash、V4 Pro（等 3 款；峰谷计费：工作日高峰 ×2、周末全天低谷） |
| 智谱 AI    | GLM-5.3、GLM-5.2（等 10 款）                     |
| 阿里通义     | Qwen3.8 Max、Qwen3-Coder 480B（等 7 款）         |
| 字节豆包     | Doubao Seed-2.1 Pro、Doubao-Seed-Evolving（等 8 款） |
| 月之暗面     | Kimi K3、Kimi K2.7 Code（等 9 款）               |
| 小米       | MiMo V2.5（等 2 款）¹                            |
| MiniMax  | MiniMax-M3、MiniMax-M2.7（等 3 款）              |
| 百度文心     | ERNIE-5.1、ERNIE-4.5 300B（等 2 款）             |
| 腾讯混元     | 混元 T1、混元 Hy3（等 2 款）                       |
| Anthropic | Claude Opus 4.6、Claude Sonnet 4.6（等 5 款）    |
| Mistral AI | Mistral Large 3、Mistral Small 4（等 3 款）     |
| Cohere    | Command A、Command R（等 2 款）                 |
| OpenAI   | GPT-5.6 Sol / Terra / Luna（等 3 款）           |
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
| `ledgerPath`            | `~/.dsh/.dsh-usage-ledger.json`       | 独立持久用量账本的绝对路径；只保存折叠后的统计（不保存消息正文或会话标题），永久删除会话不会删除已记录的费用与 token                           |
| `balanceApiKeyEnv`      | `DEEPSEEK_API_KEY`                   | DeepSeek 余额查询的凭据引用；仅在 llm-pi-ai 未配置 deepseek 的 `apiKeyEnv` 时兜底使用                                             |
| `subscriptionProviders` | `kimi-coding`、`xiaomi-token-plan-cn` | 订阅制（coding / token 套餐）provider id 列表，照常统计 token、费用记 0                                                        |
| `monthlyBudget`         | 未设置                                  | 月度预算默认金额（人民币元）；随 usage-stats 下发，作为仪表盘预算条的初始金额（用户在界面上的设置优先并本地持久化）                                             |
| `lowBalanceThreshold`   | `50`                                 | 余额不足告警阈值（人民币元）；随 usage-stats 下发，任一厂商余额折算人民币低于此值时每天提醒一次                                                       |
| `subscriptionPlans`     | 自动识别                                 | 订阅额度适配器白名单（`{ provider, baseUrl?, region? }`）；缺省时自动从 `llm-pi-ai` 设置识别所有订阅类 provider（有额度 API 的查额度，无 API 的仅标识） |
| `declaredEndpoints`     | 未设置                                  | 声明端点（`{ displayName, origin, path, fields?, windows?, raw? }`）：为内置表没有的供应商自声明余额/额度接口，只写「数字在哪里」的点路径、无表达式；请求由匹配到同源 provider 的 origin 构造，安全边界（单斜杠绝对路径、仅 GET、拒绝跨源重定向、响应体/超时上限、凭据只取匹配 provider 自有的 apiKeyEnv）由 `src/declarative.ts` 强制执行 |
| `reconcilePath`         | `~/.dsh/.dsh-usage-reconcile.json`     | 余额差对账基准的绝对路径；用官方（仅 DeepSeek 官方方向）余额当日变动与本地账本当日的官方渠道费用做交叉校验，偏差超阈值（0.3 元且 >15%）时提示核对；充值/授信/币种变化重置基准而非告警 |
| `searchCallEstimateCny` | `0.02`                               | 联网搜索请求（`web/deepseek-search-llm-request`，日志无用量事件）的单次费用估算（人民币元）；设 0 关闭估算（调用仍计数、不计费）                            |

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

- **权限等级：high**：读取持久会话日志（文件）、访问多厂商官方 / 订阅 / 余额 / 定价 API（网络）、经凭据 seam 读取 `apiKeyEnv`（凭据）、写入 `~/.dsh` 账本（持久状态）；**不含**命令执行 / Shell。
- **更新通道：`user-reviewed`**：本插件具备文件 / 网络 / 凭据能力，DSH STORE 采用每次安装需本机人工确认的通道；安装前请复核仓库、固定 Commit、生命周期脚本与影响范围。
- **兼容范围**：DSH `0.1.2-alpha.1` 起声明为 `compatible`（见 `package.json` 的 `dsh.compatibility.dshReleases`）；旧宿主（`0.1.0-rc.8` ~ `0.1.1-rc.2`）请停留在 v1.0.11。Node.js `^22.19.0 || >=24.0.0`。
- **生命周期**：无 `preinstall` / `install` / `postinstall` / `prepare`（安装即用）。
- **不冒用官方**：仅新增自有 entry id `ui-usage-billing`；对 `@deepseek-ai/dsh-*` 仅为 `peerDependencies` 依赖（不重复安装 / 不替换 / 不遮蔽官方组件），包名使用第三方命名空间 `@kenz1117/*`。
- **打包产物**：运行文件 `lib/*` 与 `cordis.patch.yml` 已随固定 Commit 提交并声明在 `files`。
- **源码锚点**：源码以 GitHub 默认分支上的固定 Commit 锁定并可追溯；例如 v1.0.13 对应 `c8e2a325689fb823d90c5c44857e6224465ea6cf`。DSH STORE 自动化每约 8 小时重新读取默认分支 HEAD 作为新的固定 Commit，并按 SemVer 变更判定是否重新审查。

## 🤖 Model Experience

无。本插件是纯 UI surface：不注册工具、不注入系统提示、不向会话日志写入模型可见事件，也不触及会话 KV 缓存；用量统计由服务端从既有会话日志聚合，日志内容由其他包各自负责。

## ⚠️ Known Limitations and Deferred Work

- **余额查询已接入 DeepSeek / 月之暗面（Kimi）/ 阶跃星辰（StepFun）/ 硅基流动 / xAI / 智谱 GLM（Z.ai 国内域）/ 腾讯云 TokenHub（Token Plan 余量）**：前六家用标准 Bearer API key，腾讯云用云 API 密钥对（TC3 签名）。其余厂商因无公开余额接口或需非 Bearer 鉴权（小米 MiMo 走控制台 Cookie、商汤走 AccessKey 签名、MiniMax/字节豆包走额度制或 AK/SK），暂显示「未配置」；扩展点在 `src/balance.ts`（按厂商余额 API 增加查询器）。
- **中转站额度依赖上游私有 schema**：New API / Sub2API 的接口字段未公开，读不出时标「未读出额度」而非臆造金额；若某中转站响应字段不同，需按 `src/relay.ts` 的解析器扩展。未知路由表示该路由在当前 provider 配置里已不存在（改过名 / 删除过），历史调用数据未丢，重新配置同名路由即可自动归位。
- **超支通知依赖浏览器 Notification**：权限被拒绝或平台不支持时只有界面红色脉冲兜底，没有宿主级通知通道；通知上限为每天一次。
- **会话明细不可跳转**：点击会话行不会打开对应会话（跨插件导航需要宿主会话选择通道）；会话数封顶 100 行、面板只显示前 20 行。
- **费用为目录价估算**：讯飞 / 商汤 / 小米等未公布按量单价的模型使用估算价（特性表脚注 ¹），正式定价以厂商账单为准。
- **账本从首次成功聚合开始生效**：升级前已经永久删除且不在旧快照中的会话无法恢复；手动删除 `.dsh-usage-ledger.json` 及其 `.bak` 会清空独立保留的历史。账本只保留本插件已经成功观测过的调用。

## ❤️ Contributors

- [@ciphoo](https://github.com/ciphoo) — MiniMax 国内域 Token Plan 订阅额度支持（PR #5）
- [@fabulousyuann-tech](https://github.com/fabulousyuann-tech) — 会话删除后用量保留的持久 ledger 功能（PR #8）
- [@hi-fangj](https://github.com/hi-fangj) — 每日 Token 柱状图悬停精确明细 tooltip（PR #21）

## 📄 许可证

[MIT](LICENSE) © 2026 KenZ (kenz1117)

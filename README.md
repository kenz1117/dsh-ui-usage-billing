<div align="center">

# dsh-ui-usage-billing

<p align="center">DeepSeek Harness 计费仪表盘插件 — 从持久化会话日志实时聚合模型用量，按多厂商最新官方价格估算费用，侧边栏一键查看完整仪表盘。</p>

<p align="center">
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing/blob/main/LICENSE"><img alt="GitHub license" src="https://img.shields.io/github/license/kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing"><img alt="GitHub stars" src="https://img.shields.io/github/stars/kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://github.com/kenz1117/dsh-ui-usage-billing"><img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing"><img alt="npm version" src="https://img.shields.io/npm/v/@kenz1117/dsh-ui-usage-billing"></a>
  <a href="https://awesome-dsh-plugin.com"><img alt="Awesome DSH Plugin" src="https://awesome-dsh-plugin.com/badge.svg"></a>
</p>

[中文](README.md) · [English](README.en.md)

</div>

---

> **峰谷计费规则更新（自 2026-08-23（周日）00:00 起）**：DeepSeek 模型按官方新规计费——**工作日（周一至周五）** 继续执行原峰谷分段计费（高峰 09:00–12:00 / 14:00–18:00，×2）；**周末（周六、周日）** 全天不再区分峰谷时段，统一按**低谷价**计费。插件计费引擎、费率表与每轮费用峰谷分带均已同步生效。

### 演示动图

![演示](screenshots/demo.gif)

## 特性

- **侧边栏入口**：设置按钮上方的仪表盘式触发卡——本月费用主数字（等宽字体）+ 近 7 天 sparkline 迷你趋势，副行「今日 / 本周」；折叠栏自动切为图标钮；悬停浮现速览卡。
- **计费仪表盘（分区 Tab）**：概览 / 趋势 / 明细 / 统计 / 费率 / 设置 六区——Hero 大数字 + 本年/今日环比 + 本月预计 + KPI×4 + 热力图；趋势图 7/30 天；厂商计费与订阅；导出 / 费用构成 / 工作区 / 会话明细；模型单价表；预算与峰谷提醒。克制冷调、`--dsw-*` 令牌、深浅主题自适应。

  ![概览：本月费用 Hero、预算进度、KPI 与用量热力图](screenshots/1.png)
- **即时代费用条**：输入框下方常驻「本轮 ¥x · 会话 ¥y」+ 峰谷档位与切换倒计时 + 订阅额度预警 chips（≤20% 浮现、≤10% 红）。
- **峰/谷切换提醒**：切档前弹窗 + 可选系统通知（提前量 / 位置 / 模式 / 预览可配），区分「即将进峰时 ×2 可稍等」/「即将进平价 价格减半」。
- **实时定价费率表**：models.dev 抓价 + 探活模型对标——系统实际配置模型全纳入；峰谷分时（工作日 9-12 / 14-18 高峰 ×2，周末全天低谷）+ 实时汇率（USD→CNY），每 6 小时刷新。

  ![费率：模型单价表（峰谷分时与实时汇率）](screenshots/5.png)
- **官方 vs 三方分桶**：明细费用列按官方 DeepSeek 直连 / 第三方中转分解（混合时「官 x / 三 y」），统计 Tab 有「官方/三方」汇总卡。
- **月度预算 + 分档提醒**：预算条（开关 / 金额 / 进度，≥80% 琥珀、超支红脉）；跨 50 / 80 / 100% 各提醒一次；余额折算 CNY 低于阈值每天提醒一次。
- **订阅套餐额度**：识别 `llm-pi-ai` 里的订阅类 provider（Kimi / Z.ai / OpenCode Go / MiniMax / OpenRouter / 小米 / 火山…），有额度 API 的实时显示剩余%与重置时间、用尽标红，无 API 标「未接入」；订阅通道模型费用记 0。

  ![明细：厂商计费与订阅（余额、套餐额度、模型用量）](screenshots/3.png)
- **自定义 Provider 余额**：配置任意 HTTP 端点查余额（`extract` 支持常量 / 点路径 / add-subtract / divide，请求头 `{{ENV}}` 经凭据 seam）；DeepSeek / Kimi / 阶跃星辰 / 硅基流动内置官方余额，余额列按近 7 天日均折算「约可撑 N 天」。
- **真实用量聚合**：服务端从会话日志实时聚合（增量缓存只重算写过的会话），单会话损坏容错、快照落盘回退；`usage_stats` 工具让模型自查今天 / 本月花费。
- **多语种 + 双币种**：¥ / $ 切换随币种双语（USD→英文、CNY→中文，仅本插件生效）；费率表按所选币种换算。
- **模型健康 + 未收录标注**：厂商接入状态圆点（绿 / 红 / 灰）；模型 id 不在目录时标「未收录」按兜底价估算、厂商自动推断（如 `mi-mimo-2.5` → 小米）；估算价模型标注「估算价」。
- **会话明细 + 成本突增 + 热力图**：按会话费用倒序（标题 / 项目 / 调用 / 费用 / 最后活跃）；每轮费用柱状图（最近 40 轮、金额贴柱顶、峰谷背景分带、超 2 倍红标归因）；当月日历热力图（5 档色阶、悬停明细）。

  ![趋势：每日费用趋势、每轮费用与峰谷时段占比](screenshots/2.png)

- **数据导出 + 离线自包含**：统计 Tab 导出按日 / 按会话 CSV 与全量 JSON；无图表库、无外部 CDN、纯设计令牌。

  ![统计：导出、费用构成、工作区与会话明细](screenshots/4.png)

## 快速开始

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

## 工作原理

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

- **服务端**（`src/index.ts`）：注入 `webServer`、`sessionPersistence` 与 `credentials`，注册 `GET /api/billing/usage-stats`、`/api/billing/pricing`、`/api/billing/balance`。聚合器按会话缓存折叠结果：一次 LLM 调用归属到其前置 `request/header` 记录的模型，token 拆分到缓存命中 / 未命中桶，日期按本机时区归天；日志文件 mtime+size 不变则直接复用缓存，只有写过的会话重新折叠，整份文档另有 5 秒 TTL 合并密集轮询。聚合逻辑见 `src/aggregate.ts`。
- **浏览器端**（`src/client/`）：请求上述接口渲染仪表盘，通过 `llm.models` 探测各厂商连接状态。真实数据到达前显示全零空快照，不展示伪造样本。

## 主题协作

本插件**不依赖任何主题包**，可独立安装运行。仪表盘弹窗声明 `billing.dashboard.decor` 装饰孔位（head / hero / trend / models / footer 锚点），并将实时费用摘要注册为 `ctx.billingMetrics` 服务：主题插件（如 acid-zine）主动注入 MacDots / 胶带 / 撕角便签等装饰视觉、订阅费用数据渲染自己的贴纸层。插件与主题各自独立装卸——主题不存在时走默认视觉，billing 不存在时主题照常运行。

## 计费引擎

单价表（`src/client/pricing.ts`）采用**原生币种**存储：国内厂商直接录入人民币价格，国外厂商录入美元价格。费用统一以人民币计算与展示——美元模型按**实时汇率**折算，国内模型全程不经过汇率换算。启动时服务端拉取实时汇率与模型价（`src/pricing-fetch.ts`）：USD→CNY 优先腾讯财经行情（免 key、国内可达），失败依次降级 open.er-api 与内置默认值；之后每 6 小时后台刷新，单价表弹窗标注「今日汇率」与实时 / 内置徽标。金额与费率表的**展示币种跟随用户所选**：切 ¥ / $ 时把每条每百万 token 单价经 `convertUnitPrice` 按实时汇率换算到目标币种再显示（汇率缺失时回退原生币种）。

```
cost（CNY）= (missInput × p_input + cacheHit × p_cacheHit + output × p_output) / 10⁶
           —— 价格为原生币种；美元模型按实时 USD → CNY 汇率折算
```

统计中的 `input` 为总输入（cacheHit + cacheMiss），估算按命中 / 未命中分拆计价，避免重复计费。支持双档计费的模型按 `DEFAULT_PEAK_SHARE`（默认 0.5）混合高峰与低谷档；周末（北京时间周六 / 周日）全天按低谷价计费。

### 支持模型（2026-08-21 主流阵容，OpenAI 兼容系列）

| 厂商       | 模型                                                                                      |
| -------- | --------------------------------------------------------------------------------------- |
| DeepSeek | V4 Flash、V4 Flash Vision (Exp)、V4 Pro（按时段峰谷计费：工作日高峰 09:00-12:00 / 14:00-18:00 北京 = 低谷 2 倍；周末全天低谷） |
| 智谱 AI    | GLM-5.3、GLM-5.2、GLM-4.6                                                                 |
| 阿里通义     | Qwen3.8 Max、Qwen3.7-Max、Qwen3.5-Plus、Qwen3.5-Flash                                      |
| 字节豆包     | Doubao Seed-2.0 Pro、Seed-2.0 Mini、Seed-1.6                                              |
| 月之暗面     | Kimi K3、K2.7 Code、K2.7 Code HighSpeed、K2.6                                              |
| 小米       | MiMo V2.5（走 token plan 订阅通道时豁免计费）¹                                                      |
| MiniMax  | MiniMax-M3                                                                              |
| 百度       | ERNIE-5.1                                                                               |
| 腾讯       | 混元 T1、混元 Hy3                                                                            |
| 零一万物     | Yi-Lightning                                                                            |
| 阶跃星辰     | Step 3.7 Flash                                                                          |
| 科大讯飞     | Spark 4.0 Ultra（套餐制）¹                                                                   |
| 商汤       | SenseNova 6.5（公测中）¹                                                                     |
| 百川智能     | Baichuan M3-Plus                                                                        |
| OpenAI   | GPT-5.6 Sol / Terra / Luna                                                              |
| Google   | Gemini 3.1 Pro、3.6 Flash（Standard / Flex 双档，Flex = -50%）                                |
| xAI      | Grok 4.6、Grok 4.3                                                                       |
| Meta     | Llama 4 Maverick、Scout                                                                  |
| 其他       | 未收录模型的统一回退定价                                                                            |

> ¹ 讯飞、商汤、小米未公布按量单价，表内为估算价；这些模型走订阅通道（coding / token plan / opencode）时费用记 0，正式定价公布后自动校准。订阅通道与 pi-ai 内置提供方对齐（kimi-coding、zai-coding-cn、opencode、opencode-go、qwen/xiaomi 的 token-plan 各区域变体），可按 `subscriptionProviders` 配置覆盖。

新增模型：在 `MODEL_CATALOG` 追加条目，并在 `src/client/pricing.ts` 的 `MODEL_KEY_ALIASES` 中映射真实模型 id（聚合层与客户端渲染共用同一张表）。

## HTTP API

对外 HTTP 接口与字段定义详见源码：`GET /api/billing/pricing`、`/api/billing/balance`、`/api/billing/usage-stats`（见 `src/index.ts`、`src/aggregate.ts`）。

## 配置

| 字段                      | 默认                                   | 说明                                                                                                           |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `statsPath`             | 未设置                                  | 回退统计文件 `.dsh-usage-stats.json` 的绝对路径（`sessionPersistence` 不可用时生效）                                            |
| `balanceApiKeyEnv`      | `DEEPSEEK_API_KEY`                   | DeepSeek 余额查询的凭据引用；仅在 llm-pi-ai 未配置 deepseek 的 `apiKeyEnv` 时兜底使用                                             |
| `subscriptionProviders` | `kimi-coding`、`xiaomi-token-plan-cn` | 订阅制（coding / token 套餐）provider id 列表，照常统计 token、费用记 0                                                        |
| `monthlyBudget`         | 未设置                                  | 月度预算默认金额（人民币元）；随 usage-stats 下发，作为仪表盘预算条的初始金额（用户在界面上的设置优先并本地持久化）                                             |
| `lowBalanceThreshold`   | `50`                                 | 余额不足告警阈值（人民币元）；随 usage-stats 下发，任一厂商余额折算人民币低于此值时每天提醒一次                                                       |
| `subscriptionPlans`     | 自动识别                                 | 订阅额度适配器白名单（`{ provider, baseUrl?, region? }`）；缺省时自动从 `llm-pi-ai` 设置识别所有订阅类 provider（有额度 API 的查额度，无 API 的仅标识） |

## 开发

环境要求：Node.js ^22.19 || >=24，pnpm。

```sh
pnpm install
pnpm --filter @kenz1117/dsh-ui-usage-billing bundle   # 构建 lib/index.js 与 lib/client.js
npx vitest run packages/client/ui-usage-billing/tests  # 单元测试
```

## 发布

本包为独立 npm 包，发布后即可被其他 DeepSeek Harness 宿主安装。

```sh
npm publish --access public
```

宿主通过 `package.json` 的 `dsh.client` 声明（`platform: web`）与 `exports["./client"]` bundle 自动发现浏览器端，无需注册中心登记。

## Model Experience

无。本插件是纯 UI surface：不注册工具、不注入系统提示、不向会话日志写入模型可见事件，也不触及会话 KV 缓存；用量统计由服务端从既有会话日志聚合，日志内容由其他包各自负责。

## Known Limitations and Deferred Work

- **余额查询已接入 DeepSeek / 月之暗面（Kimi）/ 阶跃星辰（StepFun）**：这三家用标准 Bearer API key 即可查询。其余厂商因无公开余额接口或需非 Bearer 鉴权（小米 MiMo 走控制台 Cookie、商汤走 AccessKey 签名、MiniMax/字节豆包走额度制或 AK/SK），暂显示「未配置」；扩展点在 `src/balance.ts`（按厂商余额 API 增加查询器）。
- **超支通知依赖浏览器 Notification**：权限被拒绝或平台不支持时只有界面红色脉冲兜底，没有宿主级通知通道；通知上限为每天一次。
- **会话明细不可跳转**：点击会话行不会打开对应会话（跨插件导航需要宿主会话选择通道）；会话数封顶 100 行、面板只显示前 20 行。
- **费用为目录价估算**：讯飞 / 商汤 / 小米等未公布按量单价的模型使用估算价（特性表脚注 ¹），正式定价以厂商账单为准。
- **30 天趋势受日志保留范围约束**：超出持久化日志保留期的日期在窗口内补零显示，不回溯历史。

## 许可证

[MIT](LICENSE) © 2026 KenZ (kenz1117)

# dsh-ui-usage-billing

[![GitHub license](https://img.shields.io/github/license/kenz1117/dsh-ui-usage-billing)](https://github.com/kenz1117/dsh-ui-usage-billing/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/kenz1117/dsh-ui-usage-billing)](https://github.com/kenz1117/dsh-ui-usage-billing)
[![GitHub last commit](https://img.shields.io/github/last-commit/kenz1117/dsh-ui-usage-billing)](https://github.com/kenz1117/dsh-ui-usage-billing)
[![npm version](https://img.shields.io/npm/v/@kenz1117/dsh-ui-usage-billing)](https://www.npmjs.com/package/@kenz1117/dsh-ui-usage-billing)

DeepSeek Harness 计费仪表盘插件：侧边栏"设置"上方一个触发按钮，点开是完整的计费仪表盘——总费用 Hero、KPI 指标卡、无第三方库的 SVG 每日趋势图、按模型统计的计费明细表（内置多厂商最新价格表）和单价表。完全离线、无 CDN、无图表库依赖。

## 功能特性

- **侧边栏触发按钮**：宽侧边栏显示含累计费用的胶囊按钮；折叠栏显示图标按钮
- **居中仪表盘弹窗**：
  - Hero：总费用渐变卡 + 今日费用 + 日环比
  - KPI 卡：缓存命中率、Token 总量、单次平均成本、调用次数
  - 每日趋势图：SVG 费用面积线 + 调用柱状图，支持悬浮十字线与提示
  - 模型计费明细表：按模型的调用/输入/输出/缓存命中率/估算费用与实际费用
  - 单价表：每个支持模型的输入 / 缓存命中 / 输出单价（默认收起）
- **模型健康点**：每个模型行的小圆点——该厂商模型目录加载成功（凭据有效）显示绿色、探测失败红色、未接入灰色，通过宿主 `llm.models` 探测
- **真实用量**：node half 从持久化的会话日志实时聚合出 `/api/billing/usage-stats`，无需手工维护统计文件
- **订阅计划不计费**：走 coding/token 套餐的模型照常统计 token 但费用记 0
- **暗色/亮色自适应**：全部使用 `--dsw-*` 设计令牌，无硬编码颜色
- **自包含**：无图表库、无外部 CDN，完全离线可用

## 展示位置

注册在 `sidebar.footer.action`——左侧边栏底部、设置按钮正上方。宽侧边栏显示胶囊按钮，折叠栏显示图标。

## 工作原理

插件分两个半边：

- **Node 半边**（`src/index.ts`）：注入 `webServer` + `sessionPersistence`，注册 `GET /api/billing/usage-stats`。每次请求把全部持久化会话日志做一次折叠（`aggregate.ts`）：一次 LLM 调用归属到它前面最近的 `request/header` 记录的模型，token 按缓存命中/未命中分桶，日期按本机时区归天。
- **浏览器半边**（`src/client/`）：请求该接口渲染仪表盘，并通过 `llm.models` 探测健康点。真实数据到达前（或接口不可用时）显示全 0 空快照——绝不显示伪造的样本数据。

## 计费引擎

[`pricing.ts`](src/client/pricing.ts) 持有各模型的单价表与费用估算。**每个模型的价格表用它的原生币种**：国内厂商（DeepSeek、智谱、通义…）直接存人民币；国外厂商（OpenAI、Google、xAI、Meta）存美元。费用统一按人民币计算展示——只有美元计价的模型经过汇率（CFETS 中间价 6.79，2026-08-14），国内模型全程不经过汇率。

```
cost（人民币）= (missInput×p_input + cacheHit×p_cacheHit + output×p_output) / 1M tokens
              —— 价格本身是人民币；国外模型为 USD × 6.79
```

统计的 `input` 是总输入（cacheHit + cacheMiss），估算器拆分计价——命中份额按命中价、其余按未命中价，不重复计费。

**支持模型（2026-08-16 主流阵容，OpenAI 兼容系列，已剔除退役型号）：**

| 厂商 | 模型 |
|---|---|
| DeepSeek | V4 Flash、V4 Pro — **按时段峰谷计费**（高峰 09:00-12:00 / 14:00-18:00 北京 = 低谷 2 倍，2026-08-17 起） |
| 智谱 AI | GLM-5.3、GLM-5.2、GLM-4.6 |
| 阿里通义 | Qwen3.8 Max、Qwen3.7-Max、Qwen3.5-Plus、Qwen3.5-Flash |
| 字节豆包 | Doubao Seed-2.0 Pro、Seed-2.0 Mini、Seed-1.6（缓存命中免费） |
| 月之暗面 | Kimi K3、K2.7 Code、K2.7 Code HighSpeed、K2.6 |
| MiniMax | MiniMax-M3 |
| 百度 | ERNIE-5.1 |
| 腾讯 | 混元 T1、混元 Hy3 |
| 零一万物 | Yi-Lightning |
| 阶跃星辰 | Step 3.7 Flash |
| 科大讯飞 | Spark 4.0 Ultra（套餐制，约价） |
| 商汤 | SenseNova 6.5（公测中，约价） |
| 百川智能 | Baichuan M3-Plus |
| OpenAI | GPT-5.6 Sol / Terra / Luna |
| Google | Gemini 3.1 Pro、3.6 Flash — **Standard / Flex 双档**（Flex = 闲时流量 -50%，非按时段） |
| xAI | Grok 4.6、Grok 4.3 |
| Meta | Llama 4 Maverick、Scout |
| Custom | 未知名模型的 `other` 兜底价 |

- **估算**按单价表计算；**实际**是按真实会话用量聚合的成本。明细表两列都展示。
- **双档模型**：DeepSeek 高峰价 = 低谷 2 倍；Gemini Standard = Flex 2 倍。估算器按 `DEFAULT_PEAK_SHARE`（0.5）混合两档——改 `pricing.ts` 里的常量或单价表即可调整。
- 表里没有的模型：往 `MODEL_CATALOG` 加条目即可（node half 通过 `aggregate.ts` 的 `MODEL_KEY_ALIASES` 把真实 model id 映射到计费键）。

## 安装 / 组合

在 `cordis.patch.yml` 加一行：

```yaml
- name: '@kenz1117/dsh-ui-usage-billing'
```

可选配置：

| 字段 | 默认 | 说明 |
|---|---|---|
| `statsPath` | 未设置 | 当 `sessionPersistence` 不可用时，回退读取的 `.dsh-usage-stats.json` 绝对路径 |

## 开发

```sh
pnpm install
pnpm --filter @kenz1117/dsh-ui-usage-billing bundle   # 产出 lib/index.js + lib/client.js
npx vitest run packages/client/ui-usage-billing/tests  # 单元测试
```

## 安装（发布到 GitHub / npm）

这是一个完整独立的 npm 包。

1. 从本目录发布：

   ```sh
   npm publish --access public
   ```

2. 使用方安装到他们的 profile：

   ```sh
   dsh plugin --profile web add @kenz1117/dsh-ui-usage-billing
   ```

   或在 `cordis.patch.yml` 添加：

   ```yaml
   - insert:
       - id: ui-usage-billing
         name: '@kenz1117/dsh-ui-usage-billing'
   ```

宿主通过 `package.json` 里的 `dsh.client` 声明（`platform: web`）加 `exports["./client"]` bundle 自动发现浏览器半边，无需注册中心登记。

## 模型体验

无——该插件只读取并展示用量数据，不发送模型请求、不影响提示词组装。

## 已知限制与后续规划

- **聚合成本与日志总量线性相关**——每次请求都重读全部会话日志。未来版本可为每个会话持久化增量计数器。
- **价格是快照值**——单价表在编写时对齐了各厂商官方标价；厂商会调整价格，部署时请核对 `pricing.ts` 中的有效费率。
- **趋势图是柱 + 单线**——趋势视图展示费用（线）与调用（柱）；多模型序列需要分类图例。

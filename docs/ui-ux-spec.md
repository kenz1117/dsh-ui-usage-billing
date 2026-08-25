# dsh-ui-usage-billing 前端整体 UI/UX 重构需求

> 本文档面向 UI/UX 设计师 agent，用于整体重构该插件的浏览器端界面（不止 footer 卡片与浮层，
> 含仪表盘弹窗的全部内容与信息架构）。

## 一、项目与重构范围

插件 `@kenz1117/dsh-ui-usage-billing` 是一个 **DeepSeek Harness 用量计费仪表盘**——把每一分模型开销
看清楚。重构范围 = 插件暴露给用户的**全部可视化表面**：

- 4 个常驻 / 浮层表面：Sidebar Footer 触发卡（含 hover 速览浮层）、即时费用条、峰谷切换提醒浮层、仪表盘弹窗。
- 弹窗内部 6 个 Tab：概览、明细、用量、趋势、费率、设置。

目标是：提升信息层级与可读性、统一设计语言、修复已知交互缺陷、补齐无障碍与本地化，
同时保持「真实用量、不伪造样本」的产品底线。

## 二、信息架构总览

```
侧边栏 Footer 触发卡（常驻，wide / rail 两形态）
   └─ hover 速览浮层（综合指标卡 / 订阅额度轮播卡）
仪表盘弹窗（点击触发卡/浮层打开，modal）
   ├─ 概览 Overview：对账提示条 → Hero 主数字+环形仪表盘 → 未计价提示 → KPI×4 → 用量热力图
   ├─ 明细 Providers：中转站分布 → 中转站额度 → 厂商计费与订阅（模型子表+订阅额度卡）→ 官方/三方汇总 → 工作区(下钻) → 会话明细
   ├─ 用量 Token：每日 Token 堆叠 → 模型 Token 占比 → Token 结构 KPI → 导出；性能面板（TTFT/速度/延迟）
   ├─ 趋势 Trends：趋势图(7/30天,费用/Token) → 每轮费用+成本突增 → 峰谷时段占比
   ├─ 费率 Pricing：模型单价表（实时汇率+来源徽标+峰谷分带）
   └─ 设置 Settings：月度预算 → 峰谷切换提醒 → usage_stats 工具开关 → 模型用量悬浮窗 → 插件信息卡
composer 即时费用条（常驻，输入框下）
峰谷切换提醒浮层（右下角 / 居中，fixed）
```

## 三、视觉锚点（现有实现截图）

> 以下为本插件现有实现的真实截图，存放于仓库根 `screenshots/`，是「精致科技风」
> 最直观的参照——玻璃浮层、等宽数字、蓝/青绿/琥珀/红语义色、1px 边框、深浅主题。
> 重构以这些截图的**视觉气质**为准，信息架构以本文档第二节为准。

**重要：截图反映的是偏旧的 Tab 结构**（「概览 / 趋势 / 明细 / 统计 / 费率」5 个 Tab），
与当前重构范围的 **6 Tab（概览 / 明细 / 用量 / 趋势 / 费率 / 设置）** 有出入——
原「统计」Tab（导出 / 费用构成 / 工作区 / 会话明细）内容已部分并入「明细」，
且当前新增了「用量」「设置」。重构时**界面结构按本文档，视觉风格按截图**。

| 图 | 对应表面 / Tab | 视觉要点 |
| --- | --- | --- |
| `demo.png` | 仪表盘总览概览 | 全屏弹窗整体布局：左侧大 Hero + 右侧副读数，冷调玻璃 |
| `1.png` | 概览 Overview | Hero 本月费用大数字、环形仪表盘、预算进度条、KPI×4、月历热力图 |
| `2.png` | 趋势 Trends | 多模型堆叠趋势图、每轮费用柱(成本突增红标)、峰谷占比条 |
| `3.png` | 明细 Providers | 厂商计费与订阅：模型用量子表 + 余额 + 订阅额度卡(本次/本周) |
| `4.png` | 统计（旧）→ 明细 | 导出、费用构成(用户/助手/工具)、工作区统计、会话明细 |
| `5.png` | 费率 Pricing | 模型单价表：峰/谷双价单元格、实时汇率 + 来源徽标 |

![概览 Overview](screenshots/1.png)

![趋势 Trends](screenshots/2.png)

![明细 Providers](screenshots/3.png)

![统计（旧）/ 导出与工作区](screenshots/4.png)

![费率 Pricing](screenshots/5.png)

## 四、设计语言（必守）

由 `src/client/UsageBilling.module.css` 提炼，重构贯穿所有表面：

- **风格**：精致科技风（Refined-tech）——令牌驱动表面、1px 边框、**大面积禁渐变**
  （仅保留 1.5px 顶部「金光流光饰条」这一处装饰性渐变）。
- **表面**：玻璃质地 = 半透明底
  `color-mix(in srgb, var(--dsw-alias-bg-layer-2) 72~78%, transparent)` +
  `backdrop-filter: blur(10~14px) saturate(1.2~1.3)` + `inset 顶部高光`（label-primary 7~8%）。
- **边框**：`1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 80~82%, transparent)`；
  圆角：卡片 14px、窄栏图标钮 8px、徽标/标签小圆角。
- **数字**：金额 / token 一律 `font-variant-numeric: tabular-nums` 等宽对齐；
  主数字用等宽字体（monospace）强调。
- **颜色语义（`--dsw-static-*`）**：
  - `blue-500`：峰时 / 主强调 / 健康
  - `green-500`：平价 / 安全 / 正常
  - `amber-500`：警告 / 流光饰条（剩余 ≤20%、预算 ≥80%）
  - `red-500`：危险 / 超限 / 用尽（剩余 ≤10%、超支、余额不足）
  - `neutral-300 / 400`：次要文字、分隔符
- **文字层级**：`label-primary`（主）/ `label-secondary`（次）/ `neutral-*`（辅助）。
- **动效**：浮层 `opacity + translateY(4px→0)` 160ms；峰谷提醒入场 200ms；过渡仅 160ms ease。禁重量级动画。
- **约束**：无图表库（SVG 手绘）、无外部 CDN、纯 CSS Module + `clsx`。

## 五、表面 A — Footer 触发卡 + Hover 速览浮层

### 触发卡

**锚点**：`sidebar.footer.action`（侧边栏底部「设置」按钮上方）。组件 `UsageBillingTrigger`。

**形态 1：宽卡（wide）**
- 横向 flex：icon 徽标（圆角矩 + 细线描边 SVG，18px、stroke 2）｜主数字区｜右侧 7 天 sparkline。
- 主行「当月 ¥X」（大号等宽）+ 副行「今日 ¥A · 本周 ¥B」（`weekCost>0` 才显示）。
- 数据：`monthCost / todayCost / weekCost / days[].cost`，金额用 `formatMoney`。

**形态 2：窄栏（rail）**
- 36×36 图标钮，圆角 8，`border-l1` 边框，hover/focus 变 `blue-500`；`flex:none`。

**响应式**：容器查询 `@container billing-trigger` 断点 280px（隐藏 sparkline）、230px（隐藏副行）、120px（仅图标）。

**交互**：整卡 `<button>` 点击开弹窗；`title` 提示；hover/focus 显速览浮层。

**设计机会点**：主数字等宽大字号 + 金额单位弱化；sparkline 升级为 SVG 迷你面积/折线；
低预算/超支时主数字旁加状态色点。

### 速览浮层（triggerPop）

**挂载**：绝对定位于触发卡上方 `bottom: calc(100%+8px)`、`left/right:0`、z-index 10；纯 CSS hover 呈现；顶部金光流光饰条。

**模式 1：综合（Combined）**
- 标题区（可选更新时间）；6 指标 2 列网格：本月费用(高亮)/总 Token/输入/输出/缓存命中/调用数。
- 底部「主力消耗模型」：直联 / 订阅徽标 + 厂商名 + 余额 / 额度状态文案（正常/低/未配置/密钥无效/查询失败）；
  无消耗显示「暂无消耗」。
- 数据：`dash.*`、`vendorStatus.direct/sub`、`monthCost`。

**模式 2：订阅（Subscription）**
- 单张订阅额卡：显示名 + 套餐名 + 各额度窗口（本次/本周/本月/计费周期）；
  每窗口：标签 + 进度条(≥80% 琥珀、100% 红) + 剩余%或「已用尽」 + 重置时间。
- 多套显示「2/3」计数，每 1.5s 自动轮播。数据：`currentSub`。

**交互**：整卡 `pointer-events:none`，仅「展开详情」可点。

**已知缺陷（重构必改）**：订阅模式自动轮播在浮层不可见时也在跑——需改为仅可见时轮播。

**设计机会点**：「展开详情」点击开对应 Tab；订阅进度条加剩余绝对额度；综合模式底部状态 icon 化低值警示。

## 六、表面 B — 即时费用条（LiveCostBar）

**锚点**：`conversation.composer.dock`（输入框下常驻，与 StatsLine 同姿态）；无 `sessionId` 渲染 null。

**内容**（左→右，`·` 分隔，11px、tab-num）：
1. 峰谷 chip（`tierPeak` 蓝 / `tierOff` 青绿）+ 切换倒计时（`1h23m / 45m`）+「后转峰时/后转平价」。
2. 费用仅在有值时：`本轮 ¥a`、`会话 ¥b`。
3. 订阅额度预警 chips（剩余 ≤20% 浮出、≤10% 红，最多 3 枚按剩余升序）。

**数据**：`sessionId`；`sessionCostOf / turnCostOf`；`tierCountdown(nowMs)`；`lowQuotaChips(quotas, 20)`。

**设计机会点**：常驻条轻微玻璃底或 hover 浮现；峰谷 chip 与费用主次分明；低配额 chip 加 icon。

## 七、表面 C — 峰谷切换提醒浮层（PeakAlertBanner）

**挂载**：仪表盘根层 `position:fixed`（右下角 `peakAlertCorner` / 居中 `peakAlertCenter`），无需 portal。

**结构**：档位徽标（`tierPeak`/`tierOff`，前缀色点）+ 大号等宽倒计时「Nm」+ 一句说明 + 关闭按钮(×)。
**内容**：剩余分钟（下限 1）+ 进入档位文案（进峰：「高峰价生效…」/ 进平价：「价格减半…」）。`role="alert"`。
**行为**：每秒刷新剩余分钟；**越过切换点自动卸载**（调 `onDismiss`）；位置与「峰/谷/都提醒」「是否系统通知」由设置控制。

**设计机会点**：浮层轻微玻璃化 + 关闭按钮 hover 态；倒计时配色随进入档位（进峰=蓝、进平价=青绿）。

## 八、表面 D — 仪表盘弹窗（六 Tab）

### 概览 Overview

- **对账提示条**（仅 drift 时）：中性说明「本面板只统计本机 dsh 会话」+ 官方余额变动 vs 本地费用差额 + 「知道了」。
- **Hero**：左上「本月费用」液晶大数字 + 右上环形仪表盘（stroke-dasharray 画弧，中心 % + 标签，
  无预算时按「本月占本年」装饰、超支转红）+ 底部副行「本年/今日(带 ▲▼ 环比)/本月预计」。
- **未计价模型提示**：目录外/无价模型按 0 计，提示「N 个模型未收录计价」。
- **KPI×4**：缓存命中率 / Token / 平均成本 / 调用数（每格 label + 大值 + detail）。
- **用量热力图**：月/年切换 + 活跃天数/连续使用摘要；GitHub 风格色阶。

### 明细 Providers

- **中转站分布**：按 `baseURL` 归组（站点/直连/未知路由），每行站点名 + 类别标签 + 费用 + 调用数。
- **中转站额度**：New API / Sub2API 的余额 + 滚动窗口（剩余 <20% 标红），无额度标「未读出额度」。
- **厂商计费与订阅**：单一容器按厂商聚合——厂商头部（健康点 + 套餐数 + 余额，
  `hideBalanceForGroup` 决定是否显示余额）+ 模型用量子表（模型/调用/输入/输出/缓存命中率/实际费用，
  「未收录」「估算价」标签；纯订阅显示「订阅包含」，官方/三方/混合三态费用分拆）+ 订阅额度卡
  （plan 双口径徽标「订阅制 $/月 自动识别」/「按量」+ 各额度窗口进度条）。
- **官方 vs 三方汇总**：官方(=DeepSeek 直连)/三方(中转) 费用 + 调用数统计卡。
- **工作区统计**：按 cwd 末级目录归并，点行可下钻该项目成本前 5 会话。
- **会话明细**：按费用倒序（标题/项目/调用/费用/最后活跃），封顶显示行数 + 超出提示。

### 用量 Token

- **每日 Token 堆叠**：输入(缓存未命中)/输入(缓存命中)/输出 三桶分色柱状，7/30 天切换。
- **模型 Token 占比**：模型排行 + 占比分段条。
- **Token 结构 KPI**：缓存命中率 / 思考占比 / 输入输出比 / 峰值日。
- **导出**：按日 Token CSV + JSON。
- **性能面板**：按模型 TTFT 均值/P50/P90、生成速度、总延迟 + 按小时 TTFT/速度曲线；
  「估算样本」标注工具续写步骤。

### 趋势 Trends

- **趋势图**：7/30 天，费用/Token 指标切换，多模型堆叠折线/柱状。
- **每轮费用 + 成本突增**：最近 N 轮柱状（金额贴顶、峰谷背景分带、超 2 倍红标归因），
  标题带异常计数徽标。
- **峰谷时段占比**：近 N 轮费用高峰/空闲分摊条 + 图例（含金额与百分比）。

### 费率 Pricing

- **模型单价表**：模型名（色点 + 品牌色）｜输入｜缓存命中｜输出｜时段（峰/谷双价单元格）；
  「未收录」标；头部实时汇率（`1 USD = ¥X`）+ 来源徽标（实时/内置）+ 峰谷说明条。

### 设置 Settings

- **月度预算**：开关 + 金额编辑（¥ 单位）+ 进度条（≥80% 琥珀、≥100% 红色脉冲）+ 提示。
- **峰谷切换提醒**：开关 + 提前量(1-30 分钟) + 位置(右下/居中) + 模式(峰/谷/都) + 系统通知 + 预览。
- **usage_stats 工具开关**：让模型可查用量/费用（默认关，占用上下文，改后重载生效）。
- **模型用量悬浮窗**：模式(综合/指定订阅卡) + 订阅目标多选。
- **插件信息卡**：名称/描述/作者/仓库/npm/许可证 MIT/版本号（读自包 `package.json`）。

## 九、数据契约与状态配色

数据来自 HTTP 路由（回环保护）：`/api/billing/usage-stats`、`pricing`、`balance`、`subscriptions`、
`relay-quotas`、`usage-tool` 与 `llm.models`；浏览器端统一 30s 轮询。

**状态 → 颜色映射（全表面统一）**：

| 状态        | 色彩语义       | 出现处                                        |
| ----------- | ------------- | --------------------------------------------- |
| 正常/健康   | 青绿 `green-500` | 平价 chip、余额/配额正常、直联健康          |
| 警告        | 琥珀 `amber-500` | 剩余 ≤20%、预算 ≥80%、查询失败              |
| 危险        | 红 `red-500`     | 已用尽、超支、余额不足、剩余 ≤10%、密钥无效 |
| 主线/峰时   | 蓝 `blue-500`    | 主数字强调、峰时 chip、模型健康              |

异常文案须有区分度：未配置(配置问题)/密钥无效(unauthorized)/查询失败(unreachable)/
未接入(无 API)/未收录(无价按 0 计)——不得笼统显示「错误」。

## 十、响应式 / 主题 / zine

- 触发卡用容器查询（非视口）断点 280 / 230 / 120px。
- 峰谷浮层右下角 / 居中两姿态。
- 深浅主题：全走 `--dsw-*` + `color-mix`，禁写死色；玻璃 blur 浅色下保可读性。
- zine 模式：触发卡与速览浮层由外部 CSS 隐藏，组件不写分支。

## 十一、无障碍

- 触发卡/按钮语义正确（`<button>`、`title`、`aria-label`）。
- 浮层 `role="alert"`；进度条 `aria-hidden` 装饰 + 文本值；图表 `role="img"` + `aria-label`。
- `focus-visible` 等宽描边；关闭按钮 `aria-label`。
- `Notification` 不可用时界面仍以颜色/文字兜底，不静默。

## 十二、本地化

- 中英双语（`locales.ts` 的 `zh`/`en`），随币种联动（USD→英文、CNY→中文，仅本插件生效）。
- **必须补齐现有硬编码中文**：`模型可用 / 厂商失效 / 套餐 / 暂无趋势数据 / 总计 / 调用 / 轮` 等进字典；
  `TrendChart` / `round-chart` / `heatmap` 需接收 `t`。
- 动态文案用 `{placeholder}` + 替换，禁字符串拼接。

## 十三、工程约束

- 无图表库、无外部 CDN、纯 CSS Module + `clsx`，SVG 手绘。
- 组件渲染为 `props` 纯函数（`t`、`useSession`、`useStore`、`renderSlot` 由框架注入），不碰 `ctx`。
- 通过 `pnpm --filter @kenz1117/dsh-ui-usage-billing bundle` 构建 + vitest 客户端测试（`pnpm run test:gui`）。
- 金额/token 用 `formatMoney` / `formatTokens`；百分比单项取整。

## 十四、现有代码位置（供对照）

- 触发卡 + 速览浮层：`src/client/UsageBilling.tsx`（`UsageBillingTrigger`，约 L790-1010）
- 仪表盘弹窗六 Tab：`src/client/UsageBilling.tsx`（`BillingDashboard`，约 L1013-2960）
- 即时费用条：`src/client/live-cost.tsx`
- 峰谷浮层：`src/client/PeakAlertBanner.tsx` + `peak-alert.ts`（纯逻辑）
- Token 洞察：`src/client/TokenPanel.tsx`；性能：`src/client/PerfPanel.tsx`
- 趋势图：`src/client/TrendChart.tsx`；每轮费用/突增：`round-chart.tsx`；热力图：`heatmap.tsx`
- 插件信息卡：`src/client/PluginInfoCard.tsx`
- CSS：`src/client/UsageBilling.module.css`；数据：`pricing.ts` / `budget-store.ts` / `billing-service.ts`
- 入口/插槽：`src/client/apply.ts`；文案：`src/client/locales.ts`

## 十五、本次重构可改进点汇总（含审计）

1. 订阅浮层轮播在不可见时空转 → 仅可见时运行。
2. 预算/余额/订阅浮层金额与币种不联动（部分恒 CNY）→ 随用户币种。
3. 硬编码中文绕过 i18n → 全部进字典并传 `t`。
4. 触发卡 hover 速览卡 `dash.updatedAt` 死数据 → 渲染或删除。
5. 余额与对账重复请求同端点 → 单次拉取。
6. 峰谷提醒原无周期驱动 → 已修复，重构时保持。
7. 实时汇率/定价未校验 → 已修复为有限正数，重构时保持。

---

> 警示：重构主要涉及 `src/client/` 组件与样式；`src/` 里已完成的安全加固与稳定性逻辑修复
> （回环校验、防注入、熔断、异常隔离等）建议保留，不要拆散。

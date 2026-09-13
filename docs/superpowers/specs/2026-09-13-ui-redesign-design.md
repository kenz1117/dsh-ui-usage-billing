# UI 全面美化升级 · 设计稿 Spec

> 日期：2026-09-13
> 状态：定稿 · 待实现
> 视觉基线：[docs/redesign-mockup.html](../redesign-mockup.html)
> 需求基线：[docs/redesign-brief.md](../redesign-brief.md) + [docs/ui-ux-spec.md](../ui-ux-spec.md)

## 一、目标

将插件全部浏览器端表面（4 常驻/浮层 + 仪表盘弹窗 6 Tab）按统一的「精致科技风」设计语言重做，修复已知交互缺陷，提升信息层级与可读性；同时严守功能冻结：只动视觉与排版，不新增/删除任何数据位、API、设置项、持久化 key 或 `data-testid`。

## 二、美学锚点（冻结）

- 风格：**Refined-tech**（Linear Insights 数据紧凑 × Raycast 设参留白）
- 表面：**玻璃 = 半透明背景 + 1px 描边 + 顶部 1px 高光**（不用 drop-shadow 强加层次）
- 装饰：**仅保留 1.5px 顶部金光流光饰条**一处装饰性渐变（Hero / Popover）
- 数字：**全部等宽**（`tabular-nums`），主数字用 monospace 强化
- 动效：**仅 160ms `cubic-bezier(.2,.8,.2,1)`**，禁震/闪/进度条摆动
- 体积：**lib/client.js ≤ 256 KiB**（DSH Store 单文件契约，硬红线）

## 三、设计令牌（最终版）

### 3.1 表面 / 文字（暗色）

| Token | 值 | 用途 |
|---|---|---|
| `--dsb` | `#0e1116` | 整页背景 |
| `--dsb-2` | `#141a22` | 卡片底 |
| `--dsb-3` | `#1a222c` | 表输入/内嵌 |
| `--dsb-glass` | `bg-2 78% + transparent` | 浮层 / 卡片 |
| `--dsb-glass-strong` | `bg-3 88% + transparent` | 弹窗 / popover |
| `--ds-border` | `#2a3340 82%` | 默认描边 |
| `--ds-border-strong` | `#3a4452 90%` | 强调描边 |
| `--ds-hi-top` | `rgba(255,255,255,.045)` | 顶部 1px 高光 |
| `--ds-shadow-1` | `inset 顶部高光 + 8/24/35` | 卡片 |
| `--ds-shadow-2` | `inset 顶部高光 + 18/48/50` | 弹窗 |
| `--ds-t-1` | `#e6edf3` | 主文字 |
| `--ds-t-2` | `#a4b1c2` | 次文字 |
| `--ds-t-3` | `#6b7787` | 说明 |
| `--ds-t-4` | `#4a5360` | 弱化 |

### 3.2 表面 / 文字（亮色，由 `[data-theme="light"]` 切换）

| Token | 值 |
|---|---|
| `--dsb` | `#f6f7f9` |
| `--dsb-2` | `#ffffff` |
| `--dsb-3` | `#eef0f4` |
| `--ds-t-1` | `#0e1116` |
| `--ds-t-2` | `#4b5563` |
| 阴影 | 同偏移 / 透明度从 0.35/0.5 降到 0.06/0.08 |

### 3.3 语义色（6 个，不增不减）

| 语义 | Token | 用途 |
|---|---|---|
| 主强调 / 峰时 / 链接 | `--ds-blue` `#4f8cff` | KPI / 图表主色 / 进度条 / 链接 |
| 平价 / 订阅 / 通知 | `--ds-cyan` `#2dd4bf` | 谷时徽标 / 订阅额度 / 在线态 |
| 正常 / 安全 | `--ds-green` `#34d399` | 「在线」「正常」 |
| 预警 / 流光饰条 | `--ds-amber` `#f59e0b` | 预算 ≥80% / 余额 ≤20% |
| 危险 / 超支 | `--ds-red` `#ef4444` | 余额 ≤10% / 超支 / 用尽 |
| 订阅补充 | `--ds-violet` `#a78bfa` | 订阅占比段 / 第三方统计 |

### 3.4 图表色板（7 段，按用量降序）

`#4f8cff` → `#2dd4bf` → `#a78bfa` → `#f59e0b` → `#f472b6` → `#fbbf24` → `#38bdf8`

### 3.5 字号（5 级，全部 monospace 用于数字，sans 用于标签）

| 级 | 像素 | 用途 |
|---|---|---|
| `huge` | 52 | Hero 本月费用 · 仅概览页一次 |
| `big` | 36 | KPI 主值 · 弹窗标题 |
| `kpi` | 22 | KPI 格主数字 |
| `body` | 13 | 表格 / 列表 |
| `small` | 11 | 辅助 / 状态徽标 |

### 3.6 圆角 / 间距

- 圆角：卡片 16 / 卡片内 12 / 标签按钮 8 / 状态点 4
- 间距：8 基准（4 / 8 / 12 / 16 / 20 / 24）

### 3.7 动效

- `--ds-t-fast: 160ms cubic-bezier(.2,.8,.2,1)`
- 浮层入场：`opacity 0→1, translateY(4px→0)`
- 禁：spring / bounce / shimmer / skeleton 摆动

## 四、组件规格（按表面）

### 4.1 Surface A · Sidebar Footer 触发卡

**形态 wide（>280px）**：
- `display: flex; gap: 12; padding: 10/14`
- icon 徽标 `32×32`，圆角 8，背景 `blue 14%` 配 `blue 28%` 描边，stroke 2 / 16px 折线图标
- 主列：huge 缩小为 22px（trigger 上避免与弹窗 Hero 撞视觉）数字 `¥1,284.50`（整数大、小数 14px 灰）
- 副行：`今日 ¥184 · 本周 ¥782`（11px、`t-2`）
- 右侧：84×28 SVG sparkline（线 + 16% 半透明面积），主线 `blue 1.5px`
- 超支时数字旁加 `dot r`

**形态 rail（<120px）**：
- `36×36`，圆角 8，描边 `--ds-border`，hover 切 `--ds-blue`

**容器查询断点**（保留既有 `@container billing-trigger`）：
- `280px`：隐藏 sparkline
- `230px`：隐藏副行
- `120px`：隐藏文字，仅图标

**Hover 浮层**（保留自动轮播订阅额度 + 已知缺陷修复：仅可见时轮播）：
- combined 模式：2 列 6 指标网格 + 主力消耗模型状态（图标化低值警示）
- subscription 模式：单卡进度条 + 剩余绝对额度 + 重置时间
- 顶部 1.5px 金光饰条保留

### 4.2 Surface B · 即时代费条（dock）

- 32px 高胶囊，`blur(14px) saturate(1.3)`，描边 `--ds-border-strong`
- 单行 `flex wrap`：`chip(峰/谷) · 本轮 · 会话 · 预警 chips(≤3)`
- 峰 chip = `blue` 描边 / 谷 chip = `cyan` 描边
- 预警 chip ≤20% 浮出（amber），≤10% 红

### 4.3 Surface C · 峰谷提醒浮层

- fixed 右下 24×24，`blur(14px)`
- 大号 28px 等宽倒计时「10m」
- 进峰：标题 `peak blue`，正文蓝点
- 进谷：标题 `off cyan`，正文青绿点
- × 关闭 hover `t-1`

### 4.4 Surface D · 仪表盘弹窗

**容器**：`760 × 88vh`，圆角 16，阴影 `--ds-shadow-2`，描边 `--ds-border-strong`
**头部**：红黄绿三圆 + 6 Tab（无文字下划线，圆角 6 选中态）+ 右上「实时更新 · 30s」状态
**6 Tab**：概览 / 明细 / 用量 / 趋势 / 费率 / 设置

**Hero（概览）**：
- 左 1.4fr：label `本月费用` + huge 数字 + sub 行（今日/本周/预计）+ 环比/日均/调用三联读数
- 右 1fr：双圆环（外 budget 蓝 / 内 quota 紫），中心 71% + 预算已用

**KPI × 4**（4 等分）：
- 缓存命中率 / Token / 平均每千 token / 调用次数
- 每格：uppercase 11px label + 22px 大值 + 11px detail

**用量热力图**：
- 26 周 × 7 天 = 182 格
- 色阶：`blue 10% → 30% → 60% → 90%`，灰背景基底
- 月 / 年切换 segmented control

**明细**：
- 中转站分布表（站点 / 类别徽标 / 费用 / 调用 / 状态）
- 厂商卡（厂商头 + 模型子表 + 订阅额度双窗口卡内嵌）
- 官方 vs 三方汇总卡
- 工作区下钻
- 会话明细（按费用倒序，封顶 + 「还有 N 个」提示）

**用量**：
- 每日 Token 堆叠（按结构 3 桶 / 按模型 7 段）
- 模型 Token 占比环
- Token 结构 KPI ×3
- 导出按钮
- 性能面板（PerfPanel TTFT/速度/延迟）

**趋势**：
- 每日费用堆叠柱（7/30d × 费用/Token）
- 每轮费用（成本突增 Z=3 红线）
- 峰谷时段占比条（峰 / 谷 / 订阅 三段）

**费率**：
- 模型单价表：峰/谷双价单元格 + 实时汇率 + 来源徽标
- 自定义覆盖价行以 amber 边强调

**设置**：
- 月度预算卡 + 进度
- 2×2 开关矩阵：峰谷提醒 / usage_stats 工具 / 模型用量悬浮窗 / 完成通知
- 自定义单价表（行级 amber 边）
- 插件信息卡

## 五、范围声明（硬约束）

| 类别 | 允许 | 禁止 |
|---|---|---|
| 视觉 | 重做 CSS Module、调色板、间距、字号、动效 | ❌ |
| 信息架构 | 设置页可重组（卡片分组、网格） | ❌ |
| 排版细节 | Tab 顺序可重排、标签措辞微调 | ❌ |
| 数据面 | 任何 `/api/*` 路径、字段、聚合算法 | ❌ |
| 持久化 | localStorage key、CustomEvent 名 | ❌ |
| 测试钩子 | `data-testid`、aria-label | ❌ |
| 体积 | lib/client.js 增长 | ≥256 KiB |

## 六、验收标准

1. **视觉一致**：所有表面同一设计语言（颜色 / 圆角 / 间距 / 动效一致）
2. **暗亮双主题**：所有表面在 `[data-theme="light"]` 下颜色层级保持 ≥4.5:1 对比
3. **可读性**：Hero 主数字一眼可读；KPI 4 格不挤压（≥120px/格）
4. **可访问性**：键盘可达、focus ring 可见、color-only 信息有 label/徽标补充
5. **响应式**：触发卡 3 档降级、弹窗内 720px 折单列
6. **性能**：弹窗首屏渲染 ≤100ms（无 JS 阻塞）
7. **体积**：lib/client.js ≤256 KiB
8. **构建**：`tsc -b` + `vitest run` + `tsdown` 全过
9. **回归**：现有 404 个测试用例 100% 通过（数据面零改动）

## 七、风险与对策

| 风险 | 对策 |
|---|---|
| CSS Module 类名哈希改后体积膨胀 | 移除未用类 / 把长类名折叠为短语义名（atomic 化已在） |
| 设计稿与现有数据形状不符 | 本次只动 CSS / 排版结构；不引入新数据字段 |
| 现有交互（轮播 / 自动刷新）受视觉重做影响 | 保留所有 onMount / useEffect 时序，仅替换 className |
| 体积逼近 256 KiB | 实施前用 mockup 测体积增量；超阈值则按 P3 优先级裁剪非视觉 token |

## 八、落地路径

1. 在 `UsageBilling.module.css` 顶部新增 `:root` 令牌块（暗/亮两套），不破坏现有 487 个原子类
2. 按表面逐块替换：触发卡 → 即时条 → 峰谷 → 弹窗头 → 6 Tab
3. 每完成一个表面跑 `tsc -b` 确认 CSS Module 解析通过
4. 完整后跑 `vitest run`（确认无回归）+ `tsdown`（确认体积）
5. 用真机宿主跑一遍（DSH 0.1.2+）截图对照演示稿

## 九、不在范围内（明示）

- 不做 dark/light 之外的第三主题
- 不动 docs/screenshots 现有截图
- 不引入图表库（保持 SVG 手绘）
- 不改 pricing 模块（独立更新节奏）
- 不重做 i18n 文案（仅复用既有 `locales.ts`）

---

签收：本 spec 一旦批准即冻结，进入 writing-plans 生成任务清单。
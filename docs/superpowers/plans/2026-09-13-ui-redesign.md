# UI 全面美化升级 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 [spec](../specs/2026-09-13-ui-redesign-design.md) 把插件全部浏览器端表面（4 常驻/浮层 + 仪表盘弹窗 6 Tab）改为统一的「精致科技风」设计语言；功能冻结（不改数据面、不改 API、不改持久化 key、不改 data-testid）。

**Architecture:** 单文件 CSS Module（`src/client/UsageBilling.module.css`，3573 行）顶部新增 `:root` 与 `[data-theme="light"]` 令牌块；按表面逐块重写现有 487 个原子类的视觉表现，**不动 class 名、不动 JSX 结构**。每完成一表面跑 `tsc -b` + `vitest run` 验证回归。

**Tech Stack:** CSS Modules + React + TypeScript + vitest + tsdown

---

## 文件清单

| 文件 | 角色 | 本计划改动 |
|---|---|---|
| `src/client/UsageBilling.module.css` | 全部样式（3573 行 / 487 原子类） | 顶部加令牌块 + 逐表面重写视觉类 |
| `src/client/UsageBilling.tsx` | 触发卡 + 弹窗主组件 | **不改动**（仅确认 className 已对接） |
| `src/client/PeakAlertBanner.tsx` | 峰谷提醒浮层 | **不改动**（className 已对接） |
| `src/client/live-cost.tsx` | 即时代费条 | **不改动**（className 已对接） |
| `src/client/TokenPanel.tsx` / `TrendChart.tsx` / `heatmap.tsx` / `round-chart.tsx` / `PerfPanel.tsx` / `PluginInfoCard.tsx` | 子组件 | **不改动** |
| `src/client/UsageBilling.module.css.d.ts` | CSS Module TS 类型（由构建生成） | 不手改 |
| `tests/*.spec.ts` | 现有 404 个测试 | **不新增**（CSS 改动不影响数据测试） |

---

## 总提交粒度建议（落地前先看）

按以下 6 个原子提交落地，每个提交独立可验证、独立可回退：

1. `chore(css): introduce design tokens (light + dark)` —— 仅在 CSS 顶部插令牌块，不改任何现有类
2. `style(surface-a): redesign sidebar footer trigger` —— 触发卡 + hover 浮层
3. `style(surface-b): redesign live cost dock` —— 即时代费条
4. `style(surface-c): redesign peak alert banner` —— 峰谷提醒浮层
5. `style(surface-d1): redesign modal shell + hero` —— 弹窗容器 + Hero + KPI + 热力图
6. `style(surface-d2): redesign provider / trend / settings tabs` —— 明细 / 用量 / 趋势 / 费率 / 设置 5 个 Tab

每提交后跑：
```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3 && ./node_modules/.bin/tsdown 2>&1 | grep -E "(Build complete|error)"
```
预期：tsc 0 错、vitest 全过、`Build complete`。

---

## Task 1 · 设计令牌块（基础）

**Files:**
- Modify: `src/client/UsageBilling.module.css:1-50`（在文件顶部、`/* Usage billing ... */` 注释之后插入）

- [ ] **Step 1: 在文件最顶部插入设计令牌块**

在文件第 1 行（注释行后）的下一个空行后插入以下内容（**确保整段用 CSS Module 兼容语法，无嵌套 SCSS**）：

```css
/* ───── 设计令牌（2026-09-13 重构基线） ───── */
:root {
  /* 表面 — 暗色 */
  --dsb: #0e1116;
  --dsb-2: #141a22;
  --dsb-3: #1a222c;
  --dsb-glass: color-mix(in srgb, #141a22 78%, transparent);
  --dsb-glass-strong: color-mix(in srgb, #1a222c 88%, transparent);
  --ds-border: color-mix(in srgb, #2a3340 82%, transparent);
  --ds-border-strong: color-mix(in srgb, #3a4452 90%, transparent);
  --ds-hi-top: rgba(255, 255, 255, 0.045);
  --ds-shadow-1: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 8px 24px rgba(0, 0, 0, 0.35);
  --ds-shadow-2: 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 18px 48px rgba(0, 0, 0, 0.5);

  /* 文字 */
  --ds-t-1: #e6edf3;
  --ds-t-2: #a4b1c2;
  --ds-t-3: #6b7787;
  --ds-t-4: #4a5360;

  /* 语义色 */
  --ds-blue: #4f8cff;
  --ds-cyan: #2dd4bf;
  --ds-green: #34d399;
  --ds-amber: #f59e0b;
  --ds-red: #ef4444;
  --ds-violet: #a78bfa;

  /* 图表色板 */
  --ds-c-1: #4f8cff;
  --ds-c-2: #2dd4bf;
  --ds-c-3: #a78bfa;
  --ds-c-4: #f59e0b;
  --ds-c-5: #f472b6;
  --ds-c-6: #fbbf24;
  --ds-c-7: #38bdf8;

  /* 圆角 / 动效 */
  --ds-r-1: 8px;
  --ds-r-2: 12px;
  --ds-r-3: 16px;
  --ds-t-fast: 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

[data-theme="light"] {
  --dsb: #f6f7f9;
  --dsb-2: #ffffff;
  --dsb-3: #eef0f4;
  --dsb-glass: color-mix(in srgb, #ffffff 80%, transparent);
  --dsb-glass-strong: color-mix(in srgb, #ffffff 92%, transparent);
  --ds-border: #e3e7ed;
  --ds-border-strong: #cdd3db;
  --ds-hi-top: rgba(255, 255, 255, 0.6);
  --ds-shadow-1: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 6px 18px rgba(15, 23, 30, 0.06);
  --ds-shadow-2: 0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 18px 40px rgba(15, 23, 30, 0.08);
  --ds-t-1: #0e1116;
  --ds-t-2: #4b5563;
  --ds-t-3: #6b7280;
  --ds-t-4: #9ca3af;
}
```

- [ ] **Step 2: 跑构建与测试**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json
```
预期：0 错（仅加令牌块，未引用，不破坏现有类）。

- [ ] **Step 3: 提交**

```bash
git add src/client/UsageBilling.module.css
git commit -m "chore(css): introduce redesign design tokens (light + dark)"
```

---

## Task 2 · Surface A · Sidebar Footer 触发卡

**Files:**
- Modify: `src/client/UsageBilling.module.css` 中以 `.trigger`、`.triggerWide`、`.triggerRail`、`.triggerIcon`、`.triggerCol`、`.triggerColMain`、`.triggerColSub`、`.triggerSpark`、`.triggerDot`、`.balanceDetailPop`、`.balanceDetailTitle`、`.balanceDetailGrid`、`.balanceDetailLabel`、`.balanceDetailValue`、`.balanceDetailRow`、`.balanceDetailHead`、`.balanceDetailClose` 为前缀的类（约 18 个）

- [ ] **Step 1: 重写触发卡容器的玻璃感与圆角**

定位 `.trigger` 与 `.triggerWide` 类（约 50-90 行附近，按现有命名），将以下视觉属性统一改写：

```css
.trigger {
  /* 容器查询名保留：@container billing-trigger 由现有规则承载 */
}

.triggerWide {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: var(--ds-r-2);
  background: var(--dsb-glass);
  border: 1px solid var(--ds-border);
  box-shadow: var(--ds-shadow-1);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  position: relative;
  overflow: hidden;
  transition: border-color var(--ds-t-fast);
}
.triggerWide::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--ds-hi-top), transparent);
}
.triggerWide:hover { border-color: var(--ds-border-strong); }

.triggerIcon {
  width: 32px;
  height: 32px;
  border-radius: var(--ds-r-1);
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--ds-blue) 14%, var(--dsb-3));
  border: 1px solid color-mix(in srgb, var(--ds-blue) 28%, transparent);
  flex: none;
}

.triggerCol { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.triggerColMain {
  font-family: var(--font-num, 'JetBrains Mono', ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--ds-t-1);
}
.triggerColSub {
  font-size: 11px;
  color: var(--ds-t-3);
  font-variant-numeric: tabular-nums;
}
.triggerSpark { width: 84px; height: 28px; flex: none; }
.triggerSpark :global(path) {
  stroke: var(--ds-blue);
  stroke-width: 1.5;
  fill: none;
}
.triggerSpark :global(path:nth-child(2)) {
  fill: color-mix(in srgb, var(--ds-blue) 16%, transparent);
}

.triggerDot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.triggerDotBlue { background: var(--ds-blue); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-blue) 18%, transparent); }
.triggerDotRed  { background: var(--ds-red);  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-red)  18%, transparent); }
```

- [ ] **Step 2: 重写 rail 形态**

```css
.triggerRail {
  width: 36px;
  height: 36px;
  border-radius: var(--ds-r-1);
  display: grid;
  place-items: center;
  background: var(--dsb-glass);
  border: 1px solid var(--ds-border);
  transition: border-color var(--ds-t-fast), color var(--ds-t-fast);
  color: var(--ds-t-2);
}
.triggerRail:hover { border-color: var(--ds-blue); color: var(--ds-blue); }
```

- [ ] **Step 3: 重写 hover 浮层（保留金光饰条 + 内部玻璃）**

```css
.balanceDetailPop {
  background: var(--dsb-glass-strong);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  border: 1px solid var(--ds-border-strong);
  border-radius: var(--ds-r-3);
  box-shadow: var(--ds-shadow-2);
  padding: 16px;
  width: 360px;
  position: relative;
  overflow: hidden;
}
.balanceDetailPop::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent 10%, var(--ds-amber) 50%, transparent 90%);
  opacity: 0.65;
}

.balanceDetailTitle {
  font-size: 12px;
  color: var(--ds-t-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 10px;
}
.balanceDetailGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 14px;
}
.balanceDetailLabel { color: var(--ds-t-3); font-size: 11px; }
.balanceDetailValue {
  font-size: 13px;
  font-family: var(--font-num, 'JetBrains Mono', ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--ds-t-1);
}
.balanceDetailHead {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed var(--ds-border);
}
.balanceDetailRow { display: flex; align-items: center; gap: 8px; }
.balanceDetailClose {
  margin-left: auto;
  color: var(--ds-t-3);
  cursor: pointer;
  transition: color var(--ds-t-fast);
}
.balanceDetailClose:hover { color: var(--ds-t-1); }
```

- [ ] **Step 4: 验证**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3
```
预期：tsc 0 错 / vitest 全部通过（CSS 改动不影响数据测试）。

- [ ] **Step 5: 提交**

```bash
git add src/client/UsageBilling.module.css
git commit -m "style(surface-a): redesign sidebar footer trigger + hover popover"
```

---

## Task 3 · Surface B · 即时代费条

**Files:**
- Modify: `src/client/UsageBilling.module.css` 中以 `.liveCost`、`.liveCostChip`、`.liveCostPeak`、`.liveCostOff`、`.liveCostSep`、`.liveCostDot`、`.liveCostWarn` 为前缀的类

- [ ] **Step 1: 重写胶囊容器**

```css
.liveCost {
  background: var(--dsb-glass-strong);
  backdrop-filter: blur(14px) saturate(1.3);
  -webkit-backdrop-filter: blur(14px) saturate(1.3);
  border: 1px solid var(--ds-border-strong);
  border-radius: 999px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--ds-t-2);
}
.liveCostSep { color: var(--ds-t-4); }
.liveCostChip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--dsb-3);
  border: 1px solid var(--ds-border);
  font-variant-numeric: tabular-nums;
}
.liveCostPeak { color: var(--ds-blue); border-color: color-mix(in srgb, var(--ds-blue) 30%, transparent); }
.liveCostOff  { color: var(--ds-cyan); border-color: color-mix(in srgb, var(--ds-cyan) 30%, transparent); }
.liveCostDot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.liveCostDotBlue { background: var(--ds-blue); }
.liveCostDotCyan { background: var(--ds-cyan); }
.liveCostWarn { color: var(--ds-amber); border-color: color-mix(in srgb, var(--ds-amber) 30%, transparent); }
.liveCostDanger { color: var(--ds-red); border-color: color-mix(in srgb, var(--ds-red) 30%, transparent); }
```

- [ ] **Step 2: 验证 + 提交**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3
```
预期：0 错 / 全过。

```bash
git add src/client/UsageBilling.module.css
git commit -m "style(surface-b): redesign live cost dock"
```

---

## Task 4 · Surface C · 峰谷提醒浮层

**Files:**
- Modify: `src/client/UsageBilling.module.css` 中以 `.peakAlert`、`.peakAlertCorner`、`.peakAlertCenter`、`.peakAlertCount`、`.peakAlertBody`、`.peakAlertClose` 为前缀的类

- [ ] **Step 1: 重写浮层**

```css
.peakAlert {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 320px;
  padding: 14px 16px;
  background: var(--dsb-glass-strong);
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  border: 1px solid var(--ds-border-strong);
  border-radius: var(--ds-r-2);
  box-shadow: var(--ds-shadow-2);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 50;
  animation: peakAlertIn var(--ds-t-fast);
}
.peakAlertCorner  { right: 24px; bottom: 24px; }
.peakAlertCenter  { right: 50%; bottom: 24px; transform: translateX(50%); }
.peakAlertCount {
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  font-family: var(--font-num, 'JetBrains Mono', ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--ds-t-1);
}
.peakAlertLabel { color: var(--ds-t-3); font-size: 11px; }
.peakAlertBody { font-size: 12px; color: var(--ds-t-1); margin-top: 4px; }
.peakAlertClose {
  margin-left: auto;
  color: var(--ds-t-3);
  cursor: pointer;
  transition: color var(--ds-t-fast);
}
.peakAlertClose:hover { color: var(--ds-t-1); }

@keyframes peakAlertIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.peakAlertCenter { animation-name: peakAlertInCenter; }
@keyframes peakAlertInCenter {
  from { opacity: 0; transform: translateX(50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(50%) translateY(0); }
}
```

- [ ] **Step 2: 验证 + 提交**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3
git add src/client/UsageBilling.module.css
git commit -m "style(surface-c): redesign peak alert banner"
```

---

## Task 5 · Surface D-1 · 弹窗容器 + Hero + KPI + 热力图

**Files:**
- Modify: `src/client/UsageBilling.module.css` 中以 `.modal`、`.modalHead`、`.modalBody`、`.modalTab`、`.hero`、`.heroLabel`、`.heroBig`、`.heroSub`、`.ringSvg`、`.kpi`、`.kpiLabel`、`.kpiValue`、`.kpiDetail`、`.heatmap`、`.heatmapCell` 为前缀的类

- [ ] **Step 1: 弹窗外壳**

```css
.modal {
  width: 760px;
  max-width: 100%;
  max-height: 88vh;
  background: var(--dsb-2);
  border: 1px solid var(--ds-border-strong);
  border-radius: var(--ds-r-3);
  box-shadow: var(--ds-shadow-2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modalHead {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ds-border);
}
.modalTabs { display: flex; gap: 2px; margin-left: 18px; }
.modalTab {
  background: transparent;
  color: var(--ds-t-3);
  border: 0;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: color var(--ds-t-fast), background var(--ds-t-fast);
}
.modalTab:hover { color: var(--ds-t-2); }
.modalTab[aria-current="page"] {
  background: var(--dsb-3);
  color: var(--ds-t-1);
  box-shadow: 0 0 0 1px var(--ds-border-strong);
}
.modalBody {
  padding: 20px;
  display: grid;
  gap: 18px;
  overflow-y: auto;
}
```

- [ ] **Step 2: Hero**

```css
.hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 18px;
  padding: 22px 24px;
  background: var(--dsb-glass-strong);
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-3);
  position: relative;
  overflow: hidden;
}
.hero::after {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 1.5px;
  background: linear-gradient(90deg, transparent 10%, var(--ds-amber) 50%, transparent 90%);
  opacity: 0.65;
}
.heroLabel {
  color: var(--ds-t-3);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.heroBig {
  margin-top: 8px;
  font-size: 52px;
  font-weight: 600;
  letter-spacing: -0.03em;
  font-family: var(--font-num, 'JetBrains Mono', ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--ds-t-1);
  line-height: 1;
}
.heroBig .minor {
  color: var(--ds-t-3);
  font-size: 28px;
}
.heroSub { color: var(--ds-t-2); margin-top: 4px; font-size: 12px; }
.heroSub b { color: var(--ds-t-1); font-weight: 600; }
.heroKv {
  display: flex;
  gap: 18px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--ds-t-2);
  font-variant-numeric: tabular-nums;
}
.heroKv b { color: var(--ds-t-1); font-weight: 600; }
.heroKvDeltaUp   { color: var(--ds-red); }
.heroKvDeltaDown { color: var(--ds-green); }

.ringSvg { display: block; }
.ringSvg :global(circle.bg) { stroke: var(--dsb-3); }
.ringSvg :global(circle.fg) { stroke-linecap: round; }

.ringWrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ringCenter {
  position: absolute;
  text-align: center;
}
.ringPct {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: var(--font-num, 'JetBrains Mono', ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--ds-t-1);
}
.ringPctLabel { color: var(--ds-t-3); font-size: 11px; }
```

- [ ] **Step 3: KPI × 4**

```css
.kpiGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi {
  padding: 14px 16px;
  border-radius: var(--ds-r-2);
  background: var(--dsb-glass);
  border: 1px solid var(--ds-border);
}
.kpiLabel {
  color: var(--ds-t-3);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.kpiValue {
  font-size: 22px;
  font-weight: 600;
  margin-top: 6px;
  font-family: var(--font-num, 'JetBrains Mono', ui-monospace, monospace);
  font-variant-numeric: tabular-nums;
  color: var(--ds-t-1);
}
.kpiDetail { color: var(--ds-t-3); font-size: 11px; margin-top: 4px; font-variant-numeric: tabular-nums; }
```

- [ ] **Step 4: 热力图**

```css
.heatmap {
  display: grid;
  grid-template-columns: repeat(26, 1fr);
  gap: 3px;
  width: 100%;
}
.heatmapCell {
  aspect-ratio: 1 / 1;
  border-radius: 2px;
  background: color-mix(in srgb, var(--ds-blue) 10%, var(--dsb-3));
}
.heatmapCell[data-l="1"] { background: color-mix(in srgb, var(--ds-blue) 30%, var(--dsb-3)); }
.heatmapCell[data-l="2"] { background: color-mix(in srgb, var(--ds-blue) 60%, var(--dsb-3)); }
.heatmapCell[data-l="3"] { background: color-mix(in srgb, var(--ds-blue) 90%, var(--dsb-3)); }
.heatmapCellNone {
  background: transparent;
  border: 1px dashed var(--ds-border);
}
```

- [ ] **Step 5: 验证 + 提交**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3
git add src/client/UsageBilling.module.css
git commit -m "style(surface-d1): redesign modal shell + hero + kpi + heatmap"
```

---

## Task 6 · Surface D-2 · 5 个 Tab（明细 / 用量 / 趋势 / 费率 / 设置）

**Files:**
- Modify: `src/client/UsageBilling.module.css` 中以 `.prov`、`.provRow`、`.provHead`、`.provName`、`.provBal`、`.provSubtable`、`.provQuotaCard`、`.provQuotaWin`、`.session`、`.sessionRow`、`.trendBar`、`.trendLegend`、`.trendBarCell`、`.costPeakBar`、`.pricingTable`、`.pricingRowCustom`、`.pricingSourceBadge`、`.settingCard`、`.settingToggle`、`.budgetBar` 为前缀的类

- [ ] **Step 1: 表格基线**

```css
.tbl {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.tbl th {
  color: var(--ds-t-3);
  font-weight: 500;
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ds-border);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tbl td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--ds-border);
  vertical-align: middle;
  color: var(--ds-t-1);
}
.tbl tr:last-child td { border-bottom: 0; }
.tblNum { text-align: right; }
.tblRight { text-align: right; }
.tblName { display: flex; align-items: center; gap: 8px; }
```

- [ ] **Step 2: 状态点 / 徽标**

```css
.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; vertical-align: middle; margin-right: 4px; }
.dotBlue { background: var(--ds-blue);   box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-blue)   18%, transparent); }
.dotCyan { background: var(--ds-cyan);   box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-cyan)   18%, transparent); }
.dotGreen{ background: var(--ds-green);  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-green)  18%, transparent); }
.dotAmber{ background: var(--ds-amber);  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-amber)  18%, transparent); }
.dotRed  { background: var(--ds-red);    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-red)    18%, transparent); }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid var(--ds-border-strong);
  color: var(--ds-t-2);
  background: var(--dsb-2);
  white-space: nowrap;
}
.badgeLive   { color: var(--ds-blue);  border-color: color-mix(in srgb, var(--ds-blue)  36%, transparent); background: color-mix(in srgb, var(--ds-blue)  12%, transparent); }
.badgeWarn   { color: var(--ds-amber); border-color: color-mix(in srgb, var(--ds-amber) 36%, transparent); background: color-mix(in srgb, var(--ds-amber) 12%, transparent); }
.badgeDanger { color: var(--ds-red);   border-color: color-mix(in srgb, var(--ds-red)   36%, transparent); background: color-mix(in srgb, var(--ds-red)   12%, transparent); }
.badgeOk     { color: var(--ds-green); border-color: color-mix(in srgb, var(--ds-green) 36%, transparent); background: color-mix(in srgb, var(--ds-green) 12%, transparent); }
.badgeSub    { color: var(--ds-cyan);  border-color: color-mix(in srgb, var(--ds-cyan)  36%, transparent); background: color-mix(in srgb, var(--ds-cyan)  12%, transparent); }
```

- [ ] **Step 3: 进度条**

```css
.bar {
  height: 6px;
  border-radius: 3px;
  background: var(--dsb-3);
  overflow: hidden;
}
.bar > i { display: block; height: 100%; border-radius: 3px; background: var(--ds-blue); transition: width var(--ds-t-fast); }
.barWarn > i   { background: var(--ds-amber); }
.barDanger > i { background: var(--ds-red); }
.barOk > i     { background: var(--ds-green); }
```

- [ ] **Step 4: 厂商卡 + 订阅额度子卡**

```css
.provRow {
  padding: 14px 16px;
  border-bottom: 1px solid var(--ds-border);
  display: grid;
  gap: 12px;
}
.provHead {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.provName { font-weight: 600; font-size: 13px; }
.provBal {
  margin-left: auto;
  color: var(--ds-t-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.provBal b { color: var(--ds-t-1); font-weight: 600; }

.quotaCard {
  padding: 14px 16px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-2);
  background: var(--dsb-glass);
}
.quotaCard + .quotaCard { margin-top: 12px; }
.quotaHead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.quotaName { font-weight: 600; font-size: 13px; }
.quotaReset {
  margin-left: auto;
  color: var(--ds-t-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.quotaWin + .quotaWin { margin-top: 10px; }
.quotaWinL {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--ds-t-3);
  margin-bottom: 4px;
  font-variant-numeric: tabular-nums;
}
.quotaWinL b { color: var(--ds-t-1); font-weight: 600; }
```

- [ ] **Step 5: 趋势 / 峰谷占比条**

```css
.trendLegend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  font-size: 11px;
  color: var(--ds-t-2);
  margin-top: 10px;
}
.trendLegend i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  margin-right: 4px;
  vertical-align: middle;
}

.tokenBar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--dsb-3);
}
.tokenBar > i { display: block; height: 100%; }
```

- [ ] **Step 6: 设置页开关矩阵**

```css
.settingsGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 720px) {
  .settingsGrid { grid-template-columns: 1fr; }
}
.setting {
  padding: 14px 16px;
  border: 1px solid var(--ds-border);
  border-radius: var(--ds-r-2);
  background: var(--dsb-glass);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 12px;
  align-items: center;
}
.settingName { font-weight: 600; font-size: 13px; color: var(--ds-t-1); }
.settingDesc {
  grid-column: 1 / -1;
  color: var(--ds-t-3);
  font-size: 11px;
}
.toggle {
  width: 32px;
  height: 18px;
  background: var(--dsb-3);
  border: 1px solid var(--ds-border);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  transition: background var(--ds-t-fast);
}
.toggle::after {
  content: "";
  position: absolute;
  left: 2px;
  top: 2px;
  width: 12px;
  height: 12px;
  background: var(--ds-t-2);
  border-radius: 50%;
  transition: transform var(--ds-t-fast), background var(--ds-t-fast);
}
.toggleOn { background: color-mix(in srgb, var(--ds-blue) 60%, transparent); border-color: transparent; }
.toggleOn::after { transform: translateX(14px); background: white; }
```

- [ ] **Step 7: 自定义单价行强调**

```css
.pricingRowCustom {
  /* 自定义覆盖价行：amber 描边 */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-amber) 36%, transparent);
}
.pricingSourceBadge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ds-amber) 14%, transparent);
  color: var(--ds-amber);
  border: 1px solid color-mix(in srgb, var(--ds-amber) 28%, transparent);
}
```

- [ ] **Step 8: 验证 + 提交**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3
git add src/client/UsageBilling.module.css
git commit -m "style(surface-d2): redesign provider/trend/settings/pricing tabs"
```

---

## Task 7 · 全量回归 + 体积验证

**Files:**
- 验证：`lib/client.js`、`lib/index.js`

- [ ] **Step 1: 跑全量**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3
```
预期：tsc 0 错 / vitest 全部 404 个测试通过。

- [ ] **Step 2: 跑 tsdown 打包并查体积**

```bash
cd /Users/ken/dsh-ui-usage-billing && ./node_modules/.bin/tsdown 2>&1 | grep -E "(Build complete|error)"
ls -l /Users/ken/dsh-ui-usage-billing/lib/client.js | awk '{print $5/1024 " KiB"}'
```
预期：`Build complete` / `lib/client.js` ≤ 256 KiB。

若超阈值：按 `.t1`、`.t2`、`.t3`、`.t4` 命名相似性合并类、移除未引用类、必要时把 `.badgeLive` 等独立类合到一个 `.badge` + `[data-variant]` 修饰符。

- [ ] **Step 3: 提交（如有体积裁剪）**

```bash
git add src/client/UsageBilling.module.css lib/
git commit -m "chore(build): trim css to stay under 256KiB cap"
```

---

## Task 8 · 同步双线与文档

- [ ] **Step 1: 同步 main → compat/stable-dsh**

```bash
cd /Users/ken/dsh-ui-usage-billing
git checkout compat/stable-dsh
git merge main --no-ff -m "merge: UI redesign into stable line"
./node_modules/.bin/tsc -b tsconfig.json && ./node_modules/.bin/vitest run 2>&1 | tail -3
git checkout main
```

- [ ] **Step 2: CHANGELOG 加 v1.2.8 / v1.1.18 条目**

按既有格式补条目（每条 ≤ 5 行）：
- 主标题：**UI 全面美化升级**（精致科技风 / 玻璃 / 1px / 等宽 / 暗亮双主题 / 弹窗新视觉）
- 子项：触发卡 / 即时条 / 峰谷提醒 / 弹窗 6 Tab
- 零数据面改动提示

- [ ] **Step 3: 提交**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog v1.2.8 UI redesign entry"
```

---

## 自审（写作后）

**Spec 覆盖**：
- 第二节美学锚点 ✓ → Task 1（令牌）
- 第三节令牌（表面/文字/语义/图表/字号/动效）✓ → Task 1
- 第四节组件规格 Surface A-D ✓ → Task 2/3/4/5/6
- 第五节范围声明 ✓ → 每个 Task 的 Files 列表明示不动 .tsx
- 第六节验收 ✓ → Task 7 全量 + 体积
- 第七节风险与对策 ✓ → Task 7 Step 2 的体积裁剪
- 第八节落地路径 ✓ → Task 顺序 A → B → C → D1 → D2

**占位扫描**：0 个 TBD / TODO / "类似 Task N" / "适当处理"

**类型/命名一致性**：所有颜色 token 用 `--ds-*` 前缀、玻璃用 `--dsb-*`、图表色用 `--ds-c-N`；JSX 不引用具体 token 字符串（仅引用 class 名），token 名变更不影响组件。
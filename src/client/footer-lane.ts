/**
 * 侧栏 footer 同槽占位测量（社区约定 §20.4 / §25「卡片型占用者」）。
 *
 * 背景：宿主的 `sidebar.footer.action` 是一个**无 wrap 的横向 flex 行**
 * （`.footerActions{display:flex}`，无 gap/padding）。本插件的触发卡是**宽卡**
 * （`width:100%`），同槽有别的插件时会把它们推到面板右边界之外——用户看到的
 * 现象是「别的插件像没加载」（社区 issue #237）。纵向栈（手机端侧栏浮层）
 * 下宽卡则会把同列的其它入口挤到下方（§25.6）。
 *
 * 宿主**不**向占位者暴露同槽邻居信息：owner props 只有 `{ wide }`，register
 * 选项里也没有「占用者」字段（对比 `sidebar.panellist.actions` 才带 entries）。
 * 因此按社区约定 §20.4 的测量算法从 DOM 反推：
 * - 向上找到「真正的行」：跳过 `display:contents` 的槽位外壳；
 * - 数同排的可见占位者（展开 display:contents 的子项，排除自己与不可见元素）；
 * - 读行的 `flex-direction`（`column` = 纵向栈）。
 *
 * 判定（§25 方案 A：卡片型占用者有邻居时降级为按钮形态）：
 * - 横向行且有邻居 → 收成 36×36 图标钮（此时禁止 `width:100%`）；
 * - 纵向栈 → 同样收成图标钮；
 * - 其余（独占一行 / 测不到行）→ 保持宽卡。
 *
 * 本模块只做测量与判定，不碰宿主容器（不得注入 `flex-wrap` /
 * `flex-direction` / `order`，见 §25 硬规则 2）。
 */

/** 同槽占位事实。 */
export interface FooterLaneFacts {
  /** 真正的行容器（最近的 flex 祖先）；找不到时为 null（此时没有横向挤占问题）。 */
  row: HTMLElement | null
  /** 行是纵向列（手机端侧栏浮层）而非横向行。 */
  stacked: boolean
  /** 同行可见占位者数量（不含自己）。 */
  neighbors: number
}

/** 触发卡形态：宽卡（独占一行）/ 图标钮（与邻居共存）。 */
export type TriggerForm = 'card' | 'icon'

/** 观察句柄。 */
export interface FooterLaneWatch {
  /** 停止观察。 */
  dispose(): void
}

/**
 * 向上找「真正的行」：**只认 flex 容器**（宿主的 `.footerActions` 是 flex，
 * 手机端侧栏是同一条 flex 列），并跳过 `display:contents` 的槽位外壳
 * （外壳的 `clientWidth` 恒为 0，不能用来测量）。
 *
 * 刻意不把「多子项的普通包裹层」当行：本插件自己也可能在同一容器里渲染出
 * 多个元素（宽卡 + 装饰孔位），那种容器不是宿主的 footer 行，把它当行会把
 * 自家元素数成「邻居」，宽卡无缘无故收成图标钮。认不到行时按宽卡处理
 * （= 旧行为），宁可少收窄也不误收窄。
 */
function findFooterRow(self: HTMLElement): HTMLElement | null {
  let row: HTMLElement | null = self
  while (row !== null && row.parentElement !== null) {
    const parent: HTMLElement = row.parentElement
    // body/documentElement 不是 footer 行：把它们当行会把页面上的任意元素
    // 数成「邻居」（测试容器、别的面板内容），导致宽卡无缘无故收成图标钮。
    if (parent === document.body || parent === document.documentElement) return null
    const style = getComputedStyle(parent)
    if (style.display !== 'contents' && style.display.includes('flex')) return parent
    row = parent
  }
  return null
}

/**
 * 数同排的可见占位者：展开 `display:contents` 的子项，排除自己所在的子树
 * 与不可见元素（`display:none` / `visibility:hidden` / 脱离布局的
 * `position:absolute|fixed` / 零尺寸）。
 *
 * 零尺寸判据只在**有布局**时生效（`row.clientWidth > 0`）：jsdom 不做布局，
 * 所有 rect 都是 0，照字面执行会把邻居全判成不可见。
 */
function countNeighbors(row: HTMLElement, self: HTMLElement): number {
  const hasLayout = row.clientWidth > 0
  let count = 0
  const visit = (el: Element): void => {
    // 自己所在的子树整棵跳过（自己不是「邻居」）。
    if (el.contains(self)) return
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return
    if (style.position === 'absolute' || style.position === 'fixed') return
    if (style.display === 'contents') {
      for (const child of Array.from(el.children)) visit(child)
      return
    }
    if (hasLayout) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
    }
    count += 1
  }
  for (const child of Array.from(row.children)) visit(child)
  return count
}

/**
 * 测量同槽占位事实。
 * @param self - 本插件在行内的元素（触发卡外壳）。
 * @returns 行容器 / 是否纵向栈 / 邻居数量。
 */
export function measureFooterLane(self: HTMLElement): FooterLaneFacts {
  const row = findFooterRow(self)
  if (row === null) return { row: null, stacked: false, neighbors: 0 }
  const stacked = getComputedStyle(row).flexDirection === 'column'
  return { row, stacked, neighbors: countNeighbors(row, self) }
}

/**
 * 由占位事实判定触发卡形态（社区约定 §25 方案 A）。
 * @param facts - 同槽占位事实。
 * @returns `icon` = 收成 36×36 图标钮；`card` = 保持宽卡。
 */
export function resolveTriggerForm(facts: FooterLaneFacts): TriggerForm {
  // 测不到行：没有行就没有横向挤占问题，保持宽卡（与旧行为一致）。
  if (facts.row === null) return 'card'
  // 纵向栈：宽卡仍以 width:100% 铺满，把同列其它入口挤到下方（§25.6）。
  if (facts.stacked) return 'icon'
  // 横向行内有邻居：宽卡不得占满，否则把邻居推出面板外（§25 硬规则 1）。
  return facts.neighbors > 0 ? 'icon' : 'card'
}

/**
 * 观察同槽占位变化，形态变化时回调。
 *
 * 三路触发源缺一不可（§20.4）：`ResizeObserver`（侧栏拖拽改宽 / 折叠）、
 * `MutationObserver`（邻居插件注册、卸载、隐藏）、`window` `resize`。
 * 只在**形态真的变了**时回调，避免自触发成环。
 *
 * @param self - 本插件在行内的元素。
 * @param onForm - 形态变化回调。
 * @returns 观察句柄。
 */
export function watchFooterLane(self: HTMLElement, onForm: (form: TriggerForm) => void): FooterLaneWatch {
  let last: TriggerForm | undefined
  const report = (): void => {
    const form = resolveTriggerForm(measureFooterLane(self))
    if (form === last) return
    last = form
    onForm(form)
  }
  const row = findFooterRow(self)
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => report()) : undefined
  const mutation = typeof MutationObserver === 'function' ? new MutationObserver(() => report()) : undefined
  resize?.observe(self)
  if (row !== null) {
    resize?.observe(row)
    mutation?.observe(row, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    })
  }
  window.addEventListener('resize', report)
  report()
  return {
    dispose(): void {
      resize?.disconnect()
      mutation?.disconnect()
      window.removeEventListener('resize', report)
    },
  }
}

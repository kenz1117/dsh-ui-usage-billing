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
 * - 纵向座位 → 只有「放不下宽卡」的窄座才收成图标钮；**整行宽座**（第三方
 *   皮肤显式给出的宽座，客人被拉满整行、宽卡放得下）保留宽卡（issue #140）；
 * - 其余（独占一行 / 测不到行）→ 保持宽卡。
 *
 * 本模块只做测量与判定，不碰宿主容器（不得注入 `flex-wrap` /
 * `flex-direction` / `order`，见 §25 硬规则 2）。
 */
/** 同槽占位事实。 */
export interface FooterLaneFacts {
    /** 真正的行容器（最近的 flex 祖先）；找不到时为 null（此时没有横向挤占问题）。 */
    row: HTMLElement | null;
    /** 行是纵向列（手机端侧栏浮层 / 皮肤改写的竖座）而非横向行。 */
    stacked: boolean;
    /**
     * 纵向座位是「整行宽座」：客人被拉满整行宽度（`align-items` 拉伸）且座位
     * 放得下宽卡。第三方皮肤（如 dsh-islands-ui 的工作区底部宽座）这样声明
     * 「这里要放得下宽插件」；手机端的窄竖条不是（issue #140 现象二）。
     */
    wideSeat: boolean;
    /** 同行可见占位者数量（不含自己）。 */
    neighbors: number;
}
/** 触发卡形态：宽卡（独占一行）/ 图标钮（与邻居共存）。 */
export type TriggerForm = 'card' | 'icon';
/** 观察句柄。 */
export interface FooterLaneWatch {
    /** 停止观察。 */
    dispose(): void;
}
/**
 * 测量同槽占位事实。
 * @param self - 本插件在行内的元素（触发卡外壳）。
 * @returns 行容器 / 是否纵向栈 / 是否宽座 / 邻居数量。
 */
export declare function measureFooterLane(self: HTMLElement): FooterLaneFacts;
/**
 * 由占位事实判定触发卡形态（社区约定 §25 方案 A）。
 * @param facts - 同槽占位事实。
 * @returns `icon` = 收成 36×36 图标钮；`card` = 保持宽卡。
 */
export declare function resolveTriggerForm(facts: FooterLaneFacts): TriggerForm;
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
export declare function watchFooterLane(self: HTMLElement, onForm: (form: TriggerForm) => void): FooterLaneWatch;
//# sourceMappingURL=footer-lane.d.ts.map
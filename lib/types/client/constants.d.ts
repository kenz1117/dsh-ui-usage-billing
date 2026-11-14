/**
 * 客户端常量（无 React 依赖、无运行时副作用）：把 UsageBilling.tsx 散落的零散
 * 常量集中到这里。UI 文案、key 名仍留在 locales.ts；这里只放「数值 / 路径 /
 * 颜色 / 时间间隔」。
 */
import type { UsageStats } from './domain/types.ts';
/** 预算提醒档位（百分比）：跨档时桌面通知，每档每天最多一次。 */
export declare const BUDGET_ALERT_TIERS: readonly number[];
/** 余额不足告警的默认阈值（人民币元）：宿主 Config 未配置时客户端兜底。 */
export declare const DEFAULT_LOW_BALANCE_THRESHOLD = 50;
/** 会话明细面板最多展示的行数（完整长尾在服务端另有一层封顶）。 */
export declare const SESSION_DISPLAY_LIMIT = 20;
/** 弹窗打开期间统计与定价的自动刷新间隔（毫秒）。 */
export declare const STATS_REFRESH_INTERVAL_MS = 30000;
/** 弹窗关闭后的统计刷新间隔（毫秒）：侧栏触发器只需大致最新值，降到 5 分钟
 *  省宿主聚合（每轮都是折叠 + 五个端点的串行响应）。 */
export declare const STATS_REFRESH_CLOSED_MS = 300000;
/**
 * 插件自有 DOM 根容器标记（issue #124）：动效压制规则只在本插件根容器内生效。
 *
 * 此前「动效强度」开关把 data-motion 写在 <html> 上，配 `*` 通配符 + !important，
 * 会把宿主与第三方插件的全部动画一起压平（报告者实测右键菜单动画消失）。改为
 * 给每个自有根容器挂这个类，压制规则收进根容器内，宿主与其他插件不受影响。
 * 新增挂载点时记得一并打标——漏标只会让该处动画不再被压制，不会外溢。
 */
export declare const BILLING_ROOT_CLASS = "dsh-billing-root";
/** Empty snapshot: shown before (or without) real host data — zeros, never fabricated samples. */
export declare const EMPTY_STATS: UsageStats;
/**
 * 高区分度图表色板：趋势图柱、图例与计费表圆点按模型分配。不用模型品牌色
 * （目录里多为蓝色系，视觉上几乎分不开），保证每个模型一眼可辨。
 * 取设计 spec §3.4 七段色板（与 CSS --ds-c-1..7 同值；SVG presentation
 * attribute 不解析 var()，故用同值字面量而非令牌引用），后三位保持
 * 原有高区分度补位色，10 路循环不变。
 */
export declare const CHART_PALETTE: readonly string[];
//# sourceMappingURL=constants.d.ts.map
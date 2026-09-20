/**
 * 内置价格目录与别名表的纯数据模块：只随 node 半构建发布（宿主聚合计价使用），
 * 并经 /api/billing/pricing 下发给客户端注入——client bundle 不携带这份数据
 * （瘦身：lib/client.js 约 -30 KiB）。条目结构与消费逻辑见 ./client/pricing.ts。
 */
import type { ModelEntry } from './client/pricing.ts';
export declare const BUILTIN_MODEL_CATALOG: readonly ModelEntry[];
/**
 * 真实 provider model id → 计费目录键（`MODEL_CATALOG[].key`）的映射。未知 id
 * 原样保留并落回 `other`（未知模型不估算费用）。聚合层（aggregate.ts）在折叠时
 * 用同一张表把日志里的 model id 归并为目录键，客户端渲染（`modelOf`）也按它
 * 解析，两侧共用一份映射，避免同一模型两侧不一致导致「未收录」。
 */
export declare const BUILTIN_MODEL_KEY_ALIASES: Readonly<Record<string, string>>;
//# sourceMappingURL=builtin-catalog.d.ts.map
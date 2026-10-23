/**
 * 智能体网络树：从会话行的 `parentId` 还原委派关系，并逐级算出「链合计」。
 *
 * 背景：宿主把子智能体落成**独立会话**，靠 `parentId` 指向委派它的对话。本仓的
 * 账单页（明细 Tab）已经能把子智能体归并到父会话，但那是「账单视角」；本模块给出
 * 「网络视角」——谁委派了谁、每条链总共花了多少，用来回答**「哪次委派最贵」**。
 *
 * 与展示层的 `buildSessionDisplay` 的分工：那一支做的是**同标题会话合并 + 展示树
 * 挂靠**（账单表要按人可读的方式分组）；本模块只做**委派关系 + 链合计**，不合并
 * 同标题会话——网络视角里两个同名会话是两个独立智能体。
 *
 * 环防护：异常数据可能出现 `a.parentId=b && b.parentId=a`（互指父子），直接递归
 * 会造出渲染死循环。建树时按「父链回溯」判环：命中环的节点按根处理（不挂到任何
 * 父节点下），其余结构照常。
 */
import type { SessionBillingRow } from './types.ts';
/** 网络树的一个节点（一个智能体 / 一个会话）。 */
export interface AgentNode {
    id: string;
    title?: string;
    cwd?: string;
    /** 自身调用数（不含后代）。 */
    calls: number;
    /** 自身费用（不含后代）。 */
    cost: number;
    /** 最后活跃时刻（毫秒）。 */
    lastActive: number;
    /** 自身 + 全部后代的费用合计。 */
    chainCost: number;
    /** 自身 + 全部后代的调用合计。 */
    chainCalls: number;
    /** 直接子智能体（按链合计倒序）。 */
    children: AgentNode[];
    /** 深度（根 = 0）。 */
    depth: number;
}
/** 网络树汇总。 */
export interface AgentTreeStats {
    /** 参与网络的智能体总数（含根）。 */
    agents: number;
    /** 委派边数（父 → 子 的条数）。 */
    delegations: number;
    /** 根（对话）数量。 */
    roots: number;
    /** 链合计最高的一支（根或子节点皆可）。 */
    costliest?: AgentNode;
}
/**
 * 建树：还原委派关系并算链合计。
 * @param rows - 会话行（含 parentId 的原始行，不是展示层合并后的行）。
 * @returns 根节点数组（按链合计倒序）。
 */
export declare function buildAgentTree(rows: readonly SessionBillingRow[]): AgentNode[];
/**
 * 网络树汇总统计。
 * @param roots - 根节点数组。
 * @returns 汇总（智能体数 / 委派数 / 对话数 / 最贵的一支）。
 */
export declare function agentTreeStats(roots: readonly AgentNode[]): AgentTreeStats;
//# sourceMappingURL=agent-tree.d.ts.map
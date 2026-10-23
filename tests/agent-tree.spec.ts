/**
 * 智能体网络树：从会话行的 parentId 还原委派关系并算链合计。
 *
 * 锁三件事：
 * 1. 链合计 = 自身 + 全部后代（回答「哪次委派最贵」）。
 * 2. 父不在本批（配置已删 / 只读快照）→ 该行按根处理，费用不丢。
 * 3. 异常数据互指父子（a.parentId=b && b.parentId=a）→ 判环并按根处理，
 *    不制造渲染死循环。
 */

import { describe, expect, it } from 'vitest'
import { agentTreeStats, buildAgentTree } from '../src/client/domain/agent-tree.ts'
import type { SessionBillingRow } from '../src/client/domain/types.ts'

function row(partial: Partial<SessionBillingRow> & { id: string }): SessionBillingRow {
  return {
    calls: 0,
    cost: 0,
    lastActive: Date.UTC(2026, 9, 18),
    ...partial,
  }
}

describe('buildAgentTree', () => {
  it('builds a parent → child chain with chain totals', () => {
    const roots = buildAgentTree([
      row({ id: 'root', title: '主对话', calls: 10, cost: 1 }),
      row({ id: 'child', title: '子智能体', calls: 5, cost: 0.5, parentId: 'root' }),
      row({ id: 'grand', title: '孙智能体', calls: 2, cost: 0.25, parentId: 'child' }),
    ])

    expect(roots).toHaveLength(1)
    expect(roots[0].id).toBe('root')
    expect(roots[0].chainCost).toBeCloseTo(1.75)
    expect(roots[0].chainCalls).toBe(17)
    expect(roots[0].children[0].id).toBe('child')
    expect(roots[0].children[0].chainCost).toBeCloseTo(0.75)
    expect(roots[0].children[0].children[0].id).toBe('grand')
  })

  it('treats a row whose parent is absent from the batch as a root', () => {
    const roots = buildAgentTree([
      row({ id: 'orphan', title: '孤儿子会话', calls: 3, cost: 0.3, parentId: 'gone' }),
    ])

    expect(roots).toHaveLength(1)
    expect(roots[0].id).toBe('orphan')
    expect(roots[0].depth).toBe(0)
  })

  it('breaks parent cycles instead of recursing forever', () => {
    const roots = buildAgentTree([
      row({ id: 'a', calls: 1, cost: 1, parentId: 'b' }),
      row({ id: 'b', calls: 1, cost: 1, parentId: 'a' }),
    ])

    // 环上的节点按根处理：两者各自成根，链合计不互相吞并。
    expect(roots.map(node => node.id).sort()).toEqual(['a', 'b'])
    for (const node of roots) {
      expect(node.children).toHaveLength(0)
      expect(node.chainCost).toBeCloseTo(1)
    }
  })

  it('sorts roots and children by chain cost descending', () => {
    const roots = buildAgentTree([
      row({ id: 'r1', cost: 1 }),
      row({ id: 'r2', cost: 5 }),
      row({ id: 'c1', cost: 0.5, parentId: 'r1' }),
      row({ id: 'c2', cost: 3, parentId: 'r1' }),
    ])

    expect(roots.map(node => node.id)).toEqual(['r2', 'r1'])
    expect(roots[1].children.map(node => node.id)).toEqual(['c2', 'c1'])
  })

  it('summarizes agents, delegations and the costliest chain', () => {
    const roots = buildAgentTree([
      row({ id: 'root', cost: 1 }),
      row({ id: 'a', cost: 2, parentId: 'root' }),
      row({ id: 'b', cost: 4, parentId: 'a' }),
    ])
    const summary = agentTreeStats(roots)

    expect(summary.agents).toBe(3)
    expect(summary.delegations).toBe(2)
    expect(summary.roots).toBe(1)
    expect(summary.costliest?.id).toBe('root')
    expect(summary.costliest?.chainCost).toBeCloseTo(7)
  })
})

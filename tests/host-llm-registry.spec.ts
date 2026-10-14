/**
 * 宿主 llm 注册表读取（issue #91 follow-up）。
 *
 * 1.4.31 用属性访问 `ctx.llm` 读注册表：服务名不在插件 `inject` 里时 cordis 直接抛
 * `cannot get property "llm" without inject`，异常被 catch 吞掉后退化成空集合——插件
 * 注册的 adapter 通道（commandcode）全部留在 unknown 桶（费用恒 0），而且**没有任何
 * 可观察信号**。这里锁定两条：只经 `get()` 读取；读不到/读到空都要回报 reason，
 * 由调用方告警而不是静默降级。
 */

import { describe, expect, it } from 'vitest'
import { readRegisteredProviderIds } from '../src/index.ts'

describe('readRegisteredProviderIds (issue #91)', () => {
  it('reads provider ids through get(), never through a service property access', () => {
    // 复刻 cordis 的服务代理语义：未注入的服务属性访问抛错，get() 才可用。
    const ctx = {
      get llm(): never {
        throw new Error('cannot get property "llm" without inject')
      },
      get: (name: string): unknown =>
        name === 'llm' ? { listProviders: () => [{ id: 'commandcode' }, { id: 'deepseek' }] } : undefined,
    }
    const { ids, reason } = readRegisteredProviderIds(ctx.get)
    expect(reason).toBeUndefined()
    expect([...ids].sort()).toEqual(['commandcode', 'deepseek'])
  })

  it('reports a reason instead of silently degrading when every read shape fails', () => {
    const cases: [string, ((name: string) => unknown) | undefined, RegExp][] = [
      ['no get() accessor', undefined, /no get\(\) accessor/],
      ['llm service absent', () => undefined, /llm service is not registered/],
      ['no listProviders()', () => ({ open: () => {} }), /no listProviders\(\)/],
      ['empty registry', () => ({ listProviders: () => [] }), /no registered providers/],
      [
        'registry throws',
        () => ({
          listProviders: () => {
            throw new Error('registry exploded')
          },
        }),
        /registry could not be read \(registry exploded\)/,
      ],
      ['no usable ids', () => ({ listProviders: () => [{ name: 'x' }, { id: '' }] }), /no usable provider ids/],
    ]
    for (const [label, get, pattern] of cases) {
      const { ids, reason } = readRegisteredProviderIds(get)
      expect(ids.size, label).toBe(0)
      expect(reason, label).toMatch(pattern)
    }
  })

  it('keeps usable ids and drops malformed entries', () => {
    const { ids, reason } = readRegisteredProviderIds(() => ({
      listProviders: () => [{ id: 'commandcode' }, { id: '' }, null, { id: 'workbuddy' }],
    }))
    expect(reason).toBeUndefined()
    expect([...ids].sort()).toEqual(['commandcode', 'workbuddy'])
  })
})

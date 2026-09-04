/**
 * @deepseek-ai/dsh-client-runtime/client 的测试替身。
 *
 * 稳定线（compat）代码 import 该模块，但 npm 上的 client-runtime@0.1.1-rc.2
 * 依赖了 registry 上不存在匹配版本的 dsh-typert-registry（semver 排除
 * prerelease），无法独立安装。client 渲染测试里组件的 store 都由 props
 * 注入，stub 只需形状兼容两代 API：
 * - 0.1.1 面：`handle.create()` 返回带 subscribe/getSnapshot/actions 的实例；
 * - 0.1.2 面：handle 自身即可观察（subscribe/getSnapshot）。
 */
import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** 极简 store 引擎：状态留在内存，不落 localStorage；action 在副本上执行以保证引用变化。 */
export function defineStore<S extends object, A extends object>(spec: {
  init: () => S
  persist?: string
  actions?: A
}): EngineStoreHandle<S, A> {
  let state = spec.init()
  const listeners = new Set<() => void>()
  const commit = (next: S): void => {
    state = next
    for (const fn of listeners) fn()
  }
  const actions = Object.fromEntries(Object.entries(spec.actions ?? {}).map(([name, action]) => [
    name,
    (...payload: unknown[]) => {
      const draft = { ...state }
      ;(action as (...args: unknown[]) => void)(draft, ...payload)
      commit(draft)
    },
  ])) as A
  const instance = {
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    getSnapshot: () => state,
    actions,
  }
  return {
    register: () => () => {},
    create: () => instance,
    subscribe: instance.subscribe,
    getSnapshot: instance.getSnapshot,
  } as unknown as EngineStoreHandle<S, A>
}

/**
 * 测试本地版的 uSES 桥接：把裸的 observable 快照源绑定成类型化的 selector hook。
 *
 * 为什么不复用官方 @deepseek-ai/dsh-client-test-runtime：
 * 该 npm 包的构建产物引用了 @deepseek-ai/dsh-client-ui-renderer 的 src/ 源文件，
 * 而 npm 上发布的 ui-renderer 包只含 lib/（无 src/），从 registry 安装后必然
 * ERR_MODULE_NOT_FOUND。这里的实现与官方 ui-renderer bind.ts 逐字等价（8 行），
 * 仅把宿主运行时才有的依赖换成测试环境的等价物。
 */
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'
import type { HostObservable, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'

/**
 * 把裸 observable 源绑定到 uSES selector hook。
 * subscribe/getSnapshot 在每个源上只捕获一次（同时重绑方法式源的 this），
 * 组件跨渲染不会重复订阅；相等性默认 Object.is。
 * @param source - 快照源（引擎 store、Session 对象、store 实例）。
 * @returns selector hook。
 */
export function bindSnapshotSelector<T>(source: HostObservable<T>): SnapshotSelectorHook<T> {
  const subscribe = (fn: () => void) => source.subscribe(fn)
  const getSnapshot = () => source.getSnapshot()
  return function useSelector<S>(sel: (s: T) => S, eq?: (a: S, b: S) => boolean): S {
    return useSyncExternalStoreWithSelector(subscribe, getSnapshot, undefined, sel, eq)
  }
}

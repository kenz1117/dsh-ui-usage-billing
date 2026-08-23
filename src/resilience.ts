/**
 * 上游网络请求的稳定性工具：有限重试（指数退避）与每平台熔断冷却门。
 *
 * 计费插件对三类上游做实时请求——pricing（汇率 / OpenRouter / models.dev）、
 * balance（各厂商余额）、subscriptions（各订阅额度）。单次失败会被调用方降级，
 * 但反复的瞬时失败（网络波动 / 5xx / 429）会让 30 秒轮询每次打满超时。这里提供
 * 两个纯工具：`withRetry` 对可重试错误做指数退避，`createCooldownGate` 在单一
 * 上游连续失败后短路一段时间，避免把请求打到已不可用的服务上。
 */

/** 是否是可重试的错误：网络性失败（TypeError / Abort / Timeout）或 5xx / 429。
 *  401 / 403 鉴权失败与 404 不可重试——重试只放大错误、不会变好。 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return true
    if (error instanceof TypeError) return true
    const status = (error as { httpStatus?: unknown }).httpStatus
    if (typeof status === 'number') return status === 429 || status >= 500
  }
  return false
}

/** 重试配置。 */
export interface RetryOptions {
  /** 除首次尝试外的额外重试次数（默认 1）。 */
  retries?: number
  /** 首次退避基数（默认 250ms）。 */
  baseDelayMs?: number
  /** 退避上限（默认 2000ms）。 */
  maxDelayMs?: number
  /** 何时重试；默认 {@link isRetryableError}。 */
  shouldRetry?: (error: unknown) => boolean
}

/** 休眠指定毫秒（Promise 化 setTimeout）。 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 对一次上游请求做有限重试：可重试错误时按指数退避（+同量级抖动）重试。
 * @param fn - 发起请求的异步函数。
 * @param options - 重试策略（见 {@link RetryOptions}）。
 * @returns fn 的结果；重试耗尽后抛出最后一次错误。
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 1, baseDelayMs = 250, maxDelayMs = 2000, shouldRetry = isRetryableError } = options
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= retries || !shouldRetry(error)) throw error
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
      // 同量级抖动，避免多平台同刻退避后齐射。
      await sleep(delay / 2 + Math.random() * (delay / 2))
    }
  }
  throw lastError
}

/** 熔断冷却门配置。 */
export interface CooldownGateOptions {
  /** 连续失败达到该次数进入冷却（默认 3）。 */
  failures?: number
  /** 冷却时长（默认 30 秒）。 */
  cooldownMs?: number
}

/** 每平台熔断门：check 是否允许请求；fail / success 上报结果。 */
export interface CooldownGate {
  /** 该平台是否允许发起请求。false 表示处于冷却中，调用方应短路为不可用。 */
  check(key: string): boolean
  /** 上报一次失败（可能进入冷却）。 */
  fail(key: string): void
  /** 上报一次成功（重置失败计数与冷却）。 */
  success(key: string): void
}

/** 每平台冷熔断：连续失败达阈值后短路一段真实时间，成功后复位。 */
export function createCooldownGate(options: CooldownGateOptions = {}): CooldownGate {
  const { failures = 3, cooldownMs = 30_000 } = options
  const state = new Map<string, { count: number; until: number }>()
  return {
    check(key: string): boolean {
      const s = state.get(key)
      if (s === undefined) return true
      if (s.until > 0 && Date.now() < s.until) return false
      return true
    },
    fail(key: string): void {
      const s = state.get(key) ?? { count: 0, until: 0 }
      s.count += 1
      if (s.count >= failures) {
        s.until = Date.now() + cooldownMs
        s.count = 0
      }
      state.set(key, s)
    },
    success(key: string): void {
      state.delete(key)
    },
  }
}

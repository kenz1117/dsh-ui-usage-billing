/**
 * Tencent Cloud TokenHub control-plane access (cloud API 3.0, TC3-HMAC-SHA256).
 *
 * Shared by two surfaces that read the same Token Plan:
 * - `balance.ts` — the balance row (absolute remaining quota);
 * - `subscriptions.ts` — the subscription card (monthly window + plan name).
 *
 * Credentials are a cloud API key pair (`<SecretId>:<SecretKey>`), NOT the
 * TokenHub inference key. Field names on the control plane are not fully
 * stable, so parsing stays defensive (semantic-key scanning).
 */

import { createHash, createHmac } from 'node:crypto'

/** TokenHub 管控面 API 端点（cloud.tencent.cn/document/api/1823/132270）。 */
export const TOKENHUB_HOST = 'tokenhub.tencentcloudapi.com'

/** 云 API 3.0 产品名与版本（签名的 service 段与请求头都必须一致）。 */
const TOKENHUB_SERVICE = 'tokenhub'
const TOKENHUB_VERSION = '2026-03-22'

/** 请求地域：管控面对地域不敏感，取默认国内地域（文档地域列表含 ap-guangzhou）。 */
const TOKENHUB_REGION = 'ap-guangzhou'

/** 管控面调用超时（毫秒）：余额与订阅面板共用同一预算。 */
export const TOKENHUB_TIMEOUT_MS = 8000

/** 腾讯云凭据引用值格式：`<SecretId>:<SecretKey>`（分隔符取首个冒号）。 */
export function parseTencentCredential(value: string): { secretId: string; secretKey: string } | undefined {
  const sep = value.indexOf(':')
  if (sep === -1) return undefined
  const secretId = value.slice(0, sep).trim()
  const secretKey = value.slice(sep + 1).trim()
  if (secretId === '' || secretKey === '') return undefined
  return { secretId, secretKey }
}

/**
 * 构造云 API 3.0 TC3-HMAC-SHA256 签名（官方签名方法 v3）。导出供测试：纯函数，
 * 输入确定则签名确定。Action 不参与签名——它走 `X-TC-Action` 请求头。
 * @param secretId - 云 API SecretId。
 * @param secretKey - 云 API SecretKey。
 * @param payload - 已序列化的请求体（含 Action/Version/Region 公共参数）。
 * @param timestamp - 签名时间戳（秒）。
 * @returns Authorization 头的值。
 */
export function tc3Authorization(
  secretId: string,
  secretKey: string,
  payload: string,
  timestamp: number,
): string {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${TOKENHUB_HOST}\n`
  const hashedPayload = createHash('sha256').update(payload).digest('hex')
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\ncontent-type;host\n${hashedPayload}`
  const hashedCanonical = createHash('sha256').update(canonicalRequest).digest('hex')
  const stringToSign = `TC3-HMAC-SHA256\n${String(timestamp)}\n${date}/${TOKENHUB_SERVICE}/tc3_request\n${hashedCanonical}`
  // 派生密钥链：HMAC(date, SecretKey) → HMAC(service) → HMAC("tc3_request")。
  const kDate = createHmac('sha256', date).update(secretKey).digest()
  const kService = createHmac('sha256', kDate).update(TOKENHUB_SERVICE).digest()
  const kSigning = createHmac('sha256', kService).update('tc3_request').digest()
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')
  return `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${TOKENHUB_SERVICE}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`
}

/**
 * 调用一次 TokenHub 管控面接口：TC3 签名 + 超时保护，返回响应 JSON 的 `Response`。
 * 业务错误（Response.Error）与 HTTP 层错误都带 `code` 抛出，调用方按
 * unauthorized / unreachable / invalid 归类。
 */
export async function callTokenHub(
  secretId: string,
  secretKey: string,
  action: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const payload = JSON.stringify({ Action: action, Version: TOKENHUB_VERSION, Region: TOKENHUB_REGION, ...params })
  const timestamp = Math.floor(Date.now() / 1000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TOKENHUB_TIMEOUT_MS)
  try {
    const response = await fetch(`https://${TOKENHUB_HOST}/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        host: TOKENHUB_HOST,
        'x-tc-action': action.toLowerCase(),
        'x-tc-version': TOKENHUB_VERSION,
        'x-tc-region': TOKENHUB_REGION,
        'x-tc-timestamp': String(timestamp),
        authorization: tc3Authorization(secretId, secretKey, payload, timestamp),
      },
      body: payload,
      signal: controller.signal,
    })
    if (response.status === 401 || response.status === 403) {
      throw Object.assign(new Error('unauthorized'), { code: 'unauthorized' as const })
    }
    if (!response.ok) {
      // httpStatus 供 isRetryableError 识别 5xx/429 走重试。
      throw Object.assign(new Error(`HTTP ${String(response.status)}`), { httpStatus: response.status, code: 'unreachable' as const })
    }
    const doc = await response.json() as { Response?: Record<string, unknown> }
    const inner = doc.Response
    if (inner === undefined) throw Object.assign(new Error('no Response envelope'), { code: 'invalid' as const })
    // 云 API 业务错误：Response.Error 存在即失败（HTTP 仍是 200）。
    if (inner.Error !== undefined && inner.Error !== null) {
      const err = inner.Error as { Code?: unknown; Message?: unknown }
      const code = err.Code === 'AuthFailure.SignatureFailure' || err.Code === 'AuthFailure.SecretIdNotFound'
        ? 'unauthorized' as const
        : 'unreachable' as const
      throw Object.assign(new Error(String(err.Code ?? 'api-error')), { code })
    }
    return inner
  } finally {
    clearTimeout(timer)
  }
}

/** 数字归一化：上游可能给字符串数字；非有限数返回 undefined。 */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/**
 * 在套餐余量对象里防御性提取「剩余额度」：官方 SubPackageBalance/PackageInfo
 * 的字段名未稳定公开（issue #18 调研期），按语义键名扫描——命中 remaining /
 * balance / left 语义键直接用；命中 total 与 used 则相减推导。数字一律经
 * {@link toNumber} 归一化（上游可能给字符串）。
 * 导出供测试：纯函数。
 * @param source - 套餐详情里的余量对象（PackageInfo / SubPackageBalance 等）。
 * @returns 剩余额度（上游单位，通常为 token 数或元）；提取不到返回 undefined。
 */
export function pickRemainingQuota(source: unknown): number | undefined {
  if (source === null || typeof source !== 'object') return undefined
  const rows = Object.entries(source as Record<string, unknown>)
  const numeric = rows.filter(([, v]) => v !== null && toNumber(v) !== undefined)
  const byKey = (needles: readonly string[]): number | undefined => {
    for (const [key, value] of numeric) {
      const lower = key.toLowerCase()
      if (needles.some(n => lower.includes(n))) {
        const num = toNumber(value)
        if (num !== undefined && num >= 0) return num
      }
    }
    return undefined
  }
  const remaining = byKey(['remain', 'balance', 'left', 'available'])
  if (remaining !== undefined) return remaining
  const total = byKey(['total'])
  const used = byKey(['used', 'consume'])
  if (total !== undefined && used !== undefined) return Math.max(0, total - used)
  return undefined
}

/**
 * 防御性提取「总额度」：语义键 total / limit / quota。与
 * {@link pickRemainingQuota} 配对使用——两者都能取到时订阅卡才能算出
 * 已用百分比窗口；只有剩余值时窗口保持为空（绝不猜总额度）。
 * 注意排除键名：`RemainingQuota` / `UsedQuota` 这类键同样含 quota 子串，
 * 必须先剔除剩余 / 已用语义，否则会把剩余值误当总额度（有单测守卫）。
 * @param source - 套餐详情里的额度对象（PackageInfo / SubPackageBalance 等）。
 */
export function pickTotalQuota(source: unknown): number | undefined {
  if (source === null || typeof source !== 'object') return undefined
  const forbidden = ['remain', 'used', 'consume', 'left', 'available', 'balance']
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    const lower = key.toLowerCase()
    if (!lower.includes('total') && !lower.includes('limit') && !lower.includes('quota')) continue
    if (forbidden.some(marker => lower.includes(marker))) continue
    const num = toNumber(value)
    if (num !== undefined && num > 0) return num
  }
  return undefined
}

/** 套餐列表里提取第一个启用套餐的 TeamId：集合字段名做候选兼容。 */
export function firstEnabledTeamId(inner: Record<string, unknown>): string | undefined {
  const candidates = inner.TeamSet ?? inner.TokenPlanSet ?? inner.PlanSet
  if (!Array.isArray(candidates)) return undefined
  for (const item of candidates) {
    if (item === null || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.TeamId === undefined && row.PlanId === undefined) continue
    if (row.Status !== undefined && row.Status !== 'enable') continue
    const id = row.TeamId ?? row.PlanId
    if (typeof id === 'string' && id !== '') return id
  }
  return undefined
}

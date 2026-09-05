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
/** TokenHub 管控面 API 端点（cloud.tencent.cn/document/api/1823/132270）。 */
export declare const TOKENHUB_HOST = "tokenhub.tencentcloudapi.com";
/** 管控面调用超时（毫秒）：余额与订阅面板共用同一预算。 */
export declare const TOKENHUB_TIMEOUT_MS = 8000;
/** 腾讯云凭据引用值格式：`<SecretId>:<SecretKey>`（分隔符取首个冒号）。 */
export declare function parseTencentCredential(value: string): {
    secretId: string;
    secretKey: string;
} | undefined;
/**
 * 构造云 API 3.0 TC3-HMAC-SHA256 签名（官方签名方法 v3）。导出供测试：纯函数，
 * 输入确定则签名确定。Action 不参与签名——它走 `X-TC-Action` 请求头。
 * @param secretId - 云 API SecretId。
 * @param secretKey - 云 API SecretKey。
 * @param payload - 已序列化的请求体（含 Action/Version/Region 公共参数）。
 * @param timestamp - 签名时间戳（秒）。
 * @returns Authorization 头的值。
 */
export declare function tc3Authorization(secretId: string, secretKey: string, payload: string, timestamp: number): string;
/**
 * 调用一次 TokenHub 管控面接口：TC3 签名 + 超时保护，返回响应 JSON 的 `Response`。
 * 业务错误（Response.Error）与 HTTP 层错误都带 `code` 抛出，调用方按
 * unauthorized / unreachable / invalid 归类。
 */
export declare function callTokenHub(secretId: string, secretKey: string, action: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
/** 数字归一化：上游可能给字符串数字；非有限数返回 undefined。 */
export declare function toNumber(value: unknown): number | undefined;
/**
 * 在套餐余量对象里防御性提取「剩余额度」：官方 SubPackageBalance/PackageInfo
 * 的字段名未稳定公开（issue #18 调研期），按语义键名扫描——命中 remaining /
 * balance / left 语义键直接用；命中 total 与 used 则相减推导。数字一律经
 * {@link toNumber} 归一化（上游可能给字符串）。
 * 导出供测试：纯函数。
 * @param source - 套餐详情里的余量对象（PackageInfo / SubPackageBalance 等）。
 * @returns 剩余额度（上游单位，通常为 token 数或元）；提取不到返回 undefined。
 */
export declare function pickRemainingQuota(source: unknown): number | undefined;
/**
 * 防御性提取「总额度」：语义键 total / limit / quota。与
 * {@link pickRemainingQuota} 配对使用——两者都能取到时订阅卡才能算出
 * 已用百分比窗口；只有剩余值时窗口保持为空（绝不猜总额度）。
 * 注意排除键名：`RemainingQuota` / `UsedQuota` 这类键同样含 quota 子串，
 * 必须先剔除剩余 / 已用语义，否则会把剩余值误当总额度（有单测守卫）。
 * @param source - 套餐详情里的额度对象（PackageInfo / SubPackageBalance 等）。
 */
export declare function pickTotalQuota(source: unknown): number | undefined;
/** 套餐列表里提取第一个启用套餐的 TeamId：集合字段名做候选兼容。 */
export declare function firstEnabledTeamId(inner: Record<string, unknown>): string | undefined;
//# sourceMappingURL=tc3.d.ts.map
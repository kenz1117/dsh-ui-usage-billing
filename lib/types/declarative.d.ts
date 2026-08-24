/**
 * 声明端点（declarative endpoints）：让用户为内置表没有的供应商自声明余额/额度接口，
 * 不用等插件发版。用户提供「数字在哪儿」的取值路径，而非「怎么取」——没有表达式、
 * 没有任何东西被求值，`fields` / `windows` 里写的只是响应 JSON 的点路径，唯一操作是
 * 逐层下钻。
 *
 * ## 为什么把安全边界写在代码里而不是建议里
 *
 * 这个功能让**配置文件**决定一个携带用户 API key 的请求发往哪里。风险全在此，靠
 * 「提醒用户小心」一点都没用：
 *
 * 1. `origin` 只是查找键：请求 URL 由**匹配到的 provider 的 origin** 构造，绝不由
 *    声明的 origin 自己决定。匹配不到任何已配置的 provider 就不发请求。
 * 2. `path` 必须单斜杠绝对路径：`//evil.example/x` 是协议相对 URL，`new URL()` 会
 *    把它解析到别的主机；构造后还会再校验一次 origin。
 * 3. 只发 GET，无请求体，无自定义 method / headers。
 * 4. 凭据仍从匹配 provider 自己的 `apiKeyEnv` 取，经同一凭据 seam 解析；声明不能
 *    指定任何凭据。
 * 5. 跨源重定向直接失败，不跟随——那是绕过第 1 条最省事的办法。
 * 6. 响应体有大小上限与共享超时，坏 / 恶意端点拖不住面板。
 * 7. 声明不能覆盖内置读法：只在内置表答不上来时它才轮到。
 *
 * 这类行会标 `declared`，因为数字来自用户自己写的路径——取错是配置问题，界面要让
 * 这一点看得出来；全部字段都没取到时给 `reason`，而不是留一张和「上游没返回」无从
 * 区分的空卡。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { DeclaredEndpointConfig, ProviderBalance } from './pricing-shared.ts';
/**
 * 归一化 baseURL 为可比的 origin：`scheme://host[:port]`，剥掉 scheme 的默认端口，
 * host 转小写，忽略路径。无法解析返回 undefined。
 * @param baseURL - provider 的端点地址，或声明里的 origin。
 */
export declare function normalizeDeclaredOrigin(baseURL: string): string | undefined;
/**
 * 沿点路径走进已解析的响应体。
 * 任何失败都是同一个答案 `undefined`——路径不匹配是这份响应没有那个字段，是卡片
 * 本来就渲染得了的事实，不是错误，而且不该让已解析成功的字段被牵连。
 * @param body - 已解析的响应 JSON。
 * @param path - 点路径（如 `data.balance`）。
 * @returns 路径处的值，或 undefined（路径缺失 / 中途不是对象 / 命中原型链）。
 */
export declare function readDeclaredPath(body: unknown, path: string): unknown;
/**
 * 查询一组声明端点的余额/额度。每个声明独立成败，互不影响。
 * @param ctx - host context carrying the credentials seam.
 * @param providers - llm-pi-ai providers dict（`<route> → { baseURL?, apiKeyEnv? }`）。
 * @param declarations - 声明端点配置列表。
 * @returns 每个匹配到 provider 的声明一行结果；无匹配的声明不上报（不产生请求）。
 */
export declare function queryDeclaredEndpoints(ctx: Context, providers: Readonly<Record<string, {
    baseURL?: string;
    apiKeyEnv?: string;
}>>, declarations: readonly DeclaredEndpointConfig[]): Promise<readonly ProviderBalance[]>;
//# sourceMappingURL=declarative.d.ts.map
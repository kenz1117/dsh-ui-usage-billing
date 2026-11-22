/**
 * 共享 loopback 守卫（v1.5.2 抽自 src/index.ts）。
 *
 * 端点只供本机浏览器用，局域网/远端请求一律拒绝，避免面板数据（含中转站
 * origin 与余额）外泄。三层防御：peer socket（最可信）+ Host 头精确字面量
 * （防 `127.0.0.1.evil.com` 这类 DNS rebinding 域名）+ trustedHosts 白名单
 * （反向代理场景的精确主机名放行）。Origin 头独立校验（写操作用）。
 *
 * 设计要点：精确字面量匹配（`startsWith('127.')` 会被 `127.0.0.1.evil.com`
 * 穿透，必须正则）。IPv6 字面量带方括号（`[::1]:3080`）单独剥离。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

/** Peer 地址是否为回环（本地）。回环防护：本插件的端点只供本机浏览器用，
 *  局域网/远端请求一律拒绝，避免面板数据（含中转站 origin 与余额）外泄。 */
export function isLoopbackPeer(req: IncomingMessage): boolean {
  const address = req.socket.remoteAddress
  if (address === undefined) return false
  // IPv4 127.0.0.0/8、IPv6 ::1、以及 IPv4-mapped IPv6（::ffff:127.x.x.x）。
  return address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.')
}

/** 校验 Host 头是本机回环（精确 127.0.0.0/8 / ::1 / localhost 或空，供 curl 不带 Host 的极简请求）。
 *  拒绝 `127.0.0.1.attacker.com` 这类以 `127.` 开头但解析到外部的 DNS rebinding 域名：
 *  只用 `startsWith('127.')` 会被它穿透，必须精确匹配回环 IP 的字面量。 */
/**
 * Host 头/名单条目的主机名部分：IPv6 字面量带方括号（`[::1]:3080`），整体去括号；
 * 裸 IPv6（多个冒号、无方括号）整体是字面量；其余按首个冒号去端口。统一小写。
 * （此前一律 `split(':')[0]`：`[::1]:3080` 截成 `[`，IPv6 回环请求被误拒，
 * trustedHosts 也配不进去——fail-closed 无安全暴露，但本机 IPv6 场景功能失效。）
 */
export function hostNameOf(host: string): string {
  const trimmed = host.trim()
  const bracket = /^\[([0-9a-fA-F:]+)\](?::\d+)?$/.exec(trimmed)
  if (bracket !== null) return (bracket[1] ?? '').toLowerCase()
  // 两个及以上冒号且无方括号 = 裸 IPv6 字面量（无端口语义），整体保留。
  if ((trimmed.match(/:/g) ?? []).length > 1) return trimmed.toLowerCase()
  return trimmed.split(':')[0]?.toLowerCase() ?? ''
}

/**
 * 信任主机名归一化：去空白、去端口、转小写，丢弃空项（IPv6 经 {@link hostNameOf}
 * 去方括号）。与请求侧 Host 头解析同口径，因此匹配忽略大小写与端口。
 * @param hosts - 配置里的原始名单。
 * @returns 归一化后的主机名集合（空集 = 与历史版本行为一致）。
 */
export function normalizeTrustedHosts(hosts: readonly string[] | undefined): ReadonlySet<string> {
  if (hosts === undefined) return new Set()
  const names = hosts
    .filter((host): host is string => typeof host === 'string')
    .map(host => hostNameOf(host))
    .filter(host => host !== '')
  return new Set(names)
}

/** 校验 Host 头是本机回环（精确 127.0.0.0/8 / ::1 / localhost 或空，供 curl 不带 Host 的极简请求）。
 *  拒绝 `127.0.0.1.attacker.com` 这类以 `127.` 开头但解析到外部的 DNS rebinding 域名：
 *  只用 `startsWith('127.')` 会被它穿透，必须精确匹配回环 IP 的字面量。 */
export function isLoopbackHost(req: IncomingMessage, trustedHosts: ReadonlySet<string> = new Set()): boolean {
  const host = req.headers.host
  if (host === undefined || host === '') return true
  const name = hostNameOf(host)
  // 精确匹配：localhost、IPv6 回环、或字面量 IPv4 回环地址（127.0.0.0/8）。
  if (name === 'localhost' || name === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(name)) return true
  // 反向代理场景：仅当用户显式列入 trustedHosts 才放行，且已经过 peer socket 校验。
  // 精确匹配（已去端口、转小写），无后缀 / 通配符语义。
  return name !== '' && trustedHosts.has(name)
}

/** 校验 Origin 头是否回环（写操作用，防止跨站表单/fetch 改写设置）。Origin 缺失
 *  （curl 或同源 fetch 不带）视为放行，交给下方的 Content-Type 校验兜底；Origin 存在
 *  但主机非回环则拒绝——跨站脚本发起的写请求必带攻击者域名的 Origin。 */
export function isLoopbackOrigin(origin: string | undefined): boolean {
  if (origin === undefined || origin === '') return true
  try {
    // WHATWG URL 的 hostname 对 IPv6 保留方括号（`[::1]`）：先去括号再比对。
    const raw = new URL(origin).hostname
    const host = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : raw
    return host === 'localhost' || host === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  } catch {
    return false
  }
}

/**
 * 路由准入声明（宿主 0.2.3-alpha.1 起必需）。
 *
 * 宿主把 Web 路由的 `auth` 默认值从「无鉴权」改成了 `'required'`：未通过宿主
 * 连接层鉴权的请求在进入 handler **之前**就被拒（401/503），插件自带的守卫
 * 根本没机会执行——面板会静默变成一片 0。本插件的端点只服务本机浏览器，安全
 * 边界是 {@link guardLoopback}（peer 回环 socket + Host 头精确字面量 +
 * trustedHosts 白名单 + Origin 校验），因此显式声明匿名准入。
 *
 * 宿主的可信主机栅栏仍然生效（Host 必须是回环/可信主机、Origin 必须同源），
 * 这里只放宽「需要 peer 凭据」这一层，不放宽来源校验。
 *
 * 老宿主（≤0.2.2-rc.5）没有 `auth` 字段，多余字段被忽略，行为与从前一致。
 */
export const ANONYMOUS_ROUTE_AUTH = { auth: 'anonymous' } as const

/**
 * 回环防护守卫：仅接受回环 GET 请求（peer socket 地址 + Host 头同时校验）。
 * 不满足时返回 403 并结束响应；调用方在 handler 顶部调用，返回 false 即已拒绝。
 * @param req - 当前请求。
 * @param res - 当前响应。
 * @returns 是否放行；false = 已拒绝并结束响应。
 */
export function guardLoopback(req: IncomingMessage, res: ServerResponse, trustedHosts: ReadonlySet<string> = new Set()): boolean {
  // GET 读取 + POST（usage-tool 的开关写入）都在回环内允许；其他方法一律拒绝。
  const methodOk = req.method === 'GET' || req.method === 'POST'
  const peerOk = isLoopbackPeer(req)
  const hostOk = isLoopbackHost(req, trustedHosts)
  if (!methodOk || !peerOk || !hostOk) {
    res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
    // peer 已是回环、仅 Host 被拒时给出可诊断提示：这是反向代理场景的典型失败
    // 形态（界面能渲染但数字全是 0），不给提示只能靠猜。长度截断，避免回显超长头。
    const host = req.headers.host
    const hint = methodOk && peerOk && typeof host === 'string' && host !== ''
      ? ` (host "${host.slice(0, 80)}" not in trustedHosts)`
      : ''
    res.end(JSON.stringify({ error: `forbidden: loopback only${hint}` }))
    return false
  }
  return true
}

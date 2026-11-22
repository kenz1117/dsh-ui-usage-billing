/**
 * 路由：GET/POST /api/billing/usage-tool
 *
 * usage_stats 工具开关：插件自带的读/写接口（不依赖宿主浏览器设置白名单）。
 * GET 返回当前是否注入；POST 写设置命名空间（重启应用后工具注入随新值生效）。
 * 写回失败回 503 + 宿主错误文案（issue #98：此前 200 + 笼统 invalid，开关无声
 * 弹回且无任何诊断线索）；body 非 JSON 回 400。
 *
 * 双世代宿主（issue #19 + #28 + v1.4.19）的接线在装配器里完成：
 * - 旧宿主 ≤0.1.6 走 `settings.register` 命名空间 scope。
 * - 宿主 0.1.7+ 注册面已移除，走 volatile config 投影。
 * 装配器提供 `read` / `write` 闭包，路由文件不感知双世代——`read()` 已内部分支
 * （scope 存在时读 scope，否则读 volatile + config base），`write(next)` 同理。
 * 工具注入由装配器的 `syncUsageTool` 驱动：写回后路由通过 `syncTool()` 显式调用一次
 * （幂等），覆盖「写回成功但引用未即时可见」的组合（测试替身不提交）。
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { ANONYMOUS_ROUTE_AUTH, guardLoopback, isLoopbackOrigin } from '../guard.ts'

/** 路由依赖。 */
export interface UsageToolDeps {
  trustedHosts: ReadonlySet<string>
  /** 当前 enableUsageStatsTool 值（装配器内已做双世代分支）。 */
  read: () => boolean
  /** 写回 + 立即同步工具注册（幂等）。 */
  write: (next: boolean) => Promise<void>
  /** 写回后显式调用一次的工具注册同步（幂等）。 */
  syncTool: () => void
}

export function registerUsageToolRoute(ctx: Context, deps: UsageToolDeps): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/usage-tool',
      ...ANONYMOUS_ROUTE_AUTH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!guardLoopback(req, res, deps.trustedHosts)) return
        // 方法分派必须先于状态行：此前 200 无条件先写，405 分支成为死代码
        // （guardLoopback 已拦截非 GET/POST），且到达时会二次 writeHead 抛错。
        if (req.method !== 'GET' && req.method !== 'POST') {
          res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        // 跨站写保护必须先于状态行（v1.5.2 修复）：POST 的 Origin / Content-Type
        // 校验原先排在 writeHead(200) 之后，校验失败时二次 writeHead(403/415)
        // 抛 ERR_HTTP_HEADERS_SENT，宿主直接断连——跨站攻击请求得到的是
        // connection reset 而非可诊断的 403。GET 只读不涉 CSRF，无需这些校验。
        if (req.method === 'POST') {
          if (!isLoopbackOrigin(req.headers.origin)) {
            res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'forbidden: loopback only' }))
            return
          }
          if (!(req.headers['content-type'] ?? '').toLowerCase().includes('application/json')) {
            res.writeHead(415, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'unsupported content-type' }))
            return
          }
        }
        if (req.method === 'GET') {
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ enabled: deps.read() }))
          return
        }
        // POST：状态行延迟到各终局分支（issue #98 加固）——此前 writeHead(200)
        // 先于 body 处理发出，写回失败只能以 200 + {"error":"invalid"} 回给客户端
        // （开关无声弹回，网络面板毫无线索），413 分支更是二次 writeHead 直接抛
        // ERR_HTTP_HEADERS_SENT。现在每条路径 writeHead 第一句且仅一次。
        let body = ''
        for await (const chunk of req) {
          body += String(chunk)
          if (body.length > 512) {
            // 状态行显式（同 notify-claim 的 413）：防坏/恶意 body 拖住 handler。
            res.writeHead(413, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'body too large' }))
            return
          }
        }
        let next: boolean
        try {
          const parsed = JSON.parse(body === '' ? '{}' : body) as { enabled?: unknown }
          next = parsed.enabled === true
        } catch {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'invalid json body' }))
          return
        }
        try {
          await deps.write(next)
        } catch (error) {
          // 写回链路异常升级为 503 并带回宿主错误文案（如 `No configurable plugin
          // entry`）——设置系统配置缺失是可诊断状态，不能伪装成 200 的笼统 invalid；
          // 客户端只看 body.ok !== true 的语义不变（仍会撤销乐观更新）。
          const detail = error instanceof Error ? error.message : String(error)
          console.warn('[usage-billing] usage-tool toggle write-back failed:', error)
          res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: `write failed: ${detail}` }))
          return
        }
        // 双通道写回后显式同步工具注册（幂等）：旧宿主无 volatile 提交事件；
        // 新宿主的真实提交也会再同步一次，此处先同步覆盖测试替身不提交场景。
        deps.syncTool()
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, enabled: next }))
      },
    }),
    'usage-billing: usage-tool route',
  )
}

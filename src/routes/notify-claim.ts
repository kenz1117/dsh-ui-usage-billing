/**
 * 路由：POST /api/billing/notify-claim
 *
 * 跨实例提醒认领（issue #44）：多实例（CLI + 桌面等）合法共存，各自轮询
 * 会重复弹通知。两级去重——进程内 Set 挡同进程的并发/重渲染（trigger 与仪表盘
 * 是两个组件实例，effect 同周期并发时本地 store 标记读到的还是旧值）；跨进程走
 * 认领端点（先到先得），另一实例刚发过则跳过。端点不可达（旧版本/网络故障）
 * 时放行，退化为原有 per-客户端去重。通知构造失败（平台限制）静默。
 *
 * 路由文件职责：handler + 模块级 `notifyClaims` 单例（与 `loadNotifications`
 * 共享内存状态——先到先得认领）。文件持久化（`writeFileAtomic`）由 index.ts 装配
 * 器通过 `claimsPath` 注入；handler 拿到路径后自行管理读写。
 */

import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { ANONYMOUS_ROUTE_AUTH, guardLoopback, isLoopbackOrigin } from '../guard.ts'
import { swallowed } from '../silent.ts'

/** 路由依赖：装配器注入，无需直接读 ctx。 */
export interface NotifyClaimDeps {
  /** 反向代理白名单（来自 `config.trustedHosts` 经 normalizeTrustedHosts 归一化）。 */
  trustedHosts: ReadonlySet<string>
  /** 认领表文件路径：`<snapshotPath>.notify-claims.json`。 */
  claimsPath: string
}

/** 模块级认领表：loaded 表示是否已从磁盘反序列化；keys 是先到先得序。 */
const notifyClaims: { loaded: boolean; keys: string[] } = { loaded: false, keys: [] }

/** 注册路由到 cordis webServer effect；handler 闭包外只读 deps。 */
export function registerNotifyClaimRoute(ctx: Context, deps: NotifyClaimDeps): void {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: '/api/billing/notify-claim',
      ...ANONYMOUS_ROUTE_AUTH,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        if (!guardLoopback(req, res, deps.trustedHosts)) return
        if (req.method !== 'POST') {
          res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        // 跨站写保护与 usage-tool 同口径：Origin 必须回环 + Content-Type 必须 JSON。
        if (!isLoopbackOrigin(req.headers.origin)
          || !(req.headers['content-type'] ?? '').toLowerCase().includes('application/json')) {
          res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'forbidden: loopback only' }))
          return
        }
        try {
          // body 只承载一个认领键，2 KiB 上限已足够，防坏/恶意 body 拖住 handler。
          let body = ''
          for await (const chunk of req) {
            body += String(chunk)
            if (body.length > 2048) {
              // 状态行必须显式：res.end 前无 writeHead 时 HTTP 默认 200，
              // 客户端无法按状态码区分「认领成功」与「body 被拒」。
              res.writeHead(413, { 'content-type': 'application/json; charset=utf-8' })
              res.end(JSON.stringify({ error: 'body too large' }))
              return
            }
          }
          const parsed = JSON.parse(body === '' ? '{}' : body) as { key?: unknown }
          if (typeof parsed.key !== 'string' || parsed.key === '' || parsed.key.length > 200) {
            res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'invalid key' }))
            return
          }
          if (!notifyClaims.loaded) {
            notifyClaims.loaded = true
            try {
              const stored = JSON.parse(await readFile(deps.claimsPath, 'utf8')) as { keys?: unknown }
              if (Array.isArray(stored.keys)) notifyClaims.keys = stored.keys.filter((k): k is string => typeof k === 'string')
            } catch {
              // 首次运行或文件损坏：从空表开始（去重退化为进程内，下次认领重建文件）。
              swallowed('notify-claims-file-unreadable')
            }
          }
          if (notifyClaims.keys.includes(parsed.key)) {
            res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ claimed: false }))
            return
          }
          notifyClaims.keys.push(parsed.key)
          if (notifyClaims.keys.length > 400) notifyClaims.keys = notifyClaims.keys.slice(-200)
          // 认领表写失败不阻塞通知：去重退化为进程内，多实例下该键可能重复一次。
          void writeFileAtomic(deps.claimsPath, JSON.stringify({ keys: notifyClaims.keys }), { mode: 0o600, dirMode: 0o700 })
            .catch(() => {})
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ claimed: true }))
        } catch {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'invalid' }))
        }
      },
    }),
    'usage-billing: notify-claim route',
  )
}

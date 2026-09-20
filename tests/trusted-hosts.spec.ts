// Loopback guard + trustedHosts allowlist (issue #60).
/**
 * 回环守卫的主机名白名单：默认空 = 与历史版本行为完全一致；列入后仅放宽
 * 「Host 头」这一层，peer socket 校验始终强制。
 */

import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { guardLoopback, normalizeTrustedHosts } from '../src/index.ts'

/** 最小 IncomingMessage 替身：只有守卫读取的三个字段。 */
function req(host: string | undefined, peer = '127.0.0.1', method = 'GET'): IncomingMessage {
  return { method, headers: host === undefined ? {} : { host }, socket: { remoteAddress: peer } } as unknown as IncomingMessage
}

/** 捕获 writeHead/end 的响应替身。 */
function res(): { res: ServerResponse; status: () => number | undefined; body: () => string } {
  let status: number | undefined
  let body = ''
  const stub = {
    writeHead(code: number) { status = code; return stub },
    end(chunk?: string) { body = chunk ?? ''; return stub },
  }
  return { res: stub as unknown as ServerResponse, status: () => status, body: () => body }
}

describe('normalizeTrustedHosts', () => {
  it('lowercases, trims and drops the port', () => {
    expect([...normalizeTrustedHosts([' LLM.Example.COM:8443 '])]).toEqual(['llm.example.com'])
  })

  it('drops empty entries and defaults to an empty set', () => {
    expect(normalizeTrustedHosts(['', '   ', ':8080']).size).toBe(0)
    expect(normalizeTrustedHosts(undefined).size).toBe(0)
  })
})

describe('guardLoopback', () => {
  it('allows a loopback Host with no allowlist (unchanged behaviour)', () => {
    const r = res()
    expect(guardLoopback(req('127.0.0.1:3080'), r.res)).toBe(true)
  })

  it('still rejects a proxied Host when the allowlist is empty', () => {
    const r = res()
    expect(guardLoopback(req('llm.example.com'), r.res, normalizeTrustedHosts([]))).toBe(false)
    expect(r.status()).toBe(403)
  })

  it('allows a listed host, case- and port-insensitively', () => {
    const allow = normalizeTrustedHosts(['LLM.Example.com'])
    expect(guardLoopback(req('llm.example.com'), res().res, allow)).toBe(true)
    expect(guardLoopback(req('LLM.EXAMPLE.COM:8443'), res().res, allow)).toBe(true)
  })

  it('rejects a host that is not listed', () => {
    const allow = normalizeTrustedHosts(['trusted.com'])
    expect(guardLoopback(req('other.com'), res().res, allow)).toBe(false)
  })

  it('never satisfies a listed host by suffix', () => {
    const allow = normalizeTrustedHosts(['trusted.com'])
    // 后缀/子域都不得放行，避免 evil.com 蹭到 trusted.com 的信任。
    expect(guardLoopback(req('evil-trusted.com'), res().res, allow)).toBe(false)
    expect(guardLoopback(req('trusted.com.evil.com'), res().res, allow)).toBe(false)
    expect(guardLoopback(req('sub.trusted.com'), res().res, allow)).toBe(false)
  })

  it('keeps the peer-socket check mandatory even for a listed host', () => {
    const allow = normalizeTrustedHosts(['llm.example.com'])
    expect(guardLoopback(req('llm.example.com', '203.0.113.9'), res().res, allow)).toBe(false)
  })

  it('applies to POST through the same guard path', () => {
    const allow = normalizeTrustedHosts(['llm.example.com'])
    expect(guardLoopback(req('llm.example.com', '127.0.0.1', 'POST'), res().res, allow)).toBe(true)
    expect(guardLoopback(req('other.com', '127.0.0.1', 'POST'), res().res, allow)).toBe(false)
  })

  it('rejects methods other than GET/POST regardless of the allowlist', () => {
    const allow = normalizeTrustedHosts(['llm.example.com'])
    expect(guardLoopback(req('llm.example.com', '127.0.0.1', 'DELETE'), res().res, allow)).toBe(false)
  })

  it('names the rejected host when only the Host check failed', () => {
    const r = res()
    guardLoopback(req('llm.example.com'), r.res, normalizeTrustedHosts(['other.com']))
    expect(r.body()).toContain('llm.example.com')
    expect(r.body()).toContain('trustedHosts')
  })

  it('does not leak a hint when the peer itself is not loopback', () => {
    const r = res()
    guardLoopback(req('llm.example.com', '203.0.113.9'), r.res, normalizeTrustedHosts(['llm.example.com']))
    expect(r.body()).toBe(JSON.stringify({ error: 'forbidden: loopback only' }))
  })
})

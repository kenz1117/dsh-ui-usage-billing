import { describe, expect, it } from 'vitest'
import { resolveHeaders } from '../src/balance.ts'

/** 凭据 seam 桩：KEY/TOKEN 可解析，EMPTY 为空串，其余未配置。credentialRef 是 branded 字符串。 */
function ctxWith(entries: Record<string, string>) {
  return {
    credentials: {
      resolve: async (ref: unknown) => {
        const value = entries[ref as string]
        return value === undefined ? undefined : { value }
      },
    },
  } as never
}

describe('resolveHeaders (issue #26)', () => {
  it('resolves a full-value placeholder unchanged from the historical behavior', async () => {
    const out = await resolveHeaders(ctxWith({ KEY: 'sk-abc' }), { Authorization: '{{KEY}}' })
    expect(out).toEqual({ Authorization: 'sk-abc' })
  })

  it('resolves prefixed placeholders like `Bearer {{KEY}}`', async () => {
    const out = await resolveHeaders(ctxWith({ TOKENDANCE_SPACE_API_KEY: 'sk-abc' }), {
      Authorization: 'Bearer {{TOKENDANCE_SPACE_API_KEY}}',
    })
    expect(out).toEqual({ Authorization: 'Bearer sk-abc' })
  })

  it('resolves query-style placeholders like `token={{KEY}}`', async () => {
    const out = await resolveHeaders(ctxWith({ KEY: 'sk-abc' }), { 'X-Api': 'token={{KEY}}' })
    expect(out).toEqual({ 'X-Api': 'token=sk-abc' })
  })

  it('resolves multiple distinct placeholders in one value', async () => {
    const out = await resolveHeaders(ctxWith({ A: '1', B: '2' }), { 'X-Mix': '{{A}}-{{B}}-{{A}}' })
    expect(out).toEqual({ 'X-Mix': '1-2-1' })
  })

  it('returns null when any referenced credential is missing or empty', async () => {
    expect(await resolveHeaders(ctxWith({ KEY: 'sk-abc' }), { Authorization: 'Bearer {{MISSING}}' })).toBeNull()
    expect(await resolveHeaders(ctxWith({ EMPTY: '' }), { Authorization: 'Bearer {{EMPTY}}' })).toBeNull()
  })

  it('passes through values without placeholders', async () => {
    const out = await resolveHeaders(ctxWith({}), { Accept: 'application/json' })
    expect(out).toEqual({ Accept: 'application/json' })
  })
})

import { test, expect } from '@playwright/test'

test('GET /api/billing/pricing-models returns model rows and a partial flag', async ({ request }) => {
  const res = await request.get('/api/billing/pricing-models')
  expect(res.status()).toBe(200)
  expect(res.headers()['cache-control']).toBe('no-store')
  const doc = await res.json()
  expect(typeof doc.partial).toBe('boolean')
  expect(Array.isArray(doc.models)).toBe(true)
  // Hosts may have no configured providers. Check row shape whenever rows exist.
  for (const row of doc.models) {
    expect(typeof row.key).toBe('string')
    expect(row.key.trim()).not.toBe('')
    expect(typeof row.name).toBe('string')
    expect(typeof row.route).toBe('string')
    expect(row.route.trim()).not.toBe('')
    expect(row.route).not.toBe('deepseek-account')
    expect(typeof row.channel).toBe('string')
    expect(typeof row.origin).toBe('string')
    if (row.origin) {
      const url = new URL(row.origin)
      expect(['http:', 'https:']).toContain(url.protocol)
      expect(row.origin).toBe(url.origin)
    }
  }
})

test('POST /api/billing/pricing-models is rejected', async ({ request }) => {
  const res = await request.post('/api/billing/pricing-models')
  expect(res.status()).toBe(405)
  expect(res.headers().allow).toBe('GET')
})

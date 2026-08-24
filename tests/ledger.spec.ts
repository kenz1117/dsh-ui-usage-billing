/** Durable usage-ledger file-store coverage: atomic persistence and backup recovery. */

import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { UsageLedgerDocument } from '../src/aggregate.ts'
import { createFileUsageLedgerStore } from '../src/index.ts'

let root: string | undefined

afterEach(async () => {
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('createFileUsageLedgerStore', () => {
  it('atomically saves a private ledger and loads it back', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-ledger-'))
    const path = join(root, 'nested', 'usage-ledger.json')
    const store = createFileUsageLedgerStore(path)
    const document: UsageLedgerDocument = { version: 1, updatedAt: 1, sessions: [] }

    await store.save(document)

    expect(await store.load()).toEqual(document)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(document)
    expect((await stat(path)).mode & 0o777).toBe(0o600)
  })

  it('falls back to the previous complete ledger when the main file is damaged', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-ledger-'))
    const path = join(root, 'usage-ledger.json')
    const store = createFileUsageLedgerStore(path)
    const first: UsageLedgerDocument = { version: 1, updatedAt: 1, sessions: [] }
    const second: UsageLedgerDocument = { version: 1, updatedAt: 2, sessions: [] }
    await store.save(first)
    await store.save(second)

    await writeFile(path, '{broken')

    expect(await store.load()).toEqual(first)
  })
})

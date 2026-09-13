/** Durable usage-ledger file-store coverage: atomic persistence and backup recovery. */

import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises'
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

  it('reclaims a crash-orphaned lock older than the stale threshold and saves (issue #48)', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-ledger-'))
    const path = join(root, 'usage-ledger.json')
    const store = createFileUsageLedgerStore(path)
    const document: UsageLedgerDocument = { version: 1, updatedAt: 1, sessions: [] }
    // 崩溃残留锁：mtime 拨到 2 分钟前（远超 60s 阈值），无进程会来释放。
    const stale = new Date(Date.now() - 120_000)
    await writeFile(`${path}.lock`, '999\n')
    await utimes(`${path}.lock`, stale, stale)

    await store.save(document)

    expect(await store.load()).toEqual(document)
    // 提交完成后锁文件被正常释放清理。
    await expect(stat(`${path}.lock`)).rejects.toThrow()
  })

  it('keeps failing while the contending lock is fresh (slow live writer)', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-usage-ledger-'))
    const path = join(root, 'usage-ledger.json')
    const store = createFileUsageLedgerStore(path)
    // 新鲜锁：可能是慢 writer 的活跃锁，不做年龄自愈，等待超时后原样失败。
    await writeFile(`${path}.lock`, '999\n')

    await expect(store.save({ version: 1, updatedAt: 1, sessions: [] }))
      .rejects.toThrow('timed out waiting for the writer lock')
    // 锁未被误删：持有者（若有）的锁权属不变。
    await expect(stat(`${path}.lock`)).resolves.toBeTruthy()
  }, 10_000)
})

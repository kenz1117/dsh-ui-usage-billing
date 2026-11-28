import { priceIdentity } from './price-picker.ts'
import { normalizeOriginInput, type UserPrice, type UserPriceEntry } from './pricing.ts'

type DraftBand = Record<'input' | 'cacheHit' | 'output', string>
export interface PriceDraft {
  id: number
  key: string
  origin: string
  currency: 'CNY' | 'USD'
  main: DraftBand
  off: DraftBand
  locked: boolean
  saved?: UserPriceEntry
}

function bandDraft(band?: UserPriceEntry['offPeak']): DraftBand {
  return band ? { input: String(band.input), cacheHit: String(band.cacheHit), output: String(band.output) }
    : { input: '', cacheHit: '', output: '' }
}

export function newPriceDraft(id: number, key = '', origin = '', price?: UserPrice): PriceDraft {
  return { id, key, origin, locked: false, currency: price?.currency ?? 'CNY', main: bandDraft(price), off: bandDraft(price?.offPeak) }
}

export function validPriceText(raw: string): boolean {
  return /^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()) && Number.isFinite(Number(raw))
}

function parseBand(band: DraftBand) {
  if (Object.values(band).every(validPriceText)) return { input: Number(band.input), cacheHit: Number(band.cacheHit), output: Number(band.output) }
  return undefined
}

export function samePrice(a: UserPriceEntry | undefined, b: UserPriceEntry | undefined): boolean {
  if (!a || !b) return a === b
  return a.key === b.key && a.origin === b.origin && a.currency === b.currency &&
    a.input === b.input && a.cacheHit === b.cacheHit && a.output === b.output &&
    a.offPeak?.input === b.offPeak?.input && a.offPeak?.cacheHit === b.offPeak?.cacheHit && a.offPeak?.output === b.offPeak?.output
}

/** Keep a saved row's last committed identity and prices whenever its draft cannot be applied. */
export function planPriceSave(drafts: PriceDraft[]) {
  const ids = drafts.map(row => priceIdentity(row.key, row.origin))
  const entries = drafts.map((row, i): UserPriceEntry | undefined => {
    const main = parseBand(row.main)
    const offPeak = parseBand(row.off)
    if (!row.key.trim() || !main || (!offPeak && Object.values(row.off).some(v => v !== '')) || ids.indexOf(ids[i]!) !== ids.lastIndexOf(ids[i]!)) return undefined
    return { key: row.key.trim(), ...(row.origin.trim() ? { origin: normalizeOriginInput(row.origin.trim()) } : {}), ...main,
      ...(offPeak ? { offPeak } : {}), ...(row.currency === 'USD' ? { currency: row.currency } : {}) }
  })
  // A renamed row cannot take over an identity still occupied by a preserved row.
  // Rejecting that rename may in turn reserve its previous identity.
  const reserved = new Set<string>()
  for (let i = 0; i < drafts.length; i++) {
    const saved = drafts[i]?.saved
    if (!entries[i] && saved) reserved.add(priceIdentity(saved.key, saved.origin))
  }
  for (const id of reserved) {
    const i = ids.indexOf(id)
    if (i < 0 || !entries[i]) continue
    entries[i] = undefined
    const saved = drafts[i]?.saved
    if (saved) reserved.add(priceIdentity(saved.key, saved.origin))
  }
  return entries
}

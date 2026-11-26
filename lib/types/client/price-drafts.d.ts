import { type UserPrice, type UserPriceEntry } from './pricing.ts';
type DraftBand = Record<'input' | 'cacheHit' | 'output', string>;
export interface PriceDraft {
    id: number;
    key: string;
    origin: string;
    currency: 'CNY' | 'USD';
    main: DraftBand;
    off: DraftBand;
    locked: boolean;
    saved?: UserPriceEntry;
}
export declare function newPriceDraft(id: number, key?: string, origin?: string, price?: UserPrice): PriceDraft;
export declare function validPriceText(raw: string): boolean;
export declare function samePrice(a: UserPriceEntry | undefined, b: UserPriceEntry | undefined): boolean;
/** Keep a saved row's last committed identity and prices whenever its draft cannot be applied. */
export declare function planPriceSave(drafts: PriceDraft[]): (UserPriceEntry | undefined)[];
export {};
//# sourceMappingURL=price-drafts.d.ts.map
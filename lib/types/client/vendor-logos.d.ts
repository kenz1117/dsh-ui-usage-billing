/**
 * Vendandor logos: inlined data URIs fetched from models.dev /logos/{id}.svg.
 * Keyed by the MODEL_CATALOG entry provider display name so the pricing table
 * / model rows can render a real vendor mark before the model name. Vendors not
 * listed here fall back to a brand-color letter badge in the UI.
 */
export declare const VENDOR_LOGOS: Readonly<Record<string, string>>;
export declare function vendorLogoOf(provider: string): string | undefined;
//# sourceMappingURL=vendor-logos.d.ts.map
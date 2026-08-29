/**
 * Vendor logos: inlined data URIs fetched from models.dev /logos/{id}.svg.
 * Kept to the highest-traffic providers only to hold the client bundle under the
 * DSH Store 256 KiB single-file cap. Every other provider falls back to a
 * brand-color letter badge in the UI (see VendorLogo in UsageBilling.tsx), so no
 * external asset or copyright risk is introduced for unlisted vendors. 月之暗面 is
 * a hand-redrawn minimal crescent — its official SVG is a multi-thousand-node path
 * that alone cost ~6.8 KiB.
 */
export declare const VENDOR_LOGOS: Readonly<Record<string, string>>;
export declare function vendorLogoOf(provider: string): string | undefined;
//# sourceMappingURL=vendor-logos.d.ts.map
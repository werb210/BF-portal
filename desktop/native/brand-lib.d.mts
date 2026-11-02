// BF_PORTAL_v876_NATIVE_DESKTOP - types for brand-lib.mjs (used by src/__tests__/desktopNative.v876.test.ts).
export type DesktopBrand = {
  key: string;
  app_name: string;
  bundle_id: string;
  portal_url: string;
  ops_url: string;
  passkey_domains: string[];
  release_repo: string;
  version: string;
  icon: string;
};
export type OverlayOptions = { updaterPubkey?: string; provisioned?: boolean; windowsThumbprint?: string; adhocSign?: boolean; teamId?: string };
export const BUNDLE_ID_RE: RegExp;
export const APP_NAME_RE: RegExp;
export const KEY_RE: RegExp;
export const TEAM_ID_RE: RegExp;
export const SIGN_IN_HOSTS: string[];
export function httpsOrigin(raw: unknown): string;
export function appNameFor(company: unknown): string;
export function hostOf(raw: unknown): string;
export function resolveBrand(base: Record<string, unknown>, env?: Record<string, string | undefined>): DesktopBrand;
export function associatedHosts(brand: DesktopBrand): string[];
export function runtimeBrand(brand: DesktopBrand): { app_name: string; portal_url: string; ops_url: string };
export function releaseNames(brand: DesktopBrand): { tag: string; manifest: string; channel: string };
export function tauriOverlay(brand: DesktopBrand, opts?: OverlayOptions): any;
export function entitlementsPlist(brand: DesktopBrand, opts?: OverlayOptions): string;
export function infoPlist(brand: DesktopBrand): string;
export function portalCapability(brand: DesktopBrand): any;
export function updaterManifest(args: {
  version: string;
  notes?: string;
  pubDate?: string;
  files: Record<string, { url: string; signature: string } | null | undefined>;
}): { version: string; notes: string; pub_date: string; platforms: Record<string, { url: string; signature: string }> };
export function appleAppSiteAssociation(appIds: string | string[]): {
  webcredentials: { apps: string[] };
  applinks: { details: Array<{ appIDs: string[]; components: Array<Record<string, string>> }> };
};

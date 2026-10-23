/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_JWT_STORAGE_KEY: string;
  readonly VITE_MSAL_TENANT_ID?: string;
  readonly VITE_KS_OPS_URL?: string; // BF_PORTAL_v849_KS_SILO
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

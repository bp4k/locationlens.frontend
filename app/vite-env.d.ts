/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_URL: string;
  readonly VITE_IDP_ACCT_CONSOLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

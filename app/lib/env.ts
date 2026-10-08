export function getApiBaseUrl(): string {
  return import.meta.env.VITE_APP_API_URL;
}

export function getIdpAcctConsoleUrl(): string | undefined {
  return import.meta.env.VITE_IDP_ACCT_CONSOLE || undefined;
}

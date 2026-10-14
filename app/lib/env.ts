export function getApiBaseUrl(): string {
  return import.meta.env.VITE_APP_API_URL;
}

export function getIdpAcctConsoleUrl(): string | undefined {
  return import.meta.env.VITE_IDP_ACCT_CONSOLE || undefined;
}

/** Keycloak realm base, e.g. http://localhost:8084/realms/locationlens. */
export function getIdpBaseUrl(): string | undefined {
  return import.meta.env.VITE_IDP_URI || undefined;
}

export function getIdpClientId(): string | undefined {
  return import.meta.env.VITE_IDP_CLIENT_ID || undefined;
}

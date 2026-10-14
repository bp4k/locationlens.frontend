const ACCESS_TOKEN_KEY = "locationlens.access_token";
const EXPIRES_AT_KEY = "locationlens.expires_at";
export const SESSION_CHANGED_EVENT = "locationlens:session-changed";

function notifySessionChange(): void {
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function saveSession(accessToken: string, expiresInSeconds: number): void {
  if (!accessToken || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    clearSession();
    return;
  }
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
  notifySessionChange();
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  notifySessionChange();
}

export function getSessionExpiresAt(): number {
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY));
  return Number.isFinite(expiresAt) ? expiresAt : 0;
}

export function isSessionValid(minValidityMs = 0): boolean {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!token || !expiresAt) return false;
  return Date.now() + minValidityMs < getSessionExpiresAt();
}

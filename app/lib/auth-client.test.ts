import { describe, expect, it, vi } from "vitest";
import { authClient } from "./auth-client";
import { getAccessToken, isSessionValid, saveSession } from "../auth/token-storage";

describe("AuthClient local sign-out", () => {
  it("removes session credentials without deleting other data or making requests", () => {
    saveSession("test-token", 3600);
    localStorage.setItem("locationlens.preference", "keep-me");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(isSessionValid()).toBe(true);

    authClient.logOut();

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("locationlens.expires_at")).toBeNull();
    expect(isSessionValid()).toBe(false);
    expect(localStorage.getItem("locationlens.preference")).toBe("keep-me");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows repeated sign-out and sign-out with an incomplete session", () => {
    localStorage.setItem("locationlens.expires_at", "123");
    authClient.logOut();
    expect(() => authClient.logOut()).not.toThrow();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("locationlens.expires_at")).toBeNull();
  });
});

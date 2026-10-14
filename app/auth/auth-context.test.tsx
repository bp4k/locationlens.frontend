import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";
import { getAccessToken, saveSession } from "./token-storage";
import ProtectedLayout from "../layouts/protected-layout";

// Test controls exercise the callable API only; no production UI is introduced.
function AuthHarness() {
  const { isAuthenticated, logOut, refreshAuthState } = useAuth();
  return (
    <>
      <p>{isAuthenticated ? "Session active" : "Session cleared"}</p>
      <button onClick={logOut}>Test sign out</button>
      <button onClick={() => {
        saveSession("new-token", 3600);
        refreshAuthState();
      }}>Test new session</button>
    </>
  );
}

describe("AuthProvider sign-out", () => {
  afterEach(() => vi.useRealTimers());

  it("renews before expiry while preserving authenticated content", async () => {
    vi.useFakeTimers();
    saveSession("old-token", 60);
    vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
    const fetch = vi.fn().mockResolvedValue(Response.json({ access_token: "renewed-token", token_type: "Bearer", expires_in: 300 }));
    vi.stubGlobal("fetch", fetch);
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("renewed-token");
    expect(screen.getByText("Session active")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.getByText("Session active")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stops presenting an expired session as signed in if renewal is unavailable", async () => {
    vi.useFakeTimers();
    saveSession("old-token", 60);
    vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    expect(screen.getByText("Session active")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.getByText("Session cleared")).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
  });
  it("updates auth state immediately and still supports a later login refresh", async () => {
    const user = userEvent.setup();
    saveSession("old-token", 3600);
    render(<AuthProvider><AuthHarness /></AuthProvider>);
    expect(screen.getByText("Session active")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Test sign out" }));
    expect(screen.getByText("Session cleared")).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Test new session" }));
    expect(screen.getByText("Session active")).toBeInTheDocument();
    expect(getAccessToken()).toBe("new-token");
  });

  it("removes protected content through the existing route guard", async () => {
    const user = userEvent.setup();
    saveSession("test-token", 3600);
    render(
      <AuthProvider>
        <MemoryRouter>
          <AuthHarness />
          <Routes>
            {/* Stub login rather than starting the real external OAuth redirect. */}
            <Route path="/login" element={<h1>Login route</h1>} />
            <Route element={<ProtectedLayout />}>
              <Route index element={<h1>Protected page</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(screen.getByRole("heading", { name: "Protected page" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Test sign out" }));
    expect(await screen.findByRole("heading", { name: "Login route" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Protected page" })).not.toBeInTheDocument();
  });
});

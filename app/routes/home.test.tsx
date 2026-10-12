import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/auth-context";
import { saveSession } from "../auth/token-storage";
import ProtectedLayout from "../layouts/protected-layout";
import Home from "./home";

function renderHome() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Routes>
          <Route path="/login" element={<p>Sign in</p>} />
          <Route element={<ProtectedLayout />}><Route index element={<Home />} /></Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("search home route", () => {
  it("requires sign-in before showing search", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    renderHome();
    expect(await screen.findByText("Sign in")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Find places" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the default place client and renders backend-shaped data", async () => {
    saveSession("test-token", 3600);
    vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
    const fetch = vi.fn().mockImplementation(async () => Response.json([{
      place_id: "park-1", name: "Piedmont Park", address: "Atlanta",
      latitude: 33.785, longitude: -84.373, types: ["PARK"],
    }]));
    vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup();
    renderHome();
    expect(fetch).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Location"), "Atlanta");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("button", { name: /Piedmont Park/ })).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8080/api/v1/places/search?location_text=Atlanta&radius_meters=1000");
    expect(new Headers(fetch.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer test-token");
  });
});

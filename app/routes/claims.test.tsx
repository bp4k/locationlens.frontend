import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import PlaceClaim from "./place-claim";
import AdminClaims from "./admin-claims";
import ProtectedLayout from "../layouts/protected-layout";
import { AuthProvider } from "../auth/auth-context";
import { saveSession } from "../auth/token-storage";
import { claimApiClient } from "../lib/claim-api";

vi.mock("../lib/claim-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/claim-api")>()),
  claimApiClient: {
    getPendingClaims: vi.fn().mockResolvedValue([]),
    submitClaim: vi.fn().mockResolvedValue({
      claimId: "6a7d1f76-ef09-49ee-a310-25850196740a",
      userId: "a852a1c9-1384-4571-8c53-7eeeb4975329",
      placeId: "place-1",
      status: "PENDING",
    }),
    approveClaim: vi.fn(),
    rejectClaim: vi.fn(),
  },
}));

function renderRoutes(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>Sign in to LocationLens</p>} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<p>Home</p>} />
            <Route path="/places/:placeId/claim" element={<PlaceClaim />} />
            <Route path="/admin/claims" element={<AdminClaims />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("claim routes", () => {
  it.each(["/places/place-1/claim", "/admin/claims"])(
    "requires authentication before mounting %s",
    async (path) => {
      renderRoutes(path);
      expect(
        await screen.findByText("Sign in to LocationLens"),
      ).toBeInTheDocument();
      expect(claimApiClient.getPendingClaims).not.toHaveBeenCalled();
      expect(claimApiClient.submitClaim).not.toHaveBeenCalled();
    },
  );

  it("submits the decoded route place ID without asking for a user ID", async () => {
    saveSession("token", 3600);
    renderRoutes("/places/provider%2Fplace%3Fx/claim");
    await userEvent.click(
      screen.getByRole("button", { name: "Submit business claim" }),
    );
    expect(claimApiClient.submitClaim).toHaveBeenCalledExactlyOnceWith(
      "provider/place?x",
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "was submitted",
    );
  });

  it("opens pending claims from the existing account menu", async () => {
    saveSession("token", 3600);
    renderRoutes("/");
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Business claims (admin)" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Pending business claims" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("No pending business claims."),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminClaimView } from "./admin-claim-view";
import { PlaceDetailsView } from "../places/place-details-view";
import { saveSession } from "../../auth/token-storage";

const response = {
  id: "6a7d1f76-ef09-49ee-a310-25850196740a",
  userId: "a852a1c9-1384-4571-8c53-7eeeb4975329",
  placeId: "cafe-123",
  status: "PENDING",
};
function setup() {
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  saveSession("signed-in-token", 3600);
  const fetch = vi.fn<typeof globalThis.fetch>();
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("claim views with the real API client", () => {
  it("submits from place details and preserves confirmation when the panel is hidden", async () => {
    const fetch = setup().mockResolvedValue(
      Response.json(response, { status: 201 }),
    );
    const user = userEvent.setup();
    render(
      <PlaceDetailsView
        place={{
          placeId: response.placeId,
          name: "Campus Cafe",
          address: "Atlanta",
          latitude: 33,
          longitude: -84,
          types: ["RESTAURANT"],
        }}
      />,
    );
    expect(fetch).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Claim this business" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Submit business claim" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "was submitted",
    );
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/v1/business-claims");
    expect(JSON.parse(init?.body as string)).toEqual({
      placeId: response.placeId,
    });
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer signed-in-token",
    );
    await user.click(screen.getByRole("button", { name: "Hide claim form" }));
    await user.click(
      screen.getByRole("button", { name: "Claim this business" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(response.id);
    expect(
      screen.queryByRole("button", { name: "Submit business claim" }),
    ).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("loads backend-shaped claims and approves using a real empty 204 response", async () => {
    const fetch = setup()
      .mockResolvedValueOnce(Response.json([response]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<AdminClaimView />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Approve" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm approval" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("approved");
    expect(screen.getByText("No pending business claims.")).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toBe(
      "http://localhost:8080/api/v1/business-claims/pending",
    );
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe(
      `http://localhost:8080/api/v1/business-claims/${response.id}/approve`,
    );
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer signed-in-token",
    );
  });

  it("respects a real backend 403 response without exposing decisions", async () => {
    setup().mockResolvedValue(
      Response.json({ detail: "Forbidden" }, { status: 403 }),
    );
    render(<AdminClaimView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Administrator access is required",
    );
    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject" }),
    ).not.toBeInTheDocument();
  });
});

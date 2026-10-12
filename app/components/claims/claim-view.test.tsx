import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClaimView } from "./claim-view";
import { ClaimApiError } from "../../lib/claim-api";
import type { ClaimApiClient } from "../../lib/claim-api";
import type { BusinessClaimModel } from "../../types/business-claim";

const saved: BusinessClaimModel = {
  claimId: "6a7d1f76-ef09-49ee-a310-25850196740a",
  userId: "a852a1c9-1384-4571-8c53-7eeeb4975329",
  placeId: "place-1",
  status: "PENDING",
};
function client(): ClaimApiClient {
  return {
    submitClaim: vi.fn().mockResolvedValue(saved),
    getPendingClaims: vi.fn(),
    approveClaim: vi.fn(),
    rejectClaim: vi.fn(),
  };
}

describe("ClaimView", () => {
  it("waits for a selected place without making a request", () => {
    const api = client();
    render(<ClaimView apiClient={api} />);
    expect(
      screen.getByText("Select a place to submit a business claim."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(api.submitClaim).not.toHaveBeenCalled();
  });

  it("uses the selected place and only confirms a saved submission", async () => {
    const api = client();
    let resolve!: (claim: BusinessClaimModel) => void;
    vi.mocked(api.submitClaim).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(
      <ClaimView placeId="place-1" placeName="Campus Cafe" apiClient={api} />,
    );
    expect(screen.getByText("Campus Cafe")).toBeInTheDocument();
    expect(api.submitClaim).not.toHaveBeenCalled();
    const form = screen
      .getByRole("button", { name: "Submit business claim" })
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.submitClaim).toHaveBeenCalledExactlyOnceWith("place-1");
    expect(
      screen.getByRole("button", { name: "Submitting claim..." }),
    ).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => resolve(saved));
    expect(screen.getByRole("status")).toHaveTextContent(
      "pending administrator review",
    );
    expect(screen.getByRole("status")).toHaveTextContent(saved.claimId);
    expect(
      screen.queryByRole("button", { name: "Submit business claim" }),
    ).not.toBeInTheDocument();
  });

  it("retains the selected place and allows retry after a network failure", async () => {
    const api = client();
    vi.mocked(api.submitClaim).mockRejectedValueOnce(new TypeError("Offline"));
    const user = userEvent.setup();
    render(<ClaimView placeId="place-1" apiClient={api} />);
    await user.click(
      screen.getByRole("button", { name: "Submit business claim" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please try again",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Submit business claim" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "was submitted",
    );
    expect(api.submitClaim).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, "Sign in"],
    [403, "permission"],
    [503, "Unavailable"],
  ])(
    "shows the appropriate error for HTTP %s without confirmation",
    async (status, message) => {
      const api = client();
      vi.mocked(api.submitClaim).mockRejectedValue(
        new ClaimApiError(Number(status), "Unavailable"),
      );
      render(<ClaimView placeId="place-1" apiClient={api} />);
      await userEvent.click(
        screen.getByRole("button", { name: "Submit business claim" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        String(message),
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );

  it("rejects an oversized place ID before calling the API", async () => {
    const api = client();
    render(<ClaimView placeId={"a".repeat(256)} apiClient={api} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Submit business claim" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Select a valid place");
    expect(api.submitClaim).not.toHaveBeenCalled();
  });

  it("ignores completion for a previous place and resets its confirmation", async () => {
    const api = client();
    let resolve!: (claim: BusinessClaimModel) => void;
    vi.mocked(api.submitClaim).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { rerender } = render(
      <ClaimView placeId="place-1" apiClient={api} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Submit business claim" }),
    );
    rerender(<ClaimView placeId="place-2" apiClient={api} />);
    await act(async () => resolve(saved));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit business claim" }),
    ).toBeEnabled();
    expect(screen.getByText("place-2")).toBeInTheDocument();
  });
});

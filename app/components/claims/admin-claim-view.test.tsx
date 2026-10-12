import { StrictMode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminClaimView } from "./admin-claim-view";
import { ClaimApiError } from "../../lib/claim-api";
import type { ClaimApiClient } from "../../lib/claim-api";
import type { BusinessClaimModel } from "../../types/business-claim";

const first: BusinessClaimModel = {
  claimId: "6a7d1f76-ef09-49ee-a310-25850196740a",
  userId: "a852a1c9-1384-4571-8c53-7eeeb4975329",
  placeId: "place-1",
  status: "PENDING",
};
const second = {
  ...first,
  claimId: "6a7d1f76-ef09-49ee-a310-25850196740b",
  placeId: "place-2",
};
function client(): ClaimApiClient {
  return {
    submitClaim: vi.fn(),
    getPendingClaims: vi.fn().mockResolvedValue([first, second]),
    approveClaim: vi.fn().mockResolvedValue(undefined),
    rejectClaim: vi.fn().mockResolvedValue(undefined),
  };
}

async function choose(action: "Approve" | "Reject") {
  const row = await screen.findByRole("article", { name: "Claim for place-1" });
  await userEvent.click(within(row).getByRole("button", { name: action }));
  return within(row).getByRole("button", {
    name: action === "Approve" ? "Confirm approval" : "Confirm rejection",
  });
}

describe("AdminClaimView", () => {
  it("loads pending claims and shows empty results distinctly", async () => {
    const api = client();
    vi.mocked(api.getPendingClaims).mockResolvedValue([]);
    render(<AdminClaimView apiClient={api} />);
    expect(screen.getByText("Loading pending claims...")).toBeInTheDocument();
    expect(
      await screen.findByText("No pending business claims."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the location, submitting user, and claim reference", async () => {
    render(<AdminClaimView apiClient={client()} />);
    const row = await screen.findByRole("article", {
      name: "Claim for place-1",
    });
    expect(row).toHaveTextContent(first.userId);
    expect(row).toHaveTextContent(first.claimId);
  });

  it("allows canceling a decision before any write", async () => {
    const api = client();
    render(<AdminClaimView apiClient={api} />);
    await choose("Approve");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.approveClaim).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Confirm approval" }),
    ).not.toBeInTheDocument();
  });

  it.each(["Approve", "Reject"] as const)(
    "%s saves only after confirmation and removes only that claim",
    async (action) => {
      const api = client();
      render(<AdminClaimView apiClient={api} />);
      const confirm = await choose(action);
      expect(api.approveClaim).not.toHaveBeenCalled();
      expect(api.rejectClaim).not.toHaveBeenCalled();
      await userEvent.click(confirm);
      expect(await screen.findByRole("status")).toHaveTextContent(
        action === "Approve" ? "approved" : "rejected",
      );
      expect(
        screen.queryByRole("article", { name: "Claim for place-1" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("article", { name: "Claim for place-2" }),
      ).toBeInTheDocument();
      expect(
        action === "Approve" ? api.approveClaim : api.rejectClaim,
      ).toHaveBeenCalledExactlyOnceWith(first.claimId);
    },
  );

  it("prevents duplicate decisions and retains the claim until the server succeeds", async () => {
    const api = client();
    let resolve!: () => void;
    vi.mocked(api.approveClaim).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<AdminClaimView apiClient={api} />);
    const confirm = await choose("Approve");
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(api.approveClaim).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("article", { name: "Claim for place-1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh claims" }),
    ).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await act(async () => resolve());
    expect(await screen.findByRole("status")).toHaveTextContent("approved");
  });

  it("allows retrying a failed read without showing an empty-success state", async () => {
    const api = client();
    vi.mocked(api.getPendingClaims).mockRejectedValueOnce(
      new TypeError("Offline"),
    );
    render(<AdminClaimView apiClient={api} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load pending claims",
    );
    expect(
      screen.queryByText("No pending business claims."),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Refresh claims" }),
    );
    expect(
      await screen.findByRole("article", { name: "Claim for place-1" }),
    ).toBeInTheDocument();
  });

  it.each([
    [401, "Sign in"],
    [403, "Administrator access"],
  ])("denies review controls for HTTP %s", async (status, message) => {
    const api = client();
    vi.mocked(api.getPendingClaims).mockRejectedValue(
      new ClaimApiError(Number(status), "Denied"),
    );
    render(<AdminClaimView apiClient={api} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(String(message));
    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject" }),
    ).not.toBeInTheDocument();
    expect(api.approveClaim).not.toHaveBeenCalled();
  });

  it("hides previously loaded claims when administrator permission is revoked", async () => {
    const api = client();
    vi.mocked(api.approveClaim).mockRejectedValue(
      new ClaimApiError(403, "Denied"),
    );
    render(<AdminClaimView apiClient={api} />);
    await userEvent.click(await choose("Approve"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Administrator access",
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([404, 409])(
    "removes a stale claim for HTTP %s and invites a refresh",
    async (status) => {
      const api = client();
      vi.mocked(api.rejectClaim).mockRejectedValue(
        new ClaimApiError(status, "Stale"),
      );
      render(<AdminClaimView apiClient={api} />);
      await userEvent.click(await choose("Reject"));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Refresh the pending claims",
      );
      expect(
        screen.queryByRole("article", { name: "Claim for place-1" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    },
  );

  it("keeps a failed decision available for retry without claiming success", async () => {
    const api = client();
    vi.mocked(api.rejectClaim).mockRejectedValueOnce(new TypeError("Offline"));
    render(<AdminClaimView apiClient={api} />);
    await userEvent.click(await choose("Reject"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to review this claim",
    );
    expect(
      screen.getByRole("article", { name: "Claim for place-1" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm rejection" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("rejected");
  });

  it("ignores an old read response in StrictMode", async () => {
    const api = client();
    let resolve!: (claims: BusinessClaimModel[]) => void;
    vi.mocked(api.getPendingClaims).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(
      <StrictMode>
        <AdminClaimView apiClient={api} />
      </StrictMode>,
    );
    expect(
      await screen.findByRole("article", { name: "Claim for place-1" }),
    ).toBeInTheDocument();
    await act(async () => resolve([]));
    expect(
      screen.getByRole("article", { name: "Claim for place-1" }),
    ).toBeInTheDocument();
  });
});

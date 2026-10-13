import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Button,
  Spinner,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ClaimApiError, claimApiClient } from "../../lib/claim-api";
import type { ClaimApiClient } from "../../lib/claim-api";
import type { BusinessClaimModel } from "../../types/business-claim";

const useStyles = makeStyles({
  container: {
    maxWidth: "48rem",
    margin: "0 auto",
    padding: tokens.spacingVerticalXXL,
    display: "grid",
    rowGap: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground1,
    overflowWrap: "anywhere",
  },
  list: { listStyleType: "none", padding: "0", margin: "0" },
  claim: {
    paddingBlock: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
  error: { color: tokens.colorPaletteRedForeground1 },
});

interface ReadState {
  status: "loading" | "ready" | "error";
  claims: BusinessClaimModel[];
  error?: string;
}
type Decision = { claimId: string; action: "approve" | "reject" };

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ClaimApiError)) return fallback;
  if (error.status === 401) return "Sign in to review business claims.";
  if (error.status === 403)
    return "Administrator access is required to review business claims.";
  if (error.status === 404)
    return "This claim is no longer available. Refresh the pending claims.";
  if (error.status === 409)
    return "This claim has already been reviewed. Refresh the pending claims.";
  return error.message;
}

export interface AdminClaimViewProps {
  apiClient?: ClaimApiClient;
}

/** Authorization is enforced by the backend; denied reads never expose action controls. */
export function AdminClaimView({
  apiClient = claimApiClient,
}: AdminClaimViewProps) {
  const styles = useStyles();
  const headingId = useId();
  const [read, setRead] = useState<ReadState>({
    status: "loading",
    claims: [],
  });
  const [decision, setDecision] = useState<Decision>();
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [confirmation, setConfirmation] = useState<string>();
  const alive = useRef(true);
  const sequence = useRef(0);
  const inFlight = useRef(false);

  const displayPendingClaims = useCallback(async () => {
    const request = ++sequence.current;
    setRead({ status: "loading", claims: [] });
    setDecision(undefined);
    setActionError(undefined);
    try {
      const claims = await apiClient.getPendingClaims();
      if (alive.current && request === sequence.current) {
        setRead({ status: "ready", claims });
      }
    } catch (error) {
      if (alive.current && request === sequence.current) {
        setRead({
          status: "error",
          claims: [],
          error: errorMessage(
            error,
            "Unable to load pending claims. Please try again.",
          ),
        });
      }
    }
  }, [apiClient]);

  useEffect(() => {
    alive.current = true;
    void displayPendingClaims();
    return () => {
      alive.current = false;
      ++sequence.current;
    };
  }, [displayPendingClaims]);

  async function reviewClaim(next: Decision) {
    if (inFlight.current || read.status !== "ready") return;
    inFlight.current = true;
    setWorking(true);
    setActionError(undefined);
    setConfirmation(undefined);
    const request = ++sequence.current;
    try {
      if (next.action === "approve") await apiClient.approveClaim(next.claimId);
      else await apiClient.rejectClaim(next.claimId);
      if (alive.current && request === sequence.current) {
        setRead((current) => ({
          status: "ready",
          claims: current.claims.filter(
            (claim) => claim.claimId !== next.claimId,
          ),
        }));
        setDecision(undefined);
        setConfirmation(
          `Claim ${next.claimId} was ${next.action === "approve" ? "approved" : "rejected"}.`,
        );
      }
    } catch (error) {
      if (alive.current && request === sequence.current) {
        const message = errorMessage(
          error,
          "Unable to review this claim. Please try again.",
        );
        if (
          error instanceof ClaimApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          setRead({ status: "error", claims: [], error: message });
          setDecision(undefined);
        } else {
          setActionError(message);
          if (
            error instanceof ClaimApiError &&
            (error.status === 404 || error.status === 409)
          ) {
            setRead((current) => ({
              status: "ready",
              claims: current.claims.filter(
                (claim) => claim.claimId !== next.claimId,
              ),
            }));
            setDecision(undefined);
          }
        }
      }
    } finally {
      inFlight.current = false;
      if (alive.current) setWorking(false);
    }
  }

  return (
    <main className={`${styles.container} ll-admin-panel`} aria-labelledby={headingId}>
      <h1 id={headingId}>Pending business claims</h1>
      <p>Review requests to verify ownership of business locations.</p>
      <Button
        type="button"
        disabled={working || read.status === "loading"}
        onClick={() => void displayPendingClaims()}
      >
        Refresh claims
      </Button>
      {read.status === "loading" && (
        <Spinner label="Loading pending claims..." />
      )}
      {read.status === "error" && (
        <p className={styles.error} role="alert">
          {read.error}
        </p>
      )}
      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}
      {confirmation && <p role="status">{confirmation}</p>}
      {read.status === "ready" && read.claims.length === 0 && (
        <p>No pending business claims.</p>
      )}
      {read.status === "ready" && read.claims.length > 0 && (
        <ul className={styles.list} aria-label="Pending claims">
          {read.claims.map((claim) => (
            <li key={claim.claimId}>
              <article
                className={styles.claim}
                aria-label={`Claim for ${claim.placeId}`}
              >
                <h2>Place: {claim.placeId}</h2>
                <p>Submitted by: {claim.userId}</p>
                <p>Claim reference: {claim.claimId}</p>
                {decision?.claimId === claim.claimId ? (
                  <>
                    <p>
                      {decision.action === "approve" ? "Approve" : "Reject"}{" "}
                      this claim?
                    </p>
                    <div className={styles.actions}>
                      <Button
                        type="button"
                        appearance="primary"
                        disabled={working}
                        onClick={() => void reviewClaim(decision)}
                      >
                        {working
                          ? "Saving decision..."
                          : decision.action === "approve"
                            ? "Confirm approval"
                            : "Confirm rejection"}
                      </Button>
                      <Button
                        type="button"
                        disabled={working}
                        onClick={() => setDecision(undefined)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={styles.actions}>
                    <Button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        setActionError(undefined);
                        setDecision({
                          claimId: claim.claimId,
                          action: "approve",
                        });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        setActionError(undefined);
                        setDecision({
                          claimId: claim.claimId,
                          action: "reject",
                        });
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

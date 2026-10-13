import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ClaimApiError, claimApiClient } from "../../lib/claim-api";
import type { ClaimApiClient } from "../../lib/claim-api";
import type { BusinessClaimModel } from "../../types/business-claim";

const useStyles = makeStyles({
  container: {
    display: "grid",
    rowGap: tokens.spacingVerticalM,
    overflowWrap: "anywhere",
    color: tokens.colorNeutralForeground1,
  },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export interface ClaimViewProps {
  placeId?: string;
  placeName?: string;
  apiClient?: ClaimApiClient;
}

/** Reset submission state and ignore old responses when the selected place changes. */
export function ClaimView(props: ClaimViewProps) {
  return <SelectedClaimView key={props.placeId ?? ""} {...props} />;
}

function SelectedClaimView({
  placeId,
  placeName,
  apiClient = claimApiClient,
}: ClaimViewProps) {
  const styles = useStyles();
  const headingId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<BusinessClaimModel>();
  const inFlight = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || saved) return;
    if (!placeId?.trim() || placeId.length > 255) {
      setError("Select a valid place before submitting a business claim.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(undefined);
    let succeeded = false;
    try {
      const claim = await apiClient.submitClaim(placeId);
      succeeded = true;
      if (alive.current) setSaved(claim);
    } catch (failure) {
      if (alive.current) {
        setError(
          failure instanceof ClaimApiError
            ? failure.status === 401
              ? "Sign in to submit a business claim."
              : failure.status === 403
                ? "You do not have permission to submit this claim."
                : failure.message
            : "Unable to submit your claim. Please try again.",
        );
      }
    } finally {
      if (!succeeded) inFlight.current = false;
      if (alive.current) setSubmitting(false);
    }
  }

  return (
    <section className={styles.container} aria-labelledby={headingId}>
      <h2 id={headingId}>Claim this business</h2>
      {!placeId?.trim() ? (
        <p>Select a place to submit a business claim.</p>
      ) : (
        <>
          <p>
            Selected place: <strong>{placeName || placeId}</strong>
          </p>
          <p>
            Submit a request to verify your ownership of this location. An
            administrator will review your request.
          </p>
          {saved ? (
            <div role="status">
              <p>
                Your business claim was submitted. It is pending administrator
                review.
              </p>
              <p>Claim reference: {saved.claimId}</p>
            </div>
          ) : (
            <form onSubmit={submitClaim}>
              <Button appearance="primary" type="submit" disabled={submitting}>
                {submitting ? "Submitting claim..." : "Submit business claim"}
              </Button>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </form>
          )}
        </>
      )}
    </section>
  );
}

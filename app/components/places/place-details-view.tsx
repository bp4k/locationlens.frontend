import { useId, useState } from "react";
import { Button, makeStyles, tokens } from "@fluentui/react-components";
import type { PlaceModel } from "../../types/place";
import type { ReviewApiClient } from "../../lib/review-api";
import { ReviewView } from "../reviews/review-view";
import { placeTypeLabels } from "./place-type-labels";

const useStyles = makeStyles({
  container: {
    color: tokens.colorNeutralForeground1,
    display: "grid",
    rowGap: tokens.spacingVerticalM,
    overflowWrap: "anywhere",
  },
  secondary: { color: tokens.colorNeutralForeground2 },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
});

export interface PlaceDetailsViewProps {
  /** SearchView supplies the same selection used by the map and result list. */
  place?: PlaceModel;
  /** Omit until the parent can open a claim form; no placeholder action is shown. */
  onOpenClaim?: (placeId: string) => void;
  /** Passed to ReviewView for isolated tests; production uses its default client. */
  apiClient?: ReviewApiClient;
}

/** Displays supplied place data; fetching details remains PlaceApiClient's job. */
export function PlaceDetailsView({
  place,
  onOpenClaim,
  apiClient,
}: PlaceDetailsViewProps) {
  const styles = useStyles();
  const headingId = useId();

  if (!place) {
    return (
      <section className={styles.container} aria-labelledby={headingId}>
        <h2 id={headingId}>Place details</h2>
        <p>Select a place to see its details.</p>
      </section>
    );
  }

  // The key resets local state and unmounts the old ReviewView, which ignores
  // late responses. Returning to a previous place does not restore its draft.
  return (
    <SelectedPlaceDetails
      key={place.placeId}
      place={place}
      onOpenClaim={onOpenClaim}
      apiClient={apiClient}
    />
  );
}

function SelectedPlaceDetails({
  place,
  onOpenClaim,
  apiClient,
}: PlaceDetailsViewProps & { place: PlaceModel }) {
  const styles = useStyles();
  const id = useId();
  const [reviewPanel, setReviewPanel] = useState<"unopened" | "open" | "hidden">(
    "unopened",
  );
  const reviewsOpen = reviewPanel === "open";

  return (
    <section className={styles.container} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{place.name}</h2>
      <p>{place.address}</p>
      {place.types.length > 0 && (
        <p className={styles.secondary}>
          {place.types.map((type) => placeTypeLabels[type]).join(" · ")}
        </p>
      )}
      <div className={styles.actions}>
        <Button
          type="button"
          appearance="primary"
          aria-expanded={reviewsOpen}
          aria-controls={`${id}-reviews`}
          onClick={() => setReviewPanel(reviewsOpen ? "hidden" : "open")}
        >
          {reviewsOpen ? "Hide reviews" : "Show reviews / write a review"}
        </Button>
        {onOpenClaim && (
          <Button type="button" onClick={() => onOpenClaim(place.placeId)}>
            Claim this business
          </Button>
        )}
      </div>
      <div id={`${id}-reviews`} hidden={!reviewsOpen}>
        {/* Mount on first opening to avoid fetching reviews for every selection.
            Keep mounted while hidden so toggling preserves the current draft. */}
        {reviewPanel !== "unopened" && (
          <ReviewView
            target={{ kind: "place", placeId: place.placeId }}
            apiClient={apiClient}
          />
        )}
      </div>
    </section>
  );
}

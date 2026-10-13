import { useId } from "react";
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";
import type { PlaceModel } from "../../types/place";
import { placeTypeLabels } from "./place-type-labels";

const useStyles = makeStyles({
  container: { color: tokens.colorNeutralForeground1 },
  list: {
    listStyleType: "none",
    margin: "0",
    padding: "0",
    display: "grid",
    rowGap: tokens.spacingVerticalS,
  },
  item: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: "inherit",
    fontSize: tokens.fontSizeBase300,
    textAlign: "left",
    overflowWrap: "anywhere",
    cursor: "pointer",
    ":hover": { backgroundColor: tokens.colorNeutralBackground1Hover },
    ":focus-visible": {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: "2px",
    },
    '&[aria-pressed="true"]': {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      backgroundColor: tokens.colorBrandBackground2,
    },
    '&[aria-pressed="true"]:hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  name: { fontWeight: tokens.fontWeightSemibold },
  secondary: { color: tokens.colorNeutralForeground2 },
});

export interface PlaceListViewProps {
  places: readonly PlaceModel[];
  selectedPlaceId?: string;
  onSelect: (placeId: string) => void;
}

/** SearchView owns selection so map markers and list items stay in sync. */
export function PlaceListView({
  places,
  selectedPlaceId,
  onSelect,
}: PlaceListViewProps) {
  const styles = useStyles();
  const headingId = useId();

  return (
    <section className={`${styles.container} ll-place-list`} aria-labelledby={headingId}>
      <h2 id={headingId}>Places</h2>
      {places.length === 0 ? (
        <p>No places found. Try another location or adjust your filters.</p>
      ) : (
        <ul className={styles.list} aria-labelledby={headingId}>
          {places.map((place) => (
            <li key={place.placeId}>
              <button
                className={styles.item}
                type="button"
                aria-pressed={place.placeId === selectedPlaceId}
                onClick={() => onSelect(place.placeId)}
              >
                <span className={styles.name}>{place.name}</span>
                <span className={styles.secondary}>{place.address}</span>
                {place.types.length > 0 && (
                  <span className={styles.secondary}>
                    {place.types.map((type) => placeTypeLabels[type]).join(" · ")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

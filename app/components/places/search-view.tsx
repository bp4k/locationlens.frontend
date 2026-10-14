import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Button,
  Input,
  Select,
  Spinner,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { PlaceApiError, placeApiClient } from "../../lib/place-api";
import type { PlaceApiClient } from "../../lib/place-api";
import type { ReviewApiClient } from "../../lib/review-api";
import { isLatitude, isLongitude, PLACE_TYPES } from "../../types/place";
import type { PlaceModel, PlaceTypeModel } from "../../types/place";
import {
  SearchCriteriaModel,
  type SearchCriteriaInput,
} from "../../types/search-criteria";
import { PlaceListView } from "./place-list-view";
import { PlaceDetailsView } from "./place-details-view";
import { MapView } from "./map-view";
import { placeTypeLabels } from "./place-type-labels";

const useStyles = makeStyles({
  container: {
    color: tokens.colorNeutralForeground1,
  },
  fields: { display: "grid", rowGap: tokens.spacingVerticalS },
  actions: { display: "flex", flexWrap: "wrap", gap: tokens.spacingHorizontalS },
  results: {
    display: "grid",
    rowGap: tokens.spacingVerticalL,
  },
  error: { color: tokens.colorPaletteRedForeground1 },
});

interface SearchState {
  status: "idle" | "loading" | "ready" | "error";
  places: PlaceModel[];
  error?: string;
}

interface DetailsState {
  status: "idle" | "loading" | "ready" | "error";
  placeId?: string;
  place?: PlaceModel;
  error?: string;
}

export interface SearchViewProps {
  apiClient?: PlaceApiClient;
  reviewApiClient?: ReviewApiClient;
  onOpenClaim?: (placeId: string) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof PlaceApiError) {
    if (error.status === 401) return "Sign in to search places.";
    if (error.status === 403) return "You do not have permission to access these places.";
    return error.message;
  }
  return fallback;
}

/** Owns search results and selection; child views only display data and report actions. */
export function SearchView({
  apiClient = placeApiClient,
  reviewApiClient,
  onOpenClaim,
}: SearchViewProps) {
  const styles = useStyles();
  const id = useId();
  const [mode, setMode] = useState<"text" | "coordinates">("text");
  const [locationText, setLocationText] = useState("");
  // Keep numeric fields as strings while editing: an empty field must not become 0.
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("1000");
  const [placeType, setPlaceType] = useState<PlaceTypeModel>();
  const [formError, setFormError] = useState<string>();
  const [search, setSearch] = useState<SearchState>({ status: "idle", places: [] });
  const [details, setDetails] = useState<DetailsState>({ status: "idle" });

  // These counters make the latest intent authoritative even if HTTP responses
  // finish out of order. They invalidate results; they do not cancel network I/O.
  const searchSequence = useRef(0);
  const detailsSequence = useRef(0);
  const alive = useRef(true);
  // Filters/retry reuse submitted criteria, not location fields edited afterward.
  const submittedCriteria = useRef<SearchCriteriaModel | undefined>(undefined);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ++searchSequence.current;
      ++detailsSequence.current;
    };
  }, []);

  async function runSearch(input: SearchCriteriaInput) {
    const criteria = new SearchCriteriaModel(input);
    const validationError = criteria.getValidationError();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const sequence = ++searchSequence.current;
    submittedCriteria.current = criteria;
    setFormError(undefined);
    setSearch({ status: "loading", places: [] });
    // A new search clears old selection and unmounts its review/claim actions.
    ++detailsSequence.current;
    setDetails({ status: "idle" });
    try {
      const places = await apiClient.search(criteria);
      if (alive.current && sequence === searchSequence.current) {
        setSearch({ status: "ready", places });
      }
    } catch (error) {
      if (alive.current && sequence === searchSequence.current) {
        setSearch({
          status: "error", places: [],
          error: errorMessage(error, "Unable to search places. Please try again."),
        });
      }
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const radiusMeters = Number(radius);
    if (!Number.isSafeInteger(radiusMeters) || radiusMeters <= 0) {
      setFormError("Enter a positive whole-number search radius in meters.");
      return;
    }
    const criteria: SearchCriteriaInput = { radiusMeters, placeType };
    // Send only the chosen location mode, avoiding text/coordinate precedence
    // assumptions in the proposed backend contract. Zero coordinates are valid.
    if (mode === "text") {
      if (!locationText.trim()) {
        setFormError("Enter a location before searching.");
        return;
      }
      criteria.locationText = locationText.trim();
    } else {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!latitude.trim() || !longitude.trim() || !isLatitude(lat) || !isLongitude(lng)) {
        setFormError("Enter a valid latitude and longitude together.");
        return;
      }
      criteria.latitude = lat;
      criteria.longitude = lng;
    }
    void runSearch(criteria);
  }

  function applyFilter(type?: PlaceTypeModel) {
    setPlaceType(type);
    // Before the first search, a filter only changes the upcoming request.
    // Afterward, filtering is performed by the API so omitted results are fetched.
    if (submittedCriteria.current) {
      void runSearch({ ...submittedCriteria.current, placeType: type });
    }
  }

  async function selectPlace(placeId: string) {
    // Both map markers and list items use this handler and the same selected ID.
    const selectedPlace = search.places.find((place) => place.placeId === placeId);
    if (!selectedPlace) return;
    const sequence = ++detailsSequence.current;
    // Search already supplies a validated PlaceModel. Detail enrichment must not
    // block review/claim actions or discard a draft when the same place retries.
    const fallback = details.placeId === placeId
      ? details.place ?? selectedPlace
      : selectedPlace;
    setDetails({ status: "loading", placeId, place: fallback });
    try {
      const place = await apiClient.getPlaceDetails(placeId);
      if (alive.current && sequence === detailsSequence.current) {
        setDetails({ status: "ready", placeId, place });
      }
    } catch (error) {
      if (alive.current && sequence === detailsSequence.current) {
        setDetails({
          status: "error", placeId,
          // An authorization failure or removed place invalidates the fallback.
          place: error instanceof PlaceApiError && [401, 403, 404].includes(error.status)
            ? undefined
            : fallback,
          error: errorMessage(error, "Unable to load place details. Please try again."),
        });
      }
    }
  }

  return (
    <main className={`${styles.container} ll-workspace`}>
      {/* This sidebar only rearranges existing controls and content. Keeping their
          handlers intact preserves search/filter/retry and selection semantics. */}
      <aside className="ll-sidebar" aria-label="Search and places">
        <div className="ll-eyebrow">EXPLORE YOUR SURROUNDINGS</div>
        <h1>Find places</h1>
        <p className="ll-intro">A new favorite could be just around the corner.</p>
        <form className={`${styles.fields} ll-search-form`} onSubmit={submitSearch} noValidate>
          <label htmlFor={`${id}-mode`}>Search by</label>
          <Select
            id={`${id}-mode`}
            value={mode}
            onChange={(event) => setMode(event.target.value as "text" | "coordinates")}
          >
            <option value="text">Location text</option>
            <option value="coordinates">Coordinates</option>
          </Select>
          {mode === "text" ? (
            <>
              <label htmlFor={`${id}-location`}>Location</label>
              <Input
                id={`${id}-location`}
                value={locationText}
                placeholder="City, address, or location"
                onChange={(event) => setLocationText(event.target.value)}
              />
            </>
          ) : (
            <>
              <label htmlFor={`${id}-latitude`}>Latitude</label>
              <Input
                id={`${id}-latitude`}
                type="number"
                step="any"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
              <label htmlFor={`${id}-longitude`}>Longitude</label>
              <Input
                id={`${id}-longitude`}
                type="number"
                step="any"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </>
          )}
          <label htmlFor={`${id}-radius`}>Search radius (meters)</label>
          <Input
            id={`${id}-radius`}
            type="number"
            min={1}
            step={1}
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          />
          <label htmlFor={`${id}-type`}>Place type</label>
          <Select
            id={`${id}-type`}
            value={placeType ?? ""}
            onChange={(event) =>
              applyFilter((event.target.value || undefined) as PlaceTypeModel | undefined)
            }
          >
            <option value="">All types</option>
            {PLACE_TYPES.map((type) => (
              <option key={type} value={type}>{placeTypeLabels[type]}</option>
            ))}
          </Select>
          <div className={styles.actions}>
            <Button appearance="primary" type="submit">Search</Button>
            <Button
              type="button"
              disabled={!placeType}
              onClick={() => applyFilter(undefined)}
            >
              Clear filter
            </Button>
          </div>
          {formError && (
            <p className={styles.error} role="alert">{formError}</p>
          )}
        </form>
        {search.status === "idle" && <p>Enter a location to find nearby places.</p>}
        {search.status === "loading" && <Spinner label="Searching places…" />}
        {search.status === "error" && (
          <div role="alert">
            <p className={styles.error}>{search.error}</p>
            <Button
              type="button"
              onClick={() => submittedCriteria.current && void runSearch(submittedCriteria.current)}
            >
              Retry search
            </Button>
          </div>
        )}
        {search.status === "ready" && (
          <div className={styles.results}>
            <PlaceListView
              places={search.places}
              selectedPlaceId={details.placeId}
              onSelect={(placeId) => void selectPlace(placeId)}
            />
            <div className="ll-details-panel">
              {details.status === "loading" && (
                <Spinner label="Loading place details…" />
              )}
              {details.status === "error" && (
                <div role="alert">
                  <p className={styles.error}>{details.error}</p>
                  <Button
                    type="button"
                    onClick={() => details.placeId && void selectPlace(details.placeId)}
                  >
                    Retry details
                  </Button>
                </div>
              )}
              <PlaceDetailsView
                place={details.place}
                apiClient={reviewApiClient}
                onOpenClaim={onOpenClaim}
              />
            </div>
          </div>
        )}
      </aside>
      <div className="ll-map-stage">
        {/* The map still mounts only after a successful search. The illustration
            before that is decorative, not a map or fabricated search results. */}
        {search.status === "ready" ? (
          <MapView
            places={search.places}
            selectedPlaceId={details.placeId}
            onSelect={(placeId) => void selectPlace(placeId)}
          />
        ) : (
          <div className="ll-explore-placeholder">
            <div className="ll-map-art" aria-hidden="true"><span>⌖</span></div>
            <div className="ll-placeholder-copy">
              <span className="ll-eyebrow">A LITTLE CURIOSITY. A NEW DISCOVERY.</span>
              <h2>Make room for<br />somewhere new.</h2>
              <p>Search a city, a street, or a set of coordinates.<br />Your places will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

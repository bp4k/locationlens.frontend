import type { PlaceTypeModel } from "../../types/place";

/** Keep the list and details view's labels consistent with the same API enum. */
export const placeTypeLabels: Record<PlaceTypeModel, string> = {
  RESTAURANT: "Restaurant",
  BATHROOM: "Bathroom",
  PARK: "Park",
  ATTRACTION: "Attraction",
  HOTEL: "Hotel",
  HOSPITAL: "Hospital",
  OTHER: "Other",
};

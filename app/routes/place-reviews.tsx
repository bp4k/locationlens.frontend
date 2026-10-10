import { useParams } from "react-router";
import { ReviewView } from "../components/reviews/review-view";

export default function PlaceReviews() {
  const { placeId } = useParams();
  return (
    <ReviewView target={placeId ? { kind: "place", placeId } : undefined} />
  );
}

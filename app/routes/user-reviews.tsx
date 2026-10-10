import { useParams } from "react-router";
import { ReviewView } from "../components/reviews/review-view";

export default function UserReviews() {
  const { userId } = useParams();
  return <ReviewView target={userId ? { kind: "user", userId } : undefined} />;
}

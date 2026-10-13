import { Link, useParams } from "react-router";
import { ClaimView } from "../components/claims/claim-view";

export default function PlaceClaim() {
  const { placeId } = useParams();
  return (
    <main className="ll-standalone-panel">
      <Link to="/">Back to search</Link>
      <h1>Business claim</h1>
      <ClaimView placeId={placeId} />
    </main>
  );
}

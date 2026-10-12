import { Link, useParams } from "react-router";
import { ClaimView } from "../components/claims/claim-view";

export default function PlaceClaim() {
  const { placeId } = useParams();
  return (
    <main style={{ maxWidth: "42rem", margin: "0 auto", padding: "24px" }}>
      <Link to="/">Back to search</Link>
      <h1>Business claim</h1>
      <ClaimView placeId={placeId} />
    </main>
  );
}

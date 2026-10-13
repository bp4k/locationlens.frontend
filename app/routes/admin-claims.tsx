import { AdminClaimView } from "../components/claims/admin-claim-view";
import { Link } from "react-router";

export default function AdminClaims() {
  return (
    <>
      <nav
        aria-label="Claim navigation"
        style={{ maxWidth: "48rem", margin: "0 auto", padding: "24px" }}
      >
        <Link to="/">Back to search</Link>
      </nav>
      <AdminClaimView />
    </>
  );
}

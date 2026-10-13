import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  route("welcome", "routes/welcome.tsx"),
  route("login", "routes/login.tsx"),
  route("login-redirect", "routes/login-redirect.tsx"),
  layout("layouts/protected-layout.tsx", [
    index("routes/home.tsx"),
    route("account", "routes/account.tsx"),
    route("places/:placeId/reviews", "routes/place-reviews.tsx"),
    route("reviews/history", "routes/review-history.tsx"),
    route("places/:placeId/claim", "routes/place-claim.tsx"),
    route("admin/claims", "routes/admin-claims.tsx"),
  ]),
] satisfies RouteConfig;

import { Link } from "react-router";
import { Button } from "@fluentui/react-components";
import type { Route } from "./+types/welcome";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Welcome to LocationLens" }];
}

/** Public introduction only: /login owns the unchanged authentication flow. */
export default function Welcome() {
  return (
    <main className="ll-welcome">
      <header className="ll-welcome-header">
        <Link to="/welcome" className="ll-brand">
          <span className="ll-brand-mark" aria-hidden="true">⌖</span>LocationLens
        </Link>
        <Link to="/login" className="ll-nav-link">Sign in</Link>
      </header>
      <div className="ll-welcome-layout">
        <section className="ll-welcome-copy">
          <span className="ll-eyebrow">YOUR WORLD, A LITTLE CLOSER</span>
          <h1>Good places.<br />Closer than<br /><em>you think.</em></h1>
          <p>Find a quiet park, your next favorite restaurant, or somewhere entirely new. Explore the places around you with LocationLens.</p>
          <Button as="a" href="/login" appearance="primary" size="large">Start exploring →</Button>
          <p className="ll-welcome-note">Sign in to explore places and share your experiences.</p>
          <div className="ll-feature-row">
            <span>⌖ Search nearby</span><span>◇ Explore the map</span><span>☆ Share your experience</span>
          </div>
        </section>
        <div className="ll-welcome-art" aria-hidden="true">
          <div className="ll-map-art"><span>⌖</span></div>
          <div className="ll-art-note">A new perspective<br /><strong>on your neighborhood.</strong></div>
        </div>
      </div>
    </main>
  );
}

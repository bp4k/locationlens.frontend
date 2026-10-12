import { SearchView } from "../components/places/search-view";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "LocationLens" },
    { name: "description", content: "LocationLens" },
  ];
}

export default function Home() {
  // The protected layout handles authentication; search starts on user action.
  return <SearchView />;
}

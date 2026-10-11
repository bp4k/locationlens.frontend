import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlaceListView } from "./place-list-view";
import type { PlaceModel } from "../../types/place";

const places: PlaceModel[] = [
  {
    placeId: "park-1",
    name: "Piedmont Park",
    address: "1320 Monroe Drive",
    latitude: 33.785,
    longitude: -84.373,
    types: ["PARK", "ATTRACTION"],
  },
  {
    placeId: "restaurant-1",
    name: "Campus Cafe",
    address: "1 College Avenue",
    latitude: 33.775,
    longitude: -84.396,
    types: ["RESTAURANT"],
  },
];

describe("PlaceListView", () => {
  it("lets keyboard and mouse selection update the parent's selected place", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function SearchHarness() {
      const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
      return (
        <PlaceListView
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelect={(id) => {
            onSelect(id);
            setSelectedPlaceId(id);
          }}
        />
      );
    }
    render(<SearchHarness />);
    const park = screen.getByRole("button", { name: /Piedmont Park/ });
    const cafe = screen.getByRole("button", { name: /Campus Cafe/ });
    expect(park).toHaveTextContent("1320 Monroe Drive");
    expect(park).toHaveTextContent("Park · Attraction");
    await user.tab();
    expect(park).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("park-1");
    expect(park).toHaveAttribute("aria-pressed", "true");
    await user.click(cafe);
    expect(onSelect).toHaveBeenLastCalledWith("restaurant-1");
    expect(park).toHaveAttribute("aria-pressed", "false");
    expect(cafe).toHaveAttribute("aria-pressed", "true");
  });

  it("follows selection from another view and handles replacement search results", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <PlaceListView places={places} selectedPlaceId="park-1" onSelect={onSelect} />,
    );
    rerender(
      <PlaceListView places={places} selectedPlaceId="restaurant-1" onSelect={onSelect} />,
    );
    expect(screen.getByRole("button", { name: /Piedmont Park/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Campus Cafe/ })).toHaveAttribute("aria-pressed", "true");
    rerender(
      <PlaceListView places={[places[0]]} selectedPlaceId="restaurant-1" onSelect={onSelect} />,
    );
    expect(screen.queryByRole("button", { name: /Campus Cafe/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows an empty state when a search returns no places", () => {
    render(<PlaceListView places={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/No places found/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

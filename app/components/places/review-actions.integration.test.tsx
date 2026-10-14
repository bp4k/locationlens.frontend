import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { saveSession } from "../../auth/token-storage";
import { SearchView } from "./search-view";

vi.mock("./map-view", () => ({
  MapView: () => <section aria-label="Map test boundary" />,
}));

const place = {
  place_id: "dummy-1",
  name: "Piedmont Park",
  address: "400 Park Dr NE, Atlanta, GA",
  latitude: 33.785,
  longitude: -84.3738,
  types: ["PARK"],
};

function setup(detailStatus = 400) {
  saveSession("test-token", 3600);
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockImplementation(async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === "/api/v1/session/refresh") return new Response(null, { status: 401 });
      if (path === "/api/v1/places/search") return Response.json([place]);
      if (path === "/api/v1/places/dummy-1")
        return new Response("", { status: detailStatus });
      if (path === "/api/v1/reviews/place/dummy-1") return Response.json([]);
      if (path === "/api/v1/reviews" && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        return Response.json(
          {
            review_id: "6a7d1f76-ef09-49ee-a310-25850196740a",
            user_id: "a852a1c9-1384-4571-8c53-7eeeb4975329",
            place_id: body.place_id,
            rating: body.rating,
            text: body.text,
            created_at: "2026-10-14T12:00:00Z",
          },
          { status: 201 },
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function selectPark(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Location"), "Atlanta");
  await user.click(screen.getByRole("button", { name: "Search" }));
  await user.click(
    await screen.findByRole("button", { name: /Piedmont Park/ }),
  );
}

describe("review access from search results", () => {
  it("opens and submits a review when the current backend details stub returns 400", async () => {
    const fetch = setup();
    const user = userEvent.setup();
    render(<SearchView />);
    await selectPark(user);
    expect(
      await screen.findByRole("button", { name: "Retry details" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /write a review/ }));
    await user.selectOptions(screen.getByLabelText("Rating"), "5");
    await user.type(screen.getByLabelText("Your experience"), "Lovely park!");
    await user.click(screen.getByRole("button", { name: "Submit review" }));
    expect(
      await screen.findByText("Your review was submitted."),
    ).toBeInTheDocument();
    const request = fetch.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/v1/reviews") && init?.method === "POST",
    );
    expect(JSON.parse(request![1]!.body as string)).toEqual({
      place_id: "dummy-1",
      rating: 5,
      text: "Lovely park!",
    });
    expect(new Headers(request![1]!.headers).get("Authorization")).toBe(
      "Bearer test-token",
    );
  });

  it("shows review actions before detail loading finishes", async () => {
    const fetch = setup();
    const implementation = fetch.getMockImplementation()!;
    let resolve!: (response: Response) => void;
    fetch.mockImplementation((url, init) =>
      String(url).endsWith("/places/dummy-1")
        ? new Promise<Response>((done) => {
            resolve = done;
          })
        : implementation(url, init),
    );
    const user = userEvent.setup();
    render(<SearchView />);
    await selectPark(user);
    expect(screen.getByText("Loading place details…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /write a review/ }));
    await user.type(
      screen.getByLabelText("Your experience"),
      "Draft while loading",
    );
    await act(async () => resolve(Response.json(place)));
    expect(screen.getByLabelText("Your experience")).toHaveValue(
      "Draft while loading",
    );
  });

  it("retains an open review draft across a failed detail retry", async () => {
    setup();
    const user = userEvent.setup();
    render(<SearchView />);
    await selectPark(user);
    await user.click(screen.getByRole("button", { name: /write a review/ }));
    await user.type(
      screen.getByLabelText("Your experience"),
      "Keep this draft",
    );
    await user.click(screen.getByRole("button", { name: "Retry details" }));
    expect(
      await screen.findByRole("button", { name: "Retry details" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Your experience")).toHaveValue(
      "Keep this draft",
    );
  });

  it.each([401, 403, 404])(
    "removes review actions when details reject with HTTP %s",
    async (status) => {
      setup(status);
      const user = userEvent.setup();
      render(<SearchView />);
      await selectPark(user);
      expect(
        await screen.findByRole("button", { name: "Retry details" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /write a review/ }),
      ).not.toBeInTheDocument();
    },
  );
});

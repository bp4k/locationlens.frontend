import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Welcome from "./welcome";

describe("public welcome page", () => {
  it("introduces the app without requests and links to the existing login flow", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good places.");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /Start exploring/ })).toHaveAttribute("href", "/login");
    expect(fetch).not.toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import Account from "./account";
import { saveSession } from "../auth/token-storage";

it("renders the existing account fields through the real UserModel adapter", async () => {
  const claims = { sub: "a852a1c9-1384-4571-8c53-7eeeb4975329" };
  saveSession(`header.${btoa(JSON.stringify(claims))}.signature`, 3600);
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          first_name: "Albert",
          last_name: "Zheng",
          email: "albert@example.com",
        }),
      ),
  );
  render(<Account />);
  expect(await screen.findByText("albert@example.com")).toBeInTheDocument();
  expect(screen.getByText("Albert")).toBeInTheDocument();
  expect(screen.getByText("Zheng")).toBeInTheDocument();
});

it("renews a rejected account token and renders the account instead of losing the page", async () => {
  const token = `header.${btoa(JSON.stringify({ sub: "a852a1c9-1384-4571-8c53-7eeeb4975329" }))}.signature`;
  saveSession(token, 300);
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ access_token: token, token_type: "Bearer", expires_in: 300 }))
    .mockResolvedValueOnce(Response.json({ first_name: "Jake", last_name: "Zhang", email: "jake@example.com" }));
  vi.stubGlobal("fetch", fetch);
  render(<Account />);
  expect(await screen.findByRole("heading", { name: "Your account" })).toBeInTheDocument();
  expect(screen.getByText("jake@example.com")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("keeps a heading and retry action visible when account loading fails", async () => {
  const token = `header.${btoa(JSON.stringify({ sub: "a852a1c9-1384-4571-8c53-7eeeb4975329" }))}.signature`;
  saveSession(token, 300);
  vi.stubEnv("VITE_APP_API_URL", "http://localhost:8080/api");
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce(Response.json({ first_name: "Jake", last_name: "Zhang", email: "jake@example.com" }));
  vi.stubGlobal("fetch", fetch);
  render(<Account />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your account details");
  expect(screen.getByRole("heading", { name: "Your account" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Retry account" }));
  expect(await screen.findByText("jake@example.com")).toBeInTheDocument();
});

import { render, screen } from "@testing-library/react";
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

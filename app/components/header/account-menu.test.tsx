import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, it } from "vitest";
import { AccountMenu } from "./account-menu";

it("opens the signed-in review history from the account menu", async () => {
  render(
    <FluentProvider theme={webLightTheme}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AccountMenu />} />
          <Route path="/reviews/history" element={<h1>My reviews page</h1>} />
        </Routes>
      </MemoryRouter>
    </FluentProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Account" }));
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "My reviews" }),
  );
  expect(
    await screen.findByRole("heading", { name: "My reviews page" }),
  ).toBeInTheDocument();
});

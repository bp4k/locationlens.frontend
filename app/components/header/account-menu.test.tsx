import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { Link, MemoryRouter, Route, Routes, createMemoryRouter, useNavigate } from "react-router";
import { RouterProvider } from "react-router/dom";
import { expect, it } from "vitest";
import { AccountMenu } from "./account-menu";
import { AuthProvider, useAuth } from "../../auth/auth-context";
import { getAccessToken, saveSession } from "../../auth/token-storage";
import ProtectedLayout from "../../layouts/protected-layout";

it("opens the signed-in review history from the account menu", async () => {
  render(
    <FluentProvider theme={webLightTheme}>
      <AuthProvider>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AccountMenu />} />
          <Route path="/reviews/history" element={<h1>My reviews page</h1>} />
        </Routes>
      </MemoryRouter>
      </AuthProvider>
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

function SessionControls() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <p>{isAuthenticated ? "Signed in" : "Signed out"}</p>
      <button onClick={() => navigate(-1)}>Back in history</button>
      <Link to="/account">Revisit protected account</Link>
    </>
  );
}

it("signs out to welcome, replaces history, and blocks protected reentry", async () => {
  const user = userEvent.setup();
  saveSession("test-token", 3600);
  // Match the app's framework data router so synchronous navigation commits are
  // exercised, rather than MemoryRouter's transition-only navigation behavior.
  const router = createMemoryRouter([
    { path: "/before", element: <><SessionControls /><h1>Previous public page</h1></> },
    { path: "/welcome", element: <><SessionControls /><h1>Welcome page</h1></> },
    { path: "/login", element: <h1>Login route</h1> },
    { element: <ProtectedLayout />, children: [
      { path: "/account", element: <h1>Private account page</h1> },
    ] },
  ], { initialEntries: ["/before", "/account"], initialIndex: 1 });
  render(
    <FluentProvider theme={webLightTheme}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </FluentProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Account" }));
  await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));
  expect(await screen.findByRole("heading", { name: "Welcome page" })).toBeInTheDocument();
  expect(screen.getByText("Signed out")).toBeInTheDocument();
  expect(getAccessToken()).toBeNull();
  expect(localStorage.getItem("locationlens.expires_at")).toBeNull();
  expect(screen.queryByRole("heading", { name: "Private account page" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Login route" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Back in history" }));
  expect(await screen.findByRole("heading", { name: "Previous public page" })).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Revisit protected account" }));
  expect(await screen.findByRole("heading", { name: "Login route" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Private account page" })).not.toBeInTheDocument();
});

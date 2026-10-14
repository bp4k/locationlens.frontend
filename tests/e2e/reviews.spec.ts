import { test, expect } from "@playwright/test";

// Real browser, API security, controllers and JPA. Only the OIDC issuer is a fixture.
test("login, select a place, create/read a review, and reject a duplicate", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Test identity provider" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sign in as user", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find places" }),
  ).toBeVisible();
  await page.getByLabel("Location", { exact: true }).fill("Atlanta");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const details = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/places/dummy-1"),
  );
  await page.getByRole("button", { name: /Piedmont Park/ }).click();
  expect((await details).status()).toBe(200);
  await page
    .getByRole("button", { name: "Show reviews / write a review" })
    .click();
  await expect(
    page.getByText("No reviews yet. Be the first to share your experience."),
  ).toBeVisible();
  await page.getByLabel("Rating", { exact: true }).selectOption("5");
  await page.getByLabel("Your experience").fill("Browser-tested review");
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/reviews") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Submit review", exact: true })
    .click();
  const saved = await created;
  expect(saved.status()).toBe(201);
  const review = await saved.json();
  expect(review).toMatchObject({
    place_id: "dummy-1",
    user_id: "a852a1c9-1384-4571-8c53-7eeeb4975329",
    rating: 5,
    text: "Browser-tested review",
  });
  expect(review.review_id).toMatch(/^[0-9a-f-]{36}$/i);
  expect(Number.isFinite(Date.parse(review.created_at))).toBe(true);
  await expect(page.getByText("Your review was submitted.")).toBeVisible();

  // A reload exercises database reads instead of the locally inserted result.
  await page.goto("/places/dummy-1/reviews");
  await expect(
    page.getByText("Browser-tested review", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Browser-tested review", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Rating", { exact: true }).selectOption("4");
  await page.getByLabel("Your experience").fill("Duplicate draft");
  const duplicate = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/reviews") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Submit review", exact: true })
    .click();
  expect((await duplicate).status()).toBe(409);
  await expect(page.getByRole("alert")).toContainText(
    "You have already reviewed this place.",
  );
  await expect(page.getByLabel("Your experience")).toHaveValue(
    "Duplicate draft",
  );
  await page.goto("/reviews/history");
  await expect(
    page.getByText("Browser-tested review", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Place: dummy-1/)).toBeVisible();
  await expect(page.getByText("Duplicate draft", { exact: true })).toHaveCount(
    0,
  );
});

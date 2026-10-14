import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function login(page: Page, admin = false) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Test identity provider" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: admin ? "Sign in as administrator" : "Sign in as user",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find places" }),
  ).toBeVisible();
}

async function token(page: Page) {
  return page.evaluate(() => localStorage.getItem("locationlens.access_token"));
}

test("an expired browser token renews from the OIDC session and submits the selected claim", async ({ page }) => {
  await login(page);
  const placeId = `business-${randomUUID()}`;
  await page.goto(`/places/${placeId}/claim`);
  const expired = await page.request.get("http://127.0.0.1:9084/test/expired-token");
  const expiredToken = (await expired.json()).token;
  await page.evaluate((value) => {
    localStorage.setItem("locationlens.access_token", value);
    // Match the original stale signed-in UI while the server rejects the JWT.
    localStorage.setItem("locationlens.expires_at", String(Date.now() + 300_000));
  }, expiredToken);
  const renewed = page.waitForResponse((response) => response.url().endsWith("/api/v1/session/refresh"));
  const created = page.waitForResponse((response) => response.url().endsWith("/api/v1/business-claims") && response.status() === 201);
  await page.getByRole("button", { name: "Submit business claim" }).click();
  expect((await renewed).status()).toBe(200);
  expect((await created).status()).toBe(201);
  await expect(page.getByRole("status")).toContainText("pending administrator review");
  expect(await token(page)).not.toBe(expiredToken);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const action of ["approve", "reject"] as const) {
  test(`signed-in user submits a verified business and administrator ${action}s it`, async ({
    page,
    browser,
  }) => {
    await login(page);
    const placeId = `business-${randomUUID()}`;
    await page.goto(`/places/${placeId}/claim`);
    const savedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/business-claims") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Submit business claim" }).click();
    const saved = await savedResponse;
    expect(saved.status()).toBe(201);
    const claim = await saved.json();
    expect(claim).toMatchObject({
      placeId,
      status: "PENDING",
      userId: "a852a1c9-1384-4571-8c53-7eeeb4975329",
    });
    await expect(page.getByRole("status")).toContainText(claim.id);

    const userToken = await token(page);
    const forbidden = await page.request.post(
      `http://127.0.0.1:9080/api/v1/business-claims/${claim.id}/${action}`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );
    expect(forbidden.status()).toBe(403);

    const adminContext = await browser.newContext();
    try {
      const adminPage = await adminContext.newPage();
      await login(adminPage, true);
      await adminPage.goto("/admin/claims");
      const row = adminPage.getByRole("article", {
        name: `Claim for ${placeId}`,
        exact: true,
      });
      await expect(row).toContainText(claim.id);
      await row
        .getByRole("button", {
          name: action === "approve" ? "Approve" : "Reject",
          exact: true,
        })
        .click();
      await row
        .getByRole("button", {
          name: action === "approve" ? "Confirm approval" : "Confirm rejection",
        })
        .click();
      await expect(adminPage.getByRole("status")).toContainText(
        action === "approve" ? "approved" : "rejected",
      );
      await expect(row).toHaveCount(0);
      await adminPage.reload();
      await expect(
        adminPage.getByRole("button", { name: "Refresh claims" }),
      ).toBeEnabled();
      await expect(row).toHaveCount(0);
      const adminToken = await token(adminPage);
      const repeated = await adminPage.request.post(
        `http://127.0.0.1:9080/api/v1/business-claims/${claim.id}/${action}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      expect(repeated.status()).toBe(409);
    } finally {
      await adminContext.close();
    }
  });
}

for (const [placeId, status] of [
  ["missing-business", 404],
  ["non-business", 400],
  ["provider-unavailable", 503],
] as const) {
  test(`does not save or confirm ${placeId}`, async ({ page }) => {
    await login(page, true);
    await page.goto(`/places/${placeId}/claim`);
    const failedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/business-claims") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Submit business claim" }).click();
    expect((await failedResponse).status()).toBe(status);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    const pending = await page.request.get(
      "http://127.0.0.1:9080/api/v1/business-claims/pending",
      {
        headers: { Authorization: `Bearer ${await token(page)}` },
      },
    );
    expect(pending.status()).toBe(200);
    expect(
      (await pending.json()).some(
        (claim: { placeId: string }) => claim.placeId === placeId,
      ),
    ).toBe(false);
  });
}

test("ordinary users cannot load pending claims or see decision controls", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/claims");
  await expect(page.getByRole("alert")).toContainText(
    "Administrator access is required",
  );
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reject", exact: true }),
  ).toHaveCount(0);
});

test("missing, malformed and expired bearer tokens are rejected by real Spring Security", async ({
  request,
}) => {
  const endpoint = "http://127.0.0.1:9080/api/v1/business-claims";
  const missing = await request.post(endpoint, {
    data: { placeId: "business-existing" },
  });
  expect(missing.status()).toBe(401);
  const invalid = await request.post(endpoint, {
    headers: { Authorization: "Bearer not-a-signed-token" },
    data: { placeId: "business-existing" },
  });
  expect(invalid.status()).toBe(401);
  const fixture = await request.get("http://127.0.0.1:9084/test/expired-token");
  const expiredToken = (await fixture.json()).token;
  const expired = await request.post(endpoint, {
    headers: { Authorization: `Bearer ${expiredToken}` },
    data: { placeId: "business-existing" },
  });
  expect(expired.status()).toBe(401);
});

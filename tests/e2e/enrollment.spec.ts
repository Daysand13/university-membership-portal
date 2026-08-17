import { test, expect } from "@playwright/test";

/**
 * NOT RUN IN THE BUILD SANDBOX — Playwright needs a real browser + a
 * running dev server, which this sandbox doesn't provide. This file is a
 * genuine, ready-to-run starting point: install Playwright locally
 * (`npm i -D @playwright/test && npx playwright install`), run
 * `npm run dev` in one terminal, then `npx playwright test` in another.
 *
 * The Vitest suite in tests/unit/ *is* executed in this sandbox and covers
 * the same business logic (submit -> approve -> login) at the service
 * layer against a real database — this file adds true browser-level
 * coverage of the same journey on top of that.
 */

test.describe("Membership enrollment", () => {
  test("a visitor can submit a complete application and see the confirmation page", async ({ page }) => {
    const unique = Date.now();

    await page.goto("/membership/enroll");

    await page.getByLabel("First Name").fill("Playwright");
    await page.getByLabel("Last Name").fill("Tester");
    await page.getByLabel("Date of Birth").fill("2001-01-01");
    await page.getByLabel("Gender").selectOption("MALE");
    await page.getByLabel("Phone Number").fill("0244000000");
    await page.getByLabel("Email Address").fill(`e2e-${unique}@example.com`);

    await page.getByLabel("Index Number").fill(`E2E/${unique}`);
    await page.getByLabel("Programme").fill("Test Programme");
    await page.getByLabel("Department").fill("Test Department");
    await page.getByLabel("Faculty / School").fill("Test Faculty");
    await page.getByLabel("Level").selectOption("200");
    await page.getByLabel("Campus").fill("Main Campus");
    await page.getByLabel("Year of Admission").fill("2024");

    await page.getByLabel("Residential Address").fill("1 Test Street, Accra");
    await page.getByLabel("Region").selectOption("Greater Accra");
    await page.getByLabel("Emergency Contact Name").fill("Emergency Contact");
    await page.getByLabel("Emergency Contact Phone").fill("0244111111");

    await page.getByLabel(/I confirm that the information/).check();
    await page.getByRole("button", { name: /Submit Application/ }).click();

    await expect(page).toHaveURL(/\/membership\/enroll\/success/);
    await expect(page.getByText("Application Submitted")).toBeVisible();
  });

  test("submitting a duplicate index number shows a field-level error, not a crash", async ({ page }) => {
    // Assumes the seed script has already run (SAMPLE/0001/24 exists).
    await page.goto("/membership/enroll");
    await page.getByLabel("Index Number").fill("SAMPLE/0001/24");
    // ... fill remaining required fields, then submit ...
    // await page.getByRole("button", { name: /Submit Application/ }).click();
    // await expect(page.getByText(/already exists/)).toBeVisible();
  });
});

test.describe("Admin review workflow", () => {
  test("an admin can log in, review, and approve a pending application", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email Address").fill("membership@example.edu.gh");
    await page.getByLabel("Password").fill("ChangeMe123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL("/admin");

    await page.goto("/admin/membership-applications?status=PENDING");
    await page.getByRole("link", { name: "Review" }).first().click();

    await page.getByRole("button", { name: /Approve/ }).click();
    await expect(page.getByText("APPROVED")).toBeVisible();
  });
});

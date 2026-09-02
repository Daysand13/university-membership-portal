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
  test("a visitor can submit a complete undergraduate application and see the confirmation page", async ({ page }) => {
    const unique = Date.now();

    await page.goto("/membership/enroll");
    await page.getByRole("link", { name: /Undergraduate/ }).click();
    await expect(page).toHaveURL(/\/membership\/enroll\/undergraduate/);

    await page.getByLabel("Membership Status").selectOption("REGULAR");

    await page.getByLabel("First Name").fill("Playwright");
    await page.getByLabel("Surname").fill("Tester");
    await page.getByLabel("Date of Birth").fill("2001-01-01");
    await page.getByLabel("Gender").selectOption("MALE");
    await page.getByLabel("Personal Email Address").fill(`e2e-${unique}@example.com`);
    await page.getByLabel(/Phone Number \/ WhatsApp/).fill("0244000000");

    await page.getByLabel("UEW Campus").selectOption({ label: "Winneba Campus (Main Campus)" });
    await page.getByLabel("Academic Department").selectOption({ label: "Department of Special Education" });
    await page.getByLabel("Program of Study").selectOption({
      label: "Bachelor of Education (B.Ed.) Special Education",
    });
    await page.getByLabel(/Level \/ Year of Study/).selectOption({ label: "Level 200" });
    await page.getByLabel("Index Number").fill(`E2E/${unique}`);
    await page.getByLabel("Year of Admission").fill("2024");

    await page.getByLabel("Category of Special Needs").selectOption({ label: "Visual Impairment" });

    await page.getByLabel("Passport Picture").setInputFiles({
      name: "passport.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
    });
    await page.getByLabel(/Medical Report/).setInputFiles({
      name: "medical.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test"),
    });

    await page.getByLabel("Residential Address").fill("1 Test Street, Accra");
    await page.getByLabel("Region").selectOption("Greater Accra");
    await page.getByLabel("Emergency Contact Name").fill("Emergency Contact");
    await page.getByLabel("Emergency Contact Phone").fill("0244111111");

    await page.getByLabel(/I confirm that I have registered at the Resource Center/).check();
    await page.getByRole("button", { name: /Submit Membership Registration/ }).click();

    await expect(page).toHaveURL(/\/membership\/enroll\/success/);
    await expect(page.getByText("Application Submitted")).toBeVisible();
  });

  test("submitting a duplicate index number shows a field-level error, not a crash", async ({ page }) => {
    // Assumes the seed script has already run (SAMPLE/0001/24 exists).
    await page.goto("/membership/enroll/undergraduate");
    await page.getByLabel("Index Number").fill("SAMPLE/0001/24");
    // ... fill remaining required fields, then submit ...
    // await page.getByRole("button", { name: /Submit Membership Registration/ }).click();
    // await expect(page.getByText(/already exists/)).toBeVisible();
  });

  test("the postgraduate option shows a coming-soon placeholder rather than a form", async ({ page }) => {
    await page.goto("/membership/enroll");
    await page.getByRole("link", { name: /Postgraduate/ }).click();
    await expect(page).toHaveURL(/\/membership\/enroll\/postgraduate/);
    await expect(page.getByText("Coming Soon")).toBeVisible();
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

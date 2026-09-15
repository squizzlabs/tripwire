const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("panel divider stays under the pointer while its columns resize", async ({ page }) => {
	await login(page, "Perimeter");
	const splitter = page.locator(".panel-splitter-column").first();
	await expect(splitter).toBeVisible();

	const before = await splitter.boundingBox();
	const leftPanel = page.locator(".gridWidget:visible").first();
	const panelBefore = await leftPanel.boundingBox();
	const y = before.y + before.height / 2;

	await page.mouse.move(before.x + before.width / 2, y);
	await page.mouse.down();
	await page.mouse.move(before.x + before.width / 2 + 60, y, {steps: 6});

	// Check before pointer-up: previously only the panels moved during the
	// drag and the divider teleported to them after release.
	const during = await splitter.boundingBox();
	expect(during.x).toBeGreaterThan(before.x + 45);
	const panelDuring = await leftPanel.boundingBox();
	expect(panelDuring.width).toBeGreaterThan(panelBefore.width + 45);
	await page.mouse.up();

	// Put the shared test account's layout back where it started.
	const after = await splitter.boundingBox();
	await page.mouse.move(after.x + after.width / 2, after.y + after.height / 2);
	await page.mouse.down();
	await page.mouse.move(after.x + after.width / 2 - 60, after.y + after.height / 2, {steps: 6});
	await page.mouse.up();
});

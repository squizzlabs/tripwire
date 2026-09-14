// The app comes up: header, four panels, a live poll, no console errors.
const { test } = require("@playwright/test");
const { login, expect } = require("./helpers");

test("the app loads clean and polls", async ({ page }) => {
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e)));
	await login(page, "Perimeter");
	await expect(page.locator("#hdr-system")).toHaveText(/Perimeter/);
	await expect(page.locator(".gridWidget:visible")).toHaveCount(4);
	await expect(page.locator("#user-avatar")).toBeVisible();

	// Centring the newly loaded root system must scroll only the chain map,
	// never the page that contains the application header and panel tops.
	await expect(page.locator("#topbar")).toBeInViewport();
	expect(await page.evaluate(() => ({
		window: window.scrollY,
		wrapper: document.getElementById("wrapper").scrollTop,
		inner: document.getElementById("inner-wrapper").scrollTop
	}))).toEqual({window: 0, wrapper: 0, inner: 0});

	// The poll loop reschedules: the timer id must change.
	const t1 = await page.evaluate(() => tripwire.timer);
	await page.waitForFunction((t) => tripwire.timer !== t, t1, { timeout: 20000 });
	expect(errors).toEqual([]);
});

// Header toggles: what you click must change, visibly, and stay changed.
const { test, expect } = require("@playwright/test");

test("dialog focus restoration cannot scroll the desktop header away", async ({ page }) => {
	// Force overflow so this catches the focus-scroll bug on Linux too.
	// Use the shipped CSS and jQuery UI without a live account or signature edits.
	const path = require("path");
	const root = path.resolve(__dirname, "..");
	await page.setViewportSize({width: 1440, height: 900});
	await page.setContent(`
		<div id="wrapper"><div id="inner-wrapper">
			<div id="topbar">Header</div>
			<div id="map-workspace" class="gridster" tabindex="0">
				<button id="signature-opener" style="position:absolute;top:940px">Signature</button>
				<div id="scroll-panel" style="height:100px;overflow:auto">
					<div style="height:500px">Panel content</div>
				</div>
			</div>
		</div></div>
		<div id="test-dialog"><input aria-label="Signature"></div>`);
	for (const name of ["app", "jquery-ui-1.12.1.min"]) {
		await page.addStyleTag({path: path.join(root, "public/css/" + name + ".css")});
	}
	for (const name of ["jquery-3.3.1.min", "jquery-ui-1.12.1.min"]) {
		await page.addScriptTag({path: path.join(root, "public/js/" + name + ".js")});
	}
	await page.evaluate(() => {
		document.querySelector("#signature-opener").focus({preventScroll: true});
		$("#test-dialog").dialog({buttons: {Cancel() { $(this).dialog("close"); }}});
	});
	await page.getByRole("button", {name: "Cancel", exact: true}).click();
	await expect(page.locator("#signature-opener")).toBeFocused();
	expect((await page.locator("#topbar").boundingBox()).y).toBe(0);
	const panelScroll = await page.locator("#scroll-panel").evaluate(panel => {
		panel.scrollTop = 40;
		return panel.scrollTop;
	});
	expect(panelScroll).toBe(40);
});

async function ready(page) {
	await page.goto("/?system=Perimeter");
	await page.waitForFunction(() => window.tripwire && window.options && window.options.buttons);
	await page.waitForSelector("#follow", { state: "visible" });
}

test("follow-my-system toggles on click, shows it, and survives a reload", async ({ page }) => {
	await ready(page);
	const follow = page.locator("#follow");
	const state = () => page.evaluate(() => ({
		active: document.getElementById("follow").classList.contains("active"),
		option: !!options.buttons.follow,
		color: getComputedStyle(document.getElementById("follow")).color,
		primary: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
	}));
	const before = await state();

	await follow.click();
	const after = await state();
	expect(after.active).toBe(!before.active);
	expect(after.option).toBe(after.active);

	// On draws in the brand orange; off in the muted grey. Whichever way we
	// just went, the two states must not look the same.
	expect(after.color).not.toBe(before.color);
	const onColor = after.active ? after.color : before.color;
	const rgb = await page.evaluate(p => { const d = document.createElement("div"); d.style.color = p; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; }, after.primary);
	expect(onColor).toBe(rgb);

	// Persisted: the options sync writes it, a reload reads it back.
	await page.waitForTimeout(1500);
	await ready(page);
	expect((await state()).active).toBe(after.active);

	// Leave the account as we found it.
	await follow.click();
	await page.waitForTimeout(1500);
	expect((await state()).active).toBe(before.active);
});

test("system filter closes on Escape and after choosing a suggestion", async ({ page }) => {
	await ready(page);
	const filter = page.locator("#searchSpan");
	const input = filter.locator("input.systemsAutocomplete");

	await page.locator("#hdr-system").click();
	await expect(input).toBeVisible();
	await expect(input).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(filter).toBeHidden();
	await expect(page.locator("#search")).not.toHaveClass(/active/);

	await page.locator("#hdr-system").click();
	await input.fill("Jit");
	const suggestion = page.locator(".ui-autocomplete:visible li").filter({hasText: /^Jita/}).first();
	await expect(suggestion).toBeVisible();
	await suggestion.click();

	await expect(page.locator("#hdr-system")).toHaveText("Jita");
	await expect(filter).toBeHidden();
	await expect(page.locator("#search")).not.toHaveClass(/active/);
});

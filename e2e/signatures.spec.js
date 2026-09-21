// The ways signatures get into Tripwire, end to end against a real instance.
//
// Every test here creates its own fixtures under the ZZQ prefix and removes
// them afterwards through the same remove payload the UI sends, so the
// preview's real data is untouched and a failed run leaves nothing behind
// that the next run will not clear.
const { test } = require("@playwright/test");
const { login, clientSigIds, removeSigsByPrefix, chooseType, setClipboard, expect } = require("./helpers");

const SYSTEM = process.env.E2E_SYSTEM || "Perimeter";
const PREFIX = "zzq";

test.describe("signatures", () => {
	test.beforeEach(async ({ page }) => {
		await login(page, SYSTEM);
		await removeSigsByPrefix(page, PREFIX);
	});
	test.afterEach(async ({ page }) => {
		await removeSigsByPrefix(page, PREFIX).catch(() => {});
	});

	test("add a signature by hand: typed into the dialog, saved with Enter", async ({ page }) => {
		await page.click("#add-signature");
		const dlg = page.locator(".ui-dialog:visible");
		await expect(dlg.locator(".ui-dialog-title")).toHaveText(/Add Signature/);

		// Typed, not filled: this is the path the single-key shortcuts could
		// interfere with, and the path a person actually uses.
		await page.locator("#dialog-signature input[name=signatureID_Alpha]").click();
		await page.keyboard.type("ZZQ");
		await page.keyboard.press("Tab");
		await page.keyboard.type("101");
		await chooseType(page, "Data");
		await page.locator("#dialog-signature input[name=signatureName]").click();
		await page.keyboard.type("E2E data site");
		await page.keyboard.press("Enter");

		await expect(dlg).toBeHidden();
		await expect(page.locator("#sigTable tbody td:first-child", { hasText: /ZZQ-101/i })).toBeVisible();
		expect(await clientSigIds(page)).toContain("zzq101");
	});

	test("add a signature by hand: the Add button", async ({ page }) => {
		await page.click("#add-signature");
		const dlg = page.locator(".ui-dialog:visible");
		await page.fill("#dialog-signature input[name=signatureID_Alpha]", "ZZQ");
		await page.fill("#dialog-signature input[name=signatureID_Numeric]", "102");
		await chooseType(page, "Combat");
		await page.fill("#dialog-signature input[name=signatureName]", "E2E combat site");
		await dlg.getByRole("button", { name: "Add", exact: true }).click();

		await expect(dlg).toBeHidden();
		expect(await clientSigIds(page)).toContain("zzq102");
	});

	test("paste probe-scanner results with Ctrl-V anywhere on the page", async ({ page, context }) => {
		const scan = [
			"ZZQ-201\tCosmic Signature\tRelic Site\tE2E relic\t100.0%\t2.31 AU",
			"ZZQ-202\tCosmic Signature\tGas Site\tE2E gas\t100.0%\t4.10 AU",
			"ZZQ-203\tCosmic Signature\t\t\t12.5%\t9.00 AU"
		].join("\n");
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await setClipboard(page, scan);

		// Nothing focused, Ctrl-V: paste.js focuses #clipboard and parses.
		await page.locator("body").click({ position: { x: 5, y: 400 } });
		await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");

		await page.waitForFunction(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).filter(s => /^zzq20/i.test(s.signatureID)).length >= 3, null, { timeout: 15000 });
		const ids = await clientSigIds(page);
		expect(ids).toEqual(expect.arrayContaining(["zzq201", "zzq202", "zzq203"]));
		const relic = await page.evaluate(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).find(s => /zzq201/i.test(s.signatureID)));
		expect(relic.type).toBe("relic");
		expect(relic.name).toBe("E2E relic");
	});

	test("the Paste scan button ingests the clipboard", async ({ page, context }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await setClipboard(page, "ZZQ-301\tCosmic Signature\tData Site\tE2E button paste\t100.0%\t1.00 AU");
		await page.click("#paste-signatures");
		await page.waitForFunction(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq301/i.test(s.signatureID)), null, { timeout: 15000 });
		expect(await clientSigIds(page)).toContain("zzq301");

		const notice = page.locator(".paste-notice");
		await expect(notice.getByRole("status")).toHaveText("Paste detected.");
		await expect(notice.locator(".paste-notice-progress")).toBeVisible();
		await expect(notice.getByRole("button", { name: "Delete signatures missing from this scan" })).toBeVisible();
		const dismiss = notice.getByRole("button", { name: "Dismiss" });
		await dismiss.focus();
		await page.keyboard.press("Enter");
		await expect(notice).toBeHidden();
	});

	test("a pasted signature updates rather than duplicates", async ({ page, context }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await setClipboard(page, "ZZQ-401\tCosmic Signature\t\t\t10.0%\t5.00 AU");
		await page.click("#paste-signatures");
		await page.waitForFunction(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq401/i.test(s.signatureID)), null, { timeout: 15000 });
		await setClipboard(page, "ZZQ-401\tCosmic Signature\tOre Site\tE2E ore\t100.0%\t5.00 AU");
		await page.click("#paste-signatures");
		await page.waitForFunction(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq401/i.test(s.signatureID) && s.type === "ore"), null, { timeout: 15000 });
		const matches = (await clientSigIds(page)).filter(id => id === "zzq401");
		expect(matches).toHaveLength(1);
	});

	test("pasted wormholes import immediately and can then be mapped to an existing connection", async ({ page }) => {
		await page.evaluate(() => {
			tripwire.client.signatures = tripwire.client.signatures || {};
			tripwire.client.wormholes = tripwire.client.wormholes || {};
			tripwire.client.signatures["paste-map-local"] = {
				id: "paste-map-local", signatureID: "???", systemID: viewingSystemID,
				type: "wormhole", name: "", lifeLength: 259200
			};
			tripwire.client.signatures["paste-map-other"] = {
				id: "paste-map-other", signatureID: "???", systemID: 1,
				type: "wormhole", name: "", lifeLength: 259200
			};
			tripwire.client.wormholes["paste-map-wh"] = {
				id: "paste-map-wh", initialID: "paste-map-local", secondaryID: "paste-map-other",
				type: "B274", parent: "initial", life: "stable", mass: "stable"
			};

			window.__mappingOriginalRefresh = tripwire.refresh;
			tripwire.refresh = function(mode, payload, success, always) {
				var signatures = payload && payload.signatures || {};
				if (signatures.add && signatures.add.length) {
					window.__pastePayload = JSON.parse(JSON.stringify(payload));
					if (success) success({
						resultSet: [{result: true}],
						results: [{
							wormhole: {id: "paste-new-wh", initialID: "paste-new-local", secondaryID: "paste-new-other"},
							signatures: [
								{id: "paste-new-local", signatureID: "ZZQ851", systemID: viewingSystemID, type: "wormhole"},
								{id: "paste-new-other", signatureID: null, systemID: null, type: "wormhole"}
							]
						}]
					});
				} else {
					window.__mappingPayload = JSON.parse(JSON.stringify(payload));
					if (success) success({resultSet: [{result: true}]});
				}
				if (always) always();
			};

			tripwire.pasteSignatures.parsePaste("ZZQ-851\tCosmic Signature\tWormhole\t\t100.0%\t1.00 AU");
		});

		const mapButton = page.locator("#map-pasted-wormholes");
		await page.waitForFunction(() => !!window.__pastePayload);
		const pastePayload = await page.evaluate(() => window.__pastePayload);
		expect(pastePayload.signatures.add).toHaveLength(1);
		await expect(mapButton).toBeVisible();
		await expect(mapButton).toHaveClass(/is-pending/);
		await expect(page.locator("#dialog-map-pasted-signatures")).toBeHidden();
		await mapButton.click();
		const dialog = page.locator(".ui-dialog:visible", { has: page.locator("#dialog-map-pasted-signatures") });
		await expect(dialog.getByText("ZZQ-851")).toBeVisible();
		await dialog.locator("select").selectOption("paste-map-wh");
		await dialog.getByRole("button", { name: "Apply", exact: true }).click();
		await page.waitForFunction(() => !!window.__mappingPayload);
		await expect(mapButton).not.toHaveClass(/is-pending/);

		const payload = await page.evaluate(() => window.__mappingPayload);
		expect(payload.signatures.remove).toEqual([{id: "paste-new-wh", initialID: "paste-new-local", secondaryID: "paste-new-other"}]);
		expect(payload.signatures.update).toHaveLength(1);
		expect(payload.signatures.update[0].signatures.find(sig => sig.id === "paste-map-local").signatureID).toBe("ZZQ851");

		await page.evaluate(() => {
			tripwire.refresh = window.__mappingOriginalRefresh;
			delete window.__mappingOriginalRefresh;
			delete window.__pastePayload;
			delete window.__mappingPayload;
			delete tripwire.client.wormholes["paste-map-wh"];
			delete tripwire.client.signatures["paste-map-local"];
			delete tripwire.client.signatures["paste-map-other"];
		});
	});

	test("selected wormholes can be mapped without a recent paste", async ({ page }) => {
		await page.evaluate(() => {
			tripwire.client.signatures = tripwire.client.signatures || {};
			tripwire.client.wormholes = tripwire.client.wormholes || {};
			const signatures = {
				"selected-source-local": {id: "selected-source-local", signatureID: "ZZQ852", systemID: viewingSystemID, type: "wormhole", name: "", lifeLength: 259200},
				"selected-source-other": {id: "selected-source-other", signatureID: "???", systemID: null, type: "wormhole", name: "", lifeLength: 259200},
				"selected-target-local": {id: "selected-target-local", signatureID: "???", systemID: viewingSystemID, type: "wormhole", name: "", lifeLength: 259200},
				"selected-target-other": {id: "selected-target-other", signatureID: "???", systemID: 31000005, type: "wormhole", name: "", lifeLength: 259200}
			};
			Object.assign(tripwire.client.signatures, signatures);
			tripwire.client.wormholes["selected-source-wh"] = {
				id: "selected-source-wh", initialID: "selected-source-local", secondaryID: "selected-source-other",
				type: null, parent: "initial", life: "stable", mass: "stable"
			};
			tripwire.client.wormholes["selected-target-wh"] = {
				id: "selected-target-wh", initialID: "selected-target-local", secondaryID: "selected-target-other",
				type: "B274", parent: "initial", life: "stable", mass: "stable"
			};
			$("#sigTable tbody").append(
				"<tr class='selected' data-id='selected-source-local'><td>ZZQ-852</td></tr>" +
				"<tr class='selected' data-id='selected-target-local'><td>???-###</td></tr>"
			);

			window.__selectionOriginalRefresh = tripwire.refresh;
			window.__selectionUndo = JSON.parse(JSON.stringify(tripwire.signatures.undo));
			tripwire.refresh = function(mode, payload, success, always) {
				window.__selectionMappingPayload = JSON.parse(JSON.stringify(payload));
				if (success) success({resultSet: [{result: true}]});
				if (always) always();
			};
		});

		await page.click("#map-pasted-wormholes");
		const dialog = page.locator(".ui-dialog:visible", {has: page.locator("#dialog-map-pasted-signatures")});
		await expect(dialog.getByText("ZZQ-852")).toBeVisible();
		await expect(dialog.locator("select")).toHaveValue("selected-target-wh");
		await dialog.getByRole("button", {name: "Apply", exact: true}).click();
		await page.waitForFunction(() => !!window.__selectionMappingPayload);

		const payload = await page.evaluate(() => window.__selectionMappingPayload);
		expect(payload.signatures.remove).toEqual([expect.objectContaining({id: "selected-source-wh"})]);
		expect(payload.signatures.update).toHaveLength(1);
		expect(payload.signatures.update[0].signatures.find(sig => sig.id === "selected-target-local").signatureID).toBe("ZZQ852");

		await page.evaluate(() => {
			tripwire.refresh = window.__selectionOriginalRefresh;
			tripwire.signatures.undo = window.__selectionUndo;
			sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
			$("#sigTable tbody tr[data-id^='selected-']").remove();
			["selected-source-wh", "selected-target-wh"].forEach(id => delete tripwire.client.wormholes[id]);
			["selected-source-local", "selected-source-other", "selected-target-local", "selected-target-other"].forEach(id => delete tripwire.client.signatures[id]);
			delete window.__selectionOriginalRefresh;
			delete window.__selectionMappingPayload;
			delete window.__selectionUndo;
		});
	});

	test("a destination signature cached during a jump still renders its missing row", async ({ page }) => {
		await page.evaluate(() => {
			const localID = "jump-render-local";
			const otherID = "jump-render-other";
			const wormholeID = "jump-render-wh";
			const local = {
				id: localID, signatureID: "ZZQ853", systemID: viewingSystemID,
				type: "wormhole", name: "", life: "stable", lifeLength: 259200,
				lifeTime: "2026-09-20 00:00:00", lifeLeft: "2026-09-23 00:00:00"
			};
			const other = {
				id: otherID, signatureID: "???", systemID: 31000005,
				type: "wormhole", name: "", life: "stable", lifeLength: 259200,
				lifeTime: local.lifeTime, lifeLeft: local.lifeLeft
			};
			const wormhole = {
				id: wormholeID, initialID: localID, secondaryID: otherID,
				type: "B274", parent: "initial", life: "stable", mass: "stable"
			};

			// Reproduce the jump race: the cache knows the destination signature,
			// but its table row was not rendered during the preceding poll.
			tripwire.signatures.list[localID] = local;
			$("#sigTable tbody tr[data-id='" + localID + "']").remove();
			tripwire.parse({
				signatures: {[localID]: local, [otherID]: other},
				wormholes: {[wormholeID]: wormhole}
			}, "change");
		});

		await expect(page.locator("#sigTable tbody tr[data-id='jump-render-local']")).toBeVisible();
		await expect(page.locator("#sigTable tbody tr[data-id='jump-render-local'] td:first-child")).toContainText("ZZQ-853");
	});

	test("undo removes what was just added", async ({ page }) => {
		await page.click("#add-signature");
		await page.fill("#dialog-signature input[name=signatureID_Alpha]", "ZZQ");
		await page.fill("#dialog-signature input[name=signatureID_Numeric]", "501");
		await chooseType(page, "Ore");
		await page.locator(".ui-dialog:visible").getByRole("button", { name: "Add", exact: true }).click();
		await page.waitForFunction(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq501/i.test(s.signatureID)));
		await expect(page.locator("#undo")).not.toHaveClass(/disabled/);
		await page.click("#undo");
		await page.waitForFunction(() => !Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq501/i.test(s.signatureID)), null, { timeout: 15000 });
	});

	test("Delete key then Enter deletes the selected signature", async ({ page }) => {
		await page.click("#add-signature");
		await page.fill("#dialog-signature input[name=signatureID_Alpha]", "ZZQ");
		await page.fill("#dialog-signature input[name=signatureID_Numeric]", "502");
		await chooseType(page, "Ore");
		await page.locator(".ui-dialog:visible").getByRole("button", { name: "Add", exact: true }).click();

		const row = page.locator("#sigTable tbody tr", { hasText: "ZZQ-502" });
		await expect(row).toBeVisible();
		await row.click();
		await page.keyboard.press("Delete");

		const dialog = page.locator(".ui-dialog:visible", { has: page.locator("#dialog-deleteSig") });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole("button", { name: "Delete", exact: true })).toBeFocused();
		await page.keyboard.press("Enter");

		await expect(dialog).toBeHidden();
		await expect(row).toHaveCount(0);
		await page.waitForFunction(() => !Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq502/i.test(s.signatureID)), null, { timeout: 15000 });
	});
});

test.describe("the traps", () => {
	test.beforeEach(async ({ page }) => { await login(page, SYSTEM); await removeSigsByPrefix(page, PREFIX); });
	test.afterEach(async ({ page }) => { await removeSigsByPrefix(page, PREFIX).catch(() => {}); });

	test("signature type filters are exclusive and All restores every row", async ({ page }) => {
		await page.evaluate(() => {
			tripwire.client.signatures = tripwire.client.signatures || {};
			const fixtures = [
				{id: "filter-combat", type: "combat", name: "Filter combat fixture"},
				{id: "filter-relic", type: "relic", name: "Filter relic fixture"}
			];
			fixtures.forEach((signature) => {
				tripwire.client.signatures[signature.id] = signature;
				$("#sigTable tbody").append("<tr data-id='" + signature.id + "'><td>" + signature.name + "</td></tr>");
			});
			tripwire.sigFilter.apply();
		});

		const combat = page.locator("#sigTable tbody tr[data-id='filter-combat']");
		const relic = page.locator("#sigTable tbody tr[data-id='filter-relic']");

		await page.locator("[data-group-chip='combat']").click();
		await expect(combat).toBeVisible();
		await expect(relic).toBeHidden();
		await expect(page.locator("[data-group-chip='combat']")).toHaveAttribute("aria-pressed", "true");

		await page.locator("[data-group-chip='relic']").click();
		await expect(combat).toBeHidden();
		await expect(relic).toBeVisible();

		await page.locator("[data-group-chip='all']").click();
		await expect(combat).toBeVisible();
		await expect(relic).toBeVisible();
		await expect(page.locator("[data-group-chip='all']")).toHaveAttribute("aria-pressed", "true");

		await page.evaluate(() => {
			delete tripwire.client.signatures["filter-combat"];
			delete tripwire.client.signatures["filter-relic"];
			$("#sigTable tbody tr[data-id^='filter-']").remove();
		});
	});

	test("the signature dialog remains inside the viewport when it expands", async ({ page }) => {
		const viewport = { width: 800, height: 600 };
		await page.setViewportSize(viewport);
		await page.click("#add-signature");
		await chooseType(page, "Wormhole");

		const dialog = page.locator(".ui-dialog:visible");
		await expect(dialog.locator("#wormhole")).toBeVisible();
		await page.waitForFunction(() => !$("#dialog-signature #site, #dialog-signature #wormhole").is(":animated"));
		const bounds = await dialog.boundingBox();

		expect(bounds.x).toBeGreaterThanOrEqual(0);
		expect(bounds.y).toBeGreaterThanOrEqual(0);
		expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
		expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
	});

	test("editing a wormhole with an unknown signature focuses its signature field", async ({ page }) => {
		await page.evaluate(() => {
			tripwire.client.signatures = tripwire.client.signatures || {};
			tripwire.client.wormholes = tripwire.client.wormholes || {};
			tripwire.client.signatures["focus-local"] = {
				id: "focus-local", signatureID: "???", systemID: viewingSystemID,
				type: "wormhole", name: "", lifeLength: 259200
			};
			tripwire.client.signatures["focus-other"] = {
				id: "focus-other", signatureID: "ZZQ999", systemID: viewingSystemID,
				type: "wormhole", name: "", lifeLength: 259200
			};
			tripwire.client.wormholes["focus-wh"] = {
				id: "focus-wh", initialID: "focus-local", secondaryID: "focus-other",
				type: "B274", parent: "initial", life: "stable", mass: "stable"
			};
			sigDialog.openSignatureDialog({data: {mode: "update", source: "test", signature: "focus-local"}});
		});

		const signature = page.locator("#dialog-signature input[name=signatureID_Alpha]");
		await expect(signature).toHaveValue("???");
		await expect(signature).toBeFocused();
	});

	test("typing the id then Tab does not skip the numeric half", async ({ page }) => {
		await page.click("#add-signature");
		await page.locator("#dialog-signature input[name=signatureID_Alpha]").click();
		await page.keyboard.type("ZZQ");     // auto-advances to the numeric field
		await page.keyboard.press("Tab");     // the habitual Tab must not skip it
		await page.keyboard.type("601");
		await expect(page.locator("#dialog-signature input[name=signatureID_Numeric]")).toHaveValue("601");
		await chooseType(page, "Gas");
		await page.locator(".ui-dialog:visible").getByRole("button", { name: "Add", exact: true }).click();
		await page.waitForFunction(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq601/i.test(s.signatureID)), null, { timeout: 15000 });
	});

	test("a whole id pasted into the first field splits itself", async ({ page }) => {
		await page.click("#add-signature");
		await page.fill("#dialog-signature input[name=signatureID_Alpha]", "ZZQ-602");
		await expect(page.locator("#dialog-signature input[name=signatureID_Alpha]")).toHaveValue("ZZQ");
		await expect(page.locator("#dialog-signature input[name=signatureID_Numeric]")).toHaveValue("602");
	});

	test("Ctrl-V with the search box focused still ingests a scan", async ({ page, context }) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await setClipboard(page, "ZZQ-701\tCosmic Signature\tCombat Site\tE2E from search\t100.0%\t1.00 AU");
		await page.click("#hdr-system");   // opens search and focuses its input
		await expect(page.locator("#searchSpan input")).toBeFocused();
		await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
		await page.waitForFunction(() => Object.values((tripwire.client && tripwire.client.signatures) || {}).some(s => /zzq701/i.test(s.signatureID)), null, { timeout: 15000 });
		await expect(page.locator("#searchSpan input")).toHaveValue("");
	});
});

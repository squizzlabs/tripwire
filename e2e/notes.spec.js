const { test } = require("@playwright/test");
const { login, clientSigIds, setClipboard, expect } = require("./helpers");

test("pasting scan-shaped text into a note stays in the note", async ({ page, context }) => {
	await login(page, "Perimeter");
	const note = "ZZN-991\tCosmic Signature\tData Site\tThis belongs in a note\t100.0%\t1.00 AU";
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await setClipboard(page, note);

	await page.click("#add-comment");
	const editor = page.locator("#notesWidget .rte-area");
	await expect(editor).toBeVisible();
	await expect(editor).toBeFocused();
	await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");

	await expect(editor).toContainText("ZZN-991");
	expect(await clientSigIds(page)).not.toContain("zzn991");

	// Leave no draft behind on the shared test account.
	await page.locator("#notesWidget .commentCancel:visible").click();
});

test("Ctrl+A in a note selects only the note contents", async ({ page }) => {
	await login(page, "Perimeter");
	await page.click("#add-comment");
	const editor = page.locator("#notesWidget .rte-area");
	await editor.fill("first line\nsecond line");

	await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");

	const selection = await page.evaluate(() => {
		const editor = document.querySelector("#notesWidget .rte-area");
		const selected = window.getSelection();
		return {
			text: selected.toString(),
			anchorInEditor: editor.contains(selected.anchorNode),
			focusInEditor: editor.contains(selected.focusNode),
			selectedSignatures: document.querySelectorAll("#sigTable tbody tr.selected").length
		};
	});
	expect(selection.text).toBe("first line\nsecond line");
	expect(selection.anchorInEditor).toBe(true);
	expect(selection.focusInEditor).toBe(true);
	expect(selection.selectedSignatures).toBe(0);

	await page.locator("#notesWidget .commentCancel:visible").click();
});

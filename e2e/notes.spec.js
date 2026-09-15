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

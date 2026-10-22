const { test, expect } = require('@playwright/test');
const path = require('path');
const { readSource } = require('../app/js-test/helpers/source');

// Exercise the real editor and bundled styles without needing saved notes or a server.
for (const width of [320, 490, 800]) {
	test(`note toolbar stays inside the panel at ${width}px`, async ({ page }) => {
		await page.setContent(`<div id="notesWidget" class="gridWidget" style="width:${width}px">
			<div class="controls">Notes</div>
			<div class="content"><div id="comment-container"><div class="comment">
				<div id="comment0" class="commentBody">A system note<br><br>with several lines</div>
			</div></div></div></div>`);
		await page.addStyleTag({ path: path.join(__dirname, '../public/css/app.css') });
		await page.addScriptTag({ path: path.join(__dirname, '../public/js/jquery-3.3.1.min.js') });
		await page.evaluate(() => { window.tripwire = {}; });
		await page.addScriptTag({ content: readSource('editor') });
		await page.evaluate(() => tripwire.editor.replace('comment0').focus());

		const panel = await page.locator('#notesWidget > .content').boundingBox();
		const bar = await page.locator('.rte-bar').boundingBox();
		const area = await page.locator('.rte-area').boundingBox();
		expect(bar.y).toBeGreaterThanOrEqual(panel.y);
		expect(bar.y + bar.height).toBeLessThanOrEqual(area.y);
		const controls = page.locator('.rte-bar button, .rte-bar select');
		await expect(controls).toHaveCount(17);
		for (const control of await controls.all()) {
			const box = await control.boundingBox();
			expect(box.x).toBeGreaterThanOrEqual(panel.x);
			expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width);
			// Hit testing catches controls obscured by headers or other notes.
			expect(await control.evaluate(el => {
				const box = el.getBoundingClientRect();
				return el.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
			})).toBe(true);
		}

		// Clear selected text styles and links without changing other text.
		await page.evaluate(() => {
			const area = document.querySelector('.rte-area');
			area.innerHTML = '<div><a href="https://example.com"><b><i><u><s><font color="#f06090" size="5">Formatted text</font></s></u></i></b></a></div><div><b>Keep bold</b></div>';
			area.focus();
			const range = document.createRange();
			range.selectNodeContents(area.firstChild);
			window.getSelection().removeAllRanges();
			window.getSelection().addRange(range);
		});
		await page.getByRole('button', { name: 'Clear formatting', exact: true }).click();
		const cleared = page.locator('.rte-area > div').first();
		await expect(cleared).toHaveText('Formatted text');
		await expect(cleared.locator('b, strong, i, em, u, s, strike, font, a, [style]')).toHaveCount(0);
		await expect(page.locator('.rte-area > div').last().locator('b')).toHaveText('Keep bold');
	});
}

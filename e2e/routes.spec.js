const { test } = require('@playwright/test');
const { login, expect } = require('./helpers');

test('plans a gate route from the chain toolbar and validates unknown destinations', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await login(page, 'Perimeter');
    await page.locator('#open-route-planner').click();
    await page.locator('[data-origin-mode="viewed"]').click();
    await expect(page.locator('#route-origin-description')).toContainText('Perimeter');
    await page.locator('#route-stop-input').fill('Jita');
    await page.locator('#route-wormholes').uncheck();
    await expect(page.locator('#route-result')).toContainText('1 jump');
    await expect(page.locator('#route-result')).toContainText('0 wormholes');
    await expect(page.locator('#route-result a').last()).toHaveText('Jita');
    await page.locator('#route-stops').fill('Not a solar system');
    await expect(page.locator('#route-result')).toContainText('Unknown solar system');
    await page.locator('#route-preference').selectOption('highsec');
    await expect(page.locator('#route-strictness')).toBeEnabled();
    expect(errors).toEqual([]);
});

test('route controls fit a phone viewport', async ({ page }) => {
    await page.setViewportSize({width: 390, height: 844});
    await login(page, 'Perimeter');
    await page.locator('#open-route-planner').click();
    await page.locator('[data-origin-mode="viewed"]').click();
    const box = await page.locator('#route-planner').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.locator('#route-stop-input').fill('Jita');
    await expect(page.locator('#route-result')).toContainText('1 jump');
});

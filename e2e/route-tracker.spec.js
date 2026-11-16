// Isolated browser integration: real planner/controller/waypoint client, synthetic
// live map and ESI transport. No live pilot's autopilot is changed by these tests.
const {test, expect} = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {readSource} = require('../app/js-test/helpers/source');
const root = path.resolve(__dirname, '..');
const A = 30000144, B = 30000142, W = 31000001, C = 30002187, D = 30002188;
async function fixture(page) {
    const php = fs.readFileSync(path.join(root, 'tripwire.php'), 'utf8');
    const planner = php.slice(php.indexOf('<!-- Route planner -->'), php.indexOf('<!-- /Route planner -->'));
    const header = php.slice(php.indexOf('<div id="topbar">'), php.indexOf('<span class="align-right hdr-right">'))
        .replace(/<\?= brand_logo_html\(\) \?>/g, '<span class="logo-text">Tripwire</span>')
        .replace(/<\?=.*?\?>/g, 'Perimeter') + '<span class="align-right hdr-right">Test Pilot</span></div>';
    await page.route('http://tripwire.test/', r => r.fulfill({contentType: 'text/html', body: '<meta charset="utf-8">' + header +
        '<div id="map-workspace"><div id="chainWidget" class="gridWidget" style="height:800px"><div id="chainParent" class="content">Chain map</div></div></div>' + planner}));
    await page.route('**/cached_third_party.php?key=eve-scout-signatures', r => r.fulfill({json: []}));
    await page.goto('http://tripwire.test/');
    await page.addStyleTag({path: path.join(root, 'public/css/app.css')});
    for (const file of ['jquery-3.3.1.min', 'jquery-ui-1.12.1.min', 'lodash', 'combine']) {
        await page.addScriptTag({path: path.join(root, 'public/js/' + file + '.js')});
    }
    for (const section of ['systemAnalysis', 'routePlanner', 'routeTracker']) await page.addScriptTag({content: readSource(section)});
    await page.evaluate(({A,B,W,C,D}) => {
        window.init = {userID: 1, csrfToken: 'test'};
        window.options = {tracking: {active: '7'}, masks: {active: 'mask'}, chain: {routeSecurity: 'shortest', routeIgnore: {enabled: false}}};
        window.viewingSystemID = A;
        const expiry = new Date(Date.now() + 3600000 * 8).toISOString();
        const sig = (systemID, signatureID) => ({systemID, signatureID, lifeLength: 36000, lifeLeft: expiry});
        window.tripwire = {...appData, map: {shortest: {[A-30000000]: {[B-30000000]: 0}, [C-30000000]: {[D-30000000]: 0}}},
            client: {signatures: {1: sig(B,'ONE-123'), 2: sig(W,'BACK-123'), 3: sig(W,'TWO-123'), 4: sig(C,'BACK-456')},
                wormholes: {1: {id: 1, initialID: 1, secondaryID: 2, life: 'stable', mass: 'stable'}, 2: {id: 2, initialID: 3, secondaryID: 4, life: 'stable', mass: 'stable'}}},
            esi: {characters: {7: {characterID: 7, characterName: 'Test Pilot', systemID: A, online: true, locationObservedAt: new Date().toISOString()}}}};
        window.guidance = {jumpCostModifiers: []};
        window.setInterval = fn => { window.routeTick = fn; return 1; };
    }, {A,B,W,C,D});
    const source = fs.readFileSync(path.join(root, 'public/js/app.js'), 'utf8');
    await page.addScriptTag({content: '(function(){' + source.slice(source.indexOf('    this.esi.setDestination ='), source.indexOf('    this.esi.showInfo =')) + '}).call(tripwire);'});
    await page.addScriptTag({content: readSource('routePlannerUI')});
}
async function plan(page) {
    await page.click('#open-route-planner');
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await page.click('#route-start');
}
async function move(page, systemID) {
    await page.evaluate(id => { tripwire.esi.characters[7].systemID = id; routeTick(); }, systemID);
}
test('stages real waypoint requests across two holes and tracks completion alongside the planner', async ({page}, testInfo) => {
    const calls = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await fixture(page);
    await page.route('**/esi.php', r => { calls.push(new URLSearchParams(r.request().postData())); return r.fulfill({json: {result: true}}); });
    await plan(page);
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0].get('targetID')).toBe(String(B));
    expect(calls[0].get('clear')).toBe('true');
    await expect(page.locator('#route-planner')).toBeVisible();
    await move(page, B);
    await expect(page.locator('#active-route .route-summary')).toContainText('Warp to ONE-123');
    await page.screenshot({path: testInfo.outputPath('active-route-desktop.png')});
    await move(page, W);
    await expect(page.locator('#active-route .route-summary')).toContainText('Warp to TWO-123');
    expect(calls.length).toBe(1);
    await move(page, C);
    await expect.poll(() => calls.length).toBe(2);
    expect(calls[1].get('targetID')).toBe(String(D));
    expect(calls[1].get('clear')).toBe('true');
    await move(page, D);
    await expect(page.locator('#active-route .route-summary')).toContainText('Complete');
    expect(errors).toEqual([]);
});
test('flags removed connections and pauses failed delivery until explicit retry', async ({page}) => {
    let calls = 0;
    await fixture(page);
    await page.route('**/esi.php', r => { calls++; return r.fulfill(calls === 1 ? {status: 502, json: {error: 'test'}} : {json: {result: true}}); });
    await plan(page);
    await expect(page.locator('#active-route .route-summary')).toContainText('Waypoint delivery failed');
    await page.evaluate(() => routeTick());
    expect(calls).toBe(1);
    await page.click('[data-route-action="retry"]');
    await expect.poll(() => calls).toBe(2);
    await expect(page.locator('#active-route .route-summary')).not.toContainText('Sending gate');
    await page.evaluate(() => { tripwire.client.wormholes = {}; tripwire.client.signatures = null; routeTick(); });
    await expect(page.locator('#active-route .route-summary')).toContainText('connection expired, disappeared');
});
test('waits offline and stops without sending additional waypoints; fits mobile', async ({page}, testInfo) => {
    await page.setViewportSize({width: 390, height: 844});
    let calls = 0;
    await fixture(page);
    await page.route('**/esi.php', r => { calls++; return r.fulfill({json: {result: true}}); });
    await plan(page);
    await expect.poll(() => calls).toBe(1);
    await page.evaluate(() => { tripwire.esi.characters[7].online = false; routeTick(); });
    await expect(page.locator('#active-route .route-summary')).toContainText('Waiting for an online pilot');
    const box = await page.locator('#active-route').boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await page.screenshot({path: testInfo.outputPath('active-route-phone.png')});
    await move(page, C);
    expect(calls).toBe(1);
    await page.click('[data-route-action="stop"]');
    await page.evaluate(() => { tripwire.esi.characters[7].online = true; routeTick(); });
    await expect(page.locator('#active-route')).not.toBeVisible();
    expect(calls).toBe(1);
});
test('restores paused after reload and catches up from the pilot location on resume', async ({page}) => {
    let calls = 0;
    await fixture(page);
    await page.route('**/esi.php', r => { calls++; return r.fulfill({json: {result: true}}); });
    await plan(page);
    await expect.poll(() => calls).toBe(1);
    await expect(page.locator('#active-route .route-summary')).not.toContainText('Sending gate');
    await fixture(page);
    await page.click('#open-route-planner');
    await page.evaluate(() => routeTick());
    await expect(page.locator('#active-route .route-summary')).toContainText('Route restored');
    expect(calls).toBe(1);
    await move(page, C);
    expect(calls).toBe(1);
    await page.click('[data-route-action="retry"]');
    await expect.poll(() => calls).toBe(2);
    await expect(page.locator('#active-route .route-summary')).toContainText('1 jump remaining');
});
test('keeps the assigned pilot when selection changes, and replans for that pilot', async ({page}) => {
    const pilots = [];
    await fixture(page);
    await page.route('**/esi.php', r => { pilots.push(new URLSearchParams(r.request().postData()).get('characterID')); return r.fulfill({json: {result: true}}); });
    await plan(page);
    await expect.poll(() => pilots.length).toBe(1);
    await expect(page.locator('#active-route .route-summary')).not.toContainText('Sending gate');
    await page.evaluate(() => { options.tracking.active = '8'; tripwire.esi.characters[8] = {...tripwire.esi.characters[7], characterID: 8}; });
    await move(page, C);
    await expect.poll(() => pilots.length).toBe(2);
    expect(pilots).toEqual(['7','7']);
    await expect(page.locator('#active-route .route-summary')).not.toContainText('Sending gate');
    await page.click('[data-route-action="replan"]');
    await expect(page.locator('#route-start')).toHaveText('Assign route to 1 pilot');
    await expect(page.locator('#route-result')).toContainText('1 jump');
    await page.click('#route-start');
    await expect.poll(() => pilots.length).toBe(3);
    expect(pilots[2]).toBe('7');
    expect(await page.evaluate(() => options.tracking.active)).toBe('8');
});
test('pause cancels the rest of an in-flight segment; retry replaces the partial queue', async ({page}) => {
    const calls = [];
    let release;
    await fixture(page);
    await page.evaluate(({B,C}) => { tripwire.map.shortest[B-30000000] = {[C-30000000]: 0}; }, {B,C});
    await page.route('**/esi.php', async r => {
        calls.push(new URLSearchParams(r.request().postData()));
        if (calls.length === 1) await new Promise(resolve => { release = resolve; });
        return r.fulfill({json: {result: true}});
    });
    await page.click('#open-route-planner');
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await page.click('#route-start');
    await expect.poll(() => calls.length).toBe(1);
    await page.click('[data-route-action="pause"]');
    release();
    await expect(page.locator('[data-route-action="retry"]')).toBeEnabled();
    expect(calls.length).toBe(1);
    await page.click('[data-route-action="retry"]');
    await expect.poll(() => calls.length).toBe(4);
    expect(calls.slice(1).map(c => c.get('clear'))).toEqual(['true','false','false']);
    expect(calls.slice(1).map(c => Number(c.get('targetID')))).toEqual([B,C,D]);
});
test('origin offers live current location, viewed system, and a preserved entered system', async ({page}) => {
    await fixture(page);
    await page.click('#open-route-planner');
    await expect(page.locator('[data-origin-mode="current"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#route-origin-field')).toBeHidden();
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await move(page, C);
    await expect(page.locator('#route-result')).toContainText('1 jump');
    await page.locator('[data-origin-mode="viewed"]').click();
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await page.evaluate(id => { viewingSystemID = id; routeTick(); }, C);
    await expect(page.locator('#route-result')).toContainText('1 jump');
    await page.locator('[data-origin-mode="system"]').click();
    await page.fill('#route-origin', 'Perimeter');
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await page.evaluate(() => $('#map-workspace-tab').trigger('click'));
    await page.click('#open-route-planner');
    await expect(page.locator('[data-origin-mode="system"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#route-origin')).toHaveValue('Perimeter');
    await page.locator('[data-origin-mode="current"]').click();
    await page.evaluate(() => { tripwire.esi.characters[7].online = false; });
    await expect(page.locator('#route-result')).toContainText('Current Location needs an online tracked pilot');
    await expect(page.locator('#route-start')).toBeDisabled();
});
test('context navigation carries destinations and added waypoints into the planner, including reloads', async ({page}, testInfo) => {
    await fixture(page);
    await page.route('**/esi.php', r => r.fulfill({json: {result: true}}));
    await page.evaluate(id => tripwire.routeNavigation.setDestination(id, 7, true), C);
    await page.evaluate(id => tripwire.routeNavigation.setDestination(id, 7, false), D);
    await page.click('#open-route-planner');
    const names = await page.evaluate(ids => ids.map(id => appData.systems[id].name), [C,D]);
    await expect(page.locator('#route-stops')).toHaveValue(names[0]);
    await expect(page.locator('#route-stop-input')).toHaveValue(names[1]);
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await page.screenshot({path: testInfo.outputPath('route-origin-destination.png')});
    await fixture(page);
    await page.click('#open-route-planner');
    await expect(page.locator('#route-stops')).toHaveValue(names[0]);
    await expect(page.locator('#route-stop-input')).toHaveValue(names[1]);
    await expect(page.locator('#route-result')).toContainText('4 jumps');
});
test('failed context destinations do not change the planner, and pilot destinations remain separate', async ({page}) => {
    await fixture(page);
    await page.route('**/esi.php', r => r.fulfill({json: {result: true}}));
    await page.evaluate(async ({B,C}) => {
        tripwire.esi.characters[8] = {...tripwire.esi.characters[7], characterID: 8};
        await tripwire.routeNavigation.setDestination(B, 7, true);
        await tripwire.routeNavigation.setDestination(C, 8, true);
    }, {B,C});
    await page.click('#open-route-planner');
    await expect(page.locator('#route-stop-input')).toHaveValue('Jita');
    await page.evaluate(() => { $('#map-workspace-tab').trigger('click'); options.tracking.active = '8'; });
    await page.click('#open-route-planner');
    await expect(page.locator('#route-stop-input')).toHaveValue(await page.evaluate(id => appData.systems[id].name, C));
    await page.evaluate(() => { $('#map-workspace-tab').trigger('click'); options.tracking.active = '7'; });
    await page.route('**/esi.php', r => r.fulfill({status: 502, json: {error: 'test'}}));
    await page.evaluate(id => tripwire.routeNavigation.setDestination(id, 7, true), D);
    await page.click('#open-route-planner');
    await expect(page.locator('#route-stop-input')).toHaveValue('Jita');
});
test('manual destination waits for in-flight delivery, then pauses the tracker and seeds the planner', async ({page}) => {
    const calls = [];
    let release;
    await fixture(page);
    await page.route('**/esi.php', async r => {
        calls.push(Number(new URLSearchParams(r.request().postData()).get('targetID')));
        if (calls.length === 1) await new Promise(resolve => { release = resolve; });
        return r.fulfill({json: {result: true}});
    });
    await plan(page);
    await expect.poll(() => calls.length).toBe(1);
    await page.evaluate(id => { window.manualNavigation = tripwire.routeNavigation.setDestination(id, 7, true); }, C);
    await expect(page.locator('#active-route .route-summary')).toContainText('Navigation changed from the map');
    expect(calls).toEqual([B]);
    release();
    await page.evaluate(() => manualNavigation);
    expect(calls).toEqual([B,C]);
    await move(page, C);
    expect(calls).toEqual([B,C]);
    await page.click('#open-route-planner');
    await expect(page.locator('#route-stop-input')).toHaveValue(await page.evaluate(id => appData.systems[id].name, C));
});
test('automatically uses all public and mapped sources, and updates after toggles without submitting', async ({page}) => {
    await fixture(page);
    const T = 31000005;
    await page.route('**/cached_third_party.php?key=eve-scout-signatures', r => r.fulfill({json: [A,D].map((id,i) => ({
        id: i + 90, completed: true, signature_type: 'wormhole', out_system_id: T, in_system_id: id,
        out_signature: 'PUB-12' + i, in_signature: 'EXT-12' + i, wh_type: 'B274',
        expires_at: new Date(Date.now() + 8 * 3600000).toISOString()
    }))}));
    await page.click('#open-route-planner');
    await expect(page.locator('#route-thera')).toBeChecked();
    await expect(page.locator('#route-turnur')).toBeChecked();
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-result')).toContainText('2 jumps');
    await expect(page.locator('#route-result')).toContainText('Thera');
    await expect(page.locator('#route-coverage')).toContainText('2 mapped wormholes');
    await expect(page.locator('#route-coverage')).toContainText('2 Thera');
    await page.uncheck('#route-thera');
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await expect(page.locator('#route-coverage')).toContainText('Thera off');
    await page.uncheck('#route-wormholes');
    await expect(page.locator('#route-result')).toContainText('No known route');
    await page.check('#route-thera');
    await expect(page.locator('#route-result')).toContainText('2 jumps');
    await page.fill('#route-stop-input', '');
    await expect(page.locator('#route-result')).toContainText('Enter a destination');
    await expect(page.locator('#route-start')).toBeDisabled();
});
test('public feed failure is visible while available mapped routes can still be started', async ({page}) => {
    await fixture(page);
    await page.route('**/cached_third_party.php?key=eve-scout-signatures', r => r.fulfill({status: 502, json: {error: 'test'}}));
    let calls = 0;
    await page.route('**/esi.php', r => { calls++; return r.fulfill({json: {result: true}}); });
    await plan(page);
    await expect.poll(() => calls).toBe(1);
    await page.click('#open-route-planner');
    await expect(page.locator('#route-coverage')).toContainText('Public connections unavailable');
    await expect(page.locator('#route-result')).toContainText('4 jumps');
});
test('Route tab keeps settings left and assigned route right, with stable layout as results change', async ({page}, testInfo) => {
    await fixture(page);
    await page.click('#open-route-planner');
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await expect(page.locator('.route-settings #route-pilots')).toHaveCount(1);
    await expect(page.locator('.route-settings #route-start')).toHaveCount(1);
    await expect(page.locator('.route-settings #route-result')).toHaveCount(1);
    await expect(page.locator('.route-output #active-route')).toHaveCount(1);
    const controls = await page.locator('#route-form').boundingBox();
    const output = await page.locator('.route-output').boundingBox();
    expect(output.x).toBeGreaterThan(controls.x + controls.width);
    const pane = await page.locator('#route-planner').boundingBox();
    expect(pane.height).toBeLessThan(820);
    expect(await page.locator('.ui-widget-overlay').count()).toBe(0);
    await expect(page.locator('#map-workspace')).toBeHidden();
    await page.fill('#route-stop-input', 'Not a system');
    await expect(page.locator('#route-result')).toContainText('Unknown solar system');
    expect(await page.locator('#route-form').boundingBox()).toEqual(controls);
    expect(await page.locator('.route-output').boundingBox()).toEqual(output);
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-result')).toContainText('4 jumps');
    await page.screenshot({path: testInfo.outputPath('route-tab.png')});
    await page.click('#map-workspace-tab');
    await expect(page.locator('#route-planner')).toBeHidden();
    await page.click('#open-route-planner');
    await expect(page.locator('#route-stop-input')).toHaveValue(await page.evaluate(id => appData.systems[id].name, D));
});
test('header order and Map/Route tabs preserve assignment while map is selected', async ({page}, testInfo) => {
    const calls = [];
    await fixture(page);
    const logo = await page.locator('#logo').boundingBox();
    const location = await page.locator('#hdr-system').boundingBox();
    expect(logo.x + logo.width).toBeLessThan(location.x);
    const tabs = await page.locator('#workspace-tabs').boundingBox();
    const header = await page.locator('#topbar').boundingBox();
    expect(tabs.x).toBeGreaterThanOrEqual(logo.x + logo.width);
    expect(tabs.y).toBeGreaterThanOrEqual(header.y);
    expect(tabs.y + tabs.height).toBeLessThanOrEqual(header.y + header.height);
    await expect(page.locator('#topbar #workspace-tabs')).toHaveCount(1);
    await expect(page.locator('#map-workspace-tab')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#route-planner')).toBeHidden();
    await page.route('**/esi.php', r => { calls.push(Number(new URLSearchParams(r.request().postData()).get('targetID'))); return r.fulfill({json: {result: true}}); });
    await plan(page);
    await expect.poll(() => calls.length).toBe(1);
    await expect(page.locator('#active-route .route-summary')).not.toContainText('Sending gate');
    const left = await page.locator('.route-settings').boundingBox();
    const right = await page.locator('#active-route').boundingBox();
    expect(right.x).toBeGreaterThan(left.x + left.width);
    await page.locator('#open-route-planner').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#map-workspace')).toBeVisible();
    await expect(page.locator('#route-planner')).toBeHidden();
    await move(page, C);
    await expect.poll(() => calls.length).toBe(2);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#open-route-planner')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#active-route .route-summary')).toContainText('1 jump remaining');
    await page.screenshot({path: testInfo.outputPath('assigned-route-tab.png')});
    await page.setViewportSize({width:390,height:844});
    await expect(page.locator('#hdr-system')).toBeVisible();
    await expect(page.locator('#logo')).toBeVisible();
    const phoneLeft = await page.locator('.route-settings').boundingBox();
    const phoneRight = await page.locator('.route-output').boundingBox();
    expect(phoneRight.y).toBeGreaterThanOrEqual(phoneLeft.y + phoneLeft.height);
    expect(phoneRight.x + phoneRight.width).toBeLessThanOrEqual(390);
});
async function addPilots(page) {
    await page.evaluate(({C}) => {
        tripwire.esi.characters[7].characterName = 'Zulu Pilot';
        tripwire.esi.characters[8] = {...tripwire.esi.characters[7], characterID: 8, characterName: 'Alpha Pilot', systemID: C};
        tripwire.esi.characters[9] = {...tripwire.esi.characters[7], characterID: 9, characterName: 'Beta Pilot', online: false};
    }, {C});
}
test('alphabetical portraits assign complete pilot-specific routes to all eligible selected pilots', async ({page}, testInfo) => {
    const calls = [];
    await fixture(page); await addPilots(page);
    await page.route('**/esi.php', r => { const p = new URLSearchParams(r.request().postData()); calls.push({pilot: p.get('characterID'), target: Number(p.get('targetID'))}); return r.fulfill({json: {result: true}}); });
    await page.click('#open-route-planner');
    expect(await page.locator('#route-pilots [data-pilot-id]').evaluateAll(nodes => nodes.map(n => n.dataset.pilotId))).toEqual(['8','9','7']);
    await expect(page.locator('#route-pilots img')).toHaveCount(3);
    await expect(page.locator('[data-pilot-id="9"]')).toBeDisabled();
    await page.click('#route-select-all');
    await expect(page.locator('#route-pilots [aria-pressed="true"]')).toHaveCount(2);
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-result')).toContainText('Alpha Pilot');
    await expect(page.locator('#route-result')).toContainText('Zulu Pilot');
    await expect(page.locator('#route-start')).toHaveText('Assign route to 2 pilots');
    await page.click('#route-start');
    await expect.poll(() => calls.length).toBe(2);
    expect(calls).toContainEqual({pilot:'7', target:B});
    expect(calls).toContainEqual({pilot:'8', target:D});
    await expect(page.locator('[data-assigned-pilot]')).toHaveCount(2);
    await page.evaluate(id => { tripwire.esi.characters[8].systemID = id; routeTick(); }, D);
    await expect(page.locator('[data-assigned-pilot="8"]')).toContainText('Complete');
    await move(page, C);
    await expect.poll(() => calls.length).toBe(3);
    expect(calls[2]).toEqual({pilot:'7',target:D});
    await page.screenshot({path: testInfo.outputPath('multi-pilot-routes.png')});
    const assignment = await page.locator('.route-planner-actions').boundingBox();
    const output = await page.locator('.route-output').boundingBox();
    expect(assignment.x + assignment.width).toBeLessThan(output.x);
    await page.click('[data-assigned-pilot="8"] [data-route-action="stop"]');
    await expect(page.locator('[data-assigned-pilot]')).toHaveCount(1);
    await expect(page.locator('[data-assigned-pilot="7"]')).toBeVisible();
});
test('individual selection and independent delivery failures, retries and restored assignments', async ({page}) => {
    const calls = [];
    let fail = true;
    await fixture(page); await addPilots(page);
    await page.route('**/esi.php', r => { const id = new URLSearchParams(r.request().postData()).get('characterID'); calls.push(id); return r.fulfill(id === '7' && fail ? {status:502,json:{error:'test'}} : {json:{result:true}}); });
    await page.click('#open-route-planner');
    await page.click('#route-select-none');
    await page.click('[data-pilot-id="8"]');
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-start')).toHaveText('Assign route to 1 pilot');
    await page.click('#route-start');
    await expect.poll(() => calls.length).toBe(1);
    expect(calls).toEqual(['8']);
    await page.click('[data-pilot-id="8"]'); await page.click('[data-pilot-id="7"]');
    await page.click('#route-start');
    await expect(page.locator('[data-assigned-pilot="7"]')).toContainText('Waypoint delivery failed');
    await expect(page.locator('[data-assigned-pilot="8"]')).not.toContainText('Waypoint delivery failed');
    fail = false;
    await page.click('[data-assigned-pilot="7"] [data-route-action="retry"]');
    await expect.poll(() => calls.length).toBe(3);
    expect(calls).toEqual(['8','7','7']);
    await expect(page.locator('[data-assigned-pilot="7"]')).not.toContainText('Sending gate');
    await fixture(page); await addPilots(page);
    await page.click('#open-route-planner'); await page.evaluate(() => routeTick());
    await expect(page.locator('[data-assigned-pilot]')).toHaveCount(2);
    await expect(page.locator('[data-assigned-pilot="7"]')).toContainText('Route restored');
    await expect(page.locator('[data-assigned-pilot="8"]')).toContainText('Route restored');
    expect(calls.length).toBe(3);
});
test('stopping one pilot cannot let a replacement race an outstanding waypoint request', async ({page}) => {
    let calls = 0, release;
    await fixture(page);
    await page.route('**/esi.php', async r => {
        calls++;
        if (calls === 1) await new Promise(resolve => { release = resolve; });
        return r.fulfill({json:{result:true}});
    });
    await plan(page);
    await expect.poll(() => calls).toBe(1);
    await page.click('[data-route-action="stop"]');
    await page.click('#route-start');
    await expect(page.locator('#route-start-status')).toContainText('Wait for the selected pilots');
    expect(calls).toBe(1);
    release();
    await expect.poll(() => page.evaluate(() => window.jQuery.active)).toBe(0);
    await page.click('#route-start');
    await expect.poll(() => calls).toBe(2);
});

test('Splash route markers retain security colors, stops and wormhole breaks with expandable details', async ({page}, testInfo) => {
    await fixture(page);
    await page.route('**/esi.php', r => r.fulfill({json: {result: true}}));
    await plan(page);
    const compact = page.locator('#active-route .route-compact');
    await expect(compact.locator('.route-jump-marker')).toHaveCount(5);
    await expect(compact.locator('.is-stop')).toHaveCount(2);
    await expect(compact.locator('.route-hole-instruction')).toHaveCount(2);
    await expect(compact).toContainText('Warp to ONE-123');
    await expect(compact.locator('.route-jump-marker').nth(2)).toHaveCSS('--jump-color', '#8d3264');
    await expect(compact.locator('.route-jump-marker').nth(1)).toHaveCSS('--jump-color', '#3a9aeb');
    await expect(page.locator('#active-route .route-steps')).not.toBeVisible();
    await page.locator('#active-route summary').click();
    await expect(page.locator('#active-route .route-system-row')).toHaveCount(5);
    await expect(page.locator('#active-route .route-steps')).toContainText('The Forge');
    await expect(page.locator('#route-start')).toHaveCSS('background-color', 'rgb(35, 105, 189)');
    await page.screenshot({path: testInfo.outputPath('splash-route-display.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: testInfo.outputPath('splash-route-mobile.png')});
    expect(await page.locator('.route-output').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test('identical pilot routes share one preview while distinct paths and assignments stay independent', async ({page}) => {
    await fixture(page); await addPilots(page);
    await page.evaluate(id => { tripwire.esi.characters[8].systemID = id; }, A);
    const calls = [];
    await page.route('**/esi.php', r => { calls.push(new URLSearchParams(r.request().postData()).get('characterID')); return r.fulfill({json: {result: true}}); });
    await page.click('#open-route-planner');
    await page.click('#route-select-all');
    await page.fill('#route-stop-input', await page.evaluate(id => appData.systems[id].name, D));
    await expect(page.locator('#route-result .route-preview-plan')).toHaveCount(1);
    await expect(page.locator('#route-result h4')).toHaveText('Alpha Pilot, Zulu Pilot');
    await expect(page.locator('#route-result .route-compact')).toHaveCount(1);
    await page.evaluate(id => { tripwire.esi.characters[8].systemID = id; routeTick(); }, C);
    await expect(page.locator('#route-result .route-preview-plan')).toHaveCount(2);
    await page.evaluate(id => { tripwire.esi.characters[8].systemID = id; routeTick(); }, A);
    await expect(page.locator('#route-result .route-preview-plan')).toHaveCount(1);
    await page.click('#route-start');
    await expect.poll(() => calls.length).toBe(2);
    expect(calls.sort()).toEqual(['7', '8']);
    await expect(page.locator('#active-route [data-assigned-pilot]')).toHaveCount(2);
});

test('refresh restores the selected workspace tab without resuming route delivery', async ({page}) => {
    await fixture(page);
    await expect(page.locator('#map-workspace')).toBeVisible();
    await page.route('**/esi.php', r => r.fulfill({json: {result: true}}));
    await plan(page);
    await fixture(page);
    await expect(page.locator('#route-planner')).toBeVisible();
    await expect(page.locator('#map-workspace')).toBeHidden();
    await expect(page.locator('#open-route-planner')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#open-route-planner')).toHaveAttribute('tabindex', '0');
    await page.evaluate(() => routeTick());
    await expect(page.locator('#active-route .route-summary')).toContainText('Route restored. Resume');
    await page.click('#map-workspace-tab');
    await fixture(page);
    await expect(page.locator('#map-workspace')).toBeVisible();
    await expect(page.locator('#route-planner')).toBeHidden();
    await expect(page.locator('#map-workspace-tab')).toHaveAttribute('aria-selected', 'true');
});

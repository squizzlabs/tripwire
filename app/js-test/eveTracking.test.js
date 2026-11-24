const assert = require('assert');
const { include } = require('./helpers/helpers');

global.tripwire = {};
include('tripwire/eve');

describe('Backend ESI tracking handoff', function() {
    const systems = {
        30000142: {name: 'Jita'}
    };

    it('does not produce a navigation target before location is known', function() {
        assert.equal(trackedSystemID({online: true}, systems), null);
        assert.equal(trackedSystemID({online: true, systemID: null}, systems), null);
    });

    it('does not produce a navigation target for an unknown system', function() {
        assert.equal(trackedSystemID({online: true, systemID: 123}, systems), null);
    });

    it('normalizes a known system ID for follow mode', function() {
        assert.equal(trackedSystemID({online: true, systemID: '30000142'}, systems), 30000142);
    });

    it('follows transitions, newly acquired locations, and explicit character selection', function() {
        assert.equal(shouldFollowTrackedSystem(30000142, 30000142, true, false), false);
        assert.equal(shouldFollowTrackedSystem(30000142, 30000144, true, false), true);
        assert.equal(shouldFollowTrackedSystem(null, 30000142, true, false), true);
        assert.equal(shouldFollowTrackedSystem(30000142, 30000144, false, false), false);
        assert.equal(shouldFollowTrackedSystem(30000142, 30000144, true, true), true);
    });

    it('uses the first known tracked location as the initial view', function() {
        assert.equal(shouldUseTrackedSystemAsInitialView(true, 30000142), true);
        assert.equal(shouldUseTrackedSystemAsInitialView(true, null), false);
        assert.equal(shouldUseTrackedSystemAsInitialView(false, 30000142), false);
    });
});

// Exercise the real EVE handler across successive backend refreshes.
describe('Map follow recovery', function() {
    const vm = require('vm');
    const { readSource } = require('./helpers/source');
    let context, navigations, dialogOpen, saves, classes;
    const pilot = systemID => ({characterID: 1, systemID});

    beforeEach(function() {
        navigations = [];
        dialogOpen = false;
        saves = 0;
        classes = new Set(['active']);
        const element = {
            hasClass: () => false,
            show() { return this; }, hide() { return this; },
            addClass(name) { classes.add(name); return this; },
            removeClass(name) { classes.delete(name); return this; },
            html() { return this; }, text() { return this; }
        };
        context = {
            tripwire: {client: {EVE: pilot(1)}, systems: {1: {}, 2: {}, 3: {}}},
            options: {buttons: {follow: true}, save: () => saves++}, defaultToTrackedSystem: false,
            viewingSystemID: 1, window: {},
            setTimeout: () => 1, clearTimeout: () => {},
            $: selector => selector === '.ui-dialog:visible' ? {length: dialogOpen ? 1 : 0} : element,
            systemRendering: {renderSystem: () => ''}, systemAnalysis: {analyse: () => ({})}
        };
        context.tripwire.systemChange = (id, mode) => {
            context.stopFollowForNavigation(id, mode);
            navigations.push(id);
            context.viewingSystemID = id;
        };
        vm.runInNewContext(readSource('tripwire/eve'), context);
    });

    it('catches up to the latest jump after a dialog closes', function() {
        dialogOpen = true;
        context.tripwire.EVE(pilot(2));
        context.tripwire.EVE(pilot(3));
        assert.deepEqual(navigations, []);
        dialogOpen = false;
        context.tripwire.EVE(pilot(3));
        context.tripwire.EVE(pilot(3));
        assert.deepEqual(navigations, [3]);
    });

    it('cancels a deferred jump when follow is disabled', function() {
        dialogOpen = true;
        context.tripwire.EVE(pilot(2));
        context.options.buttons.follow = false;
        context.tripwire.EVE(pilot(2));
        dialogOpen = false;
        context.tripwire.EVE(pilot(2));
        assert.deepEqual(navigations, []);
    });

    it('catches up when follow is enabled or another pilot is selected', function() {
        context.tripwire.EVE(pilot(2), true);
        assert.deepEqual(navigations, [2]);
    });

    it('follows the first known location after tracking recovers', function() {
        context.tripwire.EVE(pilot(null));
        context.tripwire.EVE(pilot(2));
        assert.deepEqual(navigations, [2]);
    });

    it('lets users browse another system between pilot jumps', function() {
        context.viewingSystemID = 3;
        context.tripwire.EVE(pilot(1));
        assert.deepEqual(navigations, []);
    });

    it('turns follow off and flashes the button when browsing another system', function() {
        context.tripwire.systemChange(3);
        context.tripwire.EVE(pilot(1));
        context.tripwire.EVE(pilot(2));
        assert.deepEqual(navigations, [3]);
        assert.equal(context.options.buttons.follow, false);
        assert.equal(classes.has('active'), false);
        assert.equal(classes.has('follow-paused'), true);
        assert.equal(saves, 1);
    });

    it('cancels deferred follow and initial location navigation when browsing', function() {
        dialogOpen = true;
        context.tripwire.EVE(pilot(2));
        context.defaultToTrackedSystem = true;
        context.tripwire.systemChange(3);
        assert.equal(context.tripwire.pendingFollowSystemID, null);
        assert.equal(context.defaultToTrackedSystem, false);
        dialogOpen = false;
        context.tripwire.EVE(pilot(2));
        assert.deepEqual(navigations, [3]);
    });

    it('keeps follow enabled for automatic jumps, initialization, and the same system', function() {
        context.stopFollowForNavigation(3, 'init');
        context.stopFollowForNavigation('1');
        context.tripwire.EVE(pilot(2));
        context.tripwire.EVE(pilot(3));
        assert.deepEqual(navigations, [2, 3]);
        assert.equal(context.options.buttons.follow, true);
        assert.equal(saves, 0);
    });

    it('clears deferred navigation when tracking stops', function() {
        dialogOpen = true;
        context.tripwire.EVE(pilot(2));
        context.tripwire.EVE(false, true);
        assert.equal(context.tripwire.pendingFollowSystemID, null);
    });
});

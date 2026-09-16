const assert = require('assert');
const { include } = require('./helpers/helpers');

global.tripwire = {};
include('app/js/tripwire/eve');

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

    it('follows only an actual tracked-character system transition', function() {
        assert.equal(shouldFollowTrackedSystem(30000142, 30000142, true, false), false);
        assert.equal(shouldFollowTrackedSystem(30000142, 30000144, true, false), true);
        assert.equal(shouldFollowTrackedSystem(null, 30000142, true, false), false);
        assert.equal(shouldFollowTrackedSystem(30000142, 30000144, false, false), false);
        assert.equal(shouldFollowTrackedSystem(30000142, 30000144, true, true), false);
    });
});

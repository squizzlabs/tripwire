const assert = require('assert');
const vm = require('vm');
const {readSource} = require('./helpers/source');
const settings = require('../../public/js/bookmark-settings');
const destinations = require('../../public/js/bookmark-destinations');

describe('Per-account bookmark preferences', function() {
    it('defaults to standard codes enabled and keeps training aliases opt-in', function() {
        const standard = settings.compile();
        assert.equal(standard.config.enabled, true);
        assert.equal(Object.keys(standard.factions).length, 0);
        assert.equal(standard.ignoreMarkers.length, 0);
        const training = settings.compile({...settings.preset('training'), enabled: true});
        assert.equal(training.factions.SQUID, 'CALDARI');
        assert.deepEqual(training.campMarkers, ['---', '-*-']);
        training.prefixes.HS = 'NS';
        assert.equal(settings.compile().prefixes.HS, 'HS');
    });
    it('retains deliberately empty lists and disabled switches through serialization', function() {
        const value = {...settings.preset('training'), prefixes: '', factions: '', markers: '', campMarkers: '', ignoreMarkers: '', suffix: false};
        const restored = settings.compile(JSON.parse(JSON.stringify(value)));
        assert.equal(Object.keys(restored.prefixes).length, 0);
        assert.equal(Object.keys(restored.factions).length, 0);
        assert.equal(Object.keys(restored.markers).length, 0);
        assert.equal(restored.config.suffix, false);
    });
    it('validates rules and rejects duplicate case-insensitive names', function() {
        for (const config of [{prefixes: 'H=HS\nh=LS'}, {prefixes: 'H=C99'},
            {factions: 'A=Pirates'}, {markers: 'EOL=LIFE9'}, {sites: 'Place=unknown'},
            {prefixes: 'no equals sign'}, {fallback: 'wormhole'}]) {
            assert.throws(() => settings.compile(config));
        }
        assert.equal(settings.compile({prefixes: 'HIGH=HS'}).prefixes.HIGH, 'HS');
    });
    it('stores faction meaning independently of the importing user alias', function() {
        const a = settings.compile({factions: 'BLUE=CALDARI'});
        const b = settings.compile({factions: 'BLUE=GALLENTE'});
        const caldari = {name: 'Jita', factionID: 500001};
        const gallente = {name: 'Botane', factionID: 500004};
        const ah = settings.canonicalHint('BLUE', a), bh = settings.canonicalHint('BLUE', b);
        assert.equal(destinations.hintsMatch(ah, caldari), true);
        assert.equal(destinations.hintsMatch(ah, gallente), false);
        assert.equal(destinations.hintsMatch(bh, gallente), true);
        assert.equal(destinations.hintsMatch(bh, caldari), false);
        assert.equal(destinations.hintsMatch(settings.canonicalHint('RUST', settings.compile()), caldari), true);
        assert.equal(destinations.equivalentHints('SQUID', ah), true, 'legacy saved hints still match');
    });
    it('preserves the suffix switch in saved hints and escapes reserved text', function() {
        const rules = settings.compile({suffix: false});
        assert.equal(destinations.hintsMatch(settings.canonicalHint('432', rules), {name: 'J113433'}), true);
        assert.equal(destinations.hintsMatch(settings.canonicalHint('432', settings.compile()), {name: 'J113433'}), false);
        assert.equal(destinations.hintsMatch(settings.canonicalHint('@f500004', rules), {factionID: 500001}), true);
    });
    function load(server, local) {
        const element = new Proxy(function() {}, {get: () => element, apply: () => element});
        const $ = () => element;
        $.map = values => values; $.inArray = () => -1; $.extend = Object.assign;
        const c = vm.createContext({$: $, bookmarkSettings: settings, setTimeout: () => 1,
            init: {userID: 1, corporationID: 2}, localStorage: {getItem: () => local ? JSON.stringify({grid: {}, ...local}) : null},
            window: {}, tripwire: null, guidance: null, chain: {redraw() {}}, viewingSystemID: 1});
        if (server) vm.runInContext('init.options = ' + JSON.stringify(server), c);
        vm.runInContext(readSource('options'), c);
        return c.options;
    }
    it('loads server preferences per account and serializes them for saving', function() {
        const bookmarks = {...settings.preset('training'), enabled: true, factions: 'MYALIAS=AMARR'};
        const options = load({bookmarks}, {userID: 2, bookmarks: {enabled: false}});
        assert.equal(options.bookmarks.enabled, true);
        assert.equal(options.get().bookmarks.factions, 'MYALIAS=AMARR');
        assert.equal(options.get().userID, 1);
    });
    it('enables imports for accounts without bookmark settings, including existing accounts', function() {
        for (const server of [null, {}, {bookmarks: {}}, {bookmarks: {factions: 'BLUE=CALDARI'}}]) {
            assert.equal(load(server, null).bookmarks.enabled, true);
        }
    });
    it('restores a saved opt-out from the account or its local cache', function() {
        assert.equal(load({bookmarks: {enabled: false}}, null).bookmarks.enabled, false);
        assert.equal(load(null, {userID: 1, bookmarks: {enabled: false}}).bookmarks.enabled, false);
    });
    it('does not inherit another account’s locally cached conventions', function() {
        const local = {userID: 2, bookmarks: {...settings.preset('training'), enabled: true}};
        assert.equal(load(null, local).bookmarks.factions, '');
        assert.equal(load({}, local).bookmarks.factions, '');
        assert.equal(load(null, {...local, userID: 1}).bookmarks.enabled, true);
    });
});

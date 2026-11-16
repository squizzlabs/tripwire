const assert = require('assert');
const vm = require('vm');
const { readSource } = require('./helpers/source');
const context = vm.createContext({});
vm.runInContext(readSource('routePlanner'), context);
const planner = context.routePlanner;
const A = 30000001, B = 30000002, C = 30000003, D = 30000004, W = 31000001;
const systems = {[A]: {name: 'A', security: 1}, [B]: {name: 'B', security: 0.2},
    [C]: {name: 'C', security: 1}, [D]: {name: 'D', security: 1}, [W]: {name: 'W', security: -1}};
const gates = {1: {2: 0, 3: 0}, 2: {1: 0, 4: 0}, 3: {1: 0, 4: 0}, 4: {2: 0, 3: 0}};
const signatures = {1: {systemID: W, signatureID: 'ABC-123', lifeLength: 3600, lifeLeft: '2030-01-01 00:00:00'},
    2: {systemID: A, signatureID: 'XYZ-789', lifeLength: 3600, lifeLeft: '2030-01-01 00:00:00'}};
const holes = {1: {id: 1, initialID: 1, secondaryID: 2, life: 'stable', mass: 'stable', type: 'B274'}};
function graph(options = {}, sigs = signatures, whs = holes) { return planner.buildGraph(systems, gates, whs, sigs, options, Date.UTC(2026, 0, 1)); }
function route(stops, options = {}, g = graph(options)) { return planner.calculate(g, systems, stops, options); }
function ids(result) { return Array.from(result.systems); }

describe('Combined gate and mapped wormhole routing', () => {
    it('joins a wormhole to gate legs, preserving each departure signature', () => {
        const forward = route([W, D]);
        assert.deepEqual(ids(forward), [W, A, B, D]);
        assert.equal(forward.edges[0].signature, 'ABC-123');
        const reverse = route([D, W]);
        assert.equal(reverse.edges[2].signature, 'XYZ-789');
    });
    it('can use multiple separate wormhole chains in one route', () => {
        const sigs = {...signatures, 3: {...signatures[1], systemID: D}, 4: {...signatures[2], systemID: C}};
        const whs = {...holes, 2: {...holes[1], id: 2, initialID: 3, secondaryID: 4}};
        const g = planner.buildGraph(systems, {1: {4: 0}, 4: {1: 0}}, whs, sigs, {}, Date.UTC(2026, 0, 1));
        assert.deepEqual(ids(route([W, C], {}, g)), [W, A, D, C]);
    });
    it('weights security and respects ordered stops', () => {
        assert.deepEqual(ids(route([A, D], {preference: 'highsec'})), [A, C, D]);
        assert.deepEqual(ids(route([A, D], {preference: 'avoid-high'})), [A, B, D]);
        assert.deepEqual(ids(route([W, D, C])), [W, A, B, D, C]);
    });
    it('settles the optimal route even when the destination was discovered sooner', () => {
        const g = new Map([[A, [{from: A, to: B}, {from: A, to: C}]], [B, [{from: B, to: D}]], [C, [{from: C, to: D}]], [D, []]]);
        assert.deepEqual(ids(route([A, D], {preference: 'highsec'}, g)), [A, C, D]);
    });
    it('strictly avoids transit systems but allows explicit endpoints', () => {
        assert.deepEqual(ids(route([A, D], {avoid: [B]})), [A, C, D]);
        assert.throws(() => route([A, D], {avoid: [B, C]}), /No known route/);
        assert.deepEqual(ids(route([A, B], {avoid: [A, B]})), [A, B]);
    });
    it('excludes expired and unresolved wormholes', () => {
        assert.throws(() => route([W, A], {}, graph({}, {...signatures, 1: {...signatures[1], lifeLeft: '2020-01-01 00:00:00'}})), /No known route/);
        assert.throws(() => route([W, A], {}, graph({}, {...signatures, 2: {...signatures[2], systemID: 4}})), /No known route/);
    });
    it('supports gates only and optional life/mass exclusions', () => {
        assert.throws(() => route([W, A], {wormholes: false}), /No known route/);
        for (const [setting, field] of [['avoidEol', 'life'], ['avoidCritical', 'mass']]) {
            const options = {[setting]: true};
            assert.throws(() => route([W, A], options, graph(options, signatures, {1: {...holes[1], [field]: 'critical'}})), /No known route/);
        }
    });
    it('honors closed conditional gates', () => {
        assert.deepEqual(ids(route([A, D], {gateAllowed: (from, to) => !(from === 1 && to === 2)})), [A, C, D]);
    });
    it('rebuilds after a wormhole is removed and handles an isolated origin equal to destination', () => {
        assert.equal(route([W, A]).edges.length, 1);
        assert.throws(() => route([W, A], {}, graph({}, {}, {})), /No known route/);
        assert.deepEqual(ids(route([W, W], {}, graph({}, {}, {}))), [W]);
    });
});

describe('Optional EVE-Scout shortcuts', () => {
    const thera = 31000005, turnur = 30002086;
    const universe = {...systems, [thera]: {name: 'Thera', security: -1}, [turnur]: {name: 'Turnur', security: 0.4}};
    const now = Date.UTC(2026, 0, 1);
    const link = {id: 123, completed: true, signature_type: 'wormhole', out_system_id: thera,
        in_system_id: A, out_signature: 'HUB-123', in_signature: 'EXT-456',
        expires_at: new Date(now + 8 * 3600000).toISOString(), wh_type: 'B274', max_ship_size: 'large'};
    function plan(from, to, settings = {}, links = [link]) {
        const opts = {...settings, scoutLinks: links};
        const g = planner.buildGraph(universe, gates, {}, {}, opts, now);
        return planner.calculate(g, universe, [from, to], opts);
    }
    it('is disabled by default and selects each hub independently', () => {
        assert.throws(() => plan(thera, A), /No known route/);
        assert.throws(() => plan(thera, A, {turnur: true}), /No known route/);
        assert.equal(plan(thera, A, {thera: true}).edges.length, 1);
        assert.throws(() => plan(turnur, A, {thera: true}, [{...link, out_system_id: turnur}]), /No known route/);
        assert.equal(plan(turnur, A, {turnur: true}, [{...link, out_system_id: turnur}]).edges.length, 1);
    });
    it('works without mapped wormholes, with directional signatures and public metadata', () => {
        const result = plan(thera, A, {thera: true, wormholes: false});
        assert.equal(result.edges[0].signature, 'HUB-123');
        assert.equal(result.edges[0].arrivalSignature, 'EXT-456');
        assert.equal(result.edges[0].mass, 'unknown');
        assert.equal(result.edges[0].source, 'EVE-Scout');
        assert.equal(result.edges[0].maxShipSize, 'large');
        assert.equal(plan(A, thera, {thera: true}).edges[0].signature, 'EXT-456');
    });
    it('rejects expired, incomplete, unresolved, malformed and non-wormhole records', () => {
        for (const patch of [{expires_at: new Date(now).toISOString()}, {expires_at: 'bad'},
            {completed: false}, {signature_type: 'gas'}, {in_system_id: 123}, {in_signature: ''}]) {
            assert.throws(() => plan(thera, A, {thera: true}, [{...link, ...patch}]), /No known route/);
        }
    });
    it('respects EOL filtering and avoided hubs', () => {
        const eol = {...link, expires_at: new Date(now + 3600000).toISOString()};
        assert.throws(() => plan(thera, A, {thera: true, avoidEol: true}, [eol]), /No known route/);
        assert.equal(plan(thera, A, {thera: true}, [eol]).edges[0].life, 'critical');
        const links = [link, {...link, id: 124, in_system_id: W}];
        assert.deepEqual(ids(plan(A, W, {thera: true}, links)), [A, thera, W]);
        assert.throws(() => plan(A, W, {thera: true, avoid: [thera]}, links), /No known route/);
    });
});

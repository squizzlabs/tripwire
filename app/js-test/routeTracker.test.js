const assert = require('assert');
const vm = require('vm');
const {readSource} = require('./helpers/source');
const ctx = vm.createContext({});
vm.runInContext(readSource('routeTracker'), ctx);
const tracker = ctx.routeTracker;
const pilot = {characterID: 7, characterName: 'Pilot', systemID: 1};
function make() {
    const systems = [1, 2, 3, 4, 5, 6];
    const edges = systems.slice(0, -1).map((from, i) => ({from, to: systems[i + 1], kind: i === 1 || i === 2 ? 'wormhole' : 'gate', id: i}));
    return tracker.create({systems, edges}, pilot, 'mask', [1, 6], {});
}
describe('Active route progress and staged waypoint delivery', () => {
    it('stops gate delivery at wormholes, including consecutive wormholes', () => {
        const route = make();
        assert.deepEqual(Array.from(tracker.segment(route).waypoints), [2]);
        assert(tracker.observe(route, 2));
        assert.equal(tracker.segment(route).waypoints.length, 0);
        assert(tracker.observe(route, 3));
        assert.equal(tracker.segment(route).waypoints.length, 0);
        assert(tracker.observe(route, 4));
        assert.deepEqual(Array.from(tracker.segment(route).waypoints), [5, 6]);
        assert(tracker.observe(route, 6));
        assert.equal(route.index, route.edges.length);
    });
    it('does not advance repeated systems without an observed transition', () => {
        const route = tracker.create({systems: [1, 2, 1, 3], edges: [{}, {}, {}]}, pilot, 'mask', [1, 3], {});
        tracker.observe(route, 1); tracker.observe(route, 1);
        assert.equal(route.index, 0);
        tracker.observe(route, 2); tracker.observe(route, 1);
        assert.equal(route.index, 2);
        assert.equal(tracker.observe(route, 99), false);
        assert.equal(tracker.observe(route, 99), false);
    });
    it('checks remaining topology and refreshes signature/life metadata', () => {
        const route = make();
        const graph = new Map();
        route.edges.forEach(edge => graph.set(edge.from, [{...edge, signature: 'ABC-123'}]));
        assert.equal(tracker.validate(route, graph), '');
        assert.equal(route.edges[1].signature, 'ABC-123');
        graph.delete(1); route.index = 1;
        assert.equal(tracker.validate(route, graph), '');
        graph.delete(2);
        assert.match(tracker.validate(route, graph), /connection/);
    });
    it('requires fresh online location data', () => {
        const now = Date.UTC(2026, 0, 1);
        const fresh = {...pilot, online: '1', locationObservedAt: '2026-01-01 00:00:00'};
        assert(tracker.ready(fresh, now));
        assert(tracker.ready({...fresh, locationObservedAt: '2026-01-01 00:00:00.000'}, now));
        assert(!tracker.ready(fresh, now - 60000));
        assert(!tracker.ready({...fresh, online: '0'}, now));
        assert(!tracker.ready(fresh, now + 120001));
        assert(!tracker.ready({...fresh, locationObservedAt: null}, now));
    });
    it('serially sends a gate segment, clearing only its first waypoint', async () => {
        const route = make(); route.index = 3;
        const calls = [];
        await tracker.deliver(route, tracker.segment(route), async (...args) => calls.push(args), () => true);
        assert.deepEqual(calls, [[5, '7', true], [6, '7', false]]);
        assert.equal(route.deliveredUntil, 5);
    });
    it('does not mark partial failures delivered and safely replaces on retry', async () => {
        const route = make(); route.index = 3;
        let count = 0;
        await assert.rejects(tracker.deliver(route, tracker.segment(route), async () => { if (++count === 2) throw Error('ESI'); }, () => true));
        assert.equal(route.deliveredUntil, -1);
        const calls = [];
        await tracker.deliver(route, tracker.segment(route), async (...args) => calls.push(args), () => true);
        assert.equal(calls[0][2], true);
    });
    it('stops pending delivery after pause, replacement or location change', async () => {
        const route = make(); route.index = 3;
        let current = true, count = 0;
        const delivered = await tracker.deliver(route, tracker.segment(route), async () => { count++; current = false; }, () => current);
        assert.equal(delivered, false);
        assert.equal(count, 1);
        assert.equal(route.deliveredUntil, -1);
    });
});

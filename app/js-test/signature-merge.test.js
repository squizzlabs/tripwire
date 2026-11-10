const assert = require('assert');
const vm = require('vm');
const {readSource} = require('./helpers/source');

describe('Merge signatures without pasting', function() {
    function setup(ids, reversed = false) {
        const signatures = {
            1: {id: 1, signatureID: 'ABC123', systemID: 42, type: 'unknown'},
            2: {id: 2, signatureID: '???', systemID: 42, type: 'wormhole'},
            3: {id: 3, signatureID: 'XYZ987', systemID: 43, type: 'wormhole'}
        };
        const hole = {id: 4, initialID: reversed ? 3 : 2, secondaryID: reversed ? 2 : 3,
            type: 'B274', parent: 'secondary', mass: 'critical', life: 'critical'};
        const widget = new Proxy({}, {get: () => () => widget});
        const $ = value => {
            if (value === '#sigTable tbody tr.selected') return {length: ids.length, each: fn => ids.forEach(id => fn.call({id}))};
            if (value && value.id) return {data: () => value.id};
            return widget;
        };
        $.grep = (items, fn) => items.filter(fn);
        $.extend = Object.assign;
        $.each = (items, fn) => Object.values(items).forEach(item => fn(null, item));
        const context = vm.createContext({$, document: {}, viewingSystemID: 42, tripwire: {
            client: {signatures, wormholes: {4: hole}}, signaturePayload: {
                wormholeForSignature: id => id === 2 || id === 3 ? hole : null,
                undoEntryFor: id => signatures[id], signatureRecord: s => s, wormholeRecord: w => w
            }
        }});
        vm.runInContext(readSource('tripwire/paste').replace('function mapWormhole(',
            'this.selectMerge = selectedMapping; this.applyMerge = mapWormhole; function mapWormhole('), context);
        return {context, signatures, hole};
    }
    for (const reversed of [false, true]) {
        it('merges an unknown row and preserves the connection in either orientation: ' + reversed, function() {
            const {context, hole} = setup([1, 2], reversed);
            const state = context.tripwire.selectMerge();
            assert.equal(state.pending[0].signatureID, 'ABC123');
            const payload = {signatures: {update: [], remove: []}};
            context.tripwire.applyMerge(payload, [], state.pending[0], state.candidates[0]);
            assert.deepEqual(payload.signatures.remove, [1]);
            assert.strictEqual(payload.signatures.update[0].wormhole, hole);
            const pair = payload.signatures.update[0].signatures;
            assert.equal(pair[reversed ? 1 : 0].signatureID, 'ABC123');
            assert.equal(pair[reversed ? 0 : 1].systemID, 43);
        });
    }
    for (const unknownID of [null, '', '???', '???-###', 'ABC123']) {
        for (const order of [[1, 2], [2, 1]]) {
            it('merges unknown ID ' + JSON.stringify(unknownID) + ' with an identified wormhole, selection ' + order, function() {
                const {context, signatures, hole} = setup(order);
                signatures[1].signatureID = unknownID;
                signatures[2].signatureID = 'TBI123';
                const state = context.tripwire.selectMerge();
                assert.ok(state);
                assert.strictEqual(state.pending[0].removedUndo, signatures[1]);
                const payload = {signatures: {update: [], remove: []}};
                const undo = [];
                context.tripwire.applyMerge(payload, undo, state.pending[0], state.candidates[0]);
                assert.deepEqual(payload.signatures.remove, [1]);
                const update = payload.signatures.update[0];
                assert.strictEqual(update.wormhole, hole);
                assert.equal(update.signatures[0].signatureID, unknownID === 'ABC123' ? 'ABC123' : 'TBI123');
                assert.strictEqual(update.signatures[1], signatures[3]);
                assert.strictEqual(undo[0], signatures[2]);
                assert.equal(signatures[2].signatureID, 'TBI123');
            });
        }
    }
    it('accepts abbreviated signature IDs', function() {
        const {context, signatures} = setup([1, 2]);
        signatures[1].signatureID = 'ABC';
        assert.equal(context.tripwire.selectMerge().pending[0].signatureID, 'ABC');
    });
    it('rejects extra selections and unrelated site types', function() {
        assert.equal(setup([1, 2, 3]).context.tripwire.selectMerge(), null);
        const {context, signatures} = setup([1, 2]);
        signatures[1].type = 'gas';
        assert.equal(context.tripwire.selectMerge(), null);
    });
});

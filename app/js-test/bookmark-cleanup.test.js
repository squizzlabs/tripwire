const assert = require('assert');
const vm = require('vm');
const {readSource} = require('./helpers/source');

describe('Paste cleanup for bookmarks and scanner results', function() {
    let context, handlers, button, visible;
    beforeEach(function() {
        handlers = {};
        const data = {};
        button = {data(key, value) { if (arguments.length === 1) return data[key]; data[key] = value; return this; },
            closest() { return {data() { return {close() {}}; }}; }};
        const widget = new Proxy({}, {get: (_, key) => {
            if (key === 'on') return (event, selector, callback) => {handlers[selector] = callback; return widget;};
            return () => widget;
        }});
        const $ = value => value === button ? button : widget;
        $.inArray = (value, values) => values.indexOf(value);
        $.map = (values, fn) => Object.values(values).map(fn).filter(v => v != null);
        button.toggle = value => {visible = value; return button;};
        context = vm.createContext({$, document: {}, viewingSystemID: 10,
            sessionStorage: {setItem() {}}, appData: {},
            bookmarkDestinations: require('../../public/js/bookmark-destinations'),
            Notify: {trigger() {return {wrapper: {find: selector => selector === '#fullPaste' ? button : widget}, destroy() {}};}},
            tripwire: {systems: {}, signatures: {undo: {}}, client: {signatures: {}, wormholes: {}},
                refresh(mode, payload, success) {context.payload = payload; success({resultSet: [{result: true}]});}}
        });
        vm.runInContext(readSource('tripwire/genericSystemTypes'), context);
        vm.runInContext(readSource('tripwire/bookmarks'), context);
        vm.runInContext(readSource('tripwire/paste'), context);
    });
    function signature(id, sig, systemID = 10, type = 'other') {
        context.tripwire.client.signatures[id] = {id, signatureID: sig, systemID, type};
    }
    function cleanup(text) {
        context.tripwire.pasteSignatures.notifyPaste(text);
        handlers['#fullPaste'].call(button, {preventDefault() {}});
    }
    it('offers cleanup for bookmarks, preserves prefix matches, and records undo', function() {
        signature(1, 'ESM032'); signature(2, 'ESM999'); signature(3, 'KSY988');
        signature(4, 'OLD123'); signature(5, 'OFF123', 20); signature(6, '???');
        cleanup('HS ESM SQUID\nZ KSY-988 Reservoir');
        assert.equal(visible, true);
        assert.deepEqual(Array.from(context.payload.signatures.remove), [4]);
        assert.equal(context.payload.systemID, 10);
        assert.equal(context.tripwire.signatures.undo[10][0].signatures[0].id, 4);
    });
    it('still matches complete scanner IDs exactly', function() {
        signature(1, 'ABC123'); signature(2, 'ABC456');
        cleanup('ABC-123\tCosmic Signature\tGas Site\tReservoir\t100.0%\t1 AU');
        assert.deepEqual(Array.from(context.payload.signatures.remove), [2]);
    });
    it('removes absent wormhole pairs but keeps gates', function() {
        signature(1, 'ABC123'); signature(2, 'OLD123', 10, 'wormhole'); signature(3, 'EXT123', 20, 'wormhole');
        signature(4, 'GAT123', 10, 'wormhole'); signature(5, 'GAT456', 30, 'wormhole');
        context.tripwire.client.wormholes = {7: {id: 7, initialID: 2, secondaryID: 3}, 8: {id: 8, initialID: 4, secondaryID: 5, type: 'GATE'}};
        cleanup('Z ABC-123 Site');
        assert.equal(context.payload.signatures.remove.length, 1);
        assert.equal(context.payload.signatures.remove[0].id, 7);
        assert.equal(context.tripwire.signatures.undo[10][0].signatures[0].signatures[1].id, 3);
    });
    it('preserves a known signature matching an unknown-ID bookmark destination during cleanup', function() {
        context.tripwire.systems = {31000002: {name: 'J123658', class: 3}};
        signature(1, 'ABC123', 10, 'wormhole'); signature(2, 'EXT123', 31000002, 'wormhole'); signature(3, 'OLD123');
        context.tripwire.client.wormholes = {7: {id: 7, initialID: 1, secondaryID: 2}};
        cleanup('C3 ??? 658 *');
        assert.deepEqual(Array.from(context.payload.signatures.remove), [3]);
    });
    it('does not delete from a different system after navigation', function() {
        signature(1, 'OLD123', 20);
        context.tripwire.pasteSignatures.notifyPaste('Z ABC-123 Site');
        context.viewingSystemID = 20;
        handlers['#fullPaste'].call(button, {preventDefault() {}});
        assert.equal(context.payload, undefined);
    });
    it('does not offer or execute cleanup for unrecognized clipboard text', function() {
        signature(1, 'OLD123');
        cleanup('unrelated clipboard text');
        assert.equal(visible, false);
        assert.equal(context.payload, undefined);
    });
});

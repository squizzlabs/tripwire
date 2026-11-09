const assert = require('assert');
const vm = require('vm');
const {readSource} = require('./helpers/source');

describe('Signature site-name hover', function() {
    for (const action of ['add', 'edit']) {
    it(action + ' renders Other with the retained name in a safely escaped native tooltip', function() {
        let markup;
        const widget = new Proxy({}, {get: () => () => widget});
        const escape = text => text.replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
        const context = vm.createContext({
            document: {hidden: true},
            tripwire: {ageTooltip: () => '', serverTime: {getTime: () => 0}},
            $: value => {if (typeof value === 'string' && value.startsWith('<tr')) markup = value; return widget;},
            _: {escape}, Tooltips: {attach: () => {}},
            formatSignatureID: id => id, linkSig: escape,
            options: {signatures: {alignment: {}}},
            moment: {utc: () => ({toDate: () => new Date(0)})}
        });
        vm.runInContext(readSource('tripwire/' + (action === 'add' ? 'addSignature' : 'editSignature')), context);
        context.tripwire[action + 'Sig']({id: 1, signatureID: 'ABC123', type: 'other', name: 'Strange "site" <test>'}, {animate: false});
        assert.ok(markup.includes('title="Strange &quot;site&quot; &lt;test&gt;">other</td>'));
        assert.ok(!markup.includes('<test>'));
        assert.ok(!markup.includes('Set ABC-123 as return'));
    });
    }
});

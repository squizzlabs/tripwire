const assert = require('assert');
const vm = require('vm');
const { readSource } = require('./helpers/source');

const context = { tripwire: {} };
vm.createContext(context);
vm.runInContext(readSource('tripwire/jumpVoice'), context);
const systems = {
    1: {name: 'Jita', regionID: 10000001},
    2: {name: 'J123007', regionID: 11000001, class: '2', statics: ['B274', 'O477']},
    3: {name: 'J123456', regionID: 11000001, class: '3', statics: []}
};
const types = {B274: {leadsTo: 'High-Sec'}, O477: {leadsTo: 'Class-3'}};
const signatures = {a: {systemID: 1}, b: {systemID: 2}, c: {systemID: 3}};
const holes = {one: {initialID: 'a', secondaryID: 'b'}};

describe('Opt-in J-space jump voice', function() {
    let spoken, observer;
    beforeEach(function() {
        spoken = [];
        observer = context.createJumpVoiceObserver(text => spoken.push(text));
    });
    function observe(systemID, map = {}, enabled = true, characterID = 10, mask = '1.2', now = 0) {
        observer.observe({systemID, characterID}, mask, signatures, map, systems, types, enabled, now);
    }
    it('announces class, individual trailing digits, and only static destinations', function() {
        observe(1);
        observe(2, holes);
        assert.deepEqual(spoken, ['Class 2. 0 0 7. Statics: highsec, class 3.']);
        observe(2, holes);
        assert.equal(spoken.length, 1);
    });
    it('stays silent while disabled and does not replay when enabled', function() {
        observe(1, {}, false);
        observe(2, holes, false);
        observe(2, holes);
        assert.equal(spoken.length, 0);
    });
    it('does not announce initial loading or previously mapped destinations', function() {
        observe(2, holes);
        observe(1, holes);
        observe(2, holes);
        assert.equal(spoken.length, 0);
    });
    it('does not announce character or mask switches', function() {
        observe(1);
        observe(2, holes, true, 20);
        observe(1, {}, true, 20, '2.2');
        observe(2, holes, true, 20, '3.2');
        assert.equal(spoken.length, 0);
    });
    it('waits for mapping to catch up with location', function() {
        observe(1);
        observe(2);
        assert.equal(spoken.length, 0);
        observe(2, holes, true, 10, '1.2', 5000);
        assert.equal(spoken.length, 1);
    });
    it('waits for location when mapping arrives first, then announces only once', function() {
        observe(1);
        observe(1, holes, true, 10, '1.2', 1000);
        observe(1, holes, true, 10, '1.2', 2000);
        assert.equal(spoken.length, 0);
        observe(2, holes, true, 10, '1.2', 3000);
        assert.equal(spoken.length, 1);
        observe(2, holes, true, 10, '1.2', 4000);
        observe(1, holes, true, 10, '1.2', 5000);
        observe(2, holes, true, 10, '1.2', 6000);
        assert.equal(spoken.length, 1);
    });
    it('expires early map candidates and clears them on pilot switches or disabled voice', function() {
        observe(1);
        observe(1, holes, true, 10, '1.2', 1000);
        observe(2, holes, true, 10, '1.2', 32000);
        assert.equal(spoken.length, 0);
        observer.reset();
        observe(1);
        observe(1, holes);
        observe(1, holes, true, 20);
        observe(2, holes, true, 20);
        assert.equal(spoken.length, 0);
        observer.reset();
        observe(1);
        observe(1, holes);
        observe(1, holes, false);
        observe(2, holes);
        assert.equal(spoken.length, 0);
    });
    it('drops pending speech after departure or timeout', function() {
        observe(1);
        observe(2);
        observe(3, holes);
        assert.equal(spoken.length, 0);
        observer.reset();
        observe(1);
        observe(2);
        observe(2, holes, true, 10, '1.2', 31000);
        assert.equal(spoken.length, 0);
    });
    it('ignores known space, unknown locations, and unrelated new connections', function() {
        observe(2);
        observe(1, holes);
        observe(null);
        observe(2, holes);
        observer.reset();
        observe(1);
        observe(2, {other: {initialID: 'b', secondaryID: 'c'}});
        assert.equal(spoken.length, 0);
    });
    it('handles missing statics and excludes special space without a J-code', function() {
        assert.equal(context.jspaceVoiceText(systems[3], types), 'Class 3. 4 5 6. Statics unknown.');
        assert.equal(context.jspaceVoiceText({...systems[2], name: 'Thera'}, types), null);
        assert.equal(context.jspaceVoiceText(systems[1], types), null);
    });
});

describe('Voice announcement parts', function() {
    it('speaks only selected parts in the chosen order', function() {
        const settings = {order: ['statics', 'digits', 'class'], parts: {digits: false}};
        assert.equal(context.jspaceVoiceText(systems[2], types, settings), 'Statics: highsec, class 3. Class 2.');
    });
    it('allows each part on its own and preserves leading zeroes', function() {
        const expected = {class: 'Class 2.', digits: '0 0 7.', statics: 'Statics: highsec, class 3.'};
        Object.keys(expected).forEach(part => {
            const parts = {class: false, digits: false, statics: false};
            parts[part] = true;
            assert.equal(context.jspaceVoiceText(systems[2], types, {parts}), expected[part]);
        });
    });
    it('normalizes incomplete or invalid orders without repeating parts', function() {
        assert.equal(context.jspaceVoiceText(systems[2], types, {order: ['digits', 'digits', 'invalid']}),
            '0 0 7. Class 2. Statics: highsec, class 3.');
        assert.equal(context.jspaceVoiceText(systems[2], types, {order: null}),
            'Class 2. 0 0 7. Statics: highsec, class 3.');
    });
    it('uses the preferences for actual jump announcements and stays silent with all parts off', function() {
        const spoken = [];
        const observer = context.createJumpVoiceObserver(text => spoken.push(text));
        const settings = {order: ['digits', 'class', 'statics'], parts: {statics: false}};
        const observe = (id, map, prefs) => observer.observe({characterID: 10, systemID: id}, '1.2',
            signatures, map, systems, types, true, 0, prefs);
        observe(1, {}, settings);
        observe(2, holes, settings);
        assert.deepEqual(spoken, ['0 0 7. Class 2.']);
        observer.reset();
        const silent = {parts: {class: false, digits: false, statics: false}};
        observe(1, {}, silent);
        observe(2, holes, silent);
        assert.equal(context.jspaceVoiceText(systems[2], types, silent), '');
        assert.equal(spoken.length, 1);
    });
});

describe('Voice playback preferences', function() {
    let utterances, chosenVoice;
    beforeEach(function() {
        utterances = [];
        chosenVoice = {voiceURI: 'test-voice', name: 'Test voice', lang: 'en-GB'};
        context.window = {
            SpeechSynthesisUtterance: function(text) { this.text = text; },
            speechSynthesis: {
                getVoices: () => [chosenVoice],
                cancel: () => {},
                speak: utterance => utterances.push(utterance)
            }
        };
    });
    it('applies the selected voice, language, volume, speed, and pitch', function() {
        context.playJspaceVoice('Test announcement', {voiceURI: 'test-voice', volume: 0.35, rate: 0.8, pitch: 1.2});
        const utterance = utterances[0];
        assert.equal(utterance.voice, chosenVoice);
        assert.equal(utterance.lang, 'en-GB');
        assert.equal(utterance.volume, 0.35);
        assert.equal(utterance.rate, 0.8);
        assert.equal(utterance.pitch, 1.2);
    });
    it('uses defaults for older preferences and unavailable voices', function() {
        context.playJspaceVoice('Test', {enabled: true, voiceURI: 'missing'});
        const utterance = utterances[0];
        assert.equal(utterance.voice, undefined);
        assert.equal(utterance.lang, 'en-US');
        assert.equal(utterance.volume, 0.6);
        assert.equal(utterance.rate, 1.25);
        assert.equal(utterance.pitch, 1);
    });
    it('preserves mute and clamps invalid stored playback settings', function() {
        context.playJspaceVoice('Test', {volume: 0, rate: 20, pitch: -1});
        assert.equal(utterances[0].volume, 0);
        assert.equal(utterances[0].rate, 2);
        assert.equal(utterances[0].pitch, 0);
        context.playJspaceVoice('Test', {volume: 'invalid', rate: null, pitch: ''});
        assert.equal(utterances[1].volume, 0.6);
        assert.equal(utterances[1].rate, 1.25);
        assert.equal(utterances[1].pitch, 1);
    });
    it('does nothing in browsers without speech support', function() {
        context.window = {};
        assert.doesNotThrow(() => context.playJspaceVoice('Test', {}));
        assert.equal(utterances.length, 0);
    });
});

describe('Voice activation waits for interaction', function() {
    function loadOptions(saved, fromLocalStorage, schedule = () => 1) {
        const element = new Proxy(function() {}, {get: () => element, apply: () => element});
        const jquery = () => element;
        jquery.map = values => values;
        jquery.inArray = () => -1;
        jquery.extend = Object.assign;
        const sandbox = {
            setTimeout: schedule, $: jquery, init: {userID: 1, corporationID: 2},
            localStorage: {getItem: () => fromLocalStorage ? JSON.stringify({grid: {}, ...saved}) : null},
            window: {speechSynthesis: {cancel() {}}, SpeechSynthesisUtterance: function() {}}, tripwire: null, guidance: null, chain: {redraw() {}}, viewingSystemID: 1
        };
        vm.createContext(sandbox);
        if (!fromLocalStorage) vm.runInContext('init.options = ' + JSON.stringify(saved), sandbox);
        vm.runInContext(readSource('options'), sandbox);
        return sandbox.options;
    }
    [false, true].forEach(fromLocalStorage => {
        it('defers saved activation from ' + (fromLocalStorage ? 'local storage' : 'the server'), function() {
            const options = loadOptions({voice: {enabled: true, voiceURI: 'saved', volume: 0.4, rate: 1.5, pitch: 0.8}}, fromLocalStorage);
            assert.equal(options.voice.enabled, false);
            assert.equal(options.voice.voiceURI, 'saved');
            assert.equal(options.voice.volume, 0.4);
            assert.equal(options.voice.rate, 1.5);
            assert.equal(options.voice.pitch, 0.8);
            const saved = options.get();
            assert.equal(saved.voice.enabled, true);
            assert.equal(options.voice.enabled, false, 'saving must not activate speech');
            assert.equal(options.restoreVoiceAfterGesture({type: 'click', isTrusted: false}), false);
            assert.equal(options.restoreVoiceAfterGesture({type: 'mousemove', isTrusted: true}), false);
            assert.equal(options.restoreVoiceAfterGesture({type: 'click', isTrusted: true}), true);
            assert.equal(saved.voice.volume, 0.4);
            assert.equal(options.voice.enabled, true, 'saving must not turn off this session');
        });
    });
    [false, true].forEach(fromLocalStorage => {
        [{}, {voice: {}}, {voice: {enabled: false}}].forEach(saved => {
            it('keeps voice off without a saved opt-in from ' + (fromLocalStorage ? 'local storage' : 'the server') + ': ' + JSON.stringify(saved), function() {
                const options = loadOptions(saved, fromLocalStorage);
                assert.equal(options.voice.enabled, false);
                for (const type of ['click', 'paste', 'keydown']) {
                    assert.equal(options.restoreVoiceAfterGesture({type, isTrusted: true}), false);
                }
                assert.equal(options.get().voice.enabled, false);
                options.setVoiceEnabled(true);
                const reloaded = loadOptions(JSON.parse(JSON.stringify(options.get())), fromLocalStorage);
                assert.equal(reloaded.restoreVoiceAfterGesture({type: 'click', isTrusted: true}), true);
                assert.equal(reloaded.voice.enabled, true);
            });
        });
    });
    it('shows the appropriate startup hint and clears it after a key press', function() {
        const pending = loadOptions({voice: {enabled: true}});
        assert.match(pending.voiceStartupMessage(), /Voice is waiting.*press a key/);
        assert.equal(pending.restoreVoiceAfterGesture({type: 'keydown', isTrusted: false}), false);
        assert.equal(pending.restoreVoiceAfterGesture({type: 'keydown', isTrusted: true}), true);
        assert.equal(pending.voiceStartupMessage(), '');
        pending.setVoiceEnabled(false);
        assert.equal(pending.voiceStartupMessage(), 'Voice is off. Click Voice to enable announcements.');
        assert.equal(pending.restoreVoiceAfterGesture({type: 'keydown', isTrusted: true}), false);
    });
    it('expires the startup hint after 5 seconds without disabling restoration', function() {
        const timers = [];
        const options = loadOptions({voice: {enabled: true}}, false, (callback, delay) => {
            timers.push({callback, delay});
            return timers.length;
        });
        assert.equal(timers.length, 1);
        assert.equal(timers[0].delay, 5000);
        assert.match(options.voiceStartupMessage(), /Voice is waiting/);
        options.updateVoiceStatus();
        assert.equal(timers.length, 1, 'updates must not restart the countdown');
        timers[0].callback();
        assert.equal(options.voiceStartupMessage(), '');
        assert.equal(options.restoreVoiceAfterGesture({type: 'click', isTrusted: true}), true);
        options.setVoiceEnabled(false);
        assert.equal(options.voiceStartupMessage(), '', 'the expired hint must not reappear');
        assert.equal(timers.length, 1);
    });
    it('retains part selection and order across preference saves and loads', function() {
        const options = loadOptions({voice: {enabled: true, parts: {class: false, digits: true, statics: true}, order: ['statics', 'digits', 'class']}});
        const reloaded = loadOptions(JSON.parse(JSON.stringify(options.get())));
        assert.equal(reloaded.voice.parts.class, false);
        assert.equal(reloaded.voice.parts.digits, true);
        assert.deepEqual(Array.from(reloaded.voice.order), ['statics', 'digits', 'class']);
        assert.equal(reloaded.voice.enabled, false);
    });
    it('saves the hide-message preference without changing voice restoration', function() {
        const options = loadOptions({voice: {enabled: true, hideStartupHint: true}}, false, () => {
            assert.fail('a hidden message should not start its countdown');
        });
        assert.equal(options.voiceStartupMessage(), '');
        const reloaded = loadOptions(JSON.parse(JSON.stringify(options.get())));
        assert.equal(reloaded.voice.hideStartupHint, true);
        assert.equal(reloaded.voiceStartupMessage(), '');
        assert.equal(reloaded.voice.enabled, false);
        assert.equal(reloaded.restoreVoiceAfterGesture({type: 'click', isTrusted: true}), true);
        reloaded.setVoiceEnabled(false);
        assert.equal(reloaded.voiceStartupMessage(), '');
    });
    it('restores on paste only once', function() {
        const options = loadOptions({voice: {enabled: true}});
        assert.equal(options.restoreVoiceAfterGesture({type: 'paste', isTrusted: true}), true);
        assert.equal(options.voice.enabled, true);
        assert.equal(options.restoreVoiceAfterGesture({type: 'click', isTrusted: true}), false);
    });
    it('never restores a disabled preference or overrides an explicit off choice', function() {
        const disabled = loadOptions({voice: {enabled: false}});
        assert.equal(disabled.restoreVoiceAfterGesture({type: 'click', isTrusted: true}), false);
        const pending = loadOptions({voice: {enabled: true}});
        pending.setVoiceEnabled(false);
        assert.equal(pending.restoreVoiceAfterGesture({type: 'paste', isTrusted: true}), false);
        assert.equal(pending.get().voice.enabled, false);
        pending.setVoiceEnabled(true);
        assert.equal(pending.get().voice.enabled, true);
    });

});

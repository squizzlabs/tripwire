const assert = require('assert');
const fs = require('fs');
const destinations = require('../../public/js/bookmark-destinations');
const data = JSON.parse(fs.readFileSync('public/js/combine.js', 'utf8').slice('var appData = '.length));
const resolve = (text, type) => destinations.resolve(text, type, data.systems, data.regions);

describe('Bookmark destination conventions', function() {
    it('resolves J-number suffixes within the specified class', function() {
        const id = resolve('432', 'c3');
        assert.equal(data.systems[id].name, 'J113432');
        assert.equal(resolve('432', 'c2'), null);
        assert.equal(resolve('432', 'c?'), null);
    });
    it('resolves DR destinations only within Drifter classes', function() {
        for (const system of Object.values(data.systems).filter(s => [14, 15, 16, 17, 18].includes(s.class))) {
            const id = resolve(system.name.toLowerCase(), 'dr');
            assert.equal(data.systems[id].name, system.name);
        }
        assert.equal(resolve('J113432', 'DR'), null);
        assert.equal(resolve('???', 'DR'), null);
    });
    it('resolves faction aliases and partial names in either order and case', function() {
        assert.equal(data.systems[resolve('rUsT fReDaGoD', 'hs')].name, 'Fredagod');
        assert.equal(data.systems[resolve('unel FRANCE', 'HS')].name, 'Unel');
        assert.equal(data.systems[resolve('jIt SQUID', 'HS')].name, 'Jita');
        assert.equal(data.systems[resolve('CHINA amarr', 'HS')].name, 'Amarr');
    });
    it('uses region names together with system fragments', function() {
        assert.equal(data.systems[resolve('forge squid jit', 'HS')].name, 'Jita');
        assert.equal(resolve('heimatar squid jit', 'HS'), null);
    });
    it('retains ambiguity and respects the destination class', function() {
        assert.equal(resolve('SQUID', 'HS'), null);
        assert.equal(resolve('Jita', 'LS'), null);
        assert.equal(resolve('FRANCE Jita', 'HS'), null);
    });
    it('hides legacy destination hints while keeping deliberate custom names', function() {
        for (const name of ['SQUID', 'rust FREDAGOD', 'Unel france', 'CHINA', '432']) {
            assert.equal(destinations.displayName(name), null);
        }
        assert.equal(destinations.displayName('Trade hub'), 'Trade hub');
    });
    it('filters jump hints without interpreting ordinary custom labels', function() {
        const jita = data.systems[30000142];
        assert.equal(destinations.hintsMatch('sqUid', jita, data.systems), true);
        assert.equal(destinations.hintsMatch('rust', jita), false);
        assert.equal(destinations.hintsMatch('Home', jita), true);
        assert.equal(destinations.hintsMatch('432', {name: 'J113432'}), true);
        assert.equal(destinations.hintsMatch('432', {name: 'J113433'}), false);
    });
});

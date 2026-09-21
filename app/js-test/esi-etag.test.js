const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

describe('Browser ESI ETags', () => {
    it('sends If-None-Match and supplies cached JSON after a 304', async () => {
        const calls = [];
        const responses = [
            { status: 200, data: { name: 'Pilot' }, etag: '"pilot-1"' },
            { status: 304, data: null, etag: null }
        ];
        const tripwire = { version: 'test' };
        const sandbox = {
            tripwire,
            window: { location: { hostname: 'localhost' }, navigator: { userAgent: 'test' } },
            $: { param: () => 'user_agent=test' },
            console,
            fetch: async (url, options) => {
                calls.push({ url, options });
                const response = responses.shift();
                return {
                    status: response.status,
                    ok: response.status === 200,
                    headers: { get: (name) => name === 'etag' ? response.etag : null },
                    json: async () => response.data
                };
            }
        };
        vm.runInNewContext(fs.readFileSync('app/js/tripwire/esi.js', 'utf8'), sandbox);
        tripwire.esi.call(tripwire);

        assert.equal((await tripwire.esi.characterLookup(10)).name, 'Pilot');
        assert.equal((await tripwire.esi.characterLookup(10)).name, 'Pilot');
        assert.equal(calls[0].options.headers['If-None-Match'], undefined);
        assert.equal(calls[1].options.headers['If-None-Match'], '"pilot-1"');
    });

    it('waits for every detail in fullLookup without synchronous requests', async () => {
        const tripwire = { version: 'test' };
        const sandbox = {
            tripwire,
            window: { location: { hostname: 'localhost' }, navigator: { userAgent: 'test' } },
            $: { param: () => 'user_agent=test', extend: Object.assign },
            console
        };
        vm.runInNewContext(fs.readFileSync('app/js/tripwire/esi.js', 'utf8'), sandbox);
        tripwire.esi.call(tripwire);
        tripwire.esi.idLookup = async () => [{ id: 10, category: 'character' }];
        tripwire.esi.characterLookup = async () => ({ name: 'Pilot', corporation_id: 20 });
        tripwire.esi.corporationLookup = async () => ({ name: 'Corp', alliance_id: 30 });
        tripwire.esi.allianceLookup = async () => ({ name: 'Alliance' });

        const result = await tripwire.esi.fullLookup([10]);
        assert.equal(result[0].name, 'Pilot');
        assert.equal(result[0].corporation.name, 'Corp');
        assert.equal(result[0].alliance.name, 'Alliance');
    });
});

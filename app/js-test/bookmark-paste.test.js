const assert = require('assert');
const vm = require('vm');
const {readSource} = require('./helpers/source');

describe('Bookmark signature paste', function() {
    let context;
    beforeEach(function() {
        const widget = new Proxy({}, {get: () => () => widget});
        const $ = () => widget;
        $.inArray = (value, values) => values.indexOf(value);
        $.map = (values, fn) => Object.values(values).map(fn).filter(v => v != null);
        $.each = (values, fn) => Object.entries(values).forEach(([k, v]) => fn(k, v));
        context = vm.createContext({$, document: {}, bookmarkDestinations: require('../../public/js/bookmark-destinations'), appData: {}, viewingSystemID: 31000001,
            options: {signatures: {pasteLife: 72}},
            tripwire: {systems: {30000142: {name: 'Jita', security: 0.9, factionID: 500001}}, client: {signatures: {}, wormholes: {}},
                refresh: (mode, payload, success, complete) => {context.payload = payload; complete();}}
        });
        vm.runInContext(readSource('tripwire/genericSystemTypes'), context);
        vm.runInContext(readSource('tripwire/bookmarks'), context);
        vm.runInContext(readSource('tripwire/paste'), context);
    });
    function paste(text) { context.tripwire.pasteSignatures.parsePaste(text); return context.payload && context.payload.signatures; }
    for (const missing of [undefined, null]) {
        it('imports the reported bookmark paste with ' + missing + ' caches and allows another paste', function() {
            context.tripwire.systems[30000144] = {name: 'Perimeter', security: 0.9, factionID: 500001};
            context.tripwire.client.signatures = missing;
            context.tripwire.client.wormholes = missing;
            const result = paste([
                'GS KSY ---', 'HS ESM SQUID', 'HS RVH RUST FREDAGOD',
                'HS WLH FRANCE UNEL', 'NS HOT ???',
                'Z KSY-988 Sizeable Perimeter Reservoir'
            ].map(title => title + '\tMC Deputy Training / Wormholes\t2026.11.10 12:40').join('\n'));
            assert.equal(result.add.length, 5);
            assert.equal(result.update.length, 0);
            assert.equal(result.add[0].signatureID, 'KSY988');
            assert.equal(result.add[0].name, 'Sizeable Perimeter Reservoir');
            assert.equal(result.add[1].signatures[1].systemID, 2);
            assert.equal(result.add[4].signatures[1].systemID, 0);
            const next = paste('RC ABC Ruins');
            assert.equal(next.add.length, 1);
            assert.equal(next.add[0].signatureID, 'ABC');
        });
    }
    it('merges gas and Z bookmarks, ignoring folder and date', function() {
        const result = paste('GS KSY ---\tFolder\t2026.11.10 12:40\nz KSY-988 Sizeable Perimeter Reservoir\tFolder\t2026.11.10 12:40');
        assert.equal(result.add.length, 1);
        assert.equal(result.add[0].signatureID, 'KSY988');
        assert.equal(result.add[0].type, 'Gas');
        assert.equal(result.add[0].name, 'Sizeable Perimeter Reservoir');
    });
    it('sets destination classes including nullsec zero and Pochven aliases', function() {
        for (const [prefix, expected] of [['HS', 2], ['LS', 1], ['NS', 0], ['C2', 4], ['TR', 10], ['PC', 10], ['C?', null], ['DR', 19], ['dr', 19]]) {
            const result = paste(prefix + ' ABC ???');
            assert.equal(result.add[0].signatures[1].systemID, expected);
        }
    });
    it('updates the existing signature and preserves wormhole state', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'TYI123', type: 'wormhole'}, 2: {id: 2, systemID: null, type: 'wormhole'}};
        context.tripwire.client.wormholes = {3: {id: 3, initialID: 1, secondaryID: 2, type: 'K162', parent: 'secondary', mass: 'critical', life: 'critical'}};
        const result = paste('C2 TYI 432');
        assert.equal(result.add.length, 0);
        assert.equal(result.update[0].signatures[1].systemID, 4);
        assert.equal(result.update[0].signatures[1].bookmark, '432');
        assert.equal(result.update[0].wormhole.mass, 'critical');
        assert.equal(result.update[0].wormhole.parent, 'secondary');
    });
    it('resolves exact system names and supports data and relic bookmarks', function() {
        assert.equal(paste('HS ABC Jita').add[0].signatures[1].systemID, '30000142');
        assert.equal(paste('DC DEF Ruins').add[0].type, 'Data');
        assert.equal(paste('RC GHI Ruins').add[0].type, 'Relic');
    });
    it('does not guess ambiguous prefixes', function() {
        context.tripwire.client.signatures = {1: {systemID: 31000001, signatureID: 'ABC123'}, 2: {systemID: 31000001, signatureID: 'ABC456'}};
        paste('HS ABC Jita');
        assert.equal(context.payload, undefined);
    });
    it('keeps a known destination and the reverse connection orientation', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 30000142, type: 'wormhole'}, 2: {id: 2, systemID: 31000001, signatureID: 'ABC123', type: 'wormhole'}};
        context.tripwire.client.wormholes = {3: {id: 3, initialID: 1, secondaryID: 2, parent: 'initial'}};
        const result = paste('HS ABC SQUID');
        assert.equal(result.update[0].signatures[0].systemID, 30000142);
        assert.equal(result.update[0].signatures[0].bookmark, 'SQUID');
        assert.equal(result.update[0].signatures[1].id, 2);
    });
    it('expands a bookmark-only prefix when a scan supplies the full ID', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ABC', type: 'gas', name: 'Reservoir'}};
        const result = paste('ABC-123\tCosmic Signature\tGas Site\tReservoir\t100.0%\t1 AU');
        assert.equal(result.add.length, 0);
        assert.equal(result.update[0].signatureID, 'ABC123');
    });
    it('does not erase the site type when Z provides only a name', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'KSY988', type: 'gas'}};
        assert.equal(paste('Z KSY-988 Reservoir').update[0].type, 'gas');
    });
    it('applies a class-qualified suffix to the destination payload', function() {
        context.tripwire.systems = {31000002: {name: 'J123456', class: 2}, 31000003: {name: 'J223456', class: 3}};
        const result = paste('c2 tYi 456');
        assert.equal(result.add[0].signatures[0].signatureID, 'TYI');
        assert.equal(result.add[0].signatures[1].systemID, '31000002');
    });
    it('stores faction hints separately from names and repairs old labels on repaste', function() {
        context.tripwire.systems[30000144] = {name: 'Perimeter', security: 0.9, factionID: 500001};
        const added = paste('HS ESM SQUID').add[0].signatures[1];
        assert.equal(added.name, undefined);
        assert.equal(added.bookmark, 'SQUID');
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ESM123', type: 'wormhole'}, 2: {id: 2, systemID: 30000142, type: 'wormhole', name: 'SQUID'}};
        context.tripwire.client.wormholes = {3: {id: 3, initialID: 1, secondaryID: 2}};
        const updated = paste('HS ESM SQUID').update[0].signatures[1];
        assert.equal(updated.name, null);
        assert.equal(updated.bookmark, 'SQUID');
        assert.equal(updated.systemID, 30000142);
        context.tripwire.client.signatures[2].name = 'Trade hub';
        assert.equal(paste('HS ESM SQUID').update[0].signatures[1].name, 'Trade hub');
    });
    it('imports the unprefixed Drone Fabricator bookmark as a combat site', function() {
        const result = paste('ZYP-952 Rampant Drone Fabricator\tWHFTW\t2026.11.09 18:29');
        assert.equal(result.add.length, 1);
        assert.equal(result.add[0].signatureID, 'ZYP952');
        assert.equal(result.add[0].name, 'Rampant Drone Fabricator');
        assert.equal(result.add[0].type, 'Combat');
    });
    it('updates an existing signature from a case-insensitive Z combat bookmark', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ZYP952', type: 'unknown'}};
        const result = paste('z zyp-952 rampant drone fabricator\tWHFTW\t2026.11.09 18:29');
        assert.equal(result.add.length, 0);
        assert.equal(result.update[0].id, 1);
        assert.equal(result.update[0].type, 'Combat');
    });
    it('categorizes unrecognized unprefixed sites as Other without importing folder metadata', function() {
        const result = paste('abc-123 Unrecognized Site\tWHFTW\t2026.11.09 18:29');
        assert.equal(result.add[0].signatureID, 'ABC123');
        assert.equal(result.add[0].type, 'Other');
        assert.equal(result.add[0].name, 'Unrecognized Site');
    });
    it('classifies the Unsecured bookmark as Data and excludes clipboard metadata', function() {
        const result = paste('Z LGD-429 Unsecured Perimeter Transponder Farm \tMC Deputy Training / Camps\t2026.11.10 13:25');
        assert.equal(result.add[0].signatureID, 'LGD429');
        assert.equal(result.add[0].type, 'Data');
        assert.equal(result.add[0].name, 'Unsecured Perimeter Transponder Farm');
    });
    it('updates Unsecured sites case-insensitively without requiring a Z prefix', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'LGD429', type: 'unknown'}};
        const result = paste('lgd-429 unsecured Frontier Site\tFolder\t2026.11.10 13:25');
        assert.equal(result.add.length, 0);
        assert.equal(result.update[0].id, 1);
        assert.equal(result.update[0].type, 'Data');
    });
    it('uses Other for an unrecognized Z site while retaining its exact name', function() {
        const result = paste('z ABC-123 Strange Site <with marks>\tFolder\t2026.11.10 13:25');
        assert.equal(result.add[0].type, 'Other');
        assert.equal(result.add[0].name, 'Strange Site <with marks>');
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ABC123', type: 'unknown'}};
        assert.equal(paste('Z ABC-123 Strange Site').update[0].type, 'Other');
    });
    it('imports the four-row class and Drifter bookmark example', function() {
        const result = paste([
            'C1 SHX ???', 'C3 XLB ???', 'C3 XVG ???', 'DR GCG ???'
        ].map(title => title + '\tMC Deputy Training / Wormholes\t2026.11.10 21:11').join('\n'));
        assert.deepEqual(Array.from(result.add, entry => entry.signatures[1].systemID), [3, 5, 5, 19]);
        assert.equal(result.add[3].signatures[0].signatureID, 'GCG');
        assert.equal(result.add[3].signatures[1].name, undefined);
    });
    for (const [name, type] of [
        ...['Limited', 'Standard', 'Superior'].map(size => [size + ' Sleeper Cache', 'Data']),
        ...['Besieged Covert Research Facility',
            'Perimeter Ambush Point', 'Perimeter Camp', 'Phase Catalyst Node', 'The Line',
            'Perimeter Checkpoint', 'Perimeter Hangar', 'The Ruins of Enclave Cohort 27', 'Sleeper Data Sanctuary',
            'Fortification Frontier Stronghold', 'Outpost Frontier Stronghold', 'Solar Cell', 'The Oruze Construct',
            'Frontier Barracks', 'Frontier Command Post', 'Integrated Terminus', 'Sleeper Information Sanctum',
            'Core Garrison', 'Core Stronghold', 'Oruze Osobnyk', 'Quarantine Area',
            'Core Citadel', 'Core Bastion', 'Strange Energy Readings', 'The Mirror'].map(name => [name, 'Combat']),
        ...['Common Perimeter', 'Ordinary Perimeter', 'Average Frontier', 'Unexceptional Frontier',
            'Exceptional Core', 'Infrequent Core', 'Isolated Core', 'Rarified Core', 'Uncommon Core',
            'Unusual Core'].map(name => [name + ' Deposit', 'Ore']),
        ['Forgotten Core Data Field', 'Relic'],
        ['Crumbling Serpentis Excavation', 'Relic'],
        ['Decayed Blood Quarry', 'Relic'],
        ['Ruined Sansha Temple Site', 'Relic'],
        ['Local Guristas Mainframe', 'Data'],
        ['Regional Angel Data Fortress', 'Data'],
        ['Central Serpentis Survey Site', 'Data'],
        ...['Barren Perimeter', 'Minor Perimeter', 'Ordinary Perimeter', 'Sizeable Perimeter',
            'Sizable Perimeter', 'Token Perimeter', 'Bountiful Frontier', 'Vast Frontier',
            'Instrumental Core', 'Vital Core'].map(name => [name + ' Reservoir', 'Gas'])
    ]) {
        it('classifies ' + name + ' with either bookmark format', function() {
            for (const prefix of ['Z ', '']) {
                const text = name.toLowerCase().replace(/ /g, '  ');
                const result = paste(prefix + 'abc-123 ' + text + '\tFolder\t2026.11.10 21:11');
                assert.equal(result.add[0].type, type);
                assert.equal(result.add[0].name, text);
            }
        });
    }
    it('leaves misleading or incomplete name patterns as Other', function() {
        for (const name of ['Local staging', 'Regional base', 'Central Unknown Mainframe',
            'Ruined home', 'Decayed Guristas', 'Forgottenish Site', 'Mystery Core Reservoir',
            'Mystery Perimeter Deposit', 'Vital Core Reservoir staging',
            'Lesser Guristas Covert Research Facility', 'Superior Serpentis Covert Research Facility',
            'Besieged Covert Research Facility staging', 'Solar Cell bookmark', 'Superior Sleeper Cache home']) {
            assert.equal(paste('Z ABC-123 ' + name).add[0].type, 'Other', name);
        }
    });
    it('reclassifies an existing Other signature when its site name is recognized', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ABC123', type: 'other'}};
        const result = paste('Z ABC-123 Forgotten Perimeter Gateway');
        assert.equal(result.add.length, 0);
        assert.equal(result.update[0].id, 1);
        assert.equal(result.update[0].type, 'Relic');
    });
    for (const hours of [1, 4]) {
        for (const [percent, mass] of [[10, 'critical'], [50, 'destab']]) {
            it('applies <' + hours + 'H and <' + percent + '% to a new wormhole', function() {
                context.tripwire.serverTime = {time: new Date('2026-11-10T20:00:00Z')};
                const result = paste('hS ABC <' + hours + 'h Jita <' + percent + '%\tFolder\t2026.11.10 19:00');
                const entry = result.add[0];
                assert.equal(entry.wormhole.life, 'critical');
                assert.equal(entry.wormhole.lifeHours, hours);
                assert.equal(entry.wormhole.mass, mass);
                assert.equal(entry.signatures[1].systemID, '30000142');
                assert.equal(entry.signatures[1].bookmark, 'Jita');
                assert.equal(entry.signatures[0].lifeLeft, '2026-11-' + (hours === 4 ? '11 00' : '10 21') + ':00:00');
                assert.equal(entry.signatures[0].lifeLeft, entry.signatures[1].lifeLeft);
            });
        }
    }
    it('updates wormhole state without extending an existing shorter countdown', function() {
        context.tripwire.serverTime = {time: new Date('2026-11-10T20:00:00Z')};
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ABC123', type: 'wormhole', lifeLeft: '2026-11-10 20:30:00'}, 2: {id: 2, systemID: null, type: 'wormhole', lifeLeft: '2026-11-10 20:30:00'}};
        context.tripwire.client.wormholes = {3: {id: 3, initialID: 1, secondaryID: 2, life: 'critical', mass: 'critical'}};
        const result = paste('C1 ABC ??? <4H <50%').update[0];
        assert.equal(result.wormhole.life, 'critical');
        assert.equal(result.wormhole.lifeHours, undefined);
        assert.equal(result.wormhole.mass, 'critical');
        assert.equal(result.signatures[0].lifeLeft, undefined);
        assert.equal(result.signatures[1].bookmark, undefined);
    });
    it('shortens existing life to one hour and handles regular-signature conversion', function() {
        context.tripwire.serverTime = {time: new Date('2026-11-10T20:00:00Z')};
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ABC123', type: 'unknown'}};
        const converted = paste('C1 ABC ??? <1H <10%').update[0];
        assert.equal(converted.wormhole.lifeHours, 1);
        assert.equal(converted.signatures[0].lifeLeft, '2026-11-10 21:00:00');
        assert.equal(converted.signatures[1].lifeLeft, '2026-11-10 21:00:00');
        context.tripwire.client.signatures[1].type = 'wormhole';
        context.tripwire.client.signatures[1].lifeLeft = '2026-11-10 23:00:00';
        context.tripwire.client.signatures[2] = {id: 2, systemID: null, type: 'wormhole', lifeLeft: '2026-11-10 23:00:00'};
        context.tripwire.client.wormholes = {3: {id: 3, initialID: 1, secondaryID: 2, life: 'critical'}};
        assert.equal(paste('C1 ABC ??? <1H').update[0].wormhole.lifeHours, 1);
    });
    it('keeps the tightest markers across repeated bookmarks', function() {
        const result = paste('DR GCG ??? <1H <10%\nDR GCG ??? <4h <50%').add[0];
        assert.equal(result.wormhole.lifeHours, 1);
        assert.equal(result.wormhole.mass, 'critical');
        assert.equal(result.signatures[1].systemID, 19);
    });
    it('ignores the home marker and resolves an unknown signature by destination', function() {
        context.tripwire.systems = {31000002: {name: 'J123658', class: 3}};
        const entry = paste('C3 ??? 658 *\tMC Deputy Training / Wormholes\t2026.11.10 21:34').add[0];
        assert.equal(entry.signatures[0].signatureID, '???');
        assert.equal(entry.signatures[1].systemID, '31000002');
        assert.equal(entry.signatures[1].bookmark, '658');
        assert.equal(entry.signatures[1].name, undefined);
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: null, type: 'wormhole'}, 2: {id: 2, systemID: 31000002, type: 'wormhole'}};
        context.tripwire.client.wormholes = {3: {id: 3, initialID: 1, secondaryID: 2}};
        const repeated = paste('c3 ??? 658*');
        assert.equal(repeated.add.length, 0);
        assert.equal(repeated.update[0].signatures[0].id, 1);
    });
    it('does not merge unknown IDs for different destinations or overwrite another unknown hole', function() {
        context.tripwire.systems = {31000002: {name: 'J123658', class: 3}, 31000003: {name: 'J123659', class: 3}};
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: '???', type: 'wormhole'}, 2: {id: 2, systemID: 31000003, type: 'wormhole'}};
        context.tripwire.client.wormholes = {3: {id: 3, initialID: 1, secondaryID: 2}};
        const result = paste('C3 ??? 658 *\nC3 ??? 659');
        assert.equal(result.add.length, 1);
        assert.equal(result.add[0].signatures[1].systemID, '31000002');
        assert.equal(result.update.length, 1);
        assert.equal(result.update[0].signatures[1].systemID, 31000003);
    });
    it('ignores home markers alongside wormhole state markers', function() {
        const result = paste('DR GCG * ??? <1h <10%').add[0];
        assert.equal(result.signatures[1].bookmark, undefined);
        assert.equal(result.wormhole.lifeHours, 1);
        assert.equal(result.wormhole.mass, 'critical');
    });
    function mappedHighsec(reverse) {
        context.tripwire.systems[30000010] = {name: 'Botane', security: 0.8, factionID: 500004};
        context.tripwire.client.signatures = {
            1: {id: 1, systemID: 31000001, signatureID: '???', type: 'wormhole'},
            2: {id: 2, systemID: 30000010, signatureID: 'EXT123', type: 'wormhole'}
        };
        context.tripwire.client.wormholes = {3: {id: 3, initialID: reverse ? 2 : 1, secondaryID: reverse ? 1 : 2, parent: 'initial', type: 'K162', life: 'critical', mass: 'destab'}};
    }
    for (const reverse of [false, true]) {
        it('reuses the existing Botane connection for an HS bookmark (reverse=' + reverse + ')', function() {
            mappedHighsec(reverse);
            const result = paste('HS NHF ???');
            assert.equal(result.add.length, 0);
            assert.equal(result.update.length, 1);
            const entry = result.update[0];
            assert.equal(entry.wormhole.id, 3);
            assert.equal(entry.wormhole.type, 'K162');
            assert.equal(entry.wormhole.life, 'critical');
            assert.equal(entry.wormhole.mass, 'destab');
            assert.equal(entry.signatures[reverse ? 1 : 0].signatureID, 'NHF');
            assert.equal(entry.signatures[reverse ? 0 : 1].systemID, 30000010);
        });
    }
    it('repairs a pasted generic duplicate by retaining the mapped connection', function() {
        mappedHighsec(false);
        context.tripwire.client.signatures[4] = {id: 4, systemID: 31000001, signatureID: 'NHF', type: 'wormhole'};
        context.tripwire.client.signatures[5] = {id: 5, systemID: 2, type: 'wormhole'};
        context.tripwire.client.wormholes[6] = {id: 6, initialID: 4, secondaryID: 5};
        const result = paste('HS NHF ???');
        assert.equal(result.add.length, 0);
        assert.equal(result.update[0].wormhole.id, 3);
        assert.equal(result.update[0].signatures[0].signatureID, 'NHF');
        assert.equal(result.remove.length, 1);
        assert.equal(result.remove[0].id, 6);
    });
    it('preserves a known local ID when the bookmark ID is unknown', function() {
        mappedHighsec(false);
        context.tripwire.client.signatures[1].signatureID = 'NHF123';
        const result = paste('HS ??? Botane *');
        assert.equal(result.add.length, 0);
        assert.equal(result.update[0].signatures[0].signatureID, 'NHF123');
    });
    it('does not assign two pasted IDs to the same connection', function() {
        mappedHighsec(false);
        const result = paste('HS NHF ???\nHS ABC ???');
        assert.equal(result.update.length, 0);
        assert.equal(result.add.length, 2);
    });
    it('does not guess between two compatible mapped connections', function() {
        mappedHighsec(false);
        context.tripwire.client.signatures[4] = {id: 4, systemID: 31000001, signatureID: null, type: 'wormhole'};
        context.tripwire.client.signatures[5] = {id: 5, systemID: 30000142, type: 'wormhole'};
        context.tripwire.client.wormholes[6] = {id: 6, initialID: 4, secondaryID: 5};
        assert.equal(paste('HS NHF ???').add.length, 1);
        assert.equal(context.payload.signatures.update.length, 0);
    });
    it('respects faction hints rather than merging with the only wrong-faction connection', function() {
        mappedHighsec(false);
        const result = paste('HS NHF SQUID');
        assert.equal(result.update.length, 0);
        assert.equal(result.add.length, 1);
    });
    it('applies the reported HTML-escaped life and mass markers to existing connections', function() {
        context.tripwire.serverTime = {time: new Date('2026-11-10T21:45:00Z')};
        context.tripwire.client.signatures = {
            1: {id: 1, systemID: 31000001, signatureID: 'HGX123', type: 'wormhole'},
            2: {id: 2, systemID: 4, type: 'wormhole'},
            3: {id: 3, systemID: 31000001, signatureID: 'NHF456', type: 'wormhole'},
            4: {id: 4, systemID: 2, type: 'wormhole'}
        };
        context.tripwire.client.wormholes = {
            5: {id: 5, initialID: 1, secondaryID: 2, life: 'stable', mass: 'stable'},
            6: {id: 6, initialID: 3, secondaryID: 4, life: 'stable', mass: 'stable'}
        };
        const result = paste('C2 HGX ??? &lt;4H &lt;10%\tMC Deputy Training / Wormholes\t2026.11.10 21:44\nHS NHF FRANCE\tMC Deputy Training / Wormholes\t2026.11.10 21:42');
        assert.equal(result.add.length, 0);
        assert.equal(result.update.length, 2);
        const entry = result.update.find(entry => entry.wormhole.id === 5);
        assert.equal(entry.wormhole.life, 'critical');
        assert.equal(entry.wormhole.lifeHours, 4);
        assert.equal(entry.wormhole.mass, 'critical');
        assert.equal(entry.signatures[0].lifeLeft, '2026-11-11 01:45:00');
        assert.equal(entry.signatures[1].lifeLeft, '2026-11-11 01:45:00');
        assert.equal(entry.signatures[1].bookmark, undefined);
        const highsec = result.update.find(entry => entry.wormhole.id === 6);
        assert.equal(highsec.signatures[1].bookmark, 'FRANCE');
        assert.equal(highsec.wormhole.life, 'stable');
        assert.equal(highsec.wormhole.mass, 'stable');
    });
    for (const marker of ['&lt;', '&LT;', '&#60;', '&#x3c;']) {
        it('accepts ' + marker + ' markers on newly imported wormholes', function() {
            const entry = paste('C2 ABC ??? ' + marker + '1h ' + marker + '50%').add[0];
            assert.equal(entry.wormhole.lifeHours, 1);
            assert.equal(entry.wormhole.mass, 'destab');
            assert.equal(entry.signatures[1].bookmark, undefined);
        });
    }
    for (const [code, type] of [['GS', 'Gas'], ['DC', 'Data'], ['RC', 'Relic']]) {
        for (const marker of ['---', '-*-']) {
            it('treats ' + code + ' ' + marker + ' as a camp for the same signature', function() {
                const camp = code + ' ABC ' + marker;
                const alone = paste(camp).add[0];
                assert.equal(alone.type, type);
                assert.equal(alone.name, undefined);
                for (const rows of [[camp, 'Z ABC-123 Named Site'], ['Z ABC-123 Named Site', camp]]) {
                    const result = paste(rows.join('\n'));
                    assert.equal(result.add.length, 1);
                    assert.equal(result.add[0].signatureID, 'ABC123');
                    assert.equal(result.add[0].type, type);
                    assert.equal(result.add[0].name, 'Named Site');
                }
                context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ABC123', type: 'unknown', name: 'Named Site'}};
                const updated = paste(camp).update[0];
                assert.equal(updated.type, type);
                assert.equal(updated.name, 'Named Site');
            });
        }
    }
    it('keeps a prefix-only row unresolved when a scan contains multiple full IDs', function() {
        context.tripwire.client.signatures = {1: {id: 1, systemID: 31000001, signatureID: 'ABC', type: 'unknown'}};
        const result = paste('ABC-123\tCosmic Signature\tGas Site\tReservoir\t100.0%\t1.00 AU\nABC-456\tCosmic Signature\tData Site\tMainframe\t100.0%\t1.00 AU');
        assert.equal(result.update.length, 0);
        assert.deepEqual(Array.from(result.add, sig => sig.signatureID), ['ABC123', 'ABC456']);
        assert.equal(context.tripwire.client.signatures[1].signatureID, 'ABC');
    });
    it('prefers the exact full-ID row over an earlier prefix-only row', function() {
        context.tripwire.client.signatures = {
            1: {id: 1, systemID: 31000001, signatureID: 'ABC', type: 'unknown'},
            2: {id: 2, systemID: 31000001, signatureID: 'ABC123', type: 'unknown'}
        };
        const result = paste('Z ABC-123 Forgotten Perimeter Gateway');
        assert.equal(result.add.length, 0);
        assert.equal(result.update.length, 1);
        assert.equal(result.update[0].id, 2);
    });
    it('continues to parse scanner results', function() {
        const result = paste('HOT-250\tCosmic Signature\tWormhole\tUnstable Wormhole\t100.0%\t55 km');
        assert.equal(result.add[0].signatures[0].signatureID, 'HOT250');
    });
});

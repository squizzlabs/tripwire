const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const {execFileSync} = require('child_process');
const {readSource} = require('./helpers/source');
const types = require('../../tools/wormholes.json');

describe('Signature lifetime policy', function() {
    const context = vm.createContext({_: {some: (items, predicate) => items.some(predicate)}});
    vm.runInContext(fs.readFileSync('public/js/combine.js', 'utf8'), context);
    for (const section of ['tripwire/genericSystemTypes', 'systemAnalysis', 'wormholeAnalysis']) {
        vm.runInContext(readSource(section), context);
    }
    vm.runInContext(readSource('signatureLifetime'), context);
    const duration = context.signatureLifetime;
    it('caps unknowns at 24 hours and sites at 72 hours, including invalid settings', function() {
        for (const requested of [0, -1, NaN, Infinity, 672 * 3600]) {
            assert.equal(duration('unknown', [], requested), 86400);
            assert.equal(duration('relic', [], requested), 259200);
        }
        assert.equal(duration('gas', [], 3600), 3600);
    });
    it('resolves the typed end, supports fractional hours, and bounds unidentified holes', function() {
        assert.equal(duration('wormhole', ['K162', 'a009']), 16200);
        assert.equal(duration('wormhole', ['U210', 'K162']), 84600);
        assert.equal(duration('wormhole', ['B041']), 172800);
        assert.equal(duration('wormhole', ['K162', '????']), 172800);
        assert.equal(duration('wormhole', ['F216']), 43200);
    });
    it('uses the highest eligible lifetime in either direction for real and generic systems', function() {
        for (const [source, target, hours] of [[6, 3, 16], [8, 2, 48], [8, 1, 48], [5, 1, 24],
                                               [9, 3, 4.5], [10, 10, 12], [31001031, 1, 24],
                                               [6, null, 24], [null, null, 48]]) {
            assert.equal(duration('wormhole', ['K162', '????'], undefined, source, target), hours * 3600);
            assert.equal(duration('wormhole', [], undefined, target, source), hours * 3600);
        }
        assert.equal(duration('wormhole', ['U210'], undefined, 5, 1), 23.5 * 3600);
        assert.equal(duration('wormhole', [], 3600, 8, 2), 3600, 'preserve an earlier deadline');
    });
    it('keeps PHP, cron, and SQL connection categories consistent with browser eligibility', function() {
        const policy = require('../../tools/signature-connections.json');
        for (let a = 0; a < policy.representatives.length; a++) {
            for (let b = 0; b < policy.representatives.length; b++) {
                assert.equal(policy.maximum[a][b], duration('wormhole', [], undefined,
                    policy.representatives[a], policy.representatives[b]), `${a} / ${b}`);
            }
        }
    });
    it('ships the audited data in the browser bundle', function() {
        const bundle = {};
        vm.runInNewContext(fs.readFileSync('public/js/combine.js', 'utf8'), bundle);
        for (const [type, info] of Object.entries(types)) {
            assert.equal(bundle.appData.wormholes[type].life, info.life, type);
        }
    });
    it('enforces the server policy for writes and paired connections', function() {
        assert.match(execFileSync('php', ['app/php-test/signature-lifetime.php'], {encoding: 'utf8'}), /checks passed/);
    });
    it('keeps generated migration and seed policies in sync', function() {
        const migration = fs.readFileSync('tripwire_update.sql', 'utf8');
        const seed = fs.readFileSync('.docker/mysql/tripwire.sql', 'utf8').replace(/\r\n/g, '\n');
        const block = text => text.split('-- BEGIN GENERATED SIGNATURE EXPIRY POLICY')[1].split('-- END GENERATED SIGNATURE EXPIRY POLICY')[0];
        assert.equal(block(seed), block(migration));
        for (const [type, info] of Object.entries(types)) {
            assert.ok(block(migration).includes(`('${type}', ${parseFloat(info.life) * 3600})`), type);
        }
        const connections = require('../../tools/signature-connections.json');
        connections.maximum.forEach((row, source) => row.forEach((seconds, target) => {
            assert.ok(block(migration).includes(`(${source}, ${target}, ${seconds})`));
        }));
        assert.ok(!migration.includes('NOW() - INTERVAL 0.1 * lifeLength'));
    });
});

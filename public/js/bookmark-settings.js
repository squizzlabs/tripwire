/* Per-account clipboard conventions. Shared maps never store a user's rule set. */
(function(root) {
    var codes = ['HS', 'LS', 'NS', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C?', 'DR', 'TR', 'PC', 'GS', 'DC', 'RC', 'Z'];
    var factions = {CALDARI: 500001, MINMATAR: 500002, AMARR: 500003, GALLENTE: 500004};
    var categories = ['Combat', 'Data', 'Relic', 'Gas', 'Ore', 'Other'];
    function preset(name) {
        return {
            enabled: true, unprefixed: true, inferSites: true, suffix: true, reuseConnections: true,
            fallback: 'Other', prefixes: codes.map(function(code) { return code + '=' + code; }).join('\n'),
            factions: name === 'training' ? 'SQUID=CALDARI\nRUST=MINMATAR\nFRANCE=GALLENTE\nCHINA=AMARR' : '',
            markers: '<4H=LIFE4\n<1H=LIFE1\n<50%=MASS50\n<10%=MASS10',
            campMarkers: name === 'training' ? '---, -*-' : '',
            ignoreMarkers: name === 'training' ? '*' : '', sites: ''
        };
    }
    function normalize(value) {
        var result = preset('standard');
        Object.keys(result).forEach(function(key) {
            if (value && typeof value[key] === typeof result[key]) result[key] = value[key];
        });
        return result;
    }
    function mappings(text, field, allowed, spaced) {
        var result = Object.create(null);
        text.split(/\r?\n/).forEach(function(line, index) {
            if (!line.trim()) return;
            var pos = line.indexOf('=');
            var key = line.slice(0, pos).trim().replace(/\s+/g, ' ').toUpperCase();
            var target = line.slice(pos + 1).trim().toUpperCase();
            if (pos < 1 || !key || (!spaced && /\s/.test(key)) || !allowed.includes(target)) {
                throw Error(field + ', line ' + (index + 1) + ': use NAME=VALUE with a supported value.');
            }
            if (Object.prototype.hasOwnProperty.call(result, key)) throw Error(field + ': duplicate rule for ' + key + '.');
            result[key] = target;
        });
        return result;
    }
    function markerList(text) {
        return text.split(',').map(function(value) { return value.trim().toUpperCase(); }).filter(Boolean);
    }
    function compile(value) {
        var config = normalize(value);
        var rules = {
            config: config,
            prefixes: mappings(config.prefixes, 'Bookmark codes', codes, false),
            factions: mappings(config.factions, 'Faction aliases', Object.keys(factions), false),
            markers: mappings(config.markers, 'Life and mass markers', ['LIFE4', 'LIFE1', 'MASS50', 'MASS10'], false),
            sites: mappings(config.sites, 'Site names', categories.map(function(c) { return c.toUpperCase(); }), true),
            campMarkers: markerList(config.campMarkers), ignoreMarkers: markerList(config.ignoreMarkers)
        };
        if (!['Other', 'unknown'].includes(config.fallback)) throw Error('Choose Other or Unknown as the fallback category.');
        return rules;
    }
    function canonicalHint(text, rules) {
        if (!text.trim()) return undefined;
        return 'bm1:' + text.trim().split(/\s+/).map(function(token) {
            var upper = token.toUpperCase();
            if (rules.factions[upper]) return '@f' + factions[rules.factions[upper]];
            if (rules.config.suffix && /^\d{3}$/.test(token)) return '@j' + token;
            // Escape reserved tokens so ordinary bookmark text stays literal.
            return token.replace(/^@/, '@@');
        }).join(' ');
    }
    var api = {preset: preset, normalize: normalize, compile: compile, canonicalHint: canonicalHint};
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.bookmarkSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

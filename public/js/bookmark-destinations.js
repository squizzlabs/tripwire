/* Shared by clipboard ingestion and both auto-mappers. */
(function(root) {
    var factions = {SQUID: 500001, RUST: 500002, FRANCE: 500004, CHINA: 500003};
    function tokens(text) { return (text || '').toUpperCase().trim().split(/\s+/).filter(Boolean); }
    var regionCache = new WeakMap();
    function spaceFaction(system, systems) {
        var faction = Number(system.factionID);
        // CONCORD-administered systems can still lie in an empire's space.
        if (faction !== 500006 || !systems) return Number(system.spaceFactionID || faction);
        if (!regionCache.has(systems)) {
            var counts = {};
            Object.keys(systems).forEach(function(id) {
                var s = systems[id], f = Number(s.factionID);
                if (f < 500001 || f > 500004) return;
                var region = counts[s.regionID] || (counts[s.regionID] = {});
                region[f] = (region[f] || 0) + 1;
            });
            regionCache.set(systems, counts);
        }
        var region = regionCache.get(systems)[system.regionID] || {};
        var ranked = Object.keys(region).sort(function(a, b) { return region[b] - region[a]; });
        return ranked.length && (!ranked[1] || region[ranked[0]] > region[ranked[1]]) ? Number(ranked[0]) : faction;
    }
    function hintsMatch(text, system, systems) {
        return tokens(text).every(function(token) {
            if (factions[token]) return spaceFaction(system, systems) === factions[token];
            if (/^\d{3}$/.test(token)) return /^J\d{6}$/i.test(system.name || '') && system.name.slice(-3) === token;
            return true;
        });
    }
    function matchesType(code, system) {
        var cls = Number(system.class || system.wormholeClass);
        if (code === 'DR') return [14, 15, 16, 17, 18].indexOf(cls) !== -1;
        if (/^C/.test(code)) return code === 'C?' ? cls > 0 : cls === Number(code.slice(1));
        if (code === 'TR' || code === 'PC') return Number(system.factionID) === 500026;
        if (cls || Number(system.factionID) === 500026) return false;
        var security = Number(system.security);
        return code === 'HS' ? security >= 0.45 : code === 'LS' ? security > 0 && security < 0.45 : security <= 0;
    }
    function matches(text, code, system, regions, systems) {
        if (!matchesType(code.toUpperCase(), system) || !hintsMatch(text, system, systems)) return false;
        var name = (system.name || '').toUpperCase();
        var region = ((regions[system.regionID] || {}).name || '').toUpperCase();
        return tokens(text).every(function(token) {
            return factions[token] || /^\d{3}$/.test(token) || /^[?-]+$/.test(token) ||
                name.indexOf(token) !== -1 || region.indexOf(token) !== -1;
        });
    }
    function resolve(text, code, systems, regions) {
        var parts = tokens(text);
        if (!parts.length || parts.every(function(t) { return /^[?-]+$/.test(t); })) return null;
        var candidates = Object.keys(systems).filter(function(id) {
            return matches(text, code, systems[id], regions, systems);
        });
        return candidates.length === 1 ? candidates[0] : null;
    }
    function displayName(name) {
        // Older bookmark imports put destination hints in the custom-name field.
        return tokens(name).some(function(token) { return factions[token]; }) || /^\d{3}$/.test((name || '').trim()) ? null : name;
    }
    var api = {matches: matches, displayName: displayName, resolve: resolve, hintsMatch: hintsMatch, spaceFaction: spaceFaction};
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.bookmarkDestinations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

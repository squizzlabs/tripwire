/* Shared by clipboard ingestion and both auto-mappers. */
(function(root) {
    var factions = {SQUID: 500001, RUST: 500002, FRANCE: 500004, CHINA: 500003};
    function tokens(text) { return (text || '').replace(/^bm1:/, '').toUpperCase().trim().split(/\s+/).filter(Boolean); }
    function factionFor(token, text) {
        return /^bm1:/.test(text || '') ? (/^@F50000[1-4]$/.test(token) ? Number(token.slice(2)) : null) : factions[token];
    }
    function suffixFor(token, text) {
        return /^bm1:/.test(text || '') ? (/^@J\d{3}$/.test(token) ? token.slice(2) : null) : (/^\d{3}$/.test(token) ? token : null);
    }
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
            var faction = factionFor(token, text), suffix = suffixFor(token, text);
            if (faction) return spaceFaction(system, systems) === faction;
            if (suffix) return /^J\d{6}$/i.test(system.name || '') && system.name.slice(-3) === suffix;
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
            var literal = token.replace(/^@@/, '@');
            return factionFor(token, text) || suffixFor(token, text) || /^[?-]+$/.test(token) ||
                name.indexOf(literal) !== -1 || region.indexOf(literal) !== -1;
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
    function equivalentHints(a, b) {
        function normalized(text) {
            return tokens(text).map(function(token) {
                var faction = factionFor(token, text), suffix = suffixFor(token, text);
                return faction ? '@f' + faction : suffix ? '@j' + suffix : token.replace(/^@@/, '@');
            }).sort().join(' ');
        }
        return normalized(a) === normalized(b);
    }
    function displayName(name) {
        // Older bookmark imports put destination hints in the custom-name field.
        return tokens(name).some(function(token) { return factions[token]; }) || /^\d{3}$/.test((name || '').trim()) ? null : name;
    }
    var api = {equivalentHints: equivalentHints, matches: matches, displayName: displayName, resolve: resolve, hintsMatch: hintsMatch, spaceFaction: spaceFaction};
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.bookmarkDestinations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

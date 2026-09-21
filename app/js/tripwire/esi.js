tripwire.esi = function() {
    var baseUrl = "https://esi.evetech.net";
    var userAgent = "Tripwire Client " + tripwire.version + " (" + window.location.hostname + ") - " + window.navigator.userAgent;
    const esiCache = new Map();

    async function esiGet(url) {
        const cached = esiCache.get(url);
        const headers = {Accept: "application/json"};
        if (cached) headers["If-None-Match"] = cached.etag;
        const response = await fetch(url, {headers: headers});
        const warning = response.headers.get("warning");
        if (warning) console.warn("ESI API Warning:", warning, url);
        if (response.status === 304) {
            if (!cached) throw new Error("ESI returned 304 without cached data: " + url);
            return {
                data: cached.data,
                expires: response.headers.get("expires") || new Date(Date.now() + 60000).toUTCString()
            };
        }
        if (!response.ok) throw new Error("ESI request failed: " + response.status + " " + url);
        const data = await response.json();
        const etag = response.headers.get("etag");
        const expires = response.headers.get("expires") || new Date(Date.now() + 60000).toUTCString();
        esiCache.delete(url);
        if (etag) {
            esiCache.set(url, {etag: etag, data: data});
            if (esiCache.size > 100) esiCache.delete(esiCache.keys().next().value);
        }
        return {data: data, expires: expires};
    }

    async function esiData(url) {
        return (await esiGet(url)).data;
    }
    this.esi.connection = true;
    this.esi.characters = {};

	function updateTracking(character) {
		// Visibility settings are consumed by the backend tracker from the saved
		// preferences. Character state itself is server-owned.
		options.save();
	}
	this.esi.updateTracking = updateTracking;	// so it can be called outside

    this.esi.typeLookup = function(typeID) {
        return esiData(baseUrl + "/v3/universe/types/" + typeID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.stationLookup = function(stationID) {
        return esiData(baseUrl + "/v2/universe/stations/" + stationID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.setDestination = function(destinationID, characterID, clear_waypoints, beginning) {
        clear_waypoints = clear_waypoints ? clear_waypoints : false;
        beginning = beginning ? beginning : false;
        const xhr = $.ajax({
            url: "esi.php",
            type: "POST",
            dataType: "JSON",
            data: {mode: "waypoint", targetID: destinationID, characterID: characterID, clear: clear_waypoints, beginning: beginning, _csrf: init.csrfToken}
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.showInfo = function(targetID, characterID) {
        const xhr = $.ajax({
            url: "esi.php",
            type: "POST",
            dataType: "JSON",
            data: {mode: "showInfo", targetID: targetID, characterID: characterID, _csrf: init.csrfToken}
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.eveStatus = function() {
        return esiData(baseUrl + "/v1/status/?" + $.param({user_agent: userAgent}));
    }

    this.esi.idLookup = function(eveIDs) {
        const xhr = $.ajax({
            url: baseUrl + "/v2/universe/names/?" + $.param({"user_agent": userAgent}),
            type: "POST",
            dataType: "JSON",
            contentType: "application/json",
            processData: false,
            data: JSON.stringify(eveIDs)
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.characterLookup = function(eveID) {
        return esiData(baseUrl + "/characters/" + eveID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.corporationLookup = function(eveID) {
        return esiData(baseUrl + "/v4/corporations/" + eveID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.allianceLookup = function(eveID) {
        return esiData(baseUrl + "/v3/alliances/" + eveID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.search = function(searchString, categories, strict) {
        const xhr = $.ajax({
            url: "esi.php",
            type: "POST",
            dataType: "JSON",
            data: {mode: "search", search: searchString, categories: categories, strict: strict, _csrf: init.csrfToken}
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.universeJumps = function() {
        return esiGet(baseUrl + "/v1/universe/system_jumps/?" + $.param({user_agent: userAgent}));
    }

    this.esi.universeKills = function() {
        return esiData(baseUrl + "/v2/universe/system_kills/?" + $.param({user_agent: userAgent}));
    }

    // Wrapper to make lookups easier
    this.esi.fullLookup = async function(eveIDs) {
        const data = await tripwire.esi.idLookup(eveIDs);
        await Promise.all(data.map(async function(item) {
            if (item.category === "character") {
                const character = await tripwire.esi.characterLookup(item.id);
                $.extend(item, character);
                item.corporation = await tripwire.esi.corporationLookup(character.corporation_id);
                if (item.corporation.alliance_id) {
                    item.alliance = await tripwire.esi.allianceLookup(item.corporation.alliance_id);
                }
            } else if (item.category === "corporation") {
                const corporation = await tripwire.esi.corporationLookup(item.id);
                $.extend(item, corporation);
                if (corporation.alliance_id) {
                    item.alliance = await tripwire.esi.allianceLookup(corporation.alliance_id);
                }
            } else if (item.category === "alliance") {
                $.extend(item, await tripwire.esi.allianceLookup(item.id));
            }
        }));
        return data;
    }

    this.esi.parse = function(characters) {
        for (characterID in tripwire.esi.characters) {
            if (!(characterID in characters)) {
                delete tripwire.esi.characters[characterID];
                tracking.remove(characterID);
                if (options.tracking.active == characterID) {
                    tripwire.EVE(false, true);
                    $("#removeESI").attr("disabled", "disabled");
                }
            }
        }

        for (characterID in characters) {
            if (options.tracking.active == "new") {
                options.tracking.active = characterID;
            }

            if (!(characterID in tripwire.esi.characters)) {
                var $clone = tracking.add(characters[characterID]);
				
                if (options.tracking.active == characterID) {
                    $clone.addClass("active");
                    $("#removeESI").removeAttr("disabled");
                }

            }

            tripwire.esi.characters[characterID] = characters[characterID];
			tracking.update(characters[characterID]);
        }
		
		set_tracking_text();

		// Location, ship and online state are polled by the background npm
		// scheduler. Keep rendering the selected character's last known location
		// when offline; online remains a separate status indicator.
		if (tripwire.esi.characters[options.tracking.active]) {
			var activeCharacter = tripwire.esi.characters[options.tracking.active];
			tripwire.EVE(activeCharacter);
		}
    }
}
tripwire.esi();

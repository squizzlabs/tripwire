tripwire.esi = function() {
    var baseUrl = "https://esi.evetech.net";
    var userAgent = "Tripwire Client " + tripwire.version + " (" + window.location.hostname + ") - " + window.navigator.userAgent;
    this.esi.connection = true;
    this.esi.characters = {};

	function updateTracking(character) {
		// Visibility settings are consumed by the backend tracker from the saved
		// preferences. Character state itself is server-owned.
		options.save();
	}
	this.esi.updateTracking = updateTracking;	// so it can be called outside

    this.esi.typeLookup = function(typeID, reference) {
        const xhr = $.ajax({
            url: baseUrl + "/v3/universe/types/"+ typeID +"/?" + $.param({"user_agent": userAgent}),
            // headers: {"X-User-Agent": userAgent},
            type: "GET",
            dataType: "JSON",
            reference: reference
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.stationLookup = function(stationID, reference) {
        const xhr = $.ajax({
            url: baseUrl + "/v2/universe/stations/"+ stationID +"/?" + $.param({"user_agent": userAgent}),
            // headers: {"X-User-Agent": userAgent},
            type: "GET",
            dataType: "JSON",
            reference: reference
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
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
        const xhr = $.ajax({
            url: baseUrl + "/v1/status/?" + $.param({"user_agent": userAgent}),
            // headers: {"X-User-Agent": userAgent},
            type: "GET",
            dataType: "JSON"
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
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

    this.esi.characterLookup = function(eveID, reference, async) {
        var async = typeof(async) !== 'undefined' ? async : true;
        const xhr = $.ajax({
            url: baseUrl + "/characters/" + eveID + "/?" + $.param({"user_agent": userAgent}),
            type: "GET",
            dataType: "JSON",
            async: async,
            eveID: eveID,
            reference: reference
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.corporationLookup = function(eveID, reference, async) {
        var async = typeof(async) !== 'undefined' ? async : true;
        const xhr = $.ajax({
            url: baseUrl + "/v4/corporations/" + eveID + "/?" + $.param({"user_agent": userAgent}),
            type: "GET",
            dataType: "JSON",
            async: async,
            eveID: eveID,
            reference: reference
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.allianceLookup = function(eveID, reference, async) {
        var async = typeof(async) !== 'undefined' ? async : true;
        const xhr = $.ajax({
            url: baseUrl + "/v3/alliances/" + eveID + "/?" + $.param({"user_agent": userAgent}),
            type: "GET",
            dataType: "JSON",
            async: async,
            eveID: eveID,
            reference: reference
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
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
        const xhr = $.ajax({
            url: baseUrl + "/v1/universe/system_jumps/?" + $.param({"user_agent": userAgent}),
            type: "GET",
            dataType: "JSON"
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.universeKills = function() {
        const xhr = $.ajax({
            url: baseUrl + "/v2/universe/system_kills/?" + $.param({"user_agent": userAgent}),
            type: "GET",
            dataType: "JSON"
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    // Wrapper to make lookups easier
    this.esi.fullLookup = function(eveIDs) {
        var promise = $.Deferred();

        tripwire.esi.idLookup(eveIDs)
            .done(function(data) {
                for (item in data) {
                    if (data[item].category == "character") {
                        tripwire.esi.characterLookup(data[item].id, data[item], false)
                            .done(function(characterData) {
                                $.extend(data[item], characterData);
                                tripwire.esi.corporationLookup(characterData.corporation_id, this.reference, false)
                                    .done(function(corporationData) {
                                        data[item].corporation = corporationData;
                                        if (corporationData.alliance_id) {
                                            tripwire.esi.allianceLookup(corporationData.alliance_id, this.reference, false)
                                                .done(function(allianceData) {
                                                    data[item].alliance = allianceData;
                                                });
                                        }
                                    });
                            });
                    } else if (data[item].category == "corporation") {
                        tripwire.esi.corporationLookup(data[item].id, data[item], false)
                            .done(function(corporationData) {
                                $.extend(data[item], corporationData);
                                if (corporationData.alliance_id) {
                                    tripwire.esi.allianceLookup(corporationData.alliance_id, this.reference, false)
                                        .done(function(allianceData) {
                                            data[item].alliance = allianceData;
                                        });
                                }
                            })
                    } else if (data[item].category == "alliance") {
                        tripwire.esi.allianceLookup(data[item].id, data[item], false)
                            .done(function(allianceData) {
                                $.extend(data[item], allianceData);
                            })
                    }
                }

                promise.resolve(data);
            });

        return promise;
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

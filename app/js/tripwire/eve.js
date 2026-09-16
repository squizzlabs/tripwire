function trackedSystemID(character, systems) {
    if (!character || character.systemID === null || character.systemID === undefined) return null;
    var systemID = Number(character.systemID);
    return Number.isSafeInteger(systemID) && systems[systemID] ? systemID : null;
}

function shouldFollowTrackedSystem(previousSystemID, currentSystemID, followEnabled, characterChange) {
    return !characterChange && followEnabled && previousSystemID !== null
        && currentSystemID !== null && previousSystemID !== currentSystemID;
}

// Handles data from EVE in-game data
tripwire.EVE = function(EVE, characterChange) {
    var systemChange = this.client.EVE && this.client.EVE.systemChange || false;
    var previousSystemID = trackedSystemID(this.client.EVE, this.systems);
    var currentSystemID = trackedSystemID(EVE, this.systems);

    if (EVE && currentSystemID) {
        // Location transitions and automapping are handled by the background
        // scheduler. The browser only follows and renders the selected pilot.

        // System follower
        if (shouldFollowTrackedSystem(previousSystemID, currentSystemID, options.buttons.follow, characterChange)
            && $(".ui-dialog:visible").length == 0) {
            tripwire.systemChange(currentSystemID);
        }

        if (!$("#search").hasClass("active")) {
            $("#currentSpan").show();
        }

        // Enable auto-mapper
        $("#toggle-automapper").removeClass("disabled");

        // Update current system
        // add system to Leads To dropdown
        if ($("#dialog-signature [data-autocomplete='sigSystems']").hasClass("custom-combobox")) {
            $("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete("removeFromSelect");
            $("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete("addToSelect", tripwire.systems[currentSystemID]);
        }
        $("#EVEsystem").html(systemRendering.renderSystem(systemAnalysis.analyse(currentSystemID)));
    } else if (EVE) {
        // ESI may report online before the first backend location observation.
        // Keep follow mode inert until a real, known system is available.
        $("#EVEsystem").text("Locating...");
        $("#currentSpan").show();
        $("#toggle-automapper").addClass("disabled");
    } else {
        // Update current system
        $("#EVEsystem").html("Not tracking");
        $("#currentSpan").hide();
        // Disable automapper
        $("#toggle-automapper").addClass("disabled");
        // remove system from Leads To dropdown
        if ($("#dialog-signature [data-autocomplete='sigSystems']").hasClass("custom-combobox")) {
            $("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete("removeFromSelect");
        }
    }

    this.client.EVE = EVE ? {
        characterID: EVE.characterID,
        characterName: EVE.characterName,
        systemID: currentSystemID,
        systemName: EVE.systemName,
        shipTypeID: EVE.shipTypeID,
        shipTypeName: EVE.shipTypeName,
        stationID: EVE.stationID,
        stationName: EVE.stationName,
        locationDate: EVE.locationDate,
        shipDate: EVE.shipDate,
        systemChange: systemChange
    } : null;
}

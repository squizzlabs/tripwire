// Handles pasting sigs from EVE
tripwire.pasteSignatures = function() {
    var processing = false;
	var pasteNotice = null;
	var pendingMapping = null;

    var rowParse = function(row) {
        var scanner = {};
        var columns = row.split("	"); // Split by tab
        var validScanGroups = [
            // English (en-us)
            "Cosmic Signature",
            "Cosmic Anomaly",

            // French (fr)
            "Signature cosmique",
            "Anomalie cosmique",

            // German (de)
            "Kosmische Anomalie",
            "Kosmische Signatur",

            // Japanese (ja)
            "宇宙の特異点",
            "宇宙のシグネチャ",

            // Korean (ko)
            "코즈믹 시그니처",
            "코즈믹 어노말리",

            // Russian (ru)
            "Скрытый сигнал",
            "Космическая аномалия",
        ];

        var validTypes = {
            // English (en-us)
            "Combat Site": "Combat",
            "Data Site": "Data",
            "Gas Site": "Gas",
            "Ore Site": "Ore",
            "Relic Site": "Relic",
            "Wormhole": "Wormhole",

            // French (fr)
            "Site de combat": "Combat",
            "Site de données": "Data",
            "Site de collecte de gaz": "Gas",
            "Site de minerai": "Ore",
            "Site de reliques": "Relic",
            "Trou de ver": "Wormhole",

            // German (de)
            "Kampfgebiet": "Combat",
            "Datengebiet": "Data",
            "Gasgebiet": "Gas",
            "Mineraliengebiet": "Ore",
            "Reliktgebiet": "Relic",
            "Wurmloch": "Wormhole",

            // Japanese (ja)
            "戦闘サイト": "Combat",
            "データサイト": "Data",
            "ガスサイト": "Gas",
            "鉱石サイト": "Ore",
            "遺物サイト": "Relic",
            "ワームホール": "Wormhole",

            // Korean (ko)
            "전투 사이트": "Combat",
            "데이터 사이트": "Data",
            "가스 사이트": "Gas",
            "채광 사이트": "Ore",
            "유물 사이트": "Relic",
            "웜홀": "Wormhole",

            // Russian (ru)
            "Боевой район": "Combat",
            "Информационный район": "Data",
            "Газовый район": "Gas",
            "Астероидный район": "Ore",
            "Археологический район": "Relic",
            "Червоточина": "Wormhole",
        };

        for (var x in columns) {
            if (columns[x].match(/^([A-Z]{3}[-]\d{3})$/)) {
                scanner.id = columns[x].split("-");
                continue;
            }

            if (columns[x].match(/(\d([.|,]\d)?[ ]?(%))/) || columns[x].match(/(\d[.|,]?\d+\s?(UA|AU|AE|km|m|а.е.|км|м))/i)) { // Exclude scan % || AU
                continue;
            }

            if ($.inArray(columns[x], validScanGroups) != -1) {
                scanner.scanGroup = columns[x];
                continue;
            }

            if (validTypes[columns[x]]) {
                scanner.type = validTypes[columns[x]];
                continue;
            }

            if (columns[x] != "") {
                scanner.name = columns[x].trim();
            }
        }

        if (!scanner.id || scanner.id.length !== 2) {
            return false;
        }

        return scanner;
    }

    function displaySystem(systemID) {
		if (tripwire.systems[systemID]) return tripwire.systems[systemID].name;
		if (appData.genericSystemTypes[systemID]) return appData.genericSystemTypes[systemID];
		return "Unknown destination";
	}

	function mappingCandidates(pastedIDs, excludedWormholes) {
		var candidates = [];
		var signatures = tripwire.client.signatures || {};
		excludedWormholes = excludedWormholes || {};
		$.each(tripwire.client.wormholes || {}, function(_, wormhole) {
			if (wormhole.type === "GATE") return;
			if (excludedWormholes[String(wormhole.id)]) return;
			var first = signatures[wormhole.initialID];
			var second = signatures[wormhole.secondaryID];
			if (!first || !second) return;
			var local = first.systemID == viewingSystemID ? first : (second.systemID == viewingSystemID ? second : null);
			if (!local) return;
			// A connection whose local id is in this scan is already matched by
			// the normal update path and must not be offered a second time.
			if (local.signatureID && pastedIDs[local.signatureID.toUpperCase()]) return;
			var other = local.id == first.id ? second : first;
			candidates.push({wormhole: wormhole, local: local, other: other});
		});
		return candidates;
	}

	function hasScannedID(signature) {
		return !!(signature && /^[a-z]{3}\d{3}$/i.test(signature.signatureID || ""));
	}

	// A mapper source does not have to come from the latest clipboard paste.
	// An identified wormhole already in the table can be the accidental new
	// connection, while an unknown row is the connection it should identify.
	function selectedMapping() {
		var selected = [];
		var seenWormholes = {};
		$("#sigTable tbody tr.selected").each(function() {
			var signature = tripwire.client.signatures[$(this).data("id")];
			var wormhole = signature && tripwire.signaturePayload.wormholeForSignature(signature.id);
			if (!signature || signature.type !== "wormhole" || !wormhole || wormhole.type === "GATE") return;
			if (seenWormholes[String(wormhole.id)]) return;
			seenWormholes[String(wormhole.id)] = true;
			var other = signature.id == wormhole.initialID
				? tripwire.client.signatures[wormhole.secondaryID]
				: tripwire.client.signatures[wormhole.initialID];
			if (other) selected.push({wormhole: wormhole, local: signature, other: other});
		});

		if (selected.length < 1 || selected.length > 2) return null;
		var sources = $.grep(selected, function(item) { return hasScannedID(item.local); });
		if (sources.length !== 1) return null;

		var source = sources[0];
		var excluded = {};
		excluded[String(source.wormhole.id)] = true;
		var candidates;
		if (selected.length === 2) {
			var target = selected[0] === source ? selected[1] : selected[0];
			// With two rows selected the unidentified connection is the target;
			// this makes Ctrl-click + Map a one-choice operation.
			if (hasScannedID(target.local)) return null;
			candidates = [target];
		} else {
			candidates = mappingCandidates({}, excluded);
		}
		if (!candidates.length) return null;

		return {
			pending: [{
				signatureID: source.local.signatureID,
				created: {wormhole: source.wormhole},
				removedUndo: tripwire.signaturePayload.undoEntryFor(source.local.id)
			}],
			candidates: candidates,
			systemID: viewingSystemID,
			fromSelection: true,
			applied: false
		};
	}

	function mapWormhole(payload, undo, pending, candidate) {
		var local = $.extend({}, candidate.local, {
			signatureID: pending.signatureID,
			type: "wormhole"
		});
		payload.signatures.update.push({
			wormhole: tripwire.signaturePayload.wormholeRecord(candidate.wormhole),
			signatures: candidate.wormhole.initialID == local.id ? [
				tripwire.signaturePayload.signatureRecord(local),
				tripwire.signaturePayload.signatureRecord(candidate.other)
			] : [
				tripwire.signaturePayload.signatureRecord(candidate.other),
				tripwire.signaturePayload.signatureRecord(local)
			]
		});
		// The paste has already created this connection. Replacing it with the
		// selected existing connection keeps paste immediate without leaving a
		// duplicate behind when the optional Map action is used.
		payload.signatures.remove.push(pending.created.wormhole);
		undo.push(tripwire.signaturePayload.undoEntryFor(candidate.local.id));
	}

	function submitPaste(payload, undo, successCallback, removedUndo) {
        if (payload.signatures.add.length || payload.signatures.update.length) {
            var success = function(data) {
                if (data.resultSet && data.resultSet[0].result == true) {
                    $("#undo").removeClass("disabled");

					if (data.results) {
						if (viewingSystemID in tripwire.signatures.undo) {
							tripwire.signatures.undo[viewingSystemID].push({action: "add", signatures: data.results});
						} else {
							tripwire.signatures.undo[viewingSystemID] = [{action: "add", signatures: data.results}];
						}
					}

					if (undo.length) {
						if (viewingSystemID in tripwire.signatures.undo) {
							tripwire.signatures.undo[viewingSystemID].push({action: "update", signatures: undo});
						} else {
							tripwire.signatures.undo[viewingSystemID] = [{action: "update", signatures: undo}];
						}
					}

					if (removedUndo && removedUndo.length) {
						if (viewingSystemID in tripwire.signatures.undo) {
							tripwire.signatures.undo[viewingSystemID].push({action: "remove", signatures: removedUndo});
						} else {
							tripwire.signatures.undo[viewingSystemID] = [{action: "remove", signatures: removedUndo}];
						}
					}

					sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
					if (successCallback) successCallback(data);
                }
            };

            tripwire.refresh('refresh', payload, success, function() { processing = false; });
        } else {
            processing = false;
        }
	}

	function refreshMappingChoices() {
		var chosen = {};
		$("#dialog-map-pasted-signatures select").each(function() {
			if (this.value) chosen[this.value] = true;
		});
		$("#dialog-map-pasted-signatures select").each(function() {
			var own = this.value;
			$(this).find("option[value!='']").each(function() {
				this.disabled = this.value !== own && !!chosen[this.value];
			});
		});
	}

	function setMappingPending(pending, candidates, systemID) {
		pendingMapping = {pending: pending, candidates: candidates, systemID: systemID, applied: false};
		$("#map-pasted-wormholes")
			.addClass("is-pending")
			.attr("data-tooltip", "Map pasted wormholes from the latest scan");
	}

	function clearMappingPending() {
		pendingMapping = null;
		$("#map-pasted-wormholes")
			.removeClass("is-pending")
			.attr("data-tooltip", "Map wormhole connections");
	}

	function openMappingDialog() {
		if (!pendingMapping) {
			pendingMapping = selectedMapping();
		}
		if (!pendingMapping) {
			Notify.trigger("Select one identified wormhole, or select it together with the unknown connection it belongs to.", "blue", 5000, null, {
				animation: false,
				fade: 0
			});
			return;
		}
		var pending = pendingMapping.pending;
		var candidates = pendingMapping.candidates;
		var dialog = $("#dialog-map-pasted-signatures");
		var rows = dialog.find(".paste-map-rows").empty();
		var systemID = pendingMapping.systemID;
		var systemName = tripwire.systems[systemID] ? tripwire.systems[systemID].name : "this system";
		dialog.find(".paste-map-intro").text(pendingMapping.fromSelection
			? "Map the selected signature to its existing connection in " + systemName + ". The duplicate connection will be removed."
			: "The wormholes were imported. Map any signatures that belong to existing connections in " + systemName + "."
		);
		dialog.find(".paste-map-columns span:first").text(pendingMapping.fromSelection ? "Selected signature" : "Pasted signature");
		dialog.find(".paste-map-hint").text(pendingMapping.fromSelection
			? "Applying this match keeps the existing mapped connection and removes the duplicate."
			: "Leave a signature set to “Keep new connection” if it is not one of the connections already on the map."
		);

		$.each(pending, function(index, item) {
			var row = $("<div class='paste-map-row'></div>");
			row.append($("<span class='paste-map-signature'></span>").text(formatSignatureID(item.signatureID)));
			var select = $("<select></select>").attr({
				"aria-label": "Existing connection for " + formatSignatureID(item.signatureID),
				"data-pending-index": index
			});
			select.append($("<option value=''></option>").text(pendingMapping.fromSelection ? "Do not map" : "Keep new connection"));
			$.each(candidates, function(_, candidate) {
				var type = candidate.wormhole.type && candidate.wormhole.type !== "???" ? " · " + candidate.wormhole.type : "";
				var label = formatSignatureID(candidate.local.signatureID) + " → " + displaySystem(candidate.other.systemID) + type;
				select.append($("<option></option>").val(candidate.wormhole.id).text(label));
			});
			if (pendingMapping.fromSelection && candidates.length === 1) select.val(candidates[0].wormhole.id);
			row.append(select);
			rows.append(row);
		});

		if (!dialog.hasClass("ui-dialog-content")) {
			dialog.dialog({
				autoOpen: false,
				modal: true,
				width: 600,
				buttons: {
					Cancel: function() { $(this).dialog("close"); },
					Apply: function() {
						var state = pendingMapping;
						var payload = {"signatures": {"add": [], "remove": [], "update": []}, "systemID": state.systemID};
						var undo = [];
						var removedUndo = [];
						state.applied = true;
						$(this).find("select").each(function() {
							if (!this.value) return;
							var selectedWormhole = this.value;
							var item = state.pending[parseInt($(this).attr("data-pending-index"), 10)];
							var candidate = $.grep(state.candidates, function(candidate) {
								return String(candidate.wormhole.id) === String(selectedWormhole);
							})[0];
							if (item && candidate) {
								mapWormhole(payload, undo, item, candidate);
								if (item.removedUndo) removedUndo.push(item.removedUndo);
							}
						});
						$(this).dialog("close");
						submitPaste(payload, undo, null, removedUndo);
					}
				},
				close: function() {
					if (pendingMapping && !pendingMapping.applied) {
						processing = false;
						if (pasteNotice && !pasteNotice.isDestroyed) pasteNotice.destroy();
					}
					clearMappingPending();
				}
			});
		}
		dialog.dialog("open");
	}

    this.pasteSignatures.parsePaste = function(paste) {
		if (processing) return;
		// The Map action always describes the most recent paste.
		if (pendingMapping) clearMappingPending();
        var paste = paste.split("\n");
        var payload = {"signatures": {"add": [], "update": []}, "systemID": viewingSystemID};
        var undo = [];
		var pendingWormholes = [];
		var pastedIDs = {};
        processing = true;

        for (var i in paste) {
            var scanner = rowParse(paste[i]);

            if (scanner.id) {
				pastedIDs[(scanner.id[0] + scanner.id[1]).toUpperCase()] = true;
                var signature = $.map(tripwire.client.signatures, function(signature) { if (signature.signatureID && signature.signatureID.toUpperCase() == scanner.id[0] + scanner.id[1] && signature.systemID == viewingSystemID) return signature; })[0];
                if (signature) {
                    // Update signature (only non-wormholes can be updated to a wormhole)
                    if (scanner.type == "Wormhole" && signature.type != "wormhole") {
                        var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0] || {};
                        var otherSignature = wormhole.id ? (signature.id == wormhole.initialID ? tripwire.client.signatures[wormhole.secondaryID] : tripwire.client.signatures[wormhole.initialID]) : {};
                        payload.signatures.update.push({
                            "wormhole": {
                                "id": wormhole.id || null,
                                "type": wormhole.type || null,
                                "life": wormhole.life || "stable",
                                "mass": wormhole.mass || "stable"
                            },
                            "signatures": [
                                {
                                    "id": signature.id,
                                    "signatureID": signature.signatureID,
                                    "systemID": viewingSystemID,
                                    "type": "wormhole",
                                    "name": signature.name
                                },
                                {
                                    "id": otherSignature.id || null,
                                    "signatureID": otherSignature.signatureID || null,
                                    "systemID": otherSignature.systemID || null,
                                    "type": "wormhole",
                                    "name": otherSignature.name
                                }
                            ]
                        });

                        if (tripwire.client.wormholes[wormhole.id]) {
							undo.push({"wormhole": tripwire.client.wormholes[wormhole.id], "signatures": [tripwire.client.signatures[signature.id], tripwire.client.signatures[otherSignature.id]]});
						} else {
							// used to be just a regular signature
							undo.push(tripwire.client.signatures[signature.id]);
						}
                    // Make sure we are only updating when we have new info (we never turn wormholes into regular signatures)
                    } else if (signature.type != "wormhole" && ((scanner.type && scanner.type.toLowerCase() != signature.type) || (scanner.name && scanner.name != signature.name))) {
                        payload.signatures.update.push({
                            "id": signature.id,
                            "systemID": viewingSystemID,
                            "type": scanner.type || 'unknown',
                            "name": scanner.name,
                            "lifeLength": options.signatures.pasteLife * 60 * 60
                        });
                        undo.push(tripwire.client.signatures[signature.id]);
                    }
                } else {
                    // Add signature
                    if (scanner.type == "Wormhole") {
                        var addition = {
                            "wormhole": {
                                "type": null,
                                "parent": "initial",
                                "life": "stable",
                                "mass": "stable"
                            },
                            "signatures": [
                                {
                                    "signatureID": scanner.id[0] + scanner.id[1],
                                    "systemID": viewingSystemID,
                                    "type": "wormhole",
                                    "lifeLength": options.signatures.pasteLife * 60 * 60
                                },
                                {
                                    "signatureID": null,
                                    "systemID": null,
                                    "type": "wormhole",
                                    "lifeLength": options.signatures.pasteLife * 60 * 60
                                }
                            ]
                        };
						payload.signatures.add.push(addition);
						pendingWormholes.push({signatureID: scanner.id[0] + scanner.id[1], add: addition});
                    } else {
                        payload.signatures.add.push({
                            "signatureID": scanner.id[0] + scanner.id[1],
                            "systemID": viewingSystemID,
                            "type": scanner.type || 'unknown',
                            "name": scanner.name,
                            "lifeLength": options.signatures.pasteLife * 60 * 60
                        });
                    }
                }
            }
        }

		var candidates = pendingWormholes.length ? mappingCandidates(pastedIDs) : [];
		var addIndexes = $.map(pendingWormholes, function(item) {
			return payload.signatures.add.indexOf(item.add);
		});
		submitPaste(payload, undo, candidates.length ? function(data) {
			var mappable = [];
			$.each(pendingWormholes, function(index, item) {
				var created = data.results && data.results[addIndexes[index]];
				if (created && created.wormhole) {
					mappable.push({signatureID: item.signatureID, created: created});
				}
			});
			if (mappable.length) setMappingPending(mappable, candidates, payload.systemID);
		} : null);
    }

    this.pasteSignatures.init = function() {
        $(document).keydown(function(e)	{
            if ((e.metaKey || e.ctrlKey) && (e.keyCode == 86 || e.keyCode == 91) && !processing) {
                // Do not steal a normal paste from anything the user can edit.
                // Notes use a contenteditable div, so checking only input and
                // textarea moved focus to #clipboard before the paste event and
                // made the global signature importer consume the note text.
                var $active = $(document.activeElement);
                if ($active.is("textarea, input, select, [contenteditable=true]") ||
                    $active.closest(".rte, [contenteditable=true]").length) return;

                $("#clipboard").focus();
            }
        });

        $("body").on("click", "#fullPaste", function(e) {
            e.preventDefault();

			var notice = $(this).closest(".jBox-Notice").data("jBox");
            var paste = $(this).data("paste").split("\n");
            var pasteIDs = [];
            var removes = [];
            var undo = [];

            for (var i in paste) {
                if (scan = rowParse(paste[i])) {
                    pasteIDs.push((scan.id[0] + scan.id[1]).toLowerCase());
                }
            }

            for (var i in tripwire.client.signatures) {
                var signature = tripwire.client.signatures[i];

                if (signature.systemID == viewingSystemID && signature.signatureID && $.inArray(signature.signatureID.toLowerCase(), pasteIDs) === -1 && signature.signatureID !== "???") {
                    if (signature.type == "wormhole") {
                        var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0] || {};
                        var otherSignature = wormhole.id ? (signature.id == wormhole.initialID ? tripwire.client.signatures[wormhole.secondaryID] : tripwire.client.signatures[wormhole.initialID]) : {};
                        if (wormhole.type !== "GATE") {
                            removes.push(wormhole);
                            undo.push({"wormhole": wormhole, "signatures": [signature, otherSignature]});
                        }
                    } else {
                        removes.push(signature.id);
                        undo.push(signature);
                    }
                }
            }

            if (removes.length > 0) {
                var payload = {"signatures": {"remove": removes}};

                var success = function(data) {
                    if (data.resultSet && data.resultSet[0].result == true) {
                        $("#undo").removeClass("disabled");
                        if (viewingSystemID in tripwire.signatures.undo) {
                            tripwire.signatures.undo[viewingSystemID].push({action: "remove", signatures: undo});
                        } else {
                            tripwire.signatures.undo[viewingSystemID] = [{action: "remove", signatures: undo}];
                        }

                        sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
                    }
                }

                tripwire.refresh('refresh', payload, success);
            }

			if (notice) notice.close({ignoreDelay: true});
        });

		$("body").on("click", ".paste-notice-dismiss", function() {
			var notice = $(this).closest(".jBox-Notice").data("jBox");
			if (notice) notice.close({ignoreDelay: true});
		});

        $("#clipboard").on("paste", function(e) {
            e.preventDefault();
            var paste = window.clipboardData ? window.clipboardData.getData("Text") : (e.originalEvent || e).clipboardData.getData('text/plain');

            $("#clipboard").blur();
			tripwire.pasteSignatures.notifyPaste(paste);
			tripwire.pasteSignatures.parsePaste(paste);
		});

		$("body").on("change", "#dialog-map-pasted-signatures select", refreshMappingChoices);
		$("body").on("click", "#map-pasted-wormholes", openMappingDialog);
		$("body").on("keydown", "#map-pasted-wormholes", function(e) {
			if (e.key !== "Enter" && e.key !== " ") return;
			e.preventDefault();
			openMappingDialog();
		});
    }

	this.pasteSignatures.notifyPaste = function(paste) {
		if (pasteNotice && !pasteNotice.isDestroyed) pasteNotice.destroy();
		var noticeDuration = 10000;

		var content = [
			"<div class='paste-notice'>",
				"<span class='paste-notice-progress' aria-hidden='true'></span>",
				"<p class='paste-notice-message' role='status' aria-live='polite'>Paste detected.</p>",
				"<button id='fullPaste' class='paste-notice-action' type='button'>Delete signatures missing from this scan</button>",
				"<button class='paste-notice-dismiss' type='button'>Dismiss</button>",
			"</div>"
		].join("");

		// Keep the cleanup shortcut available briefly without leaving a large
		// notice parked over the map indefinitely.
		pasteNotice = Notify.trigger(content, "blue", noticeDuration, null, {
			animation: false,
			closeOnClick: false,
			closeOnEsc: true,
			fade: 0
		});
		pasteNotice.wrapper.find(".paste-notice-progress").css("--paste-notice-duration", noticeDuration + "ms");
		pasteNotice.wrapper.find("#fullPaste").data("paste", paste);
	}

    this.pasteSignatures.init();
}
tripwire.pasteSignatures();

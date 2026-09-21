$("#signaturesWidget").on("click", "#delete-signature", function(e) {
	e.preventDefault();

	if ($(this).closest("tr").attr("disabled")) {
		return false;
	} else if ($("#sigTable tr.selected").length == 0) {
		return false;
	} else if ($("#dialog-sigEdit").hasClass("ui-dialog-content") && $("#dialog-sigEdit").dialog("isOpen")) {
		$("#dialog-sigEdit").parent().effect("shake", 300);
		return false;
	}
		
	openDeleteDialog({
		signatures: $.map($("#sigTable tr.selected"), function(n) {
			return tripwire.client.signatures[$(n).data("id")];
		})
	});
});

function openDeleteDialog(vm, successFunction) {
	openDeleteDialog.deleteDialogVM = vm;	// outside so it's not saved in the closure first time we open the dialog

	// check if dialog is open
	if (!$("#dialog-deleteSig").hasClass("ui-dialog-content")) {
		$("#dialog-deleteSig").dialog({
			resizable: false,
			minHeight: 0,
			modal: true,
			width: 400,
			dialogClass: "dialog-noeffect ui-dialog-shadow signatureDeleteDialog",
			buttons: [
				{
					text: "Cancel",
					click: function() {
						$(this).dialog("close");
					}
				},
				{
					text: "Delete",
					click: function() {
					// Prevent duplicate submitting
					$("#dialog-deleteSig").parent().find(":button:contains('Delete')").button("disable");
					var payload = {"signatures": {"remove": []}, "systemID": viewingSystemID};
					var undo = [];

					var signaturePayload = $.map(openDeleteDialog.deleteDialogVM.signatures, function(signature) {
						if (signature.type != "wormhole") {
							undo.push(signature);
							return signature.id;
						} else {
							var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0];
							undo.push({"wormhole": wormhole, "signatures": [tripwire.client.signatures[wormhole.initialID], tripwire.client.signatures[wormhole.secondaryID]]});
							return wormhole;
						}
					});
					payload.signatures.remove = signaturePayload;

					var success = function(data) {
						if (data.resultSet && data.resultSet[0].result == true) {
							$("#dialog-deleteSig").dialog("close");
							if(successFunction) { successFunction(); }

							$("#undo").removeClass("disabled");
							if (viewingSystemID in tripwire.signatures.undo) {
								tripwire.signatures.undo[viewingSystemID].push({action: "remove", signatures: undo});
							} else {
								tripwire.signatures.undo[viewingSystemID] = [{action: "remove", signatures: undo}];
							}

							sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
						}
					}

					var always = function(data) {
						$("#dialog-deleteSig").parent().find(":button:contains('Delete')").button("enable");
					}

					tripwire.refresh('refresh', payload, success, always);
				}
				}
			],
			open: function() {
				const sigs = openDeleteDialog.deleteDialogVM.signatures;
				const signatureID = sigs.length == 1 ? formatSignatureID(sigs[0].signatureID) : null;
				$("#dialog-deleteSig").dialog("option", "title", sigs.length == 1 ? 'Delete signature' : 'Delete signatures');
				document.getElementById('deleteSigHeading').innerText = sigs.length == 1
					? (signatureID == '???-###' ? 'Delete this signature?' : 'Delete ' + signatureID + '?')
					: 'Delete ' + sigs.length + ' signatures?';
				document.getElementById('deleteSigText').innerText = sigs.length == 1
					? 'This ' + sigs[0].type + ' signature'
					: 'These signatures (' + sigs.map(s => formatSignatureID(s.signatureID)).join(', ') + ')';
				document.getElementById('deleteSigSystem').innerHTML = systemRendering.renderSystem(systemAnalysis.analyse(sigs[0].systemID));

				var $buttons = $(this).parent().find(".ui-dialog-buttonpane button");
				var $cancel = $buttons.filter(function() { return $.trim($(this).text()) === "Cancel"; });
				var $delete = $buttons.filter(function() { return $.trim($(this).text()) === "Delete"; });
				if (!$cancel.find("[data-icon]").length) { $cancel.prepend('<i data-icon="times" aria-hidden="true"></i>'); }
				if (!$delete.find("[data-icon]").length) { $delete.prepend('<i data-icon="trash" aria-hidden="true"></i>'); }
				$delete.focus();
			},
			close: function() {
				$("#sigTable tr.selected").removeClass("selected");
				//$("#sigTable .sigDelete").removeClass("invisible");
			}
		});		
	} else if (!$("#dialog-deleteSig").dialog("isOpen")) {
		$("#dialog-deleteSig").dialog("open");
	}
}

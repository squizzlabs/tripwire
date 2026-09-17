$("body").on("dblclick", ".comment", function(e) {
	e.preventDefault();
	document.getSelection().removeAllRanges();
	$(this).find(".commentEdit").click();
})

$("body").on("click", ".commentEdit", function(e) {
	e.preventDefault();

	// Prevent multiple editors
	if ($(".rte").length) return false;

	var $comment = $(this).closest(".comment");

	$comment.find(".commentToolbar").hide();

	tripwire.editor.replace($comment.find(".commentBody").attr("id"), function(inst) {
		var $status = $comment.find(".commentStatus");
		var $save = $comment.find(".commentSave");
		var updateSaveState = function() {
			var empty = !noteHtmlHasContent(inst.getData());
			$save.prop("disabled", empty);
			$status.toggleClass("noteValidation", empty).text(empty ? "Add content before saving." : "");
		};
		inst.area.on("input.noteValidation", updateSaveState);
		updateSaveState();
		$comment.find(".commentFooter").show();
		$comment.find(".commentFooter .commentControls").show();
		// The editor opened without focus, so a paste went to the page.
		if (inst && inst.focus) { inst.focus(); }
	});

	tripwire.activity.editComment = $comment.data("id");
	tripwire.refresh('refresh');
});

$("body").on("click", ".commentSave, .commentCancel", function(e) {
	e.preventDefault();
	var $this = $(this);
	if ($this.attr("disabled")) return false;

	var $comment = $this.closest(".comment");

	if ($this.hasClass("commentSave")) {
		var editor = tripwire.editor.get($comment.find(".commentBody").attr("id"));
		var commentHtml = editor.getData();
		if (!noteHtmlHasContent(commentHtml)) {
			$comment.find(".commentStatus").addClass("noteValidation").text("Add content before saving.");
			editor.focus();
			return false;
		}
		$this.attr("disabled", "true");
		var data = {"mode": "save", "commentID": $comment.data("id"), "systemID": $comment.find(".commentSticky").hasClass("active") ? 0 : viewingSystemID, "comment": commentHtml};

		$.ajax({
			url: "comments.php",
			type: "POST",
			data: data,
			dataType: "JSON"
		}).done(function(data) {
			if (data && data.result == true) {
				// The latest editor owns the note, including when it has just been created.
				$comment.find(".commentOwner").text(data.comment.modifiedByName + " · Updated " + data.comment.modifiedDate);
				Tooltips.attach($comment.find("[data-tooltip]"));

				tripwire.editor.destroy($comment.find(".commentBody").attr("id"), false);
				$comment.attr("data-id", data.comment.id);
				$comment.find(".commentToolbar").show();
				$comment.find(".commentFooter").hide();
				$this.removeAttr("disabled");
			}
		});
	} else {
		$this.attr("disabled", "true");
		tripwire.editor.destroy($comment.find(".commentBody").attr("id"), true);

		if (!$comment.attr("data-id")) {
			$comment.remove();
		} else {
			$comment.find(".commentToolbar").show();
			$comment.find(".commentFooter").hide();
			$this.removeAttr("disabled");
		}
	}

	$comment.find(".commentStatus").text("");

	delete tripwire.activity.editComment;
	tripwire.refresh('refresh');
});

$("body").on("click", ".commentDelete", function(e) {
	e.preventDefault();
	var $comment = $(this).closest(".comment");

	// check if dialog is open
	if (!$("#dialog-deleteComment").hasClass("ui-dialog-content")) {
		$("#dialog-deleteComment").data("comment", $comment).dialog({
			resizable: false,
			minHeight: 0,
			modal: true,
			width: 380,
			position: {my: "center", at: "center", of: $("#notesWidget")},
			dialogClass: "dialog-noeffect ui-dialog-shadow commentDeleteDialog",
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
					$("#dialog-deleteComment").parent().find(":button:contains('Delete')").button("disable");

					var $comment = $(this).data("comment");
					var data = {"mode": "delete", "commentID": $comment.data("id")};

					$.ajax({
						url: "comments.php",
						type: "POST",
						data: data,
						dataType: "JSON"
					}).done(function(data) {
						if (data && data.result == true) {
							$("#dialog-deleteComment").dialog("close");
							$comment.remove();
						}
					}).always(function() {
						$("#dialog-deleteComment").parent().find(":button:contains('Delete')").button("enable");
					});
					}
				}
			],
			open: function() {
				var $buttons = $(this).parent().find(".ui-dialog-buttonpane button");
				var $cancel = $buttons.filter(function() { return $.trim($(this).text()) === "Cancel"; });
				var $delete = $buttons.filter(function() { return $.trim($(this).text()) === "Delete"; });
				if (!$cancel.find("[data-icon]").length) { $cancel.prepend('<i data-icon="times" aria-hidden="true"></i>'); }
				if (!$delete.find("[data-icon]").length) { $delete.prepend('<i data-icon="trash" aria-hidden="true"></i>'); }
				$cancel.focus();
			}
		});
	} else if (!$("#dialog-deleteComment").dialog("isOpen")) {
		$("#dialog-deleteComment").data("comment", $comment).dialog("open");
	}
});

$("body").on("click", "#add-comment", function(e) {
	e.preventDefault();

	// Prevent multiple editors
	if ($(".rte").length) return false;

	var $comment = $(".comment:last").clone();
	var commentID = $(".comment:visible:last .commentBody").attr("id") ? $(".comment:visible:last .commentBody").attr("id").replace("comment", "") + 1 : 0;
	$(".comment:last").before($comment);

	$comment.find(".commentBody").attr("id", "comment" + commentID);
	$comment.removeClass("hidden").find(".commentEdit").click();
});

$("body").on("click", ".commentSticky", function(e) {
	e.preventDefault();
	var $comment = $(this).closest(".comment");
	var makeGlobal = !$(this).hasClass("active");

	var data = {"mode": "sticky", "commentID": $comment.data("id"), "systemID": makeGlobal ? 0 : viewingSystemID};

	$.ajax({
		url: "comments.php",
		type: "POST",
		data: data,
		dataType: "JSON"
	}).done(function(data) {
		if (data && data.result == true) {
			tripwire.comments.setStickyState($comment, makeGlobal);
		}
	});
});

$("body").on("keydown", ".commentSticky", function(e) {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		$(this).click();
	}
});

function commentSortHandler(sortOrder) {
	const sortElem = document.getElementById('comment-sort');
	const containerElem = document.getElementById('comment-container');
	sortOrder = sortOrder || sortElem.nextSort || tripwire.cookies.getCookie('commentSort') || 'asc';
	
	switch(sortOrder) {
		case 'asc':
			sortElem.nextSort = 'desc';
			sortElem.setAttribute('data-icon', 'sort-asc');
			containerElem.style.flexDirection = 'column';
			break;
		case 'desc':
			sortElem.nextSort = 'asc';
			sortElem.setAttribute('data-icon', 'sort-desc');
			containerElem.style.flexDirection = 'column-reverse';
			break;
		default: throw 'sort order somehow wrong';
	}
	
	tripwire.cookies.setCookie('commentSort', sortOrder, 3650);
}

$("body").on("click", "#comment-sort", function(e) {
	commentSortHandler(undefined);
});

commentSortHandler();

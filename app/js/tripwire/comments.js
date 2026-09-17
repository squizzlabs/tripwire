tripwire.comments = function() {
    this.comments.data = {};

	this.comments.setStickyState = function($comment, sticky) {
		const label = sticky
			? "Shown on every system — click to keep only this system"
			: "Show this note on every system";
		$comment.find(".commentSticky")
			.toggleClass("active", !!sticky)
			.attr("data-tooltip", label)
			.attr("aria-label", label)
			.attr("aria-pressed", sticky ? "true" : "false");
	};

    this.comments.parse = function(data) {
		// Parse-based; see app/js/sanitise-html.js for why the previous
		// regex version was bypassable.
		const sanitise = sanitiseHtml;

		
        for (var x in data) {
            var id = data[x].id;

            if (!Object.find(tripwire.comments.data, "id", id) && $(".comment[data-id='"+id+"']").length == 0) {
                var $comment = $(".comment:last").clone();
                var commentID = $(".comment:visible:last .commentBody").attr("id") ? $(".comment:visible:last .commentBody").attr("id").replace("comment", "") + 1 : 0;

                //data[id].sticky ? $(".comment:first").before($comment) : $(".comment:last").before($comment);
                $(".comment:last").before($comment);
                $comment.attr("data-id", id);

                try {
                    $comment.find(".commentBody").html(sanitise(data[x].comment));
                } catch (err) {
                    $comment.find(".commentFooter").show();
                    $comment.find(".commentStatus").html("<span class='critical'>" + err.constructor.name + ": " + err.message + "</span>");
                    $comment.find(".commentFooter .commentControls").hide();
                }

                $comment.find(".commentOwner").text(data[x].modifiedByName + " · Updated " + data[x].modified);
                $comment.find(".commentBody").attr("id", "comment" + commentID);
				tripwire.comments.setStickyState($comment, data[x].sticky);
                $comment.removeClass("hidden");
                Tooltips.attach($comment.find("[data-tooltip]"));

                //tripwire.comments.data[id] = data[id];
            } else if (Object.find(tripwire.comments.data, "id", id) && Object.find(tripwire.comments.data, "id", id).modified != data[x].modified) {
                var $comment = $(".comment[data-id='"+id+"']");

                try {
                    $comment.find(".commentBody").html(sanitise(data[x].comment));
                } catch (err) {
                    $comment.find(".commentFooter").show();
                    $comment.find(".commentStatus").html("<span class='critical'>" + err.constructor.name + ": " + err.message + "</span>");
                    $comment.find(".commentFooter .commentControls").hide();
                }

                $comment.find(".commentOwner").text(data[x].modifiedByName + " · Updated " + data[x].modified);
				tripwire.comments.setStickyState($comment, data[x].sticky);

                //tripwire.comments.data[id] = data[id];
            }
        }

        for (var x in tripwire.comments.data) {
            var id = tripwire.comments.data[x].id;

            if (!Object.find(data, "id", id)) {
                var $comment = $(".comment[data-id='"+id+"']");
                $comment.remove();
            }
        }

        tripwire.comments.data = data;
    }
}
tripwire.comments();

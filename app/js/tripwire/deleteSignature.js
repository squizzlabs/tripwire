// Handles removing from Signatures section
tripwire.deleteSig = function(key) {
	var $tr = $("#sigTable tr[data-id='"+key+"']");

    // The row is only actually removed by the animation's completion callback,
    // and jQuery animates off requestAnimationFrame, which browsers suspend for
    // hidden tabs. Animating here would leave deleted signatures on screen for
    // as long as the tab stays in the background.
    var removeRow = function() {
		$tr.find('span[data-age]').countdown("destroy");
		$tr.remove();
        $("#sigTable").trigger("update");
    };

    if (document.hidden) {
        removeRow();
        return;
    }

	// Paint the table row rather than its individual cells. This produces one
	// continuous destructive band and avoids wrappers/slideUp changing the
	// configured padding while the deletion animation runs.
	$tr.stop(true, true)
		.removeClass("sig-added selected")
		.addClass("sig-deleting")
		.delay(1000)
		.animate({opacity: 0}, 700, removeRow);
}

(function() {
	"use strict";

	function updateSignatureToolbar(widget) {
		var width = widget.getBoundingClientRect().width;
		widget.classList.toggle("signature-toolbar-compact", width <= 760);
		widget.classList.toggle("signature-toolbar-wrap", width <= 560);
	}

	$(function() {
		var widget = document.getElementById("signaturesWidget");
		if (!widget) { return; }

		updateSignatureToolbar(widget);

		if (window.ResizeObserver) {
			new ResizeObserver(function() {
				updateSignatureToolbar(widget);
			}).observe(widget);
		} else {
			$(window).on("resize.signatureToolbar", function() {
				updateSignatureToolbar(widget);
			});
		}
	});
})();

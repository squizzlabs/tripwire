// Draggable splitters for the dashboard grid. Widths follow panel identities,
// so moving a panel also moves its preferred width. Row height is stored as a
// ratio so the layout remains useful on a different-sized screen.
tripwire.panelResize = (function() {
	var MIN_COLUMN = 180;
	var MIN_ROW = 180;
	var pending;

	function settings() {
		if (!options.panels) { options.panels = {}; }
		if (!options.panels.columnWeights) { options.panels.columnWeights = {}; }
		return options.panels;
	}

	function grid() { return document.querySelector(".gridster > ul"); }

	function compactIds() {
		return tripwire.panels && tripwire.panels.layout
			? tripwire.panels.layout().compact
			: ["infoWidget", "signaturesWidget", "notesWidget"];
	}

	function defaultWeight(id) {
		return {infoWidget: 1, signaturesWidget: 1.35, notesWidget: 0.85}[id] || 1;
	}

	function applySavedSize() {
		var el = grid();
		if (!el || window.innerWidth < 960) { return; }
		var saved = settings();
		el.style.gridTemplateColumns = compactIds().map(function(id) {
			var weight = parseFloat(saved.columnWeights[id]) || defaultWeight(id);
			return "minmax(" + MIN_COLUMN + "px, " + weight + "fr)";
		}).join(" ");
		if (parseFloat(saved.rowRatio)) {
			var height = el.getBoundingClientRect().height;
			el.style.setProperty("--top-row", Math.round(height * saved.rowRatio) + "px");
		}
	}

	function visibleCompactPanels() {
		return compactIds().map(function(id) { return document.getElementById(id); })
			.filter(function(el) { return el && getComputedStyle(el).display !== "none"; })
			.sort(function(a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
	}

	function handle(axis, box, start) {
		var h = document.createElement("div");
		h.className = "panel-splitter panel-splitter-" + axis;
		h.setAttribute("role", "separator");
		h.setAttribute("aria-orientation", axis === "column" ? "vertical" : "horizontal");
		h.style.left = box.left + "px";
		h.style.top = box.top + "px";
		h.style.width = box.width + "px";
		h.style.height = box.height + "px";
		h.addEventListener("pointerdown", start);
		return h;
	}

	function beginColumnDrag(leftPanel, rightPanel, event) {
		event.preventDefault();
		var el = grid();
		var leftRect = leftPanel.getBoundingClientRect();
		var rightRect = rightPanel.getBoundingClientRect();
		var startX = event.clientX;
		var total = leftRect.width + rightRect.width;
		var leftId = leftPanel.id, rightId = rightPanel.id;
		var saved = settings();
		// Seed every track from its rendered width before changing the pair. Fr
		// units are relative, so this preserves the untouched third column.
		visibleCompactPanels().forEach(function(panel) {
			saved.columnWeights[panel.id] = panel.getBoundingClientRect().width;
		});

		function move(e) {
			var leftWidth = Math.max(MIN_COLUMN, Math.min(total - MIN_COLUMN, leftRect.width + e.clientX - startX));
			var rightWidth = total - leftWidth;
			saved.columnWeights[leftId] = leftWidth;
			saved.columnWeights[rightId] = rightWidth;
			applySavedSize();
		}
		function stop() {
			document.removeEventListener("pointermove", move);
			document.removeEventListener("pointerup", stop);
			document.body.classList.remove("panel-resizing");
			options.save();
			schedule();
		}
		document.body.classList.add("panel-resizing");
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", stop);
	}

	function beginRowDrag(event) {
		event.preventDefault();
		var el = grid();
		var rect = el.getBoundingClientRect();
		function move(e) {
			var topHeight = Math.max(MIN_ROW, Math.min(rect.height - MIN_ROW, e.clientY - rect.top));
			settings().rowRatio = topHeight / rect.height;
			el.style.setProperty("--top-row", Math.round(topHeight) + "px");
		}
		function stop() {
			document.removeEventListener("pointermove", move);
			document.removeEventListener("pointerup", stop);
			document.body.classList.remove("panel-resizing");
			options.save();
			schedule();
		}
		document.body.classList.add("panel-resizing");
		document.addEventListener("pointermove", move);
		document.addEventListener("pointerup", stop);
	}

	function render() {
		pending = null;
		var el = grid();
		if (!el) { return; }
		Array.prototype.forEach.call(document.querySelectorAll(".panel-splitter"), function(h) { h.remove(); });
		if (window.innerWidth < 960) { return; }
		applySavedSize();

		var gridRect = el.getBoundingClientRect();
		var panels = visibleCompactPanels();
		for (var i = 0; i < panels.length - 1; i++) {
			var a = panels[i].getBoundingClientRect(), b = panels[i + 1].getBoundingClientRect();
			var x = ((a.right + b.left) / 2) - gridRect.left;
			el.appendChild(handle("column", {
				left: x - 5, top: a.top - gridRect.top, width: 10,
				height: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top)
			}, beginColumnDrag.bind(null, panels[i], panels[i + 1])));
		}

		var visible = Array.prototype.filter.call(document.querySelectorAll(".gridWidget"), function(panel) {
			return getComputedStyle(panel).display !== "none";
		});
		var rows = {};
		visible.forEach(function(panel) {
			var r = panel.getBoundingClientRect(), key = Math.round(r.top);
			if (!rows[key]) { rows[key] = {top: r.top, bottom: r.bottom}; }
			rows[key].bottom = Math.max(rows[key].bottom, r.bottom);
		});
		var rowKeys = Object.keys(rows).map(Number).sort(function(a, b) { return a - b; });
		if (rowKeys.length > 1) {
			var first = rows[rowKeys[0]], second = rows[rowKeys[1]];
			var y = ((first.bottom + second.top) / 2) - gridRect.top;
			el.appendChild(handle("row", {left: 0, top: y - 5, width: gridRect.width, height: 10}, beginRowDrag));
		}
	}

	function schedule() {
		if (pending) { cancelAnimationFrame(pending); }
		pending = requestAnimationFrame(render);
	}

	$(function() {
		applySavedSize();
		schedule();
		$(document).on("panels:layout", schedule);
		$(window).on("resize", schedule);
	});

	return {apply: applySavedSize, refresh: schedule};
})();

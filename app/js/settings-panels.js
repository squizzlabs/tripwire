// Panels, on the Display tab.
//
// The header's layout control opened a show/hide menu; drag-to-reorder went
// with gridster when the desktop became a CSS grid. Both belong in Settings:
// a row per panel with visibility and four directional controls. Any panel can
// move within the compact row, swap into the full-width row, or move that row
// above/below the compact panels. Everything routes through tripwire.panels.

tripwire.settingsPanels = (function() {
	function render() {
		var $list = $("#panel-settings");
		if (!$list.length || !tripwire.panels) { return; }
		var defs = {}; tripwire.panels.all().forEach(function(p) { defs[p.id] = p; });
		var ids = tripwire.panels.order();
		$list.empty();
		ids.forEach(function(id) {
			var p = defs[id]; if (!p) { return; }
			var on = tripwire.panels.isVisible(id);
			var $row = $('<div class="panel-row"></div>').attr("data-panel", id);
			$row.append($('<span class="panel-row-name"></span>').text(p.title));
			var $acts = $('<span class="panel-row-actions"></span>');
			$('<button type="button" class="char-btn panel-position-btn" title="Move left">&#8592;</button>')
				.attr("aria-label", "Move " + p.title + " left")
				.prop("disabled", !tripwire.panels.canMove(id, "horizontal", -1))
				.on("click", function() { tripwire.panels.moveHorizontal(id, -1); render(); })
				.appendTo($acts);
			$('<button type="button" class="char-btn panel-position-btn" title="Move right">&#8594;</button>')
				.attr("aria-label", "Move " + p.title + " right")
				.prop("disabled", !tripwire.panels.canMove(id, "horizontal", 1))
				.on("click", function() { tripwire.panels.moveHorizontal(id, 1); render(); })
				.appendTo($acts);
			$('<button type="button" class="char-btn panel-position-btn" title="Move up">&#8593;</button>')
				.attr("aria-label", "Move " + p.title + " up")
				.prop("disabled", !tripwire.panels.canMove(id, "vertical", -1))
				.on("click", function() { tripwire.panels.moveVertical(id, -1); render(); })
				.appendTo($acts);
			$('<button type="button" class="char-btn panel-position-btn" title="Move down">&#8595;</button>')
				.attr("aria-label", "Move " + p.title + " down")
				.prop("disabled", !tripwire.panels.canMove(id, "vertical", 1))
				.on("click", function() { tripwire.panels.moveVertical(id, 1); render(); })
				.appendTo($acts);
			var $sw = $('<label class="switch"><input type="checkbox" /><span class="switch-track"></span></label>');
			$sw.find("input").prop("checked", on).on("change", function() {
				tripwire.panels.setVisible(id, this.checked);
			});
			$acts.append($sw);
			$row.append($acts);
			$list.append($row);
		});
	}
	return {render: render};
})();

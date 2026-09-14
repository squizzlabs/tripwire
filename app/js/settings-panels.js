// Panels, on the Display tab.
//
// The header's layout control opened a show/hide menu; drag-to-reorder went
// with gridster when the desktop became a CSS grid. Both belong in Settings:
// a row per panel with a switch for visibility and directional controls. The
// compact panels move left/right in their shared row. The chain remains full
// width, so its controls move that whole row above/below the compact panels.
// Everything routes through tripwire.panels.

tripwire.settingsPanels = (function() {
	function render() {
		var $list = $("#panel-settings");
		if (!$list.length || !tripwire.panels) { return; }
		var defs = {}; tripwire.panels.all().forEach(function(p) { defs[p.id] = p; });
		var ids = tripwire.panels.order();
		var movable = ids.filter(function(id) { return id !== "chainWidget"; });
		$list.empty();
		ids.forEach(function(id) {
			var p = defs[id]; if (!p) { return; }
			var on = tripwire.panels.isVisible(id);
			var $row = $('<div class="panel-row"></div>').attr("data-panel", id);
			$row.append($('<span class="panel-row-name"></span>').text(p.title));
			var $acts = $('<span class="panel-row-actions"></span>');
			if (id === "chainWidget") {
				var chainFirst = ids[0] === "chainWidget";
				$('<span class="panel-axis">Vertical</span>').appendTo($acts);
				$('<button type="button" class="char-btn panel-position-btn" aria-label="Move Chain above panels" title="Move above">&#8593;</button>')
					.prop("disabled", chainFirst)
					.on("click", function() { tripwire.panels.moveVertical(id, -1); render(); })
					.appendTo($acts);
				$('<button type="button" class="char-btn panel-position-btn" aria-label="Move Chain below panels" title="Move below">&#8595;</button>')
					.prop("disabled", !chainFirst)
					.on("click", function() { tripwire.panels.moveVertical(id, 1); render(); })
					.appendTo($acts);
			} else {
				var i = movable.indexOf(id);
				$('<span class="panel-axis">Horizontal</span>').appendTo($acts);
				$('<button type="button" class="char-btn panel-position-btn" title="Move left"></button>')
					.attr("aria-label", "Move " + p.title + " left")
					.html("&#8592;")
					.prop("disabled", i === 0)
					.on("click", function() { tripwire.panels.moveHorizontal(id, -1); render(); })
					.appendTo($acts);
				$('<button type="button" class="char-btn panel-position-btn" title="Move right"></button>')
					.attr("aria-label", "Move " + p.title + " right")
					.html("&#8594;")
					.prop("disabled", i === movable.length - 1)
					.on("click", function() { tripwire.panels.moveHorizontal(id, 1); render(); })
					.appendTo($acts);
			}
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

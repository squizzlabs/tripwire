// The panel registry.
//
// Tripwire's four panels were declared only by their markup in tripwire.php,
// and the layout code found them by hard-coded id. This is the one place that
// says what panels exist, so adding one is a row here plus its markup, and the
// palette, the titles and the show/hide controls all follow from it.
//
// The grid itself already worked: gridster drags, resizes, serialises into
// options.grid and is restored in options.js before init. What was missing was
// a declaration, a way to hide a panel you don't use, and any visible sign
// that these are cards at all.

tripwire.panels = (function() {
    var PANELS = [
        {id: "infoWidget",       title: "System",     defaultVisible: true},
        {id: "signaturesWidget", title: "Signatures", defaultVisible: true},
        {id: "notesWidget",      title: "Notes",      defaultVisible: true},
        {id: "chainWidget",      title: "Chain",      defaultVisible: true}
    ];

    function def(id) {
        for (var i = 0; i < PANELS.length; i++) {
            if (PANELS[i].id === id) { return PANELS[i]; }
        }
        return null;
    }

    function store() {
        if (!options.panels) { options.panels = {}; }
        return options.panels;
    }

    function isVisible(id) {
        var saved = store();
        if (Object.prototype.hasOwnProperty.call(saved, id)) { return !!saved[id]; }
        var p = def(id);
        return !p || p.defaultVisible !== false;
    }

    // Four slots: three horizontal compact slots and one full-width slot. Any
    // panel can occupy any slot, and the full-width row can sit above or below
    // the compact row. This preserves the useful 3+1 dashboard proportions
    // without tying either axis to a particular panel.
    function layout() {
        var saved = store();
        var ids = PANELS.map(function(p) { return p.id; });
        var wide = ids.indexOf(saved.widePanel) > -1 ? saved.widePanel : "chainWidget";
        var compact = Array.isArray(saved.compactOrder) ? saved.compactOrder.slice() : [];

        // Migrate the earlier Chain-only ordering without changing its visual
        // position. New saves use explicit slot fields.
        if (!compact.length && Array.isArray(saved.order)) {
            var old = saved.order.filter(function(id) { return ids.indexOf(id) > -1; });
            compact = old.filter(function(id) { return id !== wide; });
        }
        ids.forEach(function(id) {
            if (id !== wide && compact.indexOf(id) < 0) { compact.push(id); }
        });
        compact = compact.filter(function(id) { return id !== wide; }).slice(0, 3);

        return {
            wide: wide,
            wideFirst: saved.layoutVersion === 2
                ? !!saved.wideFirst
                : Array.isArray(saved.order) && saved.order[0] === "chainWidget",
            compact: compact
        };
    }

    function order() {
        var current = layout();
        return current.wideFirst
            ? [current.wide].concat(current.compact)
            : current.compact.concat([current.wide]);
    }

    function saveLayout(current) {
        var saved = store();
        saved.layoutVersion = 2;
        saved.widePanel = current.wide;
        saved.wideFirst = current.wideFirst;
        saved.compactOrder = current.compact.slice();
        // Keep this for older clients sharing the same account settings.
        saved.order = current.wideFirst
            ? [current.wide].concat(current.compact)
            : current.compact.concat([current.wide]);
        apply();
        options.save();
    }

    function moveHorizontal(id, dir) {
        var current = layout();
        var i = current.compact.indexOf(id);
        var j = i + dir;
        if (i < 0 || j < 0 || j >= current.compact.length) { return; }
        current.compact.splice(i, 1);
        current.compact.splice(j, 0, id);
        saveLayout(current);
    }

    function moveVertical(id, dir) {
        var current = layout();
        if (id === current.wide) {
            if ((dir < 0) === current.wideFirst) { return; }
            current.wideFirst = dir < 0;
        } else {
            // A compact panel crosses into the full-width row by swapping slots
            // with its occupant. Only the arrow pointing at that row is active.
            var towardWide = current.wideFirst ? -1 : 1;
            var i = current.compact.indexOf(id);
            if (i < 0 || dir !== towardWide) { return; }
            current.compact[i] = current.wide;
            current.wide = id;
        }
        saveLayout(current);
    }

    function canMove(id, axis, dir) {
        var current = layout();
        var i = current.compact.indexOf(id);
        if (axis === "horizontal") { return i > -1 && i + dir >= 0 && i + dir < current.compact.length; }
        if (id === current.wide) { return (dir < 0) !== current.wideFirst; }
        return i > -1 && dir === (current.wideFirst ? -1 : 1);
    }

    function apply() {
        var ids = order();
        var current = layout();
        PANELS.forEach(function(p) {
            var $w = $("#" + p.id);
            $w.toggleClass("panel-hidden", !isVisible(p.id));
            $w.toggleClass("panel-wide", p.id === current.wide);
            $w.css("order", ids.indexOf(p.id));
        });
        $(document).trigger("panels:layout");
    }

    function setVisible(id, on) {
        store()[id] = !!on;
        apply();
        options.save();
    }

    function toggle(id) { setVisible(id, !isVisible(id)); }

    // Give each panel a titled header so it reads as a card rather than an
    // unlabelled box, and a control to put it away. Runs once; the title is
    // prepended into the existing .controls bar so no markup moves.
    function decorate() {
        PANELS.forEach(function(p) {
            var $w = $("#" + p.id);
            if (!$w.length) { return; }
            var $controls = $w.children(".controls").first();
            if (!$controls.length || $controls.children(".panel-title").length) { return; }

            $controls.prepend($('<span class="panel-title"></span>').text(p.title));

            $('<span class="panel-hide" role="button" tabindex="0" ' +
              'data-tooltip="Hide this panel">&times;</span>')
                .on("click keydown", function(e) {
                    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") { return; }
                    e.preventDefault();
                    setVisible(p.id, false);
                })
                .appendTo($controls);
        });
    }

    $(function() {
        decorate();
        apply();
    });

    return {
        all: function() { return PANELS.slice(); },
        isVisible: isVisible,
        setVisible: setVisible,
        toggle: toggle,
        order: order,
        layout: layout,
        canMove: canMove,
        moveHorizontal: moveHorizontal,
        moveVertical: moveVertical,
        apply: apply
    };
})();

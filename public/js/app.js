// Tripwire application. Sections execute in dependency order.

// #region helpers
Object.sort = function(obj, prop) {
	var swapped, prev;
	do {
		swapped = false, prev = null;
		for (var i in obj) {
			if (prev && Number(obj[i][prop]) < Number(obj[prev][prop])) {
				var tmp = obj[i];
				obj[i] = obj[prev];
				obj[prev] = tmp;
				swapped = true;
			}
			prev = i;
		}
	} while (swapped);
}

Object.index = function(obj, prop, val, cs) {
	for (var key in obj) {
		if (!cs && obj[key][prop] == val) {
			return key;
		} else if (obj[key][prop] && obj[key][prop].toLowerCase() == val.toLowerCase()) {
			return key;
		}
	}
}

Object.find = function(obj, prop, val, cs) {
	for (var key in obj) {
		if (!cs && obj[key][prop] == val) {
			return obj[key];
		} else if (obj[key][prop] && obj[key][prop].toLowerCase && obj[key][prop].toLowerCase() == val.toLowerCase()) {
			return obj[key];
		}
	}

	return false;
};

(function($){
    $.fn.serializeObject = function(){

        var self = this,
            json = {},
            push_counters = {},
            patterns = {
                "validate": /^[a-zA-Z][a-zA-Z0-9_]*(?:\[(?:\d*|[a-zA-Z0-9_]+)\])*$/,
                "key":      /[a-zA-Z0-9_]+|(?=\[\])/g,
                "push":     /^$/,
                "fixed":    /^\d+$/,
                "named":    /^[a-zA-Z0-9_]+$/
            };


        this.build = function(base, key, value){
            base[key] = value;
            return base;
        };

        this.push_counter = function(key){
            if(push_counters[key] === undefined){
                push_counters[key] = 0;
            }
            return push_counters[key]++;
        };

        $.each($(this).serializeArray(), function(){

            // skip invalid keys
            if(!patterns.validate.test(this.name)){
                return;
            }

            var k,
                keys = this.name.match(patterns.key),
                merge = this.value,
                reverse_key = this.name;

            while((k = keys.pop()) !== undefined){

                // adjust reverse_key
                reverse_key = reverse_key.replace(new RegExp("\\[" + k + "\\]$"), '');

                // push
                if(k.match(patterns.push)){
                    merge = self.build([], self.push_counter(reverse_key), merge);
                }

                // fixed
                else if(k.match(patterns.fixed)){
                    merge = self.build([], k, merge);
                }

                // named
                else if(k.match(patterns.named)){
                    merge = self.build({}, k, merge);
                }
            }

            json = $.extend(true, json, merge);
        });

        return json;
    };
})(jQuery);

var letterToNumbers = function(string) {
    string = string.toUpperCase();
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', sum = 0, i;
    for (i = 0; i < string.length; i++) {
        sum += Math.pow(letters.length, i) * (letters.indexOf(string.substr(((i + 1) * -1), 1)) + 1);
    }
    return sum;
};

/** Find the relative position of one element within the hierarchy tree of another.
The client position should be in the coordinate space of the ancestor, i.e. top/left values for a position:absolute overlay */
function positionRelativeTo(elem, ancestor) {
	const elemPos = elem.getBoundingClientRect(),
		ancestorPos = ancestor.getBoundingClientRect(),
		ancestorZoom = 1 * (window.getComputedStyle(ancestor).getPropertyValue('zoom') || '1');
	return { 
		left: ((elemPos.left - ancestorPos.left) / ancestorZoom) + ancestor.scrollLeft,
		top: ((elemPos.top - ancestorPos.top) / ancestorZoom) + ancestor.scrollTop
	};
}

/** Look up one or more values in a comma separated string as keys in a data map, and return a property from the results in a new comma separated string.
Convenience function for UI mapping.
Will throw a failure message, unless suppress=true in which case it will return undefined, if 
any of the lookups fail to resolve. */
function lookupMultiple(map, propertyName, lookupString, suppress) {
	const values = lookupString.split(',');
	const results = [];
	for(var i = 0; i < values.length; i++) {
		const v = values[i];
		const r = map[v];
		if(!r) { 
			if(suppress) { return undefined;}
			else { throw 'Value ' + v + ' did not match anything in ' + map; }
		}
		results.push(r[propertyName]);
	}
	return results.join(',');
}

// Global CSS class change event
(function($) {
    var originalAddClassMethod = $.fn.addClass;
	var originalRemoveClassMethod = $.fn.removeClass;

    $.fn.addClass = function(className) {
        // Execute the original method.
        var result = originalAddClassMethod.apply(this, arguments);

        // trigger a custom event
        this.trigger('classchange', className);

        // return the original result
        return result;
    }

	$.fn.removeClass = function(className) {
        // Execute the original method.
        var result = originalRemoveClassMethod.apply(this, arguments);

        // trigger a custom event
        this.trigger('classchange', className);

        // return the original result
        return result;
    }
})(jQuery);
;
// #endregion

// #region map-data-suppliers/_registry
// Map data suppliers register here before the Tripwire object is initialized.

var mapDataSuppliers = (function() {
	var suppliers = [];

	return {
		// A supplier must implement findLinks(systemID, ids) -> array of
		// connections; ids carries a parent id and a child id to increment per
		// connection. active() is optional and defaults to always on.
		register: function(supplier) {
			if (!supplier || typeof supplier.findLinks !== "function") {
				throw new Error("Map data supplier must implement findLinks(systemID, ids)");
			}
			suppliers.push(supplier);
			return supplier;
		},

		all: function() { return suppliers.slice(); }
	};
})();
;
// #endregion

// #region map-data-suppliers/eve-scout
const eveScout = mapDataSuppliers.register(new _EveScoutSignatureConnection());

function _EveScoutSignatureConnection() {
	const _this = this;
	
	this.links = [];
	
	this.active = function() {
		return 'undefined' !== typeof options && options.chain.tabs[options.chain.active] && options.chain.tabs[options.chain.active].evescout;
	}
	
	this.nodeNameSuffix = 'eve-scout';
	
	this.findLinks = function(systemID, ids) {
		if(!this.active()) { return []; }
		
		const r = [];
		for(var ti = 0; ti < this.links.length; ti++) {
			const eveScoutLink = this.links[ti];
			const eveScoutID = 'ES-' + eveScoutLink.id;
			
			const nodeDefaults = {
				life: eveScoutLink.remaining_hours >= 4 ? 'stable' : 'critical',
				mass: 'stable',	// they no longer attempt to track mass
				id: eveScoutID,
			};
			
			if(eveScoutLink.out_system_id == systemID) {	// Connection from this hole
				r.push(Object.assign({
					
					parent: {
						id: ids.parentID,
						systemID: systemID,
						signatureID: eveScoutLink.in_signature,
						type: eveScoutLink.wh_exits_outward ? eveScoutLink.wh_type : 'K162'
					},	child: {
						id: ids.nextChildID++,
						systemID: eveScoutLink.in_system_id,
						signatureID: eveScoutLink.out_signature,
						type: eveScoutLink.wh_exits_outward ? 'K162' : eveScoutLink.wh_type
					}
				}, nodeDefaults));
			} else if(eveScoutLink.in_system_id == systemID) { // Connection to this hole
				r.push(Object.assign({
					parent: {
						id: ids.parentID,
						systemID: systemID,
						signatureID: eveScoutLink.out_signature,
						type: eveScoutLink.wh_exits_outward ? 'K162' : eveScoutLink.wh_type
					},	child: {
						id: ids.nextChildID++,
						systemID: eveScoutLink.out_system_id,
						signatureID: eveScoutLink.in_signature,
						type: eveScoutLink.wh_exits_outward ? eveScoutLink.wh_type : 'K162'
					}
				}, nodeDefaults));				
			}
		}
		
		return r;
	}
	
	/** Refresh the signature data from the public Eve-Scout API */
	this.refresh = function() {
		if(!_this.active()) {
			return;	// only look for Thera data if on a tab with the option selected
		}
		
		$.ajax({
			url: 'cached_third_party.php?key=eve-scout-signatures',
			type: "GET",
			dataType: "JSON"
		}).done(function(data, status, xhr) {	
			if(!_.isEqual(data, _this.links)) {
				console.info('Updating map for EvE Scout update');
				_this.links = data;
				chain.redraw();
			}
		}).fail(function(xhr, status, error) {
			console.warn('Failed to fetch signatures from eve-scout.com: ' + status, error);
		});
	};
	
	setInterval(this.refresh, 60000);
	setTimeout(this.refresh, 0);
}
;
// #endregion

// #region init
function findSystemID(systemName) {
	for(let k in appData.systems) {
		if(appData.systems[k].name.toUpperCase() === systemName.toUpperCase()) return k; 
	}
	return undefined;
}

var viewingSystem = $("meta[name=system]").attr("content");
var viewingSystemID = findSystemID(viewingSystem);
var defaultToTrackedSystem = !viewingSystem;
var server = $("meta[name=server]").attr("content");
var app_name = $("meta[name=app_name]").attr("content");
var version = $("meta[name=version]").attr("content");

// A blank system means this is a fresh entry into Tripwire. Bootstrap the
// first sync with a valid system, then EVE() will replace it with the tracked
// character's location as soon as the backend has one. An explicitly supplied
// but invalid system still falls back to Jita.
if(defaultToTrackedSystem) {
	viewingSystem = "Jita";
	viewingSystemID = findSystemID(viewingSystem);
} else if(!viewingSystemID) {
	window.stop();
	window.location = '?system=Jita';
}

// Use this to test performance of javascript code lines
// var startTime = window.performance.now();
// console.log("stint: "+ (window.performance.now() - startTime));

if(init.masks) {
	setTimeout(() => {
		tripwire.masks = init.masks;
		maskRendering.update(tripwire.masks);
	}, 0);	// so maskRendering exists when it gets called
}
;
// #endregion

// #region options
var options = new function() {
	var localOverrides = ["grid"];
	var localOptions = JSON.parse(localStorage.getItem("tripwire_options"));
	var saveTimer;

	this.userID = init.userID;
	this.character = {id: init.characterID, name: init.characterName};
	this.background = null;
	this.uiscale = 1.0;
	this.favorites = [];
	this.grid = {};
	this.tracking = {active: "new", characterOptions: {}};
	this.masks = {active: init.corporationID + ".2"};
	this.chain = {gridlines: true, aura: true, lineWeight: 1.0, scrollWithoutCtrl: false, active: 0, tabs: [], collapsed: [], "node-reference": "type", zoom: 1.0, sigNameLocation: 'name', routingLimit: 15, routeSecurity: 'shortest', routeIgnore: { enabled: false, systems: [ 'Tama', 'Rancer' ] }, renderer: 'radial', nodeSpacing: { x: 2.0, y: 2.0 }, nodeSpacingByRenderer: {orgChart: {x: 1.4, y: 1.4}, orgChartTop: {x: 2.0, y: 2.0}, orgChartSide: {x: 2.0, y: 2.0}, radial: {x: 2.0, y: 2.0}} };
	this.signatures = {editType: "unknown", copySeparator: ",", pasteLife: 72, rowPadding: 6, alignment: {sigID: "leftAlign", sigType: "leftAlign", sigAge: "leftAlign", leadsTo: "leftAlign", sigLife: "rightAlign", sigMass: "rightAlign"}};
	this.buttons = {follow: false, chainWidget: {viewing: false, favorites: false, sortChildren: false}, signaturesWidget: {autoMapper: false}};

	this.saveDelay = function(delay) {
		if (saveTimer) clearTimeout(saveTimer);

		saveTimer = setTimeout("options.save()", delay);
	};

	// Saves options in both cookie and database
	this.save = function() {
		var options = JSON.stringify(window.options.get());

		localStorage.setItem("tripwire_options", options);

		return $.ajax({
			url: "options.php",
			data: {mode: "set", options: options},
			type: "POST",
			dataType: "JSON"
		});
	};

	// Loads options via passed object else cookie
	this.load = function(data) {
		if (data && typeof(data) != "undefined") {
			this.set(this, data);
			if (data.chain && data.chain.nodeSpacing && !data.chain.nodeSpacingByRenderer) {
				for (var renderer in this.chain.nodeSpacingByRenderer) {
					this.chain.nodeSpacingByRenderer[renderer] = $.extend({}, data.chain.nodeSpacing);
				}
			}
		} else if (localOptions) {
			this.set(this, localOptions);
			if (localOptions.chain && localOptions.chain.nodeSpacing && !localOptions.chain.nodeSpacingByRenderer) {
				for (var renderer in this.chain.nodeSpacingByRenderer) {
					this.chain.nodeSpacingByRenderer[renderer] = $.extend({}, localOptions.chain.nodeSpacing);
				}
			}
		}

		this.apply();
		if(tripwire) { set_tracking_text(); }
	};

	// Gets options from this by exluding types == function
	this.get = function() {
		var data = {};

		for (var x in this) {
			if (typeof(this[x]) != "function") {
				data[x] = this[x];
			}
		}

		return data;
	};

	// Sets this from passed object
	this.set = function(local, data) {
		for (var prop in data) {
			if (data[prop] && data[prop].constructor && data[prop].constructor === Object) {
				if (local) {
					if(typeof(local[prop]) === 'undefined') { local[prop] = {}; }
					this.set(local[prop], data[prop]);
				}
			} else if (local) {
				local[prop] = data[prop];
			}
		}
	};

	this.reset = function() {
		for (var x in this) {
			if (typeof(this[x]) != "function") {
				this[x] = JSON.parse(JSON.stringify(this.reset.defaults[x]));
			}
		}
	};

	// Applies settings
	this.apply = function() {
		if (this.chain.nodeSpacingByRenderer && this.chain.nodeSpacingByRenderer[this.chain.renderer]) {
			this.chain.nodeSpacing = $.extend({}, this.chain.nodeSpacingByRenderer[this.chain.renderer]);
		}
		// Local browser overrides
		if (localOptions) {
            for (key in localOverrides) {
                this[localOverrides[key]] = localOptions[localOverrides[key]];
			}
		}

		// Grid layout (detect old IGB setting options)
		if (this.grid.hasOwnProperty("oog") && Object.keys(this.grid.oog||{}).length) {
			$.each(this.grid.oog, function() {
				$("#"+this.id).attr({"data-col": this.col, "data-row": this.row, "data-sizex": this.size_x, "data-sizey": this.size_y})
					.css({width: this.width, height: this.height});
			});
		} else if (Object.keys(this.grid||{}).length) {
			$.each(this.grid, function() {
				$("#"+this.id).attr({"data-col": this.col, "data-row": this.row, "data-sizex": this.size_x, "data-sizey": this.size_y})
					.css({width: this.width, height: this.height});
			});
		}

		// Make sure favorites are all ints and not strings
		this.favorites = $.map(this.favorites, function(favorite) {
			return parseInt(favorite);
		});

		// Buttons
		if (this.buttons.follow) $("#follow").addClass("active");
		if (this.buttons.chainWidget.home) $("#home").addClass("active");
		if (this.buttons.chainWidget.kspace) $("#k-space").addClass("active");
		if (this.buttons.chainWidget.viewing) $("#show-viewing").addClass("active").attr("aria-pressed", "true");
		if (this.buttons.chainWidget.favorites) $("#show-favorite").addClass("active").attr("aria-pressed", "true");
		if (this.buttons.chainWidget.sortChildren) $("#chain-sort-lock").attr({"data-icon": "lock", "aria-pressed": "true"}).addClass("active");
		if (this.buttons.chainWidget.evescout) $("#eve-scout").addClass("active");
		if ($.inArray(parseInt(viewingSystemID), this.favorites) !== -1) $("#system-favorite").attr("data-icon", "star").addClass("active");
		if (this.buttons.signaturesWidget.autoMapper) $("#toggle-automapper").addClass("active");

		// UI Scale
		if (this.uiscale) {
			$("body").css("zoom", this.uiscale);
		}

		// Signature table density. Six pixels is the existing spacing; clamp
		// older or hand-edited settings so they cannot break the table layout.
		var signaturePadding = parseFloat(this.signatures.rowPadding);
		if (!isFinite(signaturePadding)) signaturePadding = 6;
		signaturePadding = Math.max(0, Math.min(6, signaturePadding));
		this.signatures.rowPadding = signaturePadding;
		$("#sigTable").css({
			"--signature-cell-padding": signaturePadding + "px",
			"--signature-mobile-padding-y": (signaturePadding * 7 / 6) + "px",
			"--signature-mobile-padding-x": (signaturePadding * 10 / 6) + "px"
		});

		// Chain zoom
		if (this.chain.zoom) {
			$("#chainParent").css("zoom", this.chain.zoom);
			if (window.chainZoomButton) { chainZoomButton(); }
		}

		// Background
		if (this.background) {
			var a = $('<a>', { href:this.background } )[0];
			$("#wrapper").attr("style", "background-image: url(https://" + a.hostname + a.pathname + a.search + ");");
		} else {
			$("#wrapper").attr("style", "");
		}

		// Characters in Options
		$("#dialog-options #characters").html("<img class='avatar avatar-lg' alt='' src='https://images.evetech.net/characters/"+init.characterID+"/portrait?size=128' />");

		// Active mask
		$("#dialog-options input[name='mask']").filter("[value='"+this.masks.active+"']").attr("checked", true);

		// Chain tabs
		$("#chainTabs").text("");
		for (var x in this.chain.tabs) {
			if (this.chain.tabs[x]) {
				var $tab = $("#chainTab .tab").clone();

				$tab.attr("id", x).find(".name").data("tab", this.chain.tabs[x].systemID).text(this.chain.tabs[x].name);
				if (x == this.chain.active) { $tab.addClass("current"); }

				$("#chainTabs").append($tab);
			}
		}
		
		// Reset routing cache in case routing options changed
		if(guidance) { guidance.clearCache(); }

		// Draw chain if Tripwire is initialized
		if (typeof(tripwire) !== "undefined") {
			chain.redraw();
		}
	};

	this.reset.defaults = JSON.parse(JSON.stringify(this.get()));
	this.load(init && init.options ? init.options : null);
}
;
// #endregion

// #region layout
var grid = $(".gridster ul").gridster({
	widget_selector: "li.gridWidget",
	avoid_overlapped_widgets: false,
	widget_base_dimensions: [50, 50],
	widget_margins: [5, 5],
	autogrow_cols: true,
	helper: "clone",
	draggable: {
		start: function(e, ui) {
			$("div.gridster").width($("div.gridster ul").width());
		}
	},
	resize: {
    	enabled: true,
    	handle_class: "grid-resize",
    	min_size: [4, 4],
    	start: function(e) {
    		$("div.gridster").width($("div.gridster ul").width());
    	},
    	stop: function(e, ui, $widget) {
    		//var width = parseInt($(".gridster").css("margin-left")) + this.container_width;
    		//$("#wrapper").css({width: width + "px"})
    		switch ($widget.attr("id")) {
    			case "infoWidget":
    				setTimeout("activity.redraw();", 300);
    				break;
    		}
    	}
	},
	serialize_params: function($w, wgd) {
		return {
			id: $w.attr("id"),
			col: wgd.col,
			row: wgd.row,
			size_x: wgd.size_x,
			size_y: wgd.size_y,
			width: $w.width(),
			height: $w.height()
		}
	}
}).data("gridster").disable();

grid.disable_resize();
$(".grid-resize").addClass("hidden").attr("data-icon", "resize");

$(".gridster").css({visibility: "visible"});
$(".gridster > *").addClass("gridster-transition");

$("#layout").click(function() {
	if (!$(this).hasClass("active")) {
		grid.enable();
		grid.enable_resize();
		$(".grid-resize").removeClass("hidden");

		$(this).addClass("active");
	} else {
		grid.disable();
		grid.disable_resize();
		$(".grid-resize").addClass("hidden");

		$(this).removeClass("active");

		options.grid = grid.serialize();

		options.save();
	}
});
;
// #endregion

// #region tripwire
var tripwire = new function() {
    this.timer, this.xhr;
	this.version = version;
	this.client = {signatures: {}, wormholes: {}};
	this.server = {signatures: {}, wormholes: {}};
	this.signatures = {list: {}, undo: JSON.parse(sessionStorage.getItem("tripwire_undo")) || {}, redo: JSON.parse(sessionStorage.getItem("tripwire_redo")) || {}};
	this.serverSignatureCount = 0;
	this.activity = {};
	this.data = {tracking: {}, esi: {}};
	this.refreshRate = 5000;
	// Used while document.hidden. Long enough to stop the traffic, short enough
	// that a tab surfaced by a notification is not minutes out of date.
	this.refreshRateHidden = 60000;
	this.connected = true;
	this.ageFormat = "HM";
	this.instance = window.name ? window.name : (new Date().getTime() / 1000, window.name = new Date().getTime() / 1000);

	// Reference to `this` that can be used inside of functions
	var _this = this

    // Command to start/stop tripwire updates
	// ToDo: Include API and Server timers
	this.stop = function() {
		clearTimeout(this.timer);
		return this.timer;
	};

	this.start = function() {
		return this.sync();
	}

    // Command to change Age format
	// ToDo: Cookie change to keep
	this.setAgeFormat = function(format) {
		var format = typeof(format) !== 'undefined' ? format : this.ageFormat;

		$("span[data-age]").each(function() {
			$(this).countdown("option", {format: format});
		});

		return true;
	}

	this.cookies = {
		getCookie: function(c_name) {
			var c_value = document.cookie;

			var c_start = c_value.indexOf(" " + c_name + "=");
			if (c_start == -1) {
				c_start = c_value.indexOf(c_name + "=");
			}

			if (c_start == -1) {
				c_value = null;
			} else {
				c_start = c_value.indexOf("=", c_start) + 1;
				var c_end = c_value.indexOf(";", c_start);

				if (c_end == -1) {
					c_end = c_value.length;
				}

				c_value = unescape(c_value.substring(c_start, c_end));
			}

			return c_value;
		},

		setCookie: function(c_name, value, exdays) {
			var exdate = new Date();
			exdate.setDate(exdate.getDate() + exdays);
			var c_value = escape(value) + ((exdays == null) ? "" : "; expires="+exdate.toUTCString());

			document.cookie = c_name + "=" + c_value + ";" + (document.location.protocol == "https:" ? "secure;" : "");
		}
	};

    this.serverTime = function() {
		this.time;

		this.serverTime.getTime = function() {
			return tripwire.serverTime.time;
		}
	}
    this.serverTime();

    // Handles putting chain together
	this.chainMap = function() {
		this.chainMap.parse = function(data) {
			chain.draw(data);
		}
	}
    this.chainMap();

    this.pastEOL = function() {
		var options = {since: $(this).countdown('option', 'until'), format: "HM", layout: "-{hnn}{sep}{mnn}&nbsp;"};
		$(this).countdown("option", options);
	}

    // Handles WH Type hover-over tooltip
	// ToDo: Use native JS
	this.whTooltip = function(sig) {
		if (viewingSystemID == sig.systemID) {
			if ($.inArray(sig.type, $.map(appData.wormholes, function(item, index) { return index;})) >= 0) {
				var type = sig.type;
				var tooltip = '';
			} else {
				var type = sig.sig2Type;
				var tooltip = "<b>Type:</b> "+(type || 'Unknown')+"<br/>";
			}
		} else {
			if ($.inArray(sig.sig2Type, $.map(appData.wormholes, function(item, index) { return index;})) >= 0) {
				var type = sig.sig2Type;
				var tooltip = '';
			} else {
				var type = sig.type;
				var tooltip = "<b>Type:</b> "+(type || 'Unknown')+"<br/>";
			}
		}

		if ($.inArray(type, $.map(appData.wormholes, function(item, index) { return index;})) >= 0) {
			var whType = true;
		} else {
			var whType = false;
		}

		tooltip += "<b>Life:</b> "+(whType?appData.wormholes[type].life:"Unknown")+"<br/>";

		if (whType) {
			switch (appData.wormholes[type].leadsTo.split("-")[0]) {
				case 'High':
					tooltip += "<b>Leads To:</b> <span class='hisec'>"+appData.wormholes[type].leadsTo+"</span><br/>";
					break;
				case 'Low':
					tooltip += "<b>Leads To:</b> <span class='lowsec'>"+appData.wormholes[type].leadsTo+"</span><br/>";
					break;
				case 'Null':
					tooltip += "<b>Leads To:</b> <span class='nullsec'>"+appData.wormholes[type].leadsTo+"</span><br/>";
					break;
				case 'Class':
					tooltip += "<b>Leads To:</b> <span class='wh'>"+appData.wormholes[type].leadsTo+"</span><br/>";
					break;
				default:
					tooltip += "<b>Leads To:</b> <span>"+appData.wormholes[type].leadsTo+"</span><br/>";
			}

			tooltip += "<b>Max Mass</b>: "+(Intl.NumberFormat().format(tripwire.wormholes[type].mass))+" Kg<br/>";

			tooltip += "<b>Max Jumpable</b>: "+(Intl.NumberFormat().format(tripwire.wormholes[type].jump))+" Kg<br/>";
		}

		return tooltip;
	}

	// Handles Age hover-over tooltip
	// ToDo: Use native JS
	this.ageTooltip = function(sig) {
		// var date = new Date(sig.lifeTime);
		// var localOffset = date.getTimezoneOffset() * 60000;
		// date = new Date(date.getTime() + localOffset);
        var date = new Date(sig.lifeTime);

		var tooltip = "<table class=\"age-tooltip-table\"><tr>"
        + "<th>Created:</th><td>"+(date.getMonth()+1)+"/"+date.getDate()+" "+(date.getHours() < 10?'0':'')+date.getHours()+":"+(date.getMinutes() < 10?'0':'')+date.getMinutes()+"</td>"
        + "<td>"+sig.createdByName.replace(/'/g, '&#39;').replace(/"/g, '&#34;')+"</td>"
        + "</tr>";

		if (sig.lifeTime != sig.modifiedTime) {
			date = new Date(sig.modifiedTime);
			// localOffset = date.getTimezoneOffset() * 60000;
			// date = new Date(date.getTime() + localOffset);
      
			tooltip += "<tr><th>Last Modified:</th><td>"+(date.getMonth()+1)+"/"+date.getDate()+" "+(date.getHours() < 10?'0':'')+date.getHours()+":"+(date.getMinutes() < 10?'0':'')+date.getMinutes()+"</td>"
          + "<td>"+sig.modifiedByName.replace(/'/g, '&#39;').replace(/"/g, '&#34;')+"</td>"
          + "</tr>";
		}

		tooltip += "</table>";

		return tooltip;
	}

    this.refresh = function(mode, data, successCallback, alwaysCallback) {
		var mode = mode || 'refresh';

		this.sync(mode, data, successCallback, alwaysCallback);
	}

	// getSystemIDsByNames performs a case-insensitive search of the internal
	// list of systems looking for matches on each system name in the given
	// comma-separated list of names. A comma-separated list of system IDs is
	// returned if all systems are found, otherwise the empty string is returned.
	this.getSystemIDsByNames = function(systemNames) {
		if (!_this.systems) {
			return "";
		}
		const values = systemNames.split(",");
		const systems = [];
		for(var i = 0; i < values.length; i++) {
			for (systemID in _this.systems) {
				const system = _this.systems[systemID];
				if (system.name.toLowerCase() == values[i].toLowerCase()) {
					systems.push(systemID);
					break;
				}
			}
		}
		if (values.length != systems.length) {
			return "";
		}
		return systems.join(",");
	}
}
;
// #endregion

// #region global-hooks
$("body").on("click", "a[href^='.?system=']", function(e) {
	e.preventDefault();

	var system = $(this).attr("href").replace(".?system=", "");
	var systemID = Object.index(tripwire.systems, "name", system);

	tripwire.systemChange(systemID);
});

// Treat the whole map card as the system link. Let clicks on the existing
// name link use the handler above so a single click never navigates twice.
$("body").on("click", "#chainMap div.node[data-nodeid]", function(e) {
	if (e.isDefaultPrevented() || $(e.target).closest("a").length) return;

	var systemID = $(this).data("nodeid");
	if (tripwire.systems[systemID]) tripwire.systemChange(systemID);
});

$("body").on("submit", "#systemSearch", function(e) {
	e.preventDefault();

	var system = $(this).find("[name='system']").val();
	var systemID = Object.index(tripwire.systems, "name", system, true) || false;

	if (systemID !== false) {
		tripwire.systemChange(systemID);
		$(this).find("[name='system']").val("");
		$("#search").click();
	}
});

// The header system picker is a transient filter, not a form users should
// have to dismiss separately. jQuery UI closes only its suggestion popup on
// Escape, and selecting a suggestion ordinarily just fills the input. Close
// the whole picker on Escape and submit a selected system immediately.
$("body").on("keydown", "#searchSpan input.systemsAutocomplete", function(e) {
	if (e.key === "Escape" && $("#search").hasClass("active")) {
		e.preventDefault();
		$("#search").trigger("click");
	}
});

$("body").on("inlinecompleteselect", "#searchSpan input.systemsAutocomplete", function(e, ui) {
	e.preventDefault();
	$(this).val(ui.item.value).closest("form").trigger("submit");
});

$("body").on("click", "#undo:not(.disabled)", function() {
	tripwire.undo();
});

$("body").on("click", "#redo:not(.disabled)", function() {
	tripwire.redo();
});

// Bind class=copy to copy the text of the previous element
$(".copy").on('click', function(e) {
	e.preventDefault();
	const source = e.target.previousElementSibling;
	if(source) { navigator.clipboard.writeText(source.innerText); }
	else { console.warn('Copy event couldn\'t find a source', e); }
});

// Chain map zooming (Gets funky if you push things too far)
$("#chainParent").on("wheel", function(e) {
	if(!(options.chain.scrollWithoutCtrl || e.ctrlKey)) { return; }
	e.preventDefault();
	var zoom = parseFloat($("#chainParent").css("zoom")) || 1.0;
	var min = 0.6;
	var max = 2.0;

    if (e.originalEvent.wheelDelta / 120 > 0 && zoom < max) {
		$("#chainParent").css("zoom", zoom + 0.1);
    } else if (e.originalEvent.wheelDelta / 120 < 0 && zoom > min) {
		$("#chainParent").css("zoom", zoom - 0.1);
    }

	// Save options
	options.chain.zoom = parseFloat($("#chainParent").css("zoom"));
	options.saveDelay(2000);
	chainZoomButton();
});

// Reset zoom is visible whenever the map is not at 1.0 -- including a zoom
// restored from the account at load. It used to fade in on the wheel and
// fade out three seconds later, so a saved zoom had no way back.
function chainZoomButton() {
	var zoom = parseFloat($("#chainParent").css("zoom")) || 1.0;
	$("#chain-zoom-reset").toggleClass("hidden", Math.abs(zoom - 1) < 0.01).css("display", "");
}
$(function() { setTimeout(chainZoomButton, 500); });

$("#chain-zoom-reset").on("click", function() {
	$("#chainParent").css("zoom", 1);
	options.chain.zoom = 1;
	options.saveDelay(2000);
	chainZoomButton();
});

$(document).keydown(function(e)	{
	// Let editable controls keep their native keyboard shortcuts. In particular,
	// Ctrl+A inside a note must select the note text, not every signature row.
	// Use the event target as well as activeElement because contenteditable events
	// can originate from a formatted child element inside the editing surface.
	if ($(e.target).closest("textarea, input, select, [contenteditable=true]").length ||
		(document.activeElement && document.activeElement.isContentEditable)) return;

	// Ctrl key hooks
	if (e.metaKey || e.ctrlKey) {

		if (e.keyCode === 89 && !$("#redo").hasClass("disabled")) {
			// Ctrl-y redo hook
			e.preventDefault();
			$("#redo").click();
			Notify.trigger("Redoing last undo");
		} else if (e.keyCode === 90 && !$("#undo").hasClass("disabled")) {
			// Ctrl-z undo hook
			e.preventDefault();
			$("#undo").click();
			Notify.trigger("Undoing last action");
		} else if (e.keyCode === 65) {
			// Ctrl-a select all (signatures) hook
			e.preventDefault();
			$("#sigTable tbody tr").addClass("selected");
			$("#signaturesWidget #delete-signature").trigger("delete:refresh");
		} else if (e.keyCode === 67) {
			// Ctrl-c copy selected signatures hook
			if (window.getSelection().toString() === "") {
				var output = "";
				$("#sigTable tbody tr.selected").each(function(row) {
					var signature = tripwire.client.signatures[$(this).data("id")];
					var row = [];

					if (signature.signatureID) {
						row.push(signature.signatureID.substring(0, 3).toUpperCase() + "-" + (signature.signatureID.substring(3, 6) || "###"));
					} else {
						row.push("null");
					}

					row.push(signature.type);
					if (signature.type === "wormhole") {
						var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0];
						var otherSignature = signature.id == wormhole.initialID ? tripwire.client.signatures[wormhole.secondaryID] : tripwire.client.signatures[wormhole.initialID];
						row.push(wormhole.type || "null" );
						row.push(tripwire.systems[signature.systemID] ? tripwire.systems[signature.systemID].name : appData.genericSystemTypes[signature.systemID]);
						row.push(tripwire.systems[otherSignature.systemID] ? tripwire.systems[otherSignature.systemID].name : appData.genericSystemTypes[otherSignature.systemID]);
						row.push(wormhole.life);
						row.push(wormhole.mass);
					} else {
						row.push(signature.name);
					}

					row.push(signature.createdByName);
					row.push(signature.lifeTime);
					row.push(signature.lifeLength);
					row.push(signature.lifeLeft);
					row.push(signature.modifiedByName);
					row.push(signature.modifiedTime);
					output += row.join(options.signatures.copySeparator) + "\r\n";
				});
				$("#clipboard").text(output);
				$("#clipboard").focus();
				$("#clipboard").select();
			}
		}
	} else {
		// delete key keyhooks
		if (e.keyCode == 46 && $("#sigTable tr.selected").length > 0) {
			$("#delete-signature").click();
		}
	}
});

// $("#APIclock").knob({angleArc: 359.9, height: 20, width: 20, max: 60, readOnly: true, displayInput: false, fgColor: "#CCC", bgColor: "#666"});

$("#follow").click(function(e) {
	e.preventDefault();

	if ($(this).hasClass("active"))
		$(this).removeClass("active");
	else
		$(this).addClass("active");

	options.buttons.follow = $(this).hasClass("active");
	options.save();
})

$("#show-viewing").click(function() {
	$(this).toggleClass("active");
	$(this).attr("aria-pressed", $(this).hasClass("active") ? "true" : "false");

	chain.redraw();

	options.buttons.chainWidget.viewing = $(this).hasClass("active");
	options.save();
});

$("#show-favorite").click(function() {
	$(this).toggleClass("active");
	$(this).attr("aria-pressed", $(this).hasClass("active") ? "true" : "false");

	chain.redraw();

	options.buttons.chainWidget.favorites = $(this).hasClass("active");
	options.save();
});

$("#chainWidget > .controls .bar-toggle[role='button']").on("keydown", function(e) {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		$(this).trigger("click");
	}
});

$("#system-favorite").click(function() {
	if ($(this).hasClass("active")) {
		$(this).removeClass("active").attr("data-icon", "star-empty");

		options.favorites.splice(options.favorites.indexOf(parseInt(viewingSystemID)), 1);
	} else {
		$(this).attr("data-icon", "star").addClass("active");

		options.favorites.push(parseInt(viewingSystemID));
	}

	if ($("#show-favorite").hasClass("active"))
		chain.redraw();

	options.save();
});

$('#favorite-dropdown-toggle').click(function() {
	const target = document.getElementById('favorite-panel');
	if(target.style.display === 'none') {
		const listWrapper = document.getElementById('favorite-panel-wrapper');
		listWrapper.innerHTML = options.favorites.length == 0 ? '<p>You have no favourites. Use the star to add a system.</p>'
			: options.favorites.map(function(f) {
				const systemInfo = systemAnalysis.analyse(f);
				return '<p>' + systemRendering.renderSystem(systemInfo) + '</p>';
			}).join('\n');
		target.style.display = '';
	} else { target.style.display = 'none'; }
});

$("#search").click(function(e) {
	$("#searchSpan").toggle();

	if ($(this).hasClass("active")) {
		$(this).removeClass("active");
		if (tripwire.client.EVE && tripwire.client.EVE.systemName)
			$("#currentSpan").show();
	} else {
		$(this).addClass("active");
		$("#currentSpan").hide();

		$("#searchSpan input[name=system]").focus().select();
	}
});

$("#toggle-automapper").click(function(e) {
	e.preventDefault();

	if ($(this).hasClass("active")) {
		$(this).removeClass("active");
	} else {
		$(this).addClass("active");
	}

	options.buttons.signaturesWidget.autoMapper = $(this).hasClass("active");
	options.save();
});

$("#user").click(function(e) {
	e.preventDefault();

	if ($(this).hasClass("active")) {
		$(this).removeClass("active");

		$("#login > #panel").css({display: "none"});

		//$("#wrapper").unbind("click");
	} else {
		$(this).addClass("active");

		$("#login > #panel").css({display: "inline"});
		$("#loginForm input[name=username]").focus().select();
	}
});
$("#wrapper").click(function(e) { // Click outside closes
	if(!(e.originalEvent && e.originalEvent.isInPanel)) {
		$("#login > #panel").css({display: "none"});
		$("#user").removeClass("active");
	}
});
$("#login").click(function(e) { // click inside doesn't
	e.originalEvent.isInPanel = true;
})


$("#logout").click(function() {
	window.location = "logout.php";
});

var Notify = new function() {
	this.trigger = function(content, color, stick, id, noticeOptions) {
		var color = typeof(color) !== "undefined" ? color : "blue";
		var stick = typeof(stick) !== "undefined" ? stick : 10000;
		var id = typeof(id) !== "undefined" ? id : null;

		return new jBox("Notice", $.extend({
			id: id,
			content: content,
			offset: {y: 35},
			animation: "flip",
			color: color,
			autoClose: stick
		}, noticeOptions || {}));
	}
}

// Init valdiation tooltips
var ValidationTooltips = new jBox("Tooltip", {
	trigger: null,
	addClass: "validation-tooltip",
	animation: "flip",
	fade: 0
});

var Tooltips = new jBox("Tooltip", {
	attach: $("[data-tooltip]"),
	getContent: "data-tooltip",
	position: {x: "right", y: "center"},
	outside: "x"
});

var SystemActivityToolTips = new jBox("Tooltip", {
	getContent: "data-tooltip",
	position: {y: "bottom"},
	appendTo: $("#chainParent"),
	reposition: true,
	repositionOnOpen: true,
	createOnInit: true,
	onOpen: function() {
		var targetPos = positionRelativeTo(this.target[0], document.getElementById('chainParent'));
		var nodePos = this.source.closest("[data-nodeid]").position();
		var parentPos = this.source.closest(".nodeActivity").position();
		var nodeHeight = this.source.closest("[data-nodeid]").height();
		// var nodeWidth = this.source.closest("[data-nodeid]").width();
		var tooltipWidth = this.container.parent().width();
		// var tooltipHeight = this.container.parent().height();

		this.options.position = {x: targetPos.left + 3 - tooltipWidth /2 , y: targetPos.top + this.target[0].offsetHeight};
	}
});

var WormholeRouteToolTips = new jBox("Tooltip", {
	getContent: "data-tooltip",
	position: {y: "bottom"},
	appendTo: $("#chainParent"),
	reposition: true,
	repositionOnOpen: true,
	createOnInit: true,
	onOpen: function() {
		var targetPos = positionRelativeTo(this.target[0], document.getElementById('chainParent'));
		var nodeHeight = this.source.closest("[data-nodeid]").height();
		// var nodeWidth = this.source.closest("[data-nodeid]").width();
		var tooltipWidth = this.container.parent().width();
		// var tooltipHeight = this.container.parent().height();
		
		this.options.position = {x: targetPos.left + 3 - tooltipWidth /2 , y: targetPos.top + this.target[0].offsetHeight};
	}
});

var WormholeTypeToolTips = new jBox("Tooltip", {
	attach: $("#chainMap .whEffect[data-icon]"),
	getContent: "data-tooltip",
	position: {x: "left", y: "center"},
	appendTo: $("#chainParent"),
	outside: "x",
	adjustDistance: 100,
	responsiveWidth: false,
	reposition: true,
	repositionOnOpen: true,
	createOnInit: true,
	onOpen: function() {
		var targetPos = positionRelativeTo(this.target[0], document.getElementById('chainParent'));
		var tooltipWidth = this.container.parent().width();

		this.options.position = {x: targetPos.left - tooltipWidth - 10, y: targetPos.top - 3};
	}
});

var OccupiedToolTips = new jBox("Tooltip", {
	pointer: "top:-3",
	position: {x: "right", y: "center"},
	appendTo: $("#chainParent"),
	outside: "x",
	minWidth: 100,
	animation: "move",
	adjustDistance: 100,
	responsiveWidth: false,
	reposition: true,
	repositionOnOpen: true,
	repositionOnContent: true,
	createOnInit: true,
	onOpen: function() {
		var tooltip = this;
		const nodeElemJ = this.source.closest("[data-nodeid]");
		var systemID = nodeElemJ.data("nodeid");
		var targetPos = positionRelativeTo(this.target[0], document.getElementById('chainParent'));

		this.options.position = {x: targetPos.left + this.target[0].offsetWidth, y: targetPos.top - 3};

		tooltip.setContent("&nbsp;");

		$.ajax({
			url: "occupants.php",
			dataType: "JSON",
			data: "systemID="+systemID,
			cache: false
		}).done(function(data) {
			if (data && data.occupants) {
				var chars = "<table>";

				// Sort by characterName
				data.occupants.sort(function(a, b) {
					if (a.characterName.toLowerCase() < b.characterName.toLowerCase()) return -1;
					if (a.characterName.toLowerCase() > b.characterName.toLowerCase()) return 1;
					return 0;
				});

				for (var x in data.occupants) {
					chars += "<tr><td>"+data.occupants[x].characterName+"</td><td style='padding-left: 10px;'>"+(data.occupants[x].shipTypeName?data.occupants[x].shipTypeName:"")+"</td></tr>";
				}

				chars += "</table>";
				tooltip.setContent(chars);
			}
		});
	}
});

$("#chainTabs").sortable({
	items: "> .tab",
	axis: "x",
	delay: 150,
	tolerance: "pointer",
	containment: "parent",
	update: function(e, ui) {
		var result = $("#chainTabs").sortable("toArray");
		var newTabs = [];

		for (var x in result) {
			newTabs.push(options.chain.tabs[result[x]]);
			$("#chainTabs .tab:eq("+x+")").attr("id", x);
		}

		options.chain.active = $(".tab.current").index();
		options.chain.tabs = newTabs;
		options.save();
	}
});

$("#chainTabs").on("click", ".tab", function(e) {
	e.preventDefault();
	// Clicking the selected tab again deselects it: the map then roots at
	// whichever system you are viewing ("Following you" in the strip).
	chain.setActiveTab($(this).hasClass("current") ? null : $(this).index())
});
$("#chainTabs").attr("title", "Click a tab to root the map there. Click the selected tab again to follow the system you are viewing.");

$("#chainTabs").on("click", ".closeTab", function(e) {
	e.stopPropagation();
	var $tab = $(this).closest(".tab");

	$("#dialog-confirm #msg").text("This tab will be removed, are you sure?");
	$("#dialog-confirm").dialog("option", {
		buttons: {
			"Remove Tab": function() {
				var i = $tab.index();

				options.chain.active = $(".tab.current").index();
				options.chain.tabs.splice(i, 1);
				options.save();

				$tab.remove();
				if ($("#chainTabs .tab.current").length == 0) {
					$("#chainTabs .tab:last").click();
				}

				for (var x = 0, l = $("#chainTabs .tab").length; x < l; x++) {
					$("#chainTabs .tab:eq("+x+")").attr("id", x);
				}

				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	}).dialog("open");
});

$("#newTab").on("click", function() {
	// check if dialog is open
	if (!$("#dialog-newTab").hasClass("ui-dialog-content")) {
		$("#dialog-newTab").dialog({
			resizable: false,
			minHeight: 0,
			dialogClass: "dialog-noeffect ui-dialog-shadow",
			buttons: {
				OK: function() {
					$("#newTab_form").submit();
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			},
			open: function() {
				$("#dialog-newTab .name").val(viewingSystem).focus();
				$("#dialog-newTab .sigSystemsAutocomplete").val(viewingSystem);
			},
			close: function() {
				ValidationTooltips.close();
			},
			create: function() {
				$("#dialog-newTab .sigSystemsAutocomplete").inlinecomplete({source: tripwire.aSigSystems, maxSize: 10, delay: 0, renderer: 'system'});

				$("#newTab_form").submit(function(e) {
					e.preventDefault();
					var $tab = $("#chainTab .tab").clone();
					var name = $("#dialog-newTab .name").val();
					var systemID = tripwire.getSystemIDsByNames($("#dialog-newTab .sigSystemsAutocomplete").val());
					var thera = $("#tabThera")[0].checked ? true : false;

					if (!name) {
						ValidationTooltips.open({target: $("#dialog-newTab .name")}).setContent("Must have a name!");
						return false;
					} else if (!systemID && $("#tabType1")[0].checked) {
						ValidationTooltips.open({target: $("#dialog-newTab .sigSystemsAutocomplete")}).setContent("Must have valid systems (comma separated if multiple)!");
						return false;
					} else if ($("#tabType2")[0].checked) {
						systemID = 0;
					}

					$tab.attr("id", $("#chainTabs .tab").length).find(".name").data("tab", systemID).text(name);
					options.chain.tabs.push({systemID: systemID, name: name, evescout: thera});
					options.save();

					$("#chainTabs").append($tab);

					$("#dialog-newTab").dialog("close");
				});

				$("#dialog-newTab .sigSystemsAutocomplete").click(function(e) {
					$("#dialog-newTab #tabType1").click();
				});
			}
		});
	} else if (!$("#dialog-newTab").dialog("isOpen")) {
		$("#dialog-newTab").dialog("open");
	}
});

$("#chainTabs").on("click", ".editTab", function(e) {
	e.stopPropagation();

	// check if dialog is open
	if (!$("#dialog-editTab").hasClass("ui-dialog-content")) {
		$("#dialog-editTab").dialog({
			resizable: false,
			minHeight: 0,
			dialogClass: "dialog-noeffect ui-dialog-shadow",
			buttons: {
				OK: function() {
					$("#editTab_form").submit();
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			},
			open: function() {
				$("#dialog-editTab .name").val(options.chain.tabs[options.chain.active].name).focus();
				$("#dialog-editTab .sigSystemsAutocomplete").val(options.chain.tabs[options.chain.active].systemID != 0 ? lookupMultiple(tripwire.systems, 'name', options.chain.tabs[options.chain.active].systemID) : "");
				options.chain.tabs[options.chain.active].systemID != 0 ? $("#dialog-editTab #editTabType1")[0].checked = true : $("#dialog-editTab #editTabType2")[0].checked = true;
				$("#dialog-editTab #editTabThera")[0].checked = options.chain.tabs[options.chain.active].evescout;
			},
			close: function() {
				ValidationTooltips.close();
			},
			create: function() {
				$("#dialog-editTab .sigSystemsAutocomplete").inlinecomplete({source: tripwire.aSigSystems, renderer: 'system', maxSize: 10, delay: 0});

				$("#editTab_form").submit(function(e) {
					e.preventDefault();
					var $tab = $("#chainTabs .tab").eq([options.chain.active]);
					var name = $("#dialog-editTab .name").val();
					var systemID = tripwire.getSystemIDsByNames($("#dialog-editTab .sigSystemsAutocomplete").val());
					var thera = $("#editTabThera")[0].checked ? true : false;

					if (!name) {
						ValidationTooltips.open({target: $("#dialog-editTab .name")}).setContent("Must have a name!");
						return false;
					} else if (!systemID && $("#editTabType1")[0].checked) {
						ValidationTooltips.open({target: $("#dialog-editTab .sigSystemsAutocomplete")}).setContent("Must have valid systems (comma separated if multiple)!");
						return false;
					} else if ($("#editTabType2")[0].checked) {
						systemID = 0;
					}

					$tab.attr("id", $("#chainTabs .tab").length).find(".name").data("tab", systemID).text(name);
					options.chain.tabs[options.chain.active] = {systemID: systemID, name: name, evescout: thera};
					options.save();
					chain.redraw();

					tripwire.parse(tripwire.client, "refresh");

					//$("#chainTabs").append($tab);

					$("#dialog-editTab").dialog("close");
				});

				$("#dialog-editTab .sigSystemsAutocomplete").click(function(e) {
					$("#dialog-editTab #editTabType1").click();
				});
			}
		});
	} else if (!$("#dialog-editTab").dialog("isOpen")) {
		$("#dialog-editTab").dialog("open");
	}
});

// Signature column context menu
$("#signaturesWidget #sigTable thead").contextmenu({
	delegate: "th.sortable",
	menu: "#signatureColumnMenu",
	position: function(event, ui) {
        return {my: "left top", at: "center", of: ui.target};
    },
	select: function(e, ui) {
		var col = $(ui.target).parent().parent().children().index($(ui.target).parent()) + 1;

		switch(col) {
			case 1:
				colName = "sigID";
				break;
			case 2:
				colName = "sigType";
				break;
			case 3:
				colName = "sigAge";
				break;
			case 4:
				colName = "leadsTo";
				break;
			case 5:
				colName = "sigLife";
				break;
			case 6:
				colName = "sigMass";
				break;
		}

		switch(ui.cmd) {
			case "leftAlign":
				$("#signaturesWidget #sigTable tbody td:nth-child("+ col +")").removeClass("centerAlign rightAlign").addClass("leftAlign");
				options.signatures.alignment[colName] = "leftAlign";
				break;
			case "centerAlign":
				$("#signaturesWidget #sigTable tbody td:nth-child("+ col +")").removeClass("leftAlign rightAlign").addClass("centerAlign");
				options.signatures.alignment[colName] = "centerAlign";
				break;
			case "rightAlign":
				$("#signaturesWidget #sigTable tbody td:nth-child("+ col +")").removeClass("centerAlign leftAlign").addClass("rightAlign");
				options.signatures.alignment[colName] = "rightAlign";
				break;
		}

		options.save();
	},
	beforeOpen: function(e, ui) {
		var col = $(ui.target).parent().parent().children().index($(ui.target).parent()) + 1;

		switch(col) {
			case 1:
				colName = "sigID";
				break;
			case 2:
				colName = "sigType";
				break;
			case 3:
				colName = "sigAge";
				break;
			case 4:
				colName = "leadsTo";
				break;
			case 5:
				colName = "sigLife";
				break;
			case 6:
				colName = "sigMass";
				break;
		}

		$(this).contextmenu("enableEntry", "leftAlign", true);
		$(this).contextmenu("enableEntry", "centerAlign", true);
		$(this).contextmenu("enableEntry", "rightAlign", true);

		$(this).contextmenu("enableEntry", options.signatures.alignment[colName], false);
	}
});

// Chain Map Context Menu
$("#chainParent").contextmenu({
	delegate: "div.node[data-nodeid]",
	position: function(event, ui) {
        return {my: "left top-1", at: "right top", of: ui.target};
    },
	menu: "#chainMenu",
	show: {effect: "slideDown", duration: 150},
	close: function() {
		$("#chainWidget").removeClass("context-menu-open");
	},
	select: function(e, ui) {
		const nodeElem = $(ui.target[0]).closest("[data-nodeid]");
		var id = nodeElem.data("nodeid");
		var row = nodeElem.attr("id").replace("node", "") -1;

		switch(ui.cmd) {
			case "showInfo":
				tripwire.esi.showInfo(id, options.tracking.active);
				break;
			case "setDest":
				tripwire.esi.setDestination(id, options.tracking.active, true);
				break;
			case "addWay":
				tripwire.esi.setDestination(id, options.tracking.active, false);
				break;
			case "setDestAll":
			case "addWayAll":
				for(const characterId in tripwire.esi.characters) {
					tripwire.esi.setDestination(id, characterId, ui.cmd == "setDestAll");
				}
				break;
			case "showMap":
				// CCPEVE.showMap(id);
				break;
			case "red":
			case "yellow":
			case "green":
			case "bubbled":
			case "camped":
			case "dangerous":
			case "do-not-jump":
			case "do-not-pvp":
				nodeElem.hasClass(ui.cmd + "Node") ? $(this).contextmenu("removeFlare", id, ui) : $(this).contextmenu("setFlare", id, ui.cmd, ui);
				break;
			case "mass":
				$("#dialog-mass").data("id", nodeElem.data("sigid")).data("systemID", id).dialog("open");
				break;
			case "ping":
				$("#dialog-ping").data("id", nodeElem.data("sigid") || null).data("systemID", id).dialog("open");
				break;
			case "collapse":
				chain.renderer.collapse(id, !chain.nodeIsCollapsed(id));
				break;
			case "copySystemName": 
				const systemName = tripwire.systems[id].name;
				navigator.clipboard.writeText(systemName); 
				break;
			case "makeTab":
				const existingTabIndex = Object.index(options.chain.tabs, 'systemID', '' + id, false);
				if(undefined !== existingTabIndex) {
					chain.setActiveTab(existingTabIndex);
				} else {
					const systemName = tripwire.systems[id].name;
					options.chain.tabs.push({systemID: '' + id, name: systemName});
					var newTab = $("#chainTab .tab").clone();
					newTab.attr('id', options.chain.tabs.length - 1).find(".name").data("tab", id).text(systemName);
					$("#chainTabs").append(newTab);
					chain.setActiveTab(options.chain.tabs.length - 1);
				}
				break;
		}
	},
	beforeOpen: function(e, ui) {
		$("#chainWidget").addClass("context-menu-open");
		var wormholeID = $(ui.target[0]).closest("[data-nodeid]").data("sigid") || null;
		var systemID = $(ui.target[0]).closest("[data-nodeid]").data("nodeid");
		const systemName = tripwire.systems[systemID].name;
		var activeFlare = $(ui.target[0]).closest("[data-nodeid]").attr("data-flare") || null;

		$("#chainMenu .flare-option").each(function() {
			var isActive = $(this).attr("data-command") === activeFlare;
			$(this)
				.toggleClass("flare-active", isActive)
				.children("a, [role='menuitem']")
				.attr("aria-current", isActive ? "true" : null);
		});

		// Add check for k-space
		if (tripwire.systems[systemID].class || !tripwire.esi.characters[options.tracking.active]) {
			$(this).contextmenu("enableEntry", "setDest", false);
			$(this).contextmenu("enableEntry", "addWay", false);
			$(this).contextmenu("enableEntry", "setDestAll", false);
			$(this).contextmenu("enableEntry", "addWayAll", false);
			$(this).contextmenu("enableEntry", "showMap", false);
		} else {
			$(this).contextmenu("enableEntry", "setDest", true);
			$(this).contextmenu("enableEntry", "addWay", true);
			$(this).contextmenu("enableEntry", "setDestAll", true);
			$(this).contextmenu("enableEntry", "addWayAll", true);
			$(this).contextmenu("enableEntry", "showMap", false);
		}
		
		// Add check for in-sig
		if (wormholeID) {
			$(this).contextmenu("enableEntry", "mass", true);
		} else {
			$(this).contextmenu("enableEntry", "mass", false);
		}
		
		// Add check for tab validity
		const existingTab = Object.find(options.chain.tabs, 'systemID', '' + systemID, false);
		$('#makeTabMenuItem').text((existingTab ? 'View Tab' : 'Make Tab') + ' for ' + systemName );
		$('#copySystemNameMenuItem').text('Copy "' + systemName + '"');

		const hasChildren = chain.nodeHasChildren(systemID);
		$('#collapseMenuItem').text(chain.nodeIsCollapsed(systemID) ? "Expand" : "Collapse");
		$(this).contextmenu("enableEntry", "collapse", hasChildren);
	},
	create: function(e, ui) {
		// Fix some bad CSS from jQuery Position
		const menuElem = document.getElementById('chainMenu');
		$(menuElem).css("width", "auto");
		$(menuElem).find(".ui-front").css("width", "auto");
		$(menuElem).find(".ui-front").css("position", "");

		$.moogle.contextmenu.prototype.setFlare = function(systemID, flare, ui) {
			var data = {"systemID": systemID, "flare": flare};

			$.ajax({
				url: "flares.php",
				type: "POST",
				data: data,
				dataType: "JSON"
			}).done(function(data) {
				if (data && data.result) {
					var existingFlare = Object.index(chain.data.flares.flares, "systemID", systemID);
					if (existingFlare !== undefined) {
						chain.data.flares.flares.splice(existingFlare, 1);
					}
					chain.data.flares.flares.push({systemID: systemID, flare: flare, time: null});
					chain.flares(chain.data.flares);
				}
			});
		}

		$.moogle.contextmenu.prototype.removeFlare = function(systemID, ui) {
			var data = {"systemID": systemID};

			$.ajax({
				url: "flares.php",
				type: "POST",
				data: data,
				dataType: "JSON"
			}).done(function(data) {
				if (data && data.result) {
					// $(ui.target[0]).closest("td").removeClass("redNode yellowNode greenNode");

					chain.data.flares.flares.splice(Object.index(chain.data.flares.flares, "systemID", systemID), 1);
					chain.flares(chain.data.flares);
				}
			});
		}
	}
});

/** Format a signature ID like abc123 as ABC-123 for user display */
function formatSignatureID(signatureID) {
	return (!signatureID) ? '???-###' :
		(signatureID.length >= 3 ? signatureID.substring(0, 3).toUpperCase() : '') + "-" + (signatureID.length == 6 ? signatureID.substring(3, 6) : "###");
}

// Used to generate eve-survival guide link
function linkSig(sigName) {
	var wormholeSignatures = [
		// Ore sites
		"Average Frontier Deposit",
		"Unexceptional Frontier Deposit",
		"Common Perimeter Deposit",
		"Exceptional Core Deposit",
		"Infrequent Core Deposit",
		"Unusual Core Deposit",
		"Rarified Core Deposit",
		"Isolated Core Deposit",
		"Ordinary Permiter Deposit",
		"Uncommon Core Deposit",

		// Gas Sites
		"Barren Perimeter Reservoir",
		"Minor Perimeter Reservoir",
		"Ordinary Perimeter Reservoir",
		"Sizeable Perimeter Reservoir",
		"Token Perimeter Reservoir",
		"Bountiful Frontier Reservoir",
		"Vast Frontier Reservoir",
		"Instrumental Core Reservoir",
		"Vital Core Reservoir",

		// Class 1
		"Perimeter Ambush Point",
		"Perimeter Camp",
		"Phase Catalyst Node",
		"The Line",
		"Forgotten Perimeter Coronation Platform",
		"Forgotten Perimeter Power Array",
		"Unsecured Perimeter Amplifier",
		"Unsecured Perimeter Information Center",

		// Class 2
		"Perimeter Checkpoint",
		"Perimeter Hangar",
		"The Ruins of Enclave Cohort 27",
		"Sleeper Data Sanctuary",
		"Forgotten Perimeter Gateway",
		"Forgotten Perimeter Habitation Coils",
		"Unsecured Perimeter Comms Relay",
		"Unsecured Perimeter Transponder Farm",

		// Class 3
		"Fortification Frontier Stronghold",
		"Outpost Frontier Stronghold",
		"Solar Cell",
		"The Oruze Construct",
		"Forgotten Frontier Quarantine Outpost",
		"Forgotten Frontier Recursive Depot",
		"Unsecured Frontier Database",
		"Unsecured Frontier Receiver",

		// Class 4
		"Frontier Barracks",
		"Frontier Command Post",
		"Integrated Terminus",
		"Sleeper Information Sanctum",
		"Forgotten Frontier Conversion Module",
		"Forgotten Frontier Evacuation Center",
		"Unsecured Frontier Digital Nexus",
		"Unsecured Frontier Trinary Hub",

		// Class 5
		"Core Garrison",
		"Core Stronghold",
		"Oruze Osobnyk",
		"Quarantine Area",
		"Forgotten Core Data Field",
		"Forgotten Core Information Pen",
		"Unsecured Frontier Enclave Relay",
		"Unsecured Frontier Server Bank",

		// Class 6
		"Core Citadel",
		"Core Bastion",
		"Strange Energy Readings",
		"The Mirror",
		"Forgotten Core Assembly Hall",
		"Forgotten Core Circuitry Disassembler",
		"Unsecured Core Backup Array",
		"Unsecured Core Emergence"
	];

	if (wormholeSignatures.indexOf(sigName) > -1) {
		return '<a href="https://eve-survival.org/wikka.php?wakka='+sigName.replace(/ /g, '')+'" target="_blank" class="siteLink">'+sigName+'</a>';
	}

	return sigName;
}

// Initialize tablesorter plugin on signaturesWidget table
$("#sigTable").tablesorter({
	sortReset: true,
	widgets: ['saveSort'],
	textExtraction: {
		2: function(node) { return $(node).find("span").data("age"); }
	}
});

// Keep sibling systems aligned with the active signature-table sort while
// the chain sort lock is enabled. Tablesorter fires this after restored sorts
// as well as after a header click.
$("#sigTable").on("sortEnd", function() {
	if (options.buttons.chainWidget.sortChildren && window.chain) chain.redraw();
});

$("body").on("click", "#chain-sort-lock", function(e) {
	e.preventDefault();

	var enabled = !options.buttons.chainWidget.sortChildren;
	options.buttons.chainWidget.sortChildren = enabled;
	$(this)
		.toggleClass("active", enabled)
		.attr({"data-icon": enabled ? "lock" : "lock-open", "aria-pressed": enabled ? "true" : "false"});
	options.save();
	if (window.chain) chain.redraw();
});

// Highlight signaturesWidget tr on click
$("#sigTable tbody").on("click", "tr", function(e) {
	if (e.metaKey || e.ctrlKey) {
		// ctrl or cmd key
		$(this).toggleClass("selected");
	} else if (e.shiftKey) {
		// shift key
		$(this).addClass("selected");
		$("#sigTable tbody tr.selected:first").nextUntil("#sigTable tbody tr.selected:last").addBack().add("#sigTable tbody tr.selected:last").addClass("selected");
	} else {
		$("#sigTable tbody tr.selected").removeClass("selected");
		$(this).addClass("selected");
	}
});

// Un-Highlight signaturesWidget tr on clicking outside
$(document).click(function(e) {
    if(!$(e.target).closest('#sigTable tbody').length && !$(e.target).closest('#edit-signature').length && !$(e.target).closest('#delete-signature').length && !$(e.target).closest('#map-pasted-wormholes').length) {
		$("#sigTable tbody tr.selected").removeClass("selected");
    }
});

// Monitor custom 'classchange' event
$("#sigTable tbody").on("classchange", "tr", function(e, className) {
	// Trigger signaturesWidget selected row change custom event
	if (className === "selected") {
		$("#signaturesWidget").trigger("selected:change");
	}
});

// Update signaturesWidget based on .selected rows change
$("#signaturesWidget").on("selected:change", function() {
	// Enable/Disable delete icon
	if ($("#sigTable tr.selected").length === 0) {
		$("#signaturesWidget #delete-signature").addClass("disabled");
	} else {
		$("#signaturesWidget #delete-signature").removeClass("disabled");
	}

	// Enable/Disable edit icon
	if ($("#sigTable tr.selected").length === 1) {
		$("#signaturesWidget #edit-signature").removeClass("disabled");
	} else {
		$("#signaturesWidget #edit-signature").addClass("disabled");
	}
})

$("#dialog-error").dialog({
	autoOpen: false,
	resizable: false,
	minHeight: 0,
	dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
	buttons: {
		Ok: function() {
			$(this).dialog("close");
		}
	},
	create: function() {
		$(this).dialog("option", "show", {effect: "shake", duration: 150, easing: "easeOutElastic"});
	}
});

$("#dialog-msg").dialog({
	autoOpen: false,
	resizable: false,
	minHeight: 0,
	dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
	buttons: {
		Ok: function() {
			$(this).dialog("close");
		}
	}
});

$("#dialog-confirm").dialog({
	autoOpen: false,
	resizable: false,
	minHeight: 0,
	dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
	buttons: {
		Cancel: function() {
			$(this).dialog("close");
		}
	}
});

if (window.location.href.indexOf("galileo") != -1) {
	Notify.trigger("This is the test version of Tripwire.<br/>Please use <a href='https://tripwire.cloud-things.com'>Tripwire</a>")
}
;
// #endregion

// #region wormholeRendering
/** Functions for rendering things relating to wormholes */
const wormholeRendering = new function() { 
	/** Render a wormhole type (from appData.wormholes).
	* @param type The type object e.g. appData.wormholes.B274
	* @param key The wormhole type e.g. 'B274'
	* @param from What system, or type of system e.g. 'Class-2' the wormhole comes from. If omitted, the type object will be used
	* @param target As above but for the target of the wormhole
	*/
	this.renderWormholeType = function(type, key, from, target) {
		return ((key || type.key) ? '<b>' + (key || type.key || '') + '</b>: ' : '') +
			formatEndTypes(type.from, from) + '➔' + formatEndTypes(type.leadsTo, target) +
			(type.jump ? ' (' + this.renderMass(type.jump) + ')' : '')
			;
	};
	
	/** Render a mass number. */
	this.renderMass = function(mass) { return Math.trunc(mass / 1e6) + 'kt'; }
	
	function formatEndTypes(types, override) {
		if(!types) { return '?'; }
		types = Array.isArray(types) ? types : [ types ];
		
		if(override) {
			const overrideSystem = override.name ? override :
				systemAnalysis.analyse(Object.index(appData.systems, "name", override, true) || override);	// look up real system ID first
			
			const eligibleTypes = types.filter(function(type) {
				return overrideSystem.name == type || overrideSystem.genericSystemType == type;
			});
			
			if(eligibleTypes.length) { types = eligibleTypes; }
		}
		
		return types.map(function(type) {
			const systemID = Object.index(appData.systems, "name", type, true) || type;	// look up real system ID first
			const system = systemAnalysis.analyse(systemID);
			return system ? '<span class="' + system.systemTypeClass + '">' + (system.name || system.systemTypeName) + '</span>' : undefined }
		).filter(function(x) { return x !== undefined; }).join(',');
	};
}
;
// #endregion

// #region widget-inlinecomplete
// Custom inlinecomplete + dropdown input
$.widget("custom.inlinecomplete", $.ui.autocomplete, {
	_create: function() {
		this.options.source = this._coerceSource(this.options.source);
		
		if (!this.element.is("input")) {
			this._selectInit();
		}

		// Invoke the parent function
		return this._super();
	},
	_value: function() {
		// Invoke the parent function
		var originalReturn = this._superApply(arguments);

		this.element.change();

		return originalReturn;
	},
	_suggest: function(items) {
		// if (this.element.val() != items[0].value) {
			// this.element.val(items[0].value.substr(0, this.element.val().length));
		// }

		// Invoke the parent function
		return this._super(items);
	},
	_coerceSource: function(source) {
		// Allow an object source like tripwire.systems - coerce it to an array
		return $.isArray(source) ? source :
			Object.keys(source).map(function(k) { return Object.assign({ key: k }, source[k]); }.bind(this) );
	},
	_initSource: function() {
		this.source = function(request, response) {
			var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
			var results = new Array(); // results array
			const dataSource = this.options.source;
			var maxSize = this.options.maxSize || 25; // maximum result size
			// simple loop for the options
			const extraMatchFunction = typeof this.options.extraMatch === 'function' ? this.options.extraMatch : function(x) { return false; }
			for (var i = 0, l = dataSource.length; i < l; i++) {
				const value = dataSource[i];
				const target = value.name || value.key || value;
				if (matcher.test(target) || extraMatchFunction(request.term, value)) {
					results.push( { value: target, label: target, content: typeof value === 'object' ? value : undefined });

					if (maxSize && request.term !== '' && results.length > maxSize) {
						break;
					}
				}
			}
			 // send response
			 response(results);
		}
	},	
	_renderItem: function( ul, item ) {
		if(item.content && this.options.renderer) {
			const renderFunction = typeof this.options.renderer === 'function' ? this.options.renderer : renderers[this.options.renderer];
			const renderResult = renderFunction(item.content);
			return $( "<li>" )
			.html( '<span>' + renderResult + '</span>')
			.appendTo( ul );
		} else return this._super(ul, item);
	},
	_close: function(event) {
		this.options.source = this.options.input_source ? this.options.input_source : this.options.source;

		// Invoke the parent function
		return this._super(event);
	},
	addToSelect: function(value) {
		this.options.select_added_value = value;
		this.options.select_source.unshift(value);
	},
	removeFromSelect: function(value) {
		if (value) {
			this.options.select_source.splice(value, 1);
		} else if (this.options.select_added_value) {
			this.options.select_source.splice(this.options.select_added_value, 1);
		}
		this.options.select_added_value = null;
	},
	_selectInit: function() {
		this.element.addClass("custom-combobox");
		this.wrapper = this.element;
		this.element = this.wrapper.find("input:first") || this.element;
		this.select = this.wrapper.find("select:first").remove();

		this.options.input_source = this.options.source;
		const selectItemMapper = this.options.select_item_mapper || function(x) { return x; };
		this.options.select_source = selectItemMapper(this.select.children("option[value!='']").map(function() { return $.trim(this.text); }).toArray());

		this._createShowAllButton();
	},
	_createShowAllButton: function() {
        var that = this,
          wasOpen = false;

        $("<a>")
			.attr("tabIndex", that.element.prop("tabindex"))
			.attr("title", "")
			.appendTo(that.wrapper)
			.button({icons: {primary: "ui-icon-triangle-1-s"}, text: false})
			.removeClass("ui-corner-all")
			.addClass("custom-combobox-toggle ui-corner-right")
			.on("mousedown", function() {
				wasOpen = that.widget().is(":visible");
			})
			.on("click", function() {
				that.element.trigger("focus");

				// Close if already visible
				if (wasOpen) {
				  return;
				}

				// Pass empty string as value to search for, displaying all results
				if(that.options.customDropdown) {
					that.options.select_source = that._coerceSource(that.options.customDropdown())
				}
				that.options.source = that.options.select_source;
				that._search("");
			});
	},
});

const renderers =  {
	system: function(system) {
		return systemRendering.renderSystem(systemAnalysis.analyse(undefined, system), 'span');
	},
	wormholeType: wormholeRendering.renderWormholeType
};
;
// #endregion

// #region systemAnalysis
const systemAnalysis = new function() {
	const mutators = [];
	this.addMutator = function(m) { mutators.push(m); }
	
	/** Extract attributes of the system, and allow mutators to add/modify them.
		Optionally, pass in a system object */
	this.analyse = function(systemID, system) {
		if(!system) { system = appData.systems[systemID]; }
		if(!system) { system = getDummySystem(systemID); }
		if(!systemID) { systemID = system.systemID; }
		const r = Object.assign({}, system);
		
		// Defaults or saved original values
		r.baseSecurity = 1 * system.security;
		r.pathSymbol = '■';
		r.systemTypeModifiers = [];		
		r.systemID = systemID;
		
		mutators.forEach(function(m) { m.mutate(r, systemID); });
		
		// Calculated final values
		r.class = (!r.class || Array.isArray(r.class)) ? r.class : [1 * r.class];
		r.systemTypeClass = r.genericLabel === 'Drifter' ? 'wh drifter' :
			r.class ? 'wh class-' + r.class[0] :
			r.factionID == 500026 ? 'triglavian' :
			r.security >= 0.45 ? 'hisec' :
			r.security > 0.0 ? 'lowsec' :
			r.security <= 0.0 ? 'nullsec' :
			'unknown';
		r.systemTypeName = r.genericLabel === 'Drifter' ? 'Drifter' :
			r.class ? 'C' + r.class.join('/') :
			r.factionID == 500026 ? 'Trig' :
			r.baseSecurity >= 0.45 ? 'HS' :
			r.baseSecurity > 0.0 ? 'LS' :
			r.baseSecurity <= 0.0 ? 'NS' :
			' ';
		r.genericSystemType = r.class ? r.class.map(x => 'Class-' + x) :
			r.factionID == 500026 ? ['Triglavian'] :
			r.baseSecurity >= 0.45 ? ['High-Sec'] :
			r.baseSecurity > 0.0 ? ['Low-Sec'] :
			r.baseSecurity <= 0.0 ? ['Null-Sec'] :
			undefined;
		r.effectClass = 
			r.effect === 'Black Hole' ? 'blackhole' :
			r.effect === 'Cataclysmic Variable' ? 'cataclysmic-variable' :
			r.effect === 'Magnetar' ? 'magnetar' :
			r.effect === 'Pulsar' ? 'pulsar' :
			r.effect === 'Red Giant' ? 'red-giant' :
			r.effect === 'Wolf-Rayet Star' ? 'wolf-rayet' :
			undefined;
			
		return r;
	};
	
	/** Get the classes possible for a 'leads to' text e.g. 'Class-2', 'Dangerous', 'Triglavian' */
	function classForTypeName(leadsTo) {
		return leadsTo && leadsTo.substring(0, 6) == 'Class-' ? [1 * leadsTo.substring(6)] :
			'Dangerous' == leadsTo ? [4,5] :
			'Drifter' == leadsTo ? [14,15,16,17,18] :
			'Unknown' == leadsTo ? [2,3] :
			'Unknown (small)' == leadsTo ? [1,2,3,13] :
			undefined;
	};
	this.classForTypeName = classForTypeName;	// expose public
	
	/** Create a dummy system object for fake IDs like 'Null-Sec', 'Class-5' etc */
	function getDummySystem(systemID) {
		const leadsToPointer = typeof(systemID) === "string" && systemID.indexOf("|") >= 0 ? appData.genericSystemTypes[systemID.substring(0, systemID.indexOf("|"))]
		: appData.genericSystemTypes.indexOf(systemID) >= 0 ? systemID
		: appData.genericSystemTypes[systemID];
		const nodeClass = classForTypeName(leadsToPointer);
		const nodeSecurity = 
			leadsToPointer == "High-Sec" ? 0.8 :
			leadsToPointer == "Low-Sec" ? 0.4 :
			leadsToPointer == "Null-Sec" ? -0.1 :
			undefined;
		const nodeFaction = 
			leadsToPointer == "Triglavian" ? 500026 :
			undefined;
		
		return { security: nodeSecurity, class: nodeClass, factionID: nodeFaction, genericLabel: leadsToPointer };
	}
}
;
// #endregion

// #region system-mutators/favourite
const mutator_favourite = new _FavouriteMutator();
systemAnalysis.addMutator(mutator_favourite);

function _FavouriteMutator() {
	const _this = this;

	this.mutate = function(system, systemID) {
		if(options.favorites.indexOf(systemID * 1) >= 0) {
			system.pathSymbol = '★';
			system.systemTypeModifiers.push('<span class="favorite active" data-icon="star"></span>');		// star added by CSS
		}
	}
}
;
// #endregion

// #region system-mutators/invasions
const invasions = new _Invasions();
systemAnalysis.addMutator(invasions);

function _Invasions() {
	const _this = this;
	const pathSymbolMap = {
		stellar_reconnaissance: '◆',
		
		triglavian_minor_victory: '▽',
		escalating_liminality: '▽',
		final_liminality: '▼',
		
		edencom_minor_victory: '△',
		redoubt: '△', bulwark: '△',
		fortress: '▲',
	};
	const textMap = {
		stellar_reconnaissance: 'Stellar Reconnaissance',
		
		triglavian_minor_victory: 'Triglavian Minor Victory',
		escalating_liminality: 'Escalating Liminality',
		final_liminality: 'Final Liminality',
		
		edencom_minor_victory: 'EDENCOM Minor Victory',
		redoubt: 'Redoubt',
		bulwark: 'Bulwark',
		fortress: 'EDENCOM Fortress',
	}
	const data = [{"system_id":30003088,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-10-04T12:29:02.888Z","system_name":"Oyonata","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30003894,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-10-01T18:28:09.852Z","system_name":"Sabusi","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30004302,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-30T15:36:50.977Z","system_name":"Omigiav","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30003539,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-30T14:11:30.759Z","system_name":"Miakie","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30005074,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-30T14:02:33.042Z","system_name":"Daran","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30003570,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-30T13:47:01.992Z","system_name":"Elore","system_security":"0.2","system_sovereignty":"gallente"},{"system_id":30003573,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-28T15:38:24.368Z","system_name":"Pertnineere","system_security":"0.4","system_sovereignty":"gallente"},{"system_id":30003463,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-28T15:38:14.299Z","system_name":"Erlendur","system_security":"0.5","system_sovereignty":"minmatar"},{"system_id":30002079,"status":"final_liminality","derived_security_status":"-0.4","updated_at":"2020-09-28T15:37:20.058Z","system_name":"Krirald","system_security":"0.2","system_sovereignty":"minmatar"},{"system_id":30002652,"status":"final_liminality","derived_security_status":"-0.4","updated_at":"2020-09-28T15:36:53.719Z","system_name":"Ala","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30045331,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-09-28T15:36:28.616Z","system_name":"Vaaralen","system_security":"0.3","system_sovereignty":"caldari"},{"system_id":30003788,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-26T12:44:03.049Z","system_name":"Intaki","system_security":"0.1","system_sovereignty":"gallente"},{"system_id":30002724,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-25T00:51:28.251Z","system_name":"Assiettes","system_security":"0.6","system_sovereignty":"gallente"},{"system_id":30002999,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-24T12:03:23.037Z","system_name":"Shastal","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30000102,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-23T22:22:21.093Z","system_name":"Dysa","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30003919,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-22T10:22:11.970Z","system_name":"Ashkoo","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30004978,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-22T10:21:30.195Z","system_name":"Pemene","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30004287,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-20T11:25:28.863Z","system_name":"Esubara","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30002051,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-20T11:25:09.478Z","system_name":"Anher","system_security":"0.5","system_sovereignty":"minmatar"},{"system_id":30003823,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-20T11:24:54.777Z","system_name":"Kenninck","system_security":"0.1","system_sovereignty":"gallente"},{"system_id":30001400,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-09-18T14:03:33.048Z","system_name":"Litiura","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30005251,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-18T09:42:27.550Z","system_name":"Asanot","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30005267,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-17T11:18:57.960Z","system_name":"Bherdasopt","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30002411,"status":"final_liminality","derived_security_status":"-0.3","updated_at":"2020-09-17T00:30:42.544Z","system_name":"Skarkon","system_security":"0.1","system_sovereignty":"minmatar"},{"system_id":30003587,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-15T01:16:50.021Z","system_name":"Harner","system_security":"0.1","system_sovereignty":"gallente"},{"system_id":30003904,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-14T16:54:07.359Z","system_name":"Col","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30005209,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-14T16:53:54.556Z","system_name":"Sibe","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30004103,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-14T13:40:36.727Z","system_name":"Kothe","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30005219,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-13T09:34:00.331Z","system_name":"Sigga","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30002755,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-12T20:51:38.354Z","system_name":"Usi","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30003824,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-11T08:28:52.435Z","system_name":"Archavoinet","system_security":"0.6","system_sovereignty":"gallente"},{"system_id":30002239,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-11T08:28:42.669Z","system_name":"Rammi","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30005005,"status":"final_liminality","derived_security_status":"-0.5","updated_at":"2020-09-10T21:09:12.196Z","system_name":"Ignebaener","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30000021,"status":"final_liminality","derived_security_status":"-0.8","updated_at":"2020-09-09T21:16:25.577Z","system_name":"Kuharah","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30000118,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-09T08:08:17.988Z","system_name":"Uanzin","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30003794,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-07T23:26:42.297Z","system_name":"Stacmon","system_security":"0.6","system_sovereignty":"gallente"},{"system_id":30003927,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-07T22:18:47.862Z","system_name":"Zahefeus","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30000109,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-07T20:54:30.351Z","system_name":"Berta","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30002797,"status":"final_liminality","derived_security_status":"-0.9","updated_at":"2020-09-06T13:33:29.649Z","system_name":"Kaunokka","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30031392,"status":"final_liminality","derived_security_status":"-0.4","updated_at":"2020-09-06T13:33:15.544Z","system_name":"Komo","system_security":"0.8","system_sovereignty":"caldari"},{"system_id":30004090,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-06T06:22:50.377Z","system_name":"Aband","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30000060,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-06T01:54:13.794Z","system_name":"Janus","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003548,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-05T17:05:22.429Z","system_name":"Barira","system_security":"0.8","system_sovereignty":"amarr"},{"system_id":30000160,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-04T23:48:55.626Z","system_name":"Reisen","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30004999,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-04T15:38:27.450Z","system_name":"Ladistier","system_security":"0.3","system_sovereignty":"gallente"},{"system_id":30000113,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-04T07:07:27.574Z","system_name":"Astabih","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30004295,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-09-02T18:09:55.446Z","system_name":"Keba","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30001413,"status":"final_liminality","derived_security_status":"-0.2","updated_at":"2020-09-02T08:11:42.869Z","system_name":"Nani","system_security":"0.8","system_sovereignty":"caldari"},{"system_id":30002386,"status":"fortress","derived_security_status":null,"updated_at":"2020-09-01T08:04:35.922Z","system_name":"Gelfiven","system_security":"0.6","system_sovereignty":"minmatar"},{"system_id":30004973,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-31T21:17:02.227Z","system_name":"Caslemon","system_security":"0.6","system_sovereignty":"gallente"},{"system_id":30004231,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-31T20:32:52.884Z","system_name":"Shakasi","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30004284,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-31T20:32:43.772Z","system_name":"Defsunun","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30002266,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-31T10:38:02.368Z","system_name":"Ahmak","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30003932,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-29T23:12:29.549Z","system_name":"Timudan","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30004254,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-28T16:43:28.986Z","system_name":"Fihrneh","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30004244,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-08-28T07:55:35.187Z","system_name":"Onanam","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30002513,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-27T20:59:21.817Z","system_name":"Dammalin","system_security":"0.5","system_sovereignty":"minmatar"},{"system_id":30000206,"status":"final_liminality","derived_security_status":"-0.5","updated_at":"2020-08-27T14:06:44.066Z","system_name":"Wirashoda","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30002048,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-27T11:14:57.970Z","system_name":"Bei","system_security":"0.6","system_sovereignty":"minmatar"},{"system_id":30003090,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-26T23:04:35.948Z","system_name":"Saidusairos","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30003478,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-26T00:06:02.331Z","system_name":"Basan","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30004289,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-25T11:33:32.949Z","system_name":"Vaini","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30045345,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-08-24T21:16:26.292Z","system_name":"Hirri","system_security":"0.3","system_sovereignty":"caldari"},{"system_id":30001358,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-08-24T08:44:18.165Z","system_name":"Ossa","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30003061,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-24T07:23:55.183Z","system_name":"Mormelot","system_security":"0.2","system_sovereignty":"gallente"},{"system_id":30040141,"status":"final_liminality","derived_security_status":"-0.4","updated_at":"2020-08-23T11:05:21.929Z","system_name":"Urhinichi","system_security":"0.8","system_sovereignty":"caldari"},{"system_id":30003078,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-22T18:47:39.976Z","system_name":"Erkinen","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30002530,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-22T15:09:00.523Z","system_name":"Avesber","system_security":"0.8","system_sovereignty":"minmatar"},{"system_id":30003900,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-22T07:50:34.044Z","system_name":"Ham","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30002644,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-21T08:26:40.788Z","system_name":"Ambeke","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30001401,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-08-21T00:44:17.584Z","system_name":"Nonni","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30045328,"status":"final_liminality","derived_security_status":"-0.7","updated_at":"2020-08-20T14:35:34.268Z","system_name":"Ahtila","system_security":"0.6","system_sovereignty":"caldari"},{"system_id":30003480,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-20T11:19:04.711Z","system_name":"Amod","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30004141,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-20T01:50:23.539Z","system_name":"Hiremir","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30002770,"status":"final_liminality","derived_security_status":"-0.1","updated_at":"2020-08-18T14:53:00.972Z","system_name":"Tunudan","system_security":"0.4","system_sovereignty":"caldari"},{"system_id":30003504,"status":"final_liminality","derived_security_status":"-0.7","updated_at":"2020-08-18T14:46:27.787Z","system_name":"Niarja","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30002253,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-18T09:31:28.183Z","system_name":"Arshat","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30002737,"status":"final_liminality","derived_security_status":"0.0","updated_at":"2020-08-16T21:29:53.121Z","system_name":"Konola","system_security":"0.7","system_sovereignty":"caldari"},{"system_id":30003398,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-16T17:38:55.577Z","system_name":"Anbald","system_security":"0.7","system_sovereignty":"minmatar"},{"system_id":30003490,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-15T20:27:08.919Z","system_name":"Khopa","system_security":"0.8","system_sovereignty":"amarr"},{"system_id":30001696,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-14T06:57:31.468Z","system_name":"Iro","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30000192,"status":"final_liminality","derived_security_status":"-0.3","updated_at":"2020-08-14T01:51:38.839Z","system_name":"Otanuomi","system_security":"0.4","system_sovereignty":"caldari"},{"system_id":30002772,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-13T11:24:31.714Z","system_name":"Rairomon","system_security":"0.6","system_sovereignty":"caldari"},{"system_id":30005284,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-13T11:24:24.229Z","system_name":"Promised Land","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30045354,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-08-13T07:37:02.262Z","system_name":"Reitsato","system_security":"0.2","system_sovereignty":"caldari"},{"system_id":30005222,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-12T17:58:16.210Z","system_name":"Serren","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003556,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-10T23:13:52.643Z","system_name":"Arton","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30005086,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-10T06:50:08.222Z","system_name":"Arza","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30000157,"status":"final_liminality","derived_security_status":"-0.3","updated_at":"2020-08-10T06:49:46.743Z","system_name":"Otela","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30003918,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-09T15:49:15.024Z","system_name":"Hakana","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30002385,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-09T00:34:34.831Z","system_name":"Teonusude","system_security":"0.6","system_sovereignty":"minmatar"},{"system_id":30002704,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-07T22:29:26.455Z","system_name":"Adrallezoen","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30001372,"status":"final_liminality","derived_security_status":"-0.9","updated_at":"2020-08-07T19:29:54.183Z","system_name":"Kino","system_security":"0.7","system_sovereignty":"caldari"},{"system_id":30003908,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-07T07:00:48.775Z","system_name":"Bashyam","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30000012,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-06T09:30:28.248Z","system_name":"Asabona","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30005058,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-05T21:45:44.898Z","system_name":"Neesher","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30004305,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-05T21:24:35.293Z","system_name":"Esaeel","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30003883,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-05T20:44:57.150Z","system_name":"Keberz","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003481,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-05T07:41:10.729Z","system_name":"Unefsih","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30003397,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-04T16:45:17.206Z","system_name":"Bongveber","system_security":"0.9","system_sovereignty":"minmatar"},{"system_id":30002702,"status":"final_liminality","derived_security_status":"-0.4","updated_at":"2020-08-04T11:15:48.842Z","system_name":"Archee","system_security":"0.4","system_sovereignty":"gallente"},{"system_id":30003460,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-03T22:03:14.542Z","system_name":"Offikatlin","system_security":"0.4","system_sovereignty":"minmatar"},{"system_id":30004084,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-02T17:58:04.736Z","system_name":"Ghesis","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003574,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-01T20:28:35.755Z","system_name":"Boystin","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30005213,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-01T20:20:33.816Z","system_name":"Hesarid","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30005308,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-08-01T10:42:51.414Z","system_name":"Jufvitte","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30002665,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-01T02:12:09.248Z","system_name":"Misneden","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30000188,"status":"fortress","derived_security_status":null,"updated_at":"2020-08-01T02:11:39.811Z","system_name":"Hentogaira","system_security":"0.6","system_sovereignty":"caldari"},{"system_id":30002557,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-07-31T18:00:06.264Z","system_name":"Atgur","system_security":"0.5","system_sovereignty":"minmatar"},{"system_id":30003058,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-29T09:14:47.194Z","system_name":"Olide","system_security":"0.7","system_sovereignty":"gallente"},{"system_id":30005334,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-28T23:28:39.525Z","system_name":"Tierijev","system_security":"0.8","system_sovereignty":"gallente"},{"system_id":30003046,"status":"final_liminality","derived_security_status":"-0.5","updated_at":"2020-07-28T14:20:51.847Z","system_name":"Angymonne","system_security":"0.6","system_sovereignty":"gallente"},{"system_id":30003514,"status":"fortress","derived_security_status":null,"updated_at":"2020-07-27T18:47:08.094Z","system_name":"Yeeramoun","system_security":"0.8","system_sovereignty":"amarr"},{"system_id":30002760,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-07-26T11:44:38.056Z","system_name":"Manjonakko","system_security":"0.3","system_sovereignty":"caldari"},{"system_id":30002506,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-23T18:07:27.688Z","system_name":"Osoggur","system_security":"0.5","system_sovereignty":"minmatar"},{"system_id":30005052,"status":"fortress","derived_security_status":null,"updated_at":"2020-07-21T17:37:44.002Z","system_name":"Soumi","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30003931,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-20T16:54:45.398Z","system_name":"Sassecho","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30005255,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-20T09:34:48.342Z","system_name":"Saphthar","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30020141,"status":"final_liminality","derived_security_status":"-0.9","updated_at":"2020-07-19T11:16:57.684Z","system_name":"Senda","system_security":"0.9","system_sovereignty":"caldari"},{"system_id":30002795,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-07-18T01:59:01.724Z","system_name":"Oshaima","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30000004,"status":"fortress","derived_security_status":null,"updated_at":"2020-07-17T22:26:00.294Z","system_name":"Jark","system_security":"0.8","system_sovereignty":"amarr"},{"system_id":30004263,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-15T21:20:01.593Z","system_name":"Feshur","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30000062,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-15T15:49:03.146Z","system_name":"Iosantin","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30002241,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-13T01:22:41.989Z","system_name":"Rimbah","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30004981,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-07-12T11:24:07.265Z","system_name":"Actee","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30002242,"status":"fortress","derived_security_status":null,"updated_at":"2020-07-10T19:06:05.853Z","system_name":"Mamenkhanar","system_security":"0.7","system_sovereignty":"amarr"},{"system_id":30003558,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-10T13:51:31.889Z","system_name":"Madimal","system_security":"0.7","system_sovereignty":"amarr"},{"system_id":30001376,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-09T16:04:24.621Z","system_name":"Nourvukaiken","system_security":"0.8","system_sovereignty":"caldari"},{"system_id":30045329,"status":"final_liminality","derived_security_status":"-0.4","updated_at":"2020-07-08T10:41:47.622Z","system_name":"Ichoriya","system_security":"0.6","system_sovereignty":"caldari"},{"system_id":30005252,"status":"fortress","derived_security_status":null,"updated_at":"2020-07-07T23:49:41.522Z","system_name":"Anzalaisio","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30004257,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-07T17:15:51.416Z","system_name":"Hakatiz","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30004108,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-05T01:56:57.535Z","system_name":"Chaneya","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30000048,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-03T15:11:36.506Z","system_name":"Ihal","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003482,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-02T20:56:41.226Z","system_name":"Mista","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30002225,"status":"final_liminality","derived_security_status":"-0.8","updated_at":"2020-07-01T14:11:27.451Z","system_name":"Harva","system_security":"0.8","system_sovereignty":"amarr"},{"system_id":30005263,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-01T13:43:12.530Z","system_name":"Mozzidit","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30005066,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-07-01T06:43:25.457Z","system_name":"Kerying","system_security":"0.2","system_sovereignty":"amarr"},{"system_id":30002986,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-28T17:43:41.096Z","system_name":"Mendori","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30001381,"status":"final_liminality","derived_security_status":"-0.1","updated_at":"2020-06-27T00:02:01.315Z","system_name":"Arvasaras","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30001447,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-25T02:19:25.407Z","system_name":"Taisy","system_security":"0.3","system_sovereignty":"caldari"},{"system_id":30002700,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-24T13:40:05.882Z","system_name":"Bawilan","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30001390,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-24T09:42:32.895Z","system_name":"Pakkonen","system_security":"0.4","system_sovereignty":"caldari"},{"system_id":30003076,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-23T09:02:12.462Z","system_name":"Gammel","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003050,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-23T06:32:08.087Z","system_name":"Odixie","system_security":"0.6","system_sovereignty":"gallente"},{"system_id":30000163,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-22T19:28:52.910Z","system_name":"Akora","system_security":"0.3","system_sovereignty":"caldari"},{"system_id":30003073,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-21T07:12:31.404Z","system_name":"Netsalakka","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30001391,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-20T21:12:20.299Z","system_name":"Piekura","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30002771,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-20T00:41:47.611Z","system_name":"Kulelen","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30000005,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-19T14:36:55.956Z","system_name":"Sasta","system_security":"0.8","system_sovereignty":"amarr"},{"system_id":30005330,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-19T13:21:23.145Z","system_name":"Arraron","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30000205,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-18T22:06:13.302Z","system_name":"Obe","system_security":"0.3","system_sovereignty":"caldari"},{"system_id":30003856,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-18T12:10:11.496Z","system_name":"Athounon","system_security":"0.1","system_sovereignty":"gallente"},{"system_id":30004250,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-17T11:42:53.830Z","system_name":"Chibi","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30004268,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-17T08:56:42.286Z","system_name":"Shenda","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30005236,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-17T07:25:26.811Z","system_name":"Noranim","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30003829,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-16T22:17:39.177Z","system_name":"Renarelle","system_security":"0.3","system_sovereignty":"gallente"},{"system_id":30005034,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-16T21:32:34.651Z","system_name":"Bridi","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30003074,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-16T21:31:28.344Z","system_name":"Sasiekko","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003392,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-15T19:26:39.709Z","system_name":"Eygfe","system_security":"0.7","system_sovereignty":"minmatar"},{"system_id":30001445,"status":"final_liminality","derived_security_status":"0.0","updated_at":"2020-06-15T03:38:02.163Z","system_name":"Nalvula","system_security":"0.4","system_sovereignty":"caldari"},{"system_id":30010141,"status":"final_liminality","derived_security_status":"-0.2","updated_at":"2020-06-14T01:12:53.428Z","system_name":"Sakenta","system_security":"1.0","system_sovereignty":"caldari"},{"system_id":30003809,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-13T20:25:21.879Z","system_name":"Brellystier","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30001718,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-13T05:28:45.485Z","system_name":"Paye","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30004256,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-11T13:37:54.195Z","system_name":"Edilkam","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30002645,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-11T00:28:57.560Z","system_name":"Carrou","system_security":"0.4","system_sovereignty":"gallente"},{"system_id":30045338,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-10T22:28:25.084Z","system_name":"Hikkoken","system_security":"0.3","system_sovereignty":"caldari"},{"system_id":30004301,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-10T16:44:37.396Z","system_name":"Anath","system_security":"0.1","system_sovereignty":"amarr"},{"system_id":30002575,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-10T05:41:23.824Z","system_name":"Sotrenzur","system_security":"0.3","system_sovereignty":"minmatar"},{"system_id":30003515,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-08T06:49:36.637Z","system_name":"Anila","system_security":"0.7","system_sovereignty":"amarr"},{"system_id":30004100,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-08T03:04:19.196Z","system_name":"Halibai","system_security":"0.7","system_sovereignty":"amarr"},{"system_id":30002397,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-08T01:10:38.296Z","system_name":"Horaka","system_security":"0.6","system_sovereignty":"minmatar"},{"system_id":30002662,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-07T11:22:11.884Z","system_name":"Pulin","system_security":"0.5","system_sovereignty":"gallente"},{"system_id":30001383,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-07T06:16:44.145Z","system_name":"Vaajaita","system_security":"0.5","system_sovereignty":"caldari"},{"system_id":30003854,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-06T19:17:57.398Z","system_name":"Alamel","system_security":"0.2","system_sovereignty":"gallente"},{"system_id":30003464,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-06T19:16:59.888Z","system_name":"Aldik","system_security":"0.7","system_sovereignty":"minmatar"},{"system_id":30000182,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-06T19:04:22.126Z","system_name":"Inaya","system_security":"0.6","system_sovereignty":"caldari"},{"system_id":30001660,"status":"edencom_minor_victory","derived_security_status":null,"updated_at":"2020-06-06T17:38:27.602Z","system_name":"Dabrid","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30001685,"status":"triglavian_minor_victory","derived_security_status":null,"updated_at":"2020-06-06T17:34:50.620Z","system_name":"Ordat","system_security":"0.3","system_sovereignty":"amarr"},{"system_id":30005029,"status":"final_liminality","derived_security_status":"-1.0","updated_at":"2020-06-06T15:44:51.914Z","system_name":"Vale","system_security":"0.7","system_sovereignty":"gallente"},{"system_id":30045322,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-06T01:44:55.204Z","system_name":"Samanuni","system_security":"0.7","system_sovereignty":"caldari"},{"system_id":30003885,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-05T17:09:39.066Z","system_name":"Arzanni","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30004248,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-05T00:49:40.255Z","system_name":"Haimeh","system_security":"0.5","system_sovereignty":"amarr"},{"system_id":30003495,"status":"final_liminality","derived_security_status":"-1.0","updated_at":"2020-06-04T23:08:13.644Z","system_name":"Raravoss","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30003541,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T16:55:17.838Z","system_name":"Faswiba","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30002651,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T15:38:07.592Z","system_name":"Fasse","system_security":"0.4","system_sovereignty":"gallente"},{"system_id":30004150,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T04:02:40.650Z","system_name":"Shaggoth","system_security":"0.7","system_sovereignty":"amarr"},{"system_id":30002251,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T04:02:40.650Z","system_name":"Sadye","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30005260,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T04:02:40.650Z","system_name":"Keri","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30000105,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T04:02:40.650Z","system_name":"Abha","system_security":"0.4","system_sovereignty":"amarr"},{"system_id":30004992,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T04:02:40.650Z","system_name":"Palmon","system_security":"0.4","system_sovereignty":"gallente"},{"system_id":30002243,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T04:02:40.650Z","system_name":"Seiradih","system_security":"0.6","system_sovereignty":"amarr"},{"system_id":30003553,"status":"fortress","derived_security_status":null,"updated_at":"2020-06-03T04:02:40.650Z","system_name":"Warouh","system_security":"0.5","system_sovereignty":"amarr"}];
	
	this.invasions = _.keyBy(data, function(x) { return x.system_id; });
	
	/** Update the system */
	this.mutate = function(system, systemID) {
		const systemInvasion = this.invasions[systemID];
		if(systemInvasion) {
			if(systemInvasion.derived_security_status) { system.security = 1 * systemInvasion.derived_security_status; }
			system.pathSymbol = pathSymbolMap[systemInvasion.status];
			const tip = textMap[systemInvasion.status] +
				(systemInvasion.derived_security_status ? '<br>Effective security lowered to ' + systemInvasion.derived_security_status : '');
			system.systemTypeModifiers.push('<span class="invasion ' + systemInvasion.status + '" data-tooltip="' + tip + '">' + system.pathSymbol + '</span>');
		}
	}
}
;
// #endregion

// #region guidance
var guidance = (function (undefined) {
	

	var sorter = function (a, b) {
		return parseFloat (a) - parseFloat (b);
	}

	function adjustCostForOptions(mapCost, toSystem) {		
		var system = systemAnalysis.analyse(30000000 + 1 * toSystem);
		if(!system) { return mapCost; }
		if(options.chain.routeIgnore.enabled && options.chain.routeIgnore.systems.indexOf(system.name) >= 0) {
			mapCost += 100;	// Penalty for an avoided system
		}
		if(system.name == 'Zarzakh') { mapCost += 100; } // Always avoid Zarzakh for its 6h wait
		switch(options.chain.routeSecurity) {
			case 'highsec': return mapCost + (system.security < 0.45 ? 100 : 0);
			case 'avoid-high': return mapCost + (system.security >= 0.45 ? 100 : 0);
			case 'avoid-null': return mapCost + (system.security <= 0.0 ? 100 : 0);
			default: return mapCost;	// in case of some invalid option, default to shortest
		}	
	}
	
	function adjustJumpCost(from, to, cost) {
		return Guidance.jumpCostModifiers.reduce((cost, modifier) => modifier(from, to, cost), cost);
	}

	/** Find a path between the start and end nodes (which may be arrays), up to the path length limit */
	var findPaths = function (map, start, end, limit) {
		if(!Array.isArray(start)) { start = [start]; } 
		if(!Array.isArray(end)) { end = [end]; } 
		
		start = start.filter(function(x) { return map[x]; });
		end = end.filter(function(x) { return map[x]; });
		
		const endsInStart = end.filter(function(x) { return start.indexOf(x) >= 0; });
		if(endsInStart.length) { return [endsInStart[0]]; }
		
		if(!(start.length && end.length)) { return null; }	// both ends of path must be in network somewhere

		var costs = {},
		    open = {'0': []},
		    predecessors = {},
		    keys;
		
		start.forEach(function(x) { costs[x] = 0; open[0].push(x); });

		var addToOpen = function (cost, vertex) {
			var key = "" + cost;
			if (!open[key]) open[key] = [];
			open[key].push(vertex);
		}

		while ((keys = Object.keys(open)).length) {
			keys.sort(sorter);

			var key = keys[0],
			    bucket = open[key],
			    node = bucket.shift(),
			    currentCost = parseFloat(key),
			    adjacentNodes = map[node] || {};

			if (!bucket.length) delete open[key];
			if(currentCost >= limit) { break; }

			for (var vertexText in adjacentNodes) {
				const vertex = 1 * vertexText;
			    if (adjacentNodes[vertex] !== undefined) {
					var cost = 1 + adjustCostForOptions(adjacentNodes[vertex], vertex),
					    totalCost = cost + currentCost,
					    vertexCost = costs[vertex];
					
					cost = adjustJumpCost(node, vertex, cost);

					if ((cost > 0) && (vertexCost === undefined) || (vertexCost > totalCost)) {
						costs[vertex] = totalCost;
						addToOpen(totalCost, vertex);
						predecessors[vertex] = node;
						if(end.indexOf(vertex) >= 0) {
							return extractShortest(predecessors, vertex);
						}
					}
				}
			}
		}
		
		return null;	// never hit any end node
	}

	var extractShortest = function (predecessors, end) {
		var nodes = [],
		    u = end;

		while (u) {
			nodes.push(u);
			predecessor = predecessors[u];
			u = predecessors[u];
		}

		nodes.reverse();
		return nodes;
	}

	/** Find the best path that connects the given nodes, in that order. The limit will be applied to each path segment, not the path as a whole. */
	var findMultiNodePath = function (map, nodes, limit) {
		var start = nodes.shift(),
		    end,
		    predecessors,
		    path = [],
		    shortest;

		while (nodes.length) {
			end = nodes.shift();
			shortest = findPaths(map, start, end, limit);

			if (shortest) {
				if (nodes.length) {
					path.push.apply(path, shortest.slice(0, -1));
				} else {
					return path.concat(shortest);
				}
			} else {
				return null;
			}

			start = end;
		}
	}
	
	var Guidance = { kSpaceCache: {}, jumpCostModifiers: [] };
	Guidance.clearCache = function() { Guidance.kSpaceCache = {}; }
	
	/** Find the shortest path between start and end nodes on the given map.
	The map should be a dictionary of node IDs where each entry is a dictionary of connected nodes and costs (see appData.map.shortest). An additional cost of 1 per jump will be added.
	You may also specify a maximum path length limit, if no path under this length is found then no path will be returned, even if a longer one is available.
	Start and end nodes may be a single ID or an array of IDs. If arrays are used then a single shortest path between any combination of nodes will be returned */
	Guidance.findShortestPath = function (map, start, end, limit) {
		if(start > 30000000) { start -= 30000000; }
		if(end > 30000000) { end -= 30000000; }
		
		const nodes = [start, end];

		const cacheKey = nodes.join(',') + (limit ? '-' + limit : '');
		const cachedPath = Guidance.kSpaceCache[cacheKey];
		if(cachedPath === undefined) {
			return Guidance.kSpaceCache[cacheKey] = findPaths(map, start, end, limit);
		} else {
			return cachedPath;
		}
	}
	
	/** Find the systems directly connected to this one. System IDs are in normal (+ 30000000) domain. */
	Guidance.connections = function(map, start) {
		if(start > 30000000) { start -= 30000000; }
		return Object.keys(map[start] || {})
			.map(k => (k * 1))
			.map(k => {
				const r = { systemID: k + 30000000 };
				if(0 > adjustJumpCost(start, k, 1)) { r.closed = true; }
				return r;
			});
	}

	return Guidance;
})();
;
// #endregion

// #region systemRendering
/** Functions for rendering things relating to systems or parts of the chain */
const systemRendering = new function() { 
	/** Render a path, as returned from guidance.findShortestPath */
	this.renderPath = function(path) {
		if(path.length <= 1 || path.length > options.chain.routingLimit) { return '' + path.length - 1; }
		else {
			var systemMarkup = path
			.slice(0, path.length - 1).reverse()
			.map(function(s) {
				const systemID = 30000000 + 1 * s;
				const system = systemAnalysis.analyse(systemID);
				const securityClass = system.systemTypeClass;
				// The tooltip showed the raw true-sec (0.4345345). The game shows
				// one decimal, and that is the number a pilot recognises.
				const sec = Number(system.security);
				const secText = isFinite(sec) ? sec.toFixed(1) : String(system.security);
				return '<span class="' + securityClass + '" data-tooltip="' + system.name + ' ' + secText + '" onclick="tripwire.systemChange(' + systemID + ')">' + system.pathSymbol + '</span>';
			});
			var r = '<span class="path">';
			for(var i = 0; i < systemMarkup.length; i++) {
				if(i > 0 && 0 == i % 5) { r += '|'; }
				
				r += systemMarkup[i];				 
			}
			return r + '</span>';
		}
	}
	
	this.renderEffect = function(system, tag) {
		return system.effectClass ? "<" + tag + " class='whEffect' data-icon='"+system.effectClass+"' data-tooltip='"+system.effect+"'></" + tag + ">" : '';
	}
	
	this.renderSystem = function(systemInfo, tag) {
		tag = tag || 'a';
		const text = systemInfo.name || systemInfo.genericSystemType;
		return '<' + tag + (tag === 'a' ? ' href=".?system=' + systemInfo.name + '"' : '') + '>' + text + '</' + tag + '> (' + this.renderEffect(systemInfo, 'span') + '<span class="' + systemInfo.systemTypeClass + '">' + systemInfo.systemTypeName + '</span>)';
	}
};
;
// #endregion

// #region chain-map-renderer-base
const ChainMapRendererBase = function(owner) {
	/** Is this renderer ready to accept draw calls? */
	this.ready = function() { return !this.drawing; }
	
	/** Switch to this renderer. The renderer can be in a blank state; draw() will be called after */
	this.switchTo = function() {
		if(!document.getElementById('map-container')) {
			const newDiv = document.createElement('div');
			newDiv.id = 'map-container';
			newDiv.className = 'radial-map';
			document.getElementById('chainMap').appendChild(newDiv);
		}
		this.container = document.getElementById('map-container');
		this.container.style.display = '';
	}
	
	/** Switch away from this renderer. All node divs should be removed from the DOM */
	this.switchFrom = function() {
		const div = document.getElementById('map-container');
		if(div) { div.parentNode.removeChild(div); }
		this.container = null;
	}
	
	this.collapse = function(systemID, collapse) {
		if(collapse) { this.mapData.collapsed.push(systemID); }
		else {  this.mapData.collapsed = this.mapData.collapsed.filter(x => x != systemID); }
		drawInner(this.mapData.map, this.mapData.lines, this.mapData.collapsed);
		owner.updateCollapsed(this.mapData.collapsed);
	}

	this.isCollapsed = function(systemID) {
		if (!this.mapData) return null;
		return this.mapData.collapsed.some(function(id) { return id == systemID; });
	}
	
	/** Redraw the map, based on the given node set, line overrides and list of collapsed systems */
	this.draw = function(map, lines, collapsed) {
		this.drawing = true;
		this.mapData = {map: map, lines: lines, collapsed: collapsed};
		
		// Clear the map for a new one
		//this.switchFrom(); this.switchTo();

		try { drawInner(map, lines, collapsed); }
		finally { this.drawing = false; }
	}
	
	/** Get the factor by which the 'arc' (or coverage if linear) for the current level reduces.
	E.g. for a circle, the 3rd ring is 3/4 the size of the 4th so arcFactor(3) should return 3/4.
	By default, all levels are the same 'size' */
	this.arcFactor = function(level) { return 1; }
	
	/** Calculate the minimum arc for this node, for example taking into account text size */
	this.calcMinArc = function(node) { return 1; }

	const _this = this;
	const drawInner = function(map, lines, collapsed) {
		const maps = [];
		const nodesById = {};
		
		// First pass: arrange nodes into rings
		for(var ri = 0; ri < map.rows.length; ri++) {
			const item = map.rows[ri];
			const inNode = item.c[0], id = inNode.v, parent = item.c[1].v;
			
			const mapNode = { id: id, children: [], systemID: inNode.systemID, minArc: 0 };
			
			if(parent == null) {
				const newMap =  { circles: [ { arc: 0, nodes: [ mapNode ] } ] };
				mapNode.map = newMap;
				mapNode.circle = 0;
				maps.push(newMap);
			} else {
				const parentNode = nodesById[parent];
				if(!parentNode) { throw 'Parent id ' + parent + ' not on map yet'; }
				parentNode.children.push(mapNode);
				mapNode.parent = parentNode;
				mapNode.connection = lines.filter(function(l) { return l[0] == id; })[0] || [id, parent, [], '?'];
				mapNode.styles = ['connection'].concat(mapNode.connection[2]);
				mapNode.map = parentNode.map;
				mapNode.circle = parentNode.circle + 1;
				if(mapNode.map.circles.length <= mapNode.circle) {
					mapNode.map.circles.push({ arc: 0, nodes:[mapNode] });
				} else { mapNode.map.circles[mapNode.circle].nodes.push(mapNode); }
			}
			nodesById[id] = mapNode;
			mapNode.markup = inNode.f;
			mapNode.requestedSize = measureNode(mapNode.markup);
		}

		// Second pass - for each map, find the allocation of arc needed for each node
		for(var mi = 0; mi < maps.length; mi++) {
			const map = maps[mi];
			for(var ci = map.circles.length - 1; ci >= 1; ci--) {	// don't need to calculate ring 0
				for(var ni = 0; ni < map.circles[ci].nodes.length; ni++) {
					const node = map.circles[ci].nodes[ni];
					node.minArc *= _this.arcFactor(ci);
					const minForNode = _this.calcMinArc(node);
					if(node.minArc < minForNode || collapsed.indexOf(node.systemID * 1) >= 0) {
						node.minArc = minForNode;
					}
					node.parent.minArc += node.minArc;
					map.circles[ci].arc += node.minArc;
				}
			}
		}

		// Third pass - lay out each ring based on the arc values
		for(var mi = 0; mi < maps.length; mi++) {
			const map = maps[mi];
			var mapDiv = document.getElementById("map" + mi);
			if(!mapDiv) {
				mapDiv = document.createElement('div');
				mapDiv.id = "map" + mi;
				mapDiv.className = "map-chain-wrapper";
			}
			mapDiv.innerHTML = '<div class="map-outer-container"><div class="map-inner-container"><canvas class="map-drawing" id="map-canvas-' + mi + '"/></div></div>';
			const innerContainer = mapDiv.firstChild.firstChild;
			document.getElementById('map-container').appendChild(mapDiv);

			const range = _this.initialRads(map.circles[0].nodes[0].minArc);
			map.bounds = makeDivsForRing(innerContainer, 0, map.circles[0].nodes, -range, range, collapsed);
			map.radRange = { min: -range, max: range };
			map.domNode = mapDiv;
			map.innerContainer = innerContainer;
		}

		// Fourth pass: update div and canvas bounds, and draw rings/links
		// Remember the scroll on the outer container so we can reset it if the map didn't change a lot
		const chainParent = document.getElementById('chainParent');
		const previousScroll = { x: chainParent.scrollLeft, y: chainParent.scrollTop };
		// Which system the map is rooted on. When that changes the old scroll
		// position is meaningless -- on a chain wider than the viewport it
		// leaves you looking at empty grid several screens from the system you
		// just opened, with no indication of which way to drag.
		const rootNode = maps.length && maps[0].circles.length && maps[0].circles[0].nodes.length
			? maps[0].circles[0].nodes[0] : null;
		const rootSystemID = rootNode ? 1 * rootNode.systemID : null;
		const rootChanged = rootSystemID !== null && rootSystemID !== _this.lastCentredSystemID;
		const CANVAS_SCALE = 1;
		for(var mi = 0; mi < maps.length; mi++) {
			const map = maps[mi];
			// Reset the width overrides so previous expansions aren't persisted if not needed any more
			map.domNode.style.width = null;
			map.domNode.style.height = null;
			const finalPositions = {
				w: 200 + map.bounds.x[1] - map.bounds.x[0],
				h: 100 + map.bounds.y[1] - map.bounds.y[0],
				cx: 100 - map.bounds.x[0],
				cy: 50 - map.bounds.y[0]
			}
			
			// Fill the space available, if we didn't already
			const centringOptions = _this.centringOptions;
			// Tree layouts keep the root on the exact centre line. Without
			// symmetric bounds, swapping a wide and a narrow sibling subtree
			// moves the root even though the tree itself has not changed size.
			if(centringOptions.rootNode && centringOptions.x) {
				const extentX = Math.max(Math.abs(map.bounds.x[0]), Math.abs(map.bounds.x[1]));
				finalPositions.w = 200 + 2 * extentX;
				finalPositions.cx = finalPositions.w / 2;
			}
			if(centringOptions.rootNode && centringOptions.y) {
				const extentY = Math.max(Math.abs(map.bounds.y[0]), Math.abs(map.bounds.y[1]));
				finalPositions.h = 100 + 2 * extentY;
				finalPositions.cy = finalPositions.h / 2;
			}
			if(centringOptions.x && maps.length == 1) {	// only centre in X if it's the only map, otherwise let them flow	
				const parentWidth = -38 + _this.container.offsetWidth;	// 20px for map margins, 18 for scrollbar
				if(finalPositions.w < parentWidth) {
					finalPositions.cx += 0.5 * (parentWidth - finalPositions.w);
					finalPositions.w = parentWidth;
				}
			}			
			if(centringOptions.y) {
				const parentHeight = chainParent.offsetHeight;
				if(finalPositions.h < parentHeight) {
					finalPositions.cy += 0.5 * (parentHeight - finalPositions.h);
					finalPositions.h = parentHeight;
				}
			}
			
			// If there's enough space to centre the top level node now, do it
			if(centringOptions.y && centringOptions.rootNode && finalPositions.h >= 2 * (map.bounds.y[1] > -map.bounds.y[0] ? map.bounds.y[1] : -map.bounds.y[0])) {
				finalPositions.cy = finalPositions.h / 2;
			}
			if(centringOptions.x && centringOptions.rootNode && finalPositions.w >= 2 * (map.bounds.x[1] > -map.bounds.x[0] ? map.bounds.x[1] : -map.bounds.x[0])) {
				finalPositions.cx = finalPositions.w / 2;
			}			
			map.domNode.style.width = finalPositions.w + 'px';
			map.domNode.style.height = finalPositions.h + 'px';
			const outerContainer = map.domNode.firstChild;
			outerContainer.style.left = finalPositions.cx + 'px';
			outerContainer.style.top = finalPositions.cy + 'px';
			const canvas = outerContainer.getElementsByTagName('canvas')[0];
			canvas.width = CANVAS_SCALE * finalPositions.w;
			canvas.style.width = finalPositions.w + 'px';
			canvas.height = CANVAS_SCALE * finalPositions.h;
			canvas.style.height = finalPositions.h + 'px';
			canvas.style.left = -finalPositions.cx + 'px';
			canvas.style.top = -finalPositions.cy + 'px';
			const ctx = canvas.getContext('2d');
			ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
			ctx.translate(finalPositions.cx, finalPositions.cy);
			
			for(var ci = map.bounds.maxCi; ci >= 1; ci--) {	// don't need to draw ring 0
				if(options.chain.gridlines) {
					_this.drawGridlines(ctx, ci, map.radRange);
				}
			}
			const lineWeightFactor = options.chain.lineWeight || 1.0;
			for(var ci = map.bounds.maxCi; ci >= 1; ci--) {
				if(ci >= map.circles.length) { continue; }
				
				ctx.save();
				if(options.chain.aura) { // draw aura first
					drawConnections(ctx, map.circles[ci].nodes, function(node) {
						ctx.save();
						ctx.lineWidth = lineWeightFactor;
						const auraColor = propertyFromCssClass(node.styles, 'color');
						ctx.shadowBlur = 11 * lineWeightFactor;
						ctx.shadowColor = auraColor;
						ctx.strokeStyle = 'black';
						for(let ai = 0; ai < 8; ai++)
							ctx.stroke();
						ctx.restore();					
					});
				}
				
				drawConnections(ctx, map.circles[ci].nodes, function(node) {		
					ctx.lineWidth = lineWeightFactor * parseInt(propertyFromCssClass(node.styles, 'border-width')) || 2;
					ctx.strokeStyle = propertyFromCssClass(node.styles, 'border-top-color');
					ctx.setLineDash ({ dashed: [5, 3] }[propertyFromCssClass(node.styles, 'border-top-style')] || []);
					ctx.stroke();
				});					

				ctx.restore();
			}	
		}
		
		// Remove any maps which aren't in use any more
		for(var mi = maps.length; ; mi++) {
			const div = document.getElementById('map' + mi);
			if(div) { div.parentNode.removeChild(div); }
			else { break; }
		}
		
		// A refresh of the same chain must not yank the view around, so the
		// scroll is restored -- but a new root system is centred, because
		// keeping the old offset is the thing that loses you.
		if (rootChanged && rootNode && rootNode.domNode) {
			_this.lastCentredSystemID = rootSystemID;
			// scrollIntoView also scrolls the page and every other scrollable
			// ancestor. When the chain arrives after first paint that can move the
			// application header and the tops of all three compact panels above
			// the viewport. Centre only the map's own scroll container instead.
			const nodePosition = positionRelativeTo(rootNode.domNode, chainParent);
			const chainZoom = 1 * (window.getComputedStyle(chainParent).getPropertyValue('zoom') || '1');
			const nodeRect = rootNode.domNode.getBoundingClientRect();
			const parentRect = chainParent.getBoundingClientRect();
			chainParent.scrollLeft = nodePosition.left
				+ nodeRect.width / chainZoom / 2
				- parentRect.width / chainZoom / 2;
			chainParent.scrollTop = nodePosition.top
				+ nodeRect.height / chainZoom / 2
				- parentRect.height / chainZoom / 2;
		} else {
			chainParent.scrollLeft = previousScroll.x;
			chainParent.scrollTop = previousScroll.y;
		}
	}
	
	function drawConnections(ctx, nodes, drawFunction) {
		for(var ni = 0; ni < nodes.length; ni++) {
			const node = nodes[ni];
			if(!node.position) { continue; }	// not drawn on map
			ctx.beginPath();
			ctx.moveTo(node.position.x, node.position.y);
			_this.drawConnection(ctx, node);
			drawFunction(node);
		}		
	}
	
	/** The coordinate space for the full range. May be based on the total requested arc */
	this.initialRads = function(minArc) { return Math.PI; }
	
	/** How many levels to skip to allow more space for the nodes. Only makes sense if each level is "wider" than the previous so it will have more space. */
	this.skipLevels = function(ci, nodes, minRad, maxRad, parentCollapsed) { return 0; }
	
	/** Set the position of this node based on its level and radial position within the level
	A "position" property with x and y must be set. Other values used in drawConnection may also be set */
	this.setPosition = function(node, ci, rad_centre) { throw 'must define setPosition'; }
	
	/** Draw the connection from this node to its parent. The current point will be the node's position. By default, draws a line */
	this.drawConnection = function(ctx, node) {
		ctx.lineTo(node.parent.position.x, node.parent.position.y);			
	}

	/** Draw grid lines for this level */
	this.drawGridlines = function(ctx, ci, radRange) { }
	
	this.adjustAlignmentDelta = function(ci, rad_centre) { return 0; }
	
	/** Override to not centre the map and centre node */
	this.centringOptions = { x: true, y: true, root_node: true };
	
	/** Add the nodes for this ring/level and all further rings to the container, and return the bounds of the space used by it
	Called recursively for chain sub-sections
	@param ci The index of the current level
	@param nodes The node data (see chain-map) for nodes within this level
	@param minRad The minimum radial coordinate for this section of chain
	@param maxRad The maximum radial coordinate for this section of chain
	@param collapsed The list of systems which have been collapsed 
	*/
	function makeDivsForRing(innerContainer, ci, nodes, minRad, maxRad, collapsed) {
		const bounds = { x: [0, 0], y: [0, 0], maxCi: ci };
		if(!nodes.length) { return bounds; }
		const parentCollapsed = collapsed.indexOf(1 * (nodes[0].parent || {}).systemID) >= 0;
		const totalArc = parentCollapsed ? nodes.length : nodes.reduce(function(acc, x) { return acc + x.minArc; }, 0);
		const rads_per_arc = (maxRad - minRad) / totalArc;
		var rad_offset = minRad;
		function getNodeRadialPosition(node) {
			const dr = (parentCollapsed ? 1 : node.minArc) * rads_per_arc,
				rad_centre = rad_offset + (dr / 2);
			return { dr: dr, rad_centre: rad_centre };
		}
		var alignment_delta = _this.adjustAlignmentDelta(ci, getNodeRadialPosition(nodes[0]).rad_centre);
		
		ci += _this.skipLevels(ci, nodes, minRad, maxRad, parentCollapsed);

		
		for(var ni = 0; ni < nodes.length; ni++) {
			const node = nodes[ni];	
			
			// Make the node
			const frag = document.createRange().createContextualFragment('<div class="node-wrapper">' + node.markup + '</div>');
			node.domNode = frag.firstChild;
			innerContainer.appendChild(node.domNode);
			const systemID = 1 * node.systemID;
			$(node.domNode).dblclick(() => _this.collapse(systemID, collapsed.indexOf(systemID) < 0));
			
			// Position the node
			const nodeRadialPosition = getNodeRadialPosition(node);
			
			_this.setPosition(node, ci, nodeRadialPosition.rad_centre + alignment_delta);
			
			if(node.position.x < bounds.x[0]) { bounds.x[0] = node.position.x; }
			if(node.position.x > bounds.x[1]) { bounds.x[1] = node.position.x; }
			if(node.position.y < bounds.y[0]) { bounds.y[0] = node.position.y; }
			if(node.position.y > bounds.y[1]) { bounds.y[1] = node.position.y; }
			
			node.domNode.style.left = node.position.x + 'px';
			node.domNode.style.top = node.position.y + 'px';
			
			if(parentCollapsed) {
				node.domNode.style.display = 'none';
			} else {				
				// Do the segment of the next circle
				const excess = (ci > 0 && nodeRadialPosition.dr > node.minArc * ci) ? nodeRadialPosition.dr - node.minArc * ci : 0;
				if(node.children.length) {
					const nextBounds = makeDivsForRing(innerContainer, ci + 1, node.children, rad_offset + (0.5 * excess) + alignment_delta, rad_offset - (0.5 * excess) + alignment_delta + nodeRadialPosition.dr, collapsed);
					if(nextBounds.x[0] < bounds.x[0]) { bounds.x[0] = nextBounds.x[0]; }
					if(nextBounds.x[1] > bounds.x[1]) { bounds.x[1] = nextBounds.x[1]; }
					if(nextBounds.y[0] < bounds.y[0]) { bounds.y[0] = nextBounds.y[0]; }
					if(nextBounds.y[1] > bounds.y[1]) { bounds.y[1] = nextBounds.y[1]; }
					if(nextBounds.maxCi > bounds.maxCi) { bounds.maxCi = nextBounds.maxCi; }
				}
			}
			rad_offset += nodeRadialPosition.dr;
		}
		
		return bounds;
	}
};

/** https://stackoverflow.com/questions/40978050 */
function propertyFromCssClass(className, property) {
	if(Array.isArray(className)) { className = className.join(' '); }
	var elem = document.getElementById('temp-div-' + className);
	if(!elem) {
	  elem = document.createElement("div");
	  elem.id = 'temp-div-' + className;
	  elem.style.cssText = "position:fixed;left:-100px;top:-100px;width:1px;height:1px;";
	  elem.className = className + ' temp';
	  document.body.appendChild(elem);  // required in some browsers
	  }
  const prop = getComputedStyle(elem).getPropertyValue(property);
  return prop;
}	

/** https://stackoverflow.com/questions/118241
Using the DOM approach because we have a fully styled node, not just text */
function measureNode(markup) {
	var elem = document.getElementById('temp-div-node-width');
	if(!elem) {
	  elem = document.createElement("div");
	  elem.id = 'temp-div-node-width';
	  elem.style.cssText = "position:fixed;left:-100px;top:-100px;";
	  elem.className = 'node-wrapper';
	  document.body.appendChild(elem);  // required in some browsers
  }
  elem.innerHTML = markup;
  return elem.firstChild.getBoundingClientRect();
}
;
// #endregion

// #region chain-map-renderer-orgchart-side
const ChainMapRendererOrgchartSide = function(owner) {
	ChainMapRendererBase.apply(this, arguments);
	
	const GRID_SIZE = { x: 70, y: 45 };
	
	this.initialRads = function(minArc) { return minArc * 0.5; }
	this.centringOptions = { y: true, rootNode: true };
	
	function project(rad, ci) { return {
		x: ((ci == 0 ? -0.3 : 0) + ci) * GRID_SIZE.x * options.chain.nodeSpacing.x,	// root is larger so give some extra space
		y: rad * GRID_SIZE.y * options.chain.nodeSpacing.y	
	}; }
	
	this.setPosition = function(node, ci, rad_centre) {
		node.position = project(rad_centre, ci);
	}
	
	this.drawConnection = function(ctx, node) {
		const ave_x = 0.5 * (node.position.x + node.parent.position.x);
		const cp1 = { x: node.parent.position.x, y: node.position.y };
		const cp2 = { x: node.parent.position.x, y: node.position.y };
		
		ctx.bezierCurveTo(cp2.x, cp2.y, cp1.x, cp1.y, node.parent.position.x, node.parent.position.y);
	}
	
	this.drawGridlines = function(ctx, ci, radRange) {
		ctx.beginPath();
		const start = project(radRange.min, ci), end = project(radRange.max, ci);
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		
		ctx.strokeStyle = propertyFromCssClass('grid-default', 'color');
		ctx.stroke();		
		
		ctx.fillStyle = propertyFromCssClass('grid-default', 'color');
		ctx.font = '10px Sans-serif';
		ctx.fillText(ci, start.x + 5, start.y);
	}		
};

ChainMapRendererOrgchartSide.prototype = new ChainMapRendererBase();
;
// #endregion

// #region chain-map-renderer-orgchart-top
const ChainMapRendererOrgchartTop = function(owner) {
	ChainMapRendererBase.apply(this, arguments);
	
	const GRID_SIZE = { x: 55, y: 45 };
	
	this.initialRads = function(minArc) { return minArc * 0.5; }
	this.centringOptions = { x: true, rootNode: true };
	
	function project(rad, ci) { return {
		x: rad * GRID_SIZE.x * options.chain.nodeSpacing.x,
		y: ((ci == 0 ? -0.3 : 0) + ci) * GRID_SIZE.y * options.chain.nodeSpacing.y	// root is larger so give some extra space
	}; }
	
	this.setPosition = function(node, ci, rad_centre) {
		node.position = project(rad_centre, ci);
		node.rad_centre = rad_centre;
	}
	
	this.calcMinArc = function(node) {
		// Keep collision sizing in the renderer's unscaled coordinate system.
		// Dividing by nodeSpacing here cancelled the multiplier in project(), so
		// wide nodes barely moved when the horizontal spacing setting changed.
		const arcFromSize = 0.2 + node.requestedSize.width / GRID_SIZE.x; // 0.2 to leave a gap between adjacent nodes
		return Math.max(arcFromSize, 1);
	}
	
	this.drawConnection = function(ctx, node) {
		const endpoint_y = node.parent.position.y; // + 10 * (3 - Math.abs(node.rad_centre - node.parent.rad_centre));
		const ave_y = 0.5 * (node.position.y + endpoint_y);
		const cp1 = { x: node.position.x, y: endpoint_y };
		const cp2 = { x: node.position.x, y: endpoint_y };
		
		ctx.bezierCurveTo(cp2.x, cp2.y, cp1.x, cp1.y, node.parent.position.x, endpoint_y);
	}
	
	this.drawGridlines = function(ctx, ci, radRange) {
		ctx.beginPath();
		const start = project(radRange.min, ci), end = project(radRange.max, ci);
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		
		ctx.strokeStyle = propertyFromCssClass('grid-default', 'color');
		ctx.stroke();		
		
		ctx.fillStyle = propertyFromCssClass('grid-default', 'color');
		ctx.font = '10px Sans-serif';
		ctx.fillText(ci, start.x, start.y + 12);
	}		
};

ChainMapRendererOrgchartTop.prototype = new ChainMapRendererBase();
;
// #endregion

// #region chain-map-renderer-orgchart
const ChainMapRendererOrgchart = function(owner) {
	const _this = this;
	
	/** Initialiser - callback from chart onload */
	this.init = function() {
		_this.map = new google.visualization.OrgChart(document.getElementById("chainMap"));
		_this.options = {allowHtml: true, allowCollapse: true, size: "medium", nodeClass: "node"};

		google.visualization.events.addListener(_this.map, "collapse", _this.collapseHandler);

		_this.map.draw(new google.visualization.DataView(new google.visualization.DataTable({cols:[{label: "System", type: "string"}, {label: "Parent", type: "string"}]})), _this.options);
	}
	
	/** Is this renderer ready to accept draw calls? */
	this.ready = function() { return !this.drawing && !!this.map; }
	
	/** Switch to this renderer. The renderer can be in a blank state; draw() will be called after */
	this.switchTo = function() {
		document.getElementById('chainGrid').style.display = '';
		if(!_this.map) { google.charts.setOnLoadCallback(this.init); }
	}
	
	/** Switch away from this renderer. All node divs should be removed from the DOM */
	this.switchFrom = function() {
		document.getElementById('chainGrid').style.display = 'none';
		_this.map.draw(new google.visualization.DataView(new google.visualization.DataTable({cols:[{label: "System", type: "string"}, {label: "Parent", type: "string"}]})), _this.options);		
	}
	
	/** Redraw the map, based on the given node set, line overrides and list of collapsed systems */
	this.draw = function(map, lines, collapsed) {
		this.drawing = true;
		const spacing = options.chain.nodeSpacing || {x: 1.4, y: 1.4};
		document.getElementById('chainMap').style.setProperty('--classic-node-spacing-x', spacing.x / 1.4);
		document.getElementById('chainMap').style.setProperty('--classic-node-spacing-y', spacing.y / 1.4);
		this.map.draw(newView(map), this.options); 
		
		for (var x in collapsed) {
			const s = collapsed[x];
			const nodeId = $("#chainMap [data-nodeid='"+s+"']").attr("id");
			if (nodeId) {
				const nodeVal = nodeId.split("node")[1];
				this.map.collapse(nodeVal - 1, true);
			}
		}
		
		centerRoot(map);
		updateLines(map, lines);
		this.drawing = false;
	};

	/** Collapse or expand a system from controls outside the Google chart. */
	this.collapse = function(systemID, collapse) {
		const nodeId = $("#chainMap [data-nodeid='"+systemID+"']").attr("id");
		if (!nodeId) return;

		this.map.collapse(parseInt(nodeId.replace("node", ""), 10) - 1, collapse);
		this.collapseHandler();
	};

	this.isCollapsed = function(systemID) {
		const nodeId = $("#chainMap [data-nodeid='"+systemID+"']").attr("id");
		if (!nodeId || !this.map) return null;
		const row = parseInt(nodeId.replace("node", ""), 10) - 1;
		return this.map.getCollapsedNodes().indexOf(row) >= 0;
	};
	
	const newView = function(json) {
		const view = new google.visualization.DataView(new google.visualization.DataTable(json));
		return view;
	};

	/** Balance the chart's outside space so the root sits on its exact
	 * horizontal centre line, independent of sibling subtree order. */
	const centerRoot = function(map) {
		const table = document.querySelector("#chainMap .google-visualization-orgchart-table");
		if(!table) return;

		table.style.paddingLeft = "0px";
		table.style.paddingRight = "0px";
		const roots = map.rows.filter(function(row) { return !row.c[1] || row.c[1].v === null; });
		// K-space and multi-system tabs have independent roots. Balancing the
		// whole chart around the first one adds a chart's worth of empty space
		// before the systems, leaving the initial viewport blank.
		if(roots.length !== 1) return;
		const rootNode = document.getElementById("node" + roots[0].c[0].v);
		if(!rootNode) return;

		const tableRect = table.getBoundingClientRect();
		const rootRect = rootNode.getBoundingClientRect();
		const rootCenter = rootRect.left + rootRect.width / 2;
		const leftExtent = rootCenter - tableRect.left;
		const rightExtent = tableRect.right - rootCenter;
		if(leftExtent < rightExtent) table.style.paddingLeft = (rightExtent - leftExtent) + "px";
		else if(rightExtent < leftExtent) table.style.paddingRight = (leftExtent - rightExtent) + "px";
	};
	
	const updateLines = function(map, lines) {
		_this.lastLineData = { map: map, lines: lines };
		function drawNodeLine(system, parent, mode, signatureID) {
			/*	function for drawing colored lines  */
			if(typeof mode == 'string') { mode = [mode]; }

			function addModes(jquerySelector, prefixes) { return doModeClasses(jquerySelector, prefixes, function(s, c) { s.addClass(c); }); }
			function removeModes(jquerySelector, prefixes) { return doModeClasses(jquerySelector, prefixes, function(s, c) { s.removeClass(c); }); }
			function doModeClasses(jquerySelector, prefixes, classFunc) {
				prefixes = prefixes || [];
				prefixes.push('');
				prefixes.forEach(function(prefix) { 
					mode.forEach( function(mode) { classFunc(jquerySelector, (prefix.length ? prefix + '-' : '') + mode); });
				});
				return jquerySelector;
			}

			// Find node in chainmap
			//var $node = $("#chainMap [data-nodeid='"+system+"']").parent();
			var $node = $("#chainMap #node"+system).parent();

			if ($node.length == 0) {
				return false;
			}

			// Get node # in this line
			var nodeIndex = Math.ceil(($node[0].cellIndex + 1) / 2 - 1);

			// applly to my top line
			var $connector = addModes($($node.parent().prev().children("td.google-visualization-orgchart-lineleft, td.google-visualization-orgchart-lineright")[nodeIndex]), [ 'left', 'right' ]);

			// Find parent node
			//var $parent = $("#chainMap [data-nodeid='"+parent+"']").parent();
			var $parent = $("#chainMap #node"+parent).parent();

			if ($parent.length == 0 || $connector.length == 0)
				return false;

			// Find the col of my top line
			var nodeCol = 0, connectorCell = $connector[0].cellIndex;
			$node.parent().prev().find("td").each(function(index) {
				nodeCol += this.colSpan;

				if (index == connectorCell) {
					return false;
				}
			});

			// Get node # in this line
			var parentIndex = Math.ceil(($parent[0].cellIndex + 1) / 2 - 1);

			// Compensate for non-parent nodes (slight performance hit ~10ms)
			var newparentIndex = parentIndex;
			for (var i = 0; i <= parentIndex; i++) {
				var checkSystem = 0;//$node.parent().prev().prev().prev().find("td:has([data-nodeid]):eq("+i+")").find("[data-nodeid]").data("nodeid");
				$node.parent().prev().prev().prev().find("td > [data-nodeid]").each(function(index) {
					if (index == i) {
						checkSystem = $(this).attr("id").replace("node", "");//$(this).data("nodeid");

						return false;
					}
				});

				if ($.map(map.rows, function(node) { return node.c[1].v == checkSystem ? node : null; }).length <= 0) {
					newparentIndex--;
				}
			}
			parentIndex = newparentIndex;

			// Apply to parent bottom line
			var $connecte = addModes($($node.parent().prev().prev().children("td.google-visualization-orgchart-lineleft, td.google-visualization-orgchart-lineright")[parentIndex]), [ 'left', 'right'] );

			// the beans
			var col = 0, parent = false, me = false;
			$node.parent().prev().prev().find("td").each(function(index, value) {
				col += this.colSpan;

				if (me && parent) {
					// All done - get outta here
					return false;
				} else if (typeof($connecte[0]) != "undefined" && $connecte[0].cellIndex == index) {
					parent = true;

					addModes($(this), ['left']);

					// remove bottom border that points to the right
					if (!me && col != nodeCol) {
						addModes($(this), ['bottom']);
					}

					// parent and node are same - we are done
					if (nodeCol == col) {
						return false;
					}
				} else if (col == nodeCol) {
					me = true;

					addModes($(this), [ 'bottom' ]);
				} else if (me || parent) {
					var tempCol = 0, breaker = false, skip = false;

					$node.parent().prev().find("td").each(function(index) {
						tempCol += this.colSpan;

						if (tempCol == col && ($(this).hasClass("google-visualization-orgchart-lineleft") || $(this).hasClass("google-visualization-orgchart-lineright"))) {
							if (parent == false) {
								// Stop looking cuz there is another node between us and parent
								breaker = true;
								removeModes($connecte, [ 'left', 'right' ]);
								return false;
							} else if (parent == true) {
								// Lets make sure there isnt a node between the parent and me
								removeModes($connecte, [ 'left', 'right' ]);

								$node.parent().prev().prev().find("td").each(function(index) {
									if (index >= $connecte[0].cellIndex) {
										// there is a node after parent but before me
										removeModes($(this), [ 'bottom' ]);
									}
								});
								skip = true;
							}
						}
					});

					if (breaker) {
						return false;
					}

					if (!skip) {
						addModes($(this), ['bottom'] );
					}
				}
			});
		}

		for (var x in lines) {
			drawNodeLine(lines[x][0], lines[x][1], lines[x][2].concat(['connection']), lines[x][3]);
		}
	};

	this.collapseHandler = function() {		
		if(_this.drawing) { return; }
		
		const collapsed = _this.map.getCollapsedNodes();
		const collapsedSystems = [];
		for (x in collapsed) {
			var systemID = $("#chainMap #node"+(collapsed[x] +1)).data("nodeid");
			collapsedSystems.push(systemID);
		}
		owner.updateCollapsed(collapsedSystems);
		
		if(_this.lastLineData) {
			centerRoot(_this.lastLineData.map);
			updateLines(_this.lastLineData.map, _this.lastLineData.lines);
		}
	}


};
;
// #endregion

// #region chain-map-renderer-radial
const ChainMapRendererRadial = function(owner) {
	ChainMapRendererBase.apply(this, arguments);
	
	const CIRCLE_SIZE = { x: 70, y: 60, first_ring_delta: 0.3,
		ringX: function(ci) { return ci == 0 ? 0 : (ci + this.first_ring_delta) * this.x * options.chain.nodeSpacing.x},
		ringY: function(ci) { return ci == 0 ? 0 : (ci + this.first_ring_delta) * this.y * options.chain.nodeSpacing.y},
	 };
	
	this.arcFactor = function(ci) { return ci / (ci + 1.0); }
	
	this.skipLevels = function(ci, nodes, minRad, maxRad, parentCollapsed) { 
		const max_nodes_per_rad = 1.4;
		let skipped = 0;
		if(ci > 0 && !parentCollapsed) {
			while(nodes.length > max_nodes_per_rad * ci * (maxRad - minRad) && ++skipped < 1) { }
		}
		return skipped; 
	}
	
	this.setPosition = function(node, ci, rad_centre) {
		node.radPosition = { r: ci, theta: rad_centre };
		node.position = radToCartesian(node.radPosition);		
	}
	
	this.drawConnection = function(ctx, node) {
		const cp1 = radToCartesian({ r: node.radPosition.r - 0.5, theta: (node.radPosition.theta + 2 * node.parent.radPosition.theta) / 3.0 });
		const cp2 = radToCartesian({ r: node.radPosition.r - 0.5, theta: (2 * node.radPosition.theta + node.parent.radPosition.theta) / 3.0 });
		
		if(node.circle > 1) {				
			ctx.bezierCurveTo(cp2.x, cp2.y, cp1.x, cp1.y, node.parent.position.x, node.parent.position.y);
		} else {
			ctx.lineTo(node.parent.position.x, node.parent.position.y);			
		}
	}
	
	this.adjustAlignmentDelta = function(ci, rad_centre) {
		return ci == 1 ? -rad_centre	// First node on first ring should be axis aligned
		: 0;
	}
	
	this.drawGridlines = function(ctx, ci) {
		ctx.beginPath();
		if(ctx.ellipse) {
			ctx.lineWidth = 0.5;
			ctx.setLineDash([]);
			ctx.ellipse(0, 0, CIRCLE_SIZE.ringX(ci), CIRCLE_SIZE.ringY(ci), 0, 0, Math.PI * 2);
		}
		ctx.strokeStyle = propertyFromCssClass('grid-default', 'color');
		ctx.stroke();		
	}		
	
	function radToCartesian(rad) {
		return { 
			x: CIRCLE_SIZE.ringX(rad.r) * Math.sin(rad.theta), 
			y: CIRCLE_SIZE.ringY(rad.r) * Math.cos(rad.theta)
		};

	}
};

ChainMapRendererRadial.prototype = new ChainMapRendererBase();
;
// #endregion

// #region chain-map
var chain = new function() {
	var chain = this;
	this.map, this.view, this.drawing, this.data = {};
	this.collapsedSystems = [];
	
	// Third party suppliers should have:
	//  findLinks(systemId, ids) - Find links from the given system coming from the third party. ids contain a parent and a child ID; the child ID should be incremented for every new connection
	
	// Suppliers register themselves with mapDataSuppliers.

	// Renderer should have:
	//  ready() - Whether the renderer is initialised and can accept draw calls
	// switchTo() - Make this renderer active. The renderer can be in a blank state; draw() will be called after
	// switchFrom() - Switch away from this renderer. All node divs should be removed from the DOM, other items can be removed or made invisible
	// draw(map, lines, collapsedSystems) - Redraw the map, based on the given node set, line overrides and list of collapsed systems 
	// collapse(systemID, toggle) - marks the system as collapsed/not collapsed
	// If the renderer allows collapsing of nodes then it will call updateCollapsed on the owner (the chain) with a list of collapsed systems in the current tab
	
	const renderers = { 
		orgChart: new ChainMapRendererOrgchart(this),
		orgChartTop: new ChainMapRendererOrgchartTop(this),
		orgChartSide: new ChainMapRendererOrgchartSide(this),
		radial: new ChainMapRendererRadial(this)
	};
	
	this.renderer = renderers[options.chain.renderer];
	this.renderer.switchTo();
	
	this.useRenderer = function(name) {
		if(!renderers[name]) { throw 'Unknown renderer ' + name; }
		if(chain.renderer != renderers[name]) {
			chain.renderer.switchFrom();
			chain.renderer = renderers[name];
			chain.renderer.switchTo();
			chain.redraw();
		}
	}

	this.activity = function(data) {
		/*	function for adding recent activity to chain map nodes	*/
		//var data = typeof(data) !== "undefined" ? data : this.data.activity;

		// Hide all activity colored dots instead of checking each one
		var elements = document.querySelectorAll("#chainMap .nodeActivity span");
		for (var i = 0, l = elements.length; i < l; ++i) {
		   elements[i].className = elements[i].className + " invisible";
		}

		// Loop through passed data and show dots by system
		var elements = document.querySelectorAll("#chainMap [data-nodeid]");
		for (var i = 0, l = elements.length; i < l; ++i) {
		   var systemID = elements[i].getAttribute("data-nodeid");
		   if (data[systemID]) {
			   var shipJumps = data[systemID].shipJumps;
			   var podKills = data[systemID].podKills;
			   var shipKills = data[systemID].shipKills;
			   var npcKills = data[systemID].npcKills;
			   var node = elements[i].getElementsByClassName("nodeActivity")[0];

			   if (shipJumps > 0) {
				   var jumps = node.getElementsByClassName("jumps")[0];
				   jumps.className = jumps.className.replace(/invisible/g, "");
				   jumps.setAttribute("data-tooltip", shipJumps + " Jumps");
			   }

			   if (podKills > 0) {
				   var pods = node.getElementsByClassName("pods")[0];
				   pods.className = pods.className.replace(/invisible/g, "");
				   pods.setAttribute("data-tooltip", podKills + " Pod Kills");
			   }

			   if (shipKills > 0) {
				   var ships = node.getElementsByClassName("ships")[0];
				   ships.className = ships.className.replace(/invisible/g, "");
				   ships.setAttribute("data-tooltip", shipKills + " Ship Kills");
			   }

			   if (npcKills > 0) {
				   var npcs = node.getElementsByClassName("npcs")[0];
				   npcs.className = npcs.className.replace(/invisible/g, "");
				   npcs.setAttribute("data-tooltip", npcKills + " NPC Kills");
			   }
		   }
		}

		if (SystemActivityToolTips.attachedElements && SystemActivityToolTips.attachedElements.length > 0) {
			SystemActivityToolTips.detach($("#chainMap .whEffect"));
		}
		SystemActivityToolTips.attach($("#chainMap .nodeActivity > span[data-tooltip]:not(.invisible)"));

		return data;
	}

	this.occupied = function(data) {
		/*	function for showing occupied icon  */

		// Hide all icons instead of checking each one
		$("#chainMap [data-icon='user'], #chainMap [data-icon='user'] + .badge").addClass("invisible");

		// Loop through passed data and show icons
		for (var x in data) {
			$("#chainMap [data-nodeid='"+data[x].systemID+"'] [data-icon='user']").removeClass("invisible");
			$("#chainMap [data-nodeid='"+data[x].systemID+"'] [data-icon='user'] + .badge").removeClass("invisible").text(data[x].count);
		}

		OccupiedToolTips.attach($("#chainMap [data-icon='user']:not(.invisible)"));

		return data;
	}

	this.flares = function(data) {
		/*	function for coloring chain map nodes via flares  */
		//var data = typeof(data) !== "undefined" ? data : this.data.flares;
		var flareNames = ["red", "yellow", "green", "bubbled", "camped", "dangerous", "do-not-jump", "do-not-pvp"];
		var flareLabels = {
			red: "Battle",
			yellow: "Hold",
			green: "Fleet Op",
			bubbled: "Bubbled",
			camped: "Camped",
			dangerous: "Dangerous",
			"do-not-jump": "Do Not Jump",
			"do-not-pvp": "Do Not PvP"
		};
		var flareNodeClasses = flareNames.map(function(flare) { return flare + "Node"; }).join(" ");

		// Remove all current node coloring instead of checking each one
		$("#chainMap div.node").removeClass("flareNode " + flareNodeClasses).removeAttr("data-flare data-flare-label");

		// Remove all coloring from chain grid
		$("#chainGrid tr").removeClass(flareNames.join(" "));

		// Loop through passed data and add classes by system
		if (data) {
			for (var x in data.flares) {
				var systemID = data.flares[x].systemID;
				var flare = data.flares[x].flare;

				var row = ($("#chainMap [data-nodeid="+systemID+"]")
					.addClass("flareNode " + flare + "Node")
					.attr("data-flare", flare)
					.attr("data-flare-label", flareLabels[flare] || flare)
					.parent().index() - 1) / 3 * 2;

				if (row > 0) {
					$("#chainGrid tr:eq("+row+")").addClass(flare).next().addClass(flare);
				}
			}
		}

		return data;
	}

	this.grid = function() {
		/*  function for showing/hiding grid lines  */
		// This is an optional feature
		if (options.chain.gridlines == false) {
			$("#chainGrid tr").addClass("hidden");
			return false;
		}

		$("#chainGrid tr").removeClass("hidden");
		//$("#chainGrid").css("width", "100%");

		// Calculate how many rows have systems, max 0 hack to prevent negative numbers, and rows above this number get hidden
		var rows = Math.max(0, $(".google-visualization-orgchart-table tr:has(.node)").length * 2 - 1);
		$("#chainGrid tr:gt("+rows+")").addClass("hidden");
	}

	this.nodes = function(map) {
		var chain = {cols: [{label: "System", type: "string"}, {label: "Parent", type: "string"}], rows: []};
		var frigTypes = ["Q003", "E004", "L005", "Z006", "M001", "C008", "G008", "A009", "SML" ];
		var connections = [];
		var chainMap = this;

		function formatStatics(statics) {
			if(!statics) { return ''; }
			else if(statics.length > 4) { return '<span class="type-label multi-static">+</span>'; }
			
			const shortCodeMap = { 'High-Sec': 'HS', 'Low-Sec': 'LS', 'Null-Sec': 'NS', 'Triglavian':'Trig',
				'Class-1': 'C1', 'Class-2': 'C2', 'Class-3': 'C3', 'Class-4': 'C4', 'Class-5': 'C5', 'Class-6': 'C6'
			};
			const classMap = { HS: 'hisec', LS: 'lowsec', NS: 'nullsec', Trig: 'triglavian',
				C1: 'class-1', C2: 'class-2', C3: 'class-3', C4: 'class-4', C5: 'class-5', C6: 'class-6'
			};
			return statics.map(function(s) {
				const text = shortCodeMap[appData.wormholes[s].leadsTo];
				const className = classMap[text] || 'unknown';
				const tip = appData.wormholes[s].leadsTo + ' via ' + s;
				return '<span class="type-label ' + className + '" data-tooltip="' + tip + '">' + text + '</span>';
			}).join('');
		}

		function topLevel(systemID, id) {
			if (!systemID || !tripwire.systems[systemID])
				return false;
			const tab = options.chain.tabs[options.chain.active];
			const tabName = tab && tab.systemID != 0 && 0 > tab.systemID.indexOf(',') ? options.chain.tabs[options.chain.active].name : undefined;
			return makeSystemNode(systemID, id, null, null, tabName, '&nbsp;', ['top-level']);
		}

		function makeSystemNode(systemID, id, whId, inSigId, systemName, nodeTypeMarkup, additionalClasses) {
			// System type switch
			const system = systemAnalysis.analyse(systemID);
			var systemType = "<span class='type-label " + system.systemTypeClass + "'>" + system.systemTypeName + system.systemTypeModifiers.join('') + "</span>";
			
			systemName = _.escape(bookmarkDestinations.displayName(systemName));
			const systemNameText = 
				options.chain.sigNameLocation == 'name' ? (systemName ? systemName : system.name ? system.name : '&nbsp;') :
				options.chain.sigNameLocation == 'name_prefix' ?
					(systemName ? systemName + (system.name ? ' - ' + system.name : '') : (system.name ? system.name : '&nbsp;')) :
				(system.name ? system.name : '&nbsp;');	

			var node = {v: id, systemID: systemID };
			var chainNode = "<div id='node"+id+"' data-nodeid='"+systemID+"'"
				+(whId ? " data-sigid='"+whId+"'" : '')
				+(inSigId ? " data-inSigid='"+inSigId+"'" : '')
				+" class='node sec-" + String(system.systemTypeClass || 'unknown').split(' ')[0] + (system.class ? " cls-" + system.class[0] : "") + " " + ((additionalClasses || []).join(' ')) + "'>"
							+	"<div class='nodeIcons'>"
							+		"<div style='float: left;'>"
							+ systemRendering.renderEffect(system, 'i')
							+		"</div>"
							+		"<div style='float: right;'>"
							+			"<i data-icon='user' class='invisible'></i>"
							+			"<span class='badge invisible'></span>"
							+		"</div>"
							+	"</div>"
							+	"<h4 class='nodeClass'>"+systemType+"</h4>"
							+	"<h4 class='nodeSystem'>"
							+		(system.name ? "<a href='.?system="+system.name+"'>"+systemNameText+"</a>" : systemNameText)
							+	"</h4>"
							+	"<h4 class='nodeType'>" + nodeTypeMarkup + "</h4>"
							+	"<div class='statics'>"
							+ formatStatics(system.name ? system.statics : [])
							+	"</div>"
							+	"<div class='nodeActivity'>"
							+		"<span class='jumps invisible'>&#9679;</span>&nbsp;<span class='pods invisible'>&#9679;</span>&nbsp;&nbsp;<span class='ships invisible'>&#9679;</span>&nbsp;<span class='npcs invisible'>&#9679;</span>"
							+	"</div>"
							+"</div>";

			node.f = chainNode;

			return node;
		}
		
		function makeCalcChildNode(childID, node, targetSystem) {
			var path = guidance.findShortestPath(tripwire.map.shortest, targetSystem - 30000000, node.child.systemID - 30000000);
			if(!path) { return null; }
			
			var calcNode = { calculated: true};
			calcNode.life = "Gate";
			calcNode.parent = {};
			calcNode.parent.id = node.child.id;
			calcNode.parent.systemID = node.child.systemID;
			calcNode.parent.name = node.child.name;
			calcNode.parent.type = node.child.type;
			calcNode.parent.nth = node.child.nth;

			calcNode.child = {};
			calcNode.child.id = ++childID;
			calcNode.child.systemID = targetSystem;
			calcNode.child.name = tripwire.systems[targetSystem].name;
			calcNode.child.path = path;
			calcNode.child.jumps = path.length - 1;
			calcNode.child.nth = null;			
			
			return { childID, calcNode };
		}

		function activeSignatureSort() {
			if (!options.buttons.chainWidget.sortChildren) return [];
			var table = $("#sigTable")[0];
			return table && table.config && Array.isArray(table.config.sortList) ? table.config.sortList : [];
		}

		function signatureAtSystem(wormhole, systemID) {
			var initial = tripwire.client.signatures[wormhole.initialID];
			var secondary = tripwire.client.signatures[wormhole.secondaryID];
			if (initial && initial.systemID == systemID) return {signature: initial, other: secondary};
			if (secondary && secondary.systemID == systemID) return {signature: secondary, other: initial};
			return null;
		}

		function signatureSortValue(pair, wormhole, column) {
			if (!pair) return null;
			var signature = pair.signature;
			var other = pair.other || {};
			switch (column) {
				case 0: return (signature.signatureID || "").toUpperCase();
				case 1:
					var isNamedEnd = wormhole.parent && wormhole[wormhole.parent + "ID"] == signature.id;
					return (isNamedEnd ? (wormhole.type || "") : "[" + (wormhole.type || "") + "]").toLowerCase();
				case 2: return Date.parse(signature.lifeTime || 0) || 0;
				case 3:
					var destination = tripwire.systems[other.systemID];
					return (signature.name || (destination && destination.name) || "").toLowerCase();
				case 4:
					var lifePreset = tripwire.signaturePayload && tripwire.signaturePayload.lifePreset
						? tripwire.signaturePayload.lifePreset(wormhole, signature) : wormhole.life;
					return ({stable: "Stable", critical4: "<4h", expiring: "Expiring"}[lifePreset] || lifePreset || "").toLowerCase();
				case 5:
					return ({stable: "Stable", destab: "<50%", critical: "<10%"}[wormhole.mass] || wormhole.mass || "").toLowerCase();
				default: return "";
			}
		}

		function compareValues(a, b) {
			if (a === b) return 0;
			if (a === null) return 1;
			if (b === null) return -1;
			if (typeof a === "number" && typeof b === "number") return a - b;
			return String(a).localeCompare(String(b), undefined, {numeric: true, sensitivity: "base"});
		}

		function sortedLinkKeys(chainData, systemID) {
			var keys = Object.keys(chainData);
			var sortList = activeSignatureSort();
			if (!sortList.length) return keys;

			return keys.sort(function(a, b) {
				var leftWormhole = chainData[a], rightWormhole = chainData[b];
				var left = signatureAtSystem(leftWormhole, systemID);
				var right = signatureAtSystem(rightWormhole, systemID);
				for (var i = 0; i < sortList.length; i++) {
					var column = sortList[i][0], direction = sortList[i][1] === 1 ? -1 : 1;
					var result = compareValues(
						signatureSortValue(left, leftWormhole, column),
						signatureSortValue(right, rightWormhole, column)
					);
					if (result) return result * direction;
				}
				return Number(leftWormhole.id) - Number(rightWormhole.id);
			});
		}

		function findLinks(system) {
			if (system[0] <= 0) return false;

			var parentID = parseInt(system[1]), childID = chainList.length;
			const connectedTo = [];	// Local cache, in addition to usedLinks, for extra link sources

			/** Add the 'current' and 'favourite' calculated nodes if appropriate */
			const addCalcChildNodes = function(node) {
				if ($("#show-viewing").hasClass("active") && tripwire.systems[node.child.systemID] && !tripwire.systems[viewingSystemID].class && !tripwire.systems[node.child.systemID].class && viewingSystemID != node.child.systemID ) {
					var calcNode = makeCalcChildNode(childID, node, viewingSystemID);
					if(calcNode) {
						childID = calcNode.childID;

						chainLinks.push(calcNode.calcNode);
						chainList.push([0, childID]);
					}
				}

				if ($("#show-favorite").hasClass("active") && tripwire.systems[node.child.systemID] && !tripwire.systems[node.child.systemID].class) {
					for (var x in options.favorites) {
						if (tripwire.systems[options.favorites[x]].regionID >= 11000000 || tripwire.systems[node.child.systemID].regionID >= 11000000 || options.favorites[x] == node.child.systemID)
							continue;

						var calcNode = makeCalcChildNode(childID, node, options.favorites[x]);
						if(calcNode) {
							childID = calcNode.childID;

							chainLinks.push(calcNode.calcNode);
							chainList.push([0, childID]);
						}
					}
				}				
			};

			var sortedKeys = sortedLinkKeys(chainData, system[0]);
			for (var keyIndex = 0; keyIndex < sortedKeys.length; keyIndex++) {
				var x = sortedKeys[keyIndex];
				var wormhole = chainData[x];
				if ($.inArray(wormhole.id, usedLinks) == -1) {
					var sig1, sig2, sig1Type, sig2Type,
						parent, child, parentType, childType;
					if (wormhole.parent == "secondary") {
						sig1 = tripwire.client.signatures[wormhole.secondaryID];
						sig2 = tripwire.client.signatures[wormhole.initialID];
					} else {
						sig1 = tripwire.client.signatures[wormhole.initialID];
						sig2 = tripwire.client.signatures[wormhole.secondaryID];
					}
					sig1Type = wormhole.type; sig2Type = 'K162';
					
					if (sig1 && sig1.systemID == system[0]) {
						parent = sig1; child = sig2;
						parentType = sig2Type; childType = sig1Type;
					} else if(sig2 && sig2.systemID == system[0]) {
						parent = sig2; child = sig1;
						childType = sig2Type; parentType = sig1Type;
					} else { continue; }
					
					var node = {};
					node.id = wormhole.id;
					node.life = wormhole.life;
					node.mass = wormhole.mass;
					node.time = parent.modifiedTime;

					node.parent = {};
					node.parent.id = parentID;
					node.parent.systemID = tripwire.systems[parent.systemID] ? parent.systemID : parent.systemID + "|" + Math.floor(Math.random() * Math.floor(10000));
					node.parent.name = child.name;
					node.parent.type = parentType;
					node.parent.nth = null;
					node.parent.signatureID = child.signatureID;
					node.parent.sigIndex = child.id;

					node.child = {};
					node.child.id = ++childID;
					node.child.systemID = tripwire.systems[child.systemID] ? child.systemID : child.systemID + "|" + Math.floor(Math.random() * Math.floor(10000));
					node.child.name = parent.name;
					node.child.type = childType;
					node.child.nth = null;
					node.child.signatureID = parent.signatureID;
					node.child.sigIndex = parent.id;

					chainLinks.push(node);
					chainList.push([node.child.systemID, node.child.id, system[2]]);
					usedLinks.push(node.id);
					if(tripwire.systems[child.systemID]) { connectedTo.push(1 * child.systemID); }	// cast to number - sigs have the system as a string
					// usedLinks[system[2]].push(node.id);
					
					addCalcChildNodes(node);					
				}
			}
			
			mapDataSuppliers.all().forEach(function(supplier) {				
				const ids = { parentID: parentID, nextChildID: ++childID };
				const supplierNodes = supplier.findLinks(1 * system[0], ids);
				if(!supplierNodes) { return; }
				childID = ids.nextChildID - 1;

				for(var ti = 0; ti < supplierNodes.length; ti++) {
					var supplierNode = supplierNodes[ti];
					if(0 > usedLinks.indexOf(supplierNode.id)) {
						if(0 > connectedTo.indexOf(supplierNode.child.systemID)) { // not in our map already
							supplierNode.thirdParty = supplier.nodeNameSuffix;
								
							chainLinks.push(supplierNode);
							chainList.push([supplierNode.child.systemID, supplierNode.child.id, system[2]]);
							connectedTo.push(supplierNode.child.systemID);		
							
							addCalcChildNodes(supplierNode);		
						}							
						// Always want to do this, even if we didn't add it, because in that case the link is overridden by one on this mask, so it is 'used' even if not made visible
						usedLinks.push(supplierNode.id);	
					}
				}
			});
		}
		
		if ($("#chainTabs .current").length > 0) {
			var systems = $("#chainTabs .current .name").data("tab").toString().split(",");
			var chainList = [];
			var chainData = map;
			var chainLinks = [];
			var usedLinks = [];

			if (systems == 0) {
                                let i = 0;
                                Object.keys(map).slice()/*.reverse()*/.forEach(x => {
				        const parent = tripwire.client.signatures[map[x].initialID];
				        const child = tripwire.client.signatures[map[x].secondaryID];
                                        if (parent && tripwire.systems[parent.systemID] && typeof(tripwire.systems[parent.systemID].class) == "undefined") {
						i++;
						// usedLinks[parent.systemID] = [];
						chain.rows.push({c: [topLevel(parent.systemID, i), {v: null}]});
						chainList.push([parent.systemID, i, parent.systemID]);
                                        } else if (child && tripwire.systems[child.systemID] && typeof(tripwire.systems[child.systemID].class) == "undefined") {
				  	        i++;
				  		// usedLinks[child.systemID] = [];
						chain.rows.push({c: [topLevel(child.systemID, i), {v: null}]});
						chainList.push([child.systemID, i, child.systemID]);
					}
				});
			} else {
				for (var x in systems) {
					// usedLinks[systems[x]] = [];
					chain.rows.push({c: [topLevel(systems[x], parseInt(x) + 1), {v: null}]});
					chainList.push([systems[x], parseInt(x) + 1, systems[x]]);
				}
			}

			for (var i = 0; i < chainList.length; i++) {
				findLinks(chainList[i]);
			}
		} else {
			$("#chainError").hide();

			var row = {c: []};
			var systemID = viewingSystemID;

			row.c.push(topLevel(systemID, 1), {v: null});

			chain.rows.push(row);

			var chainList = [[systemID, 1]];
			var chainData = map;
			var chainLinks = [];
			var usedLinks = [];

			for (var i = 0; i < chainList.length; ++i) {
				findLinks(chainList[i]);
			}
		}

		const systemsInChainMap = {};
		
		for (var x in chainLinks) {
			var node = chainLinks[x];
			var row = {c: []};
			
			const sigText = options.chain["node-reference"] == "id" ? (node.child.signatureID ? node.child.signatureID.substring(0, 3) : "???") :
					(node.child.type || "(?)");
			const nodeTypeMarkup = node.child.path ? 
				systemRendering.renderPath(node.child.path) :
				(node.child.sigIndex ? "<a href='#' onclick='sigDialog.openSignatureDialog({data: { signature: " + node.child.sigIndex + ", mode: \"update\" }}); return false;'>" : '') + _.escape(
					node.child.name && options.chain.sigNameLocation == 'ref' ? node.child.name :
					node.child.name && options.chain.sigNameLocation == 'ref_prefix' ? node.child.name + ' - ' + sigText :
					sigText
				) + (node.child.sigIndex ? '</a>' : '');
			const additionalClasses = node.calculated ? ['calc'] : systemsInChainMap[node.child.systemID] ? [ 'loop' ] : [];
			if(node.thirdParty) { additionalClasses.push('third-party', 'third-party-' + node.thirdParty); }

			// Connection modifiers
			var modifiers = [];			
			if (node.life == "critical") { modifiers.push('eol'); }
			if (node.mass == "critical") { modifiers.push('critical'); }
			else if (node.mass == "destab") { modifiers.push('destab'); }
			
			const connectionWormhole = wormholeAnalysis.wormholeFromTypePair(node.parent.type, node.child.type) || 
				wormholeAnalysis.likelyWormhole(node.parent.systemID, node.child.systemID);
			if(connectionWormhole.jump) { 
				modifiers.push('jm-' + (connectionWormhole.jump / 1e6) + 'kt'); 
				if(connectionWormhole.jump == 5000000) { modifiers.push('frig'); }
			}
			
			const parentModifiers = (systemsInChainMap[node.parent.systemID] || { chainModifiers:[]}).chainModifiers;
			row.chainModifiers = modifiers.concat(parentModifiers.filter(function(p) { return modifiers.indexOf(p) < 0; }));
			
			row.chainModifiers.forEach(function(cm) { modifiers.push(cm + '-chain')});
			
			// Update result set (rows/connections)
			const child = makeSystemNode(node.child.systemID, node.child.id, node.id, node.child.sigIndex, node.child.name, nodeTypeMarkup, additionalClasses.concat(modifiers));

			var parent = {v: node.parent.id};

			row.c.push(child, parent);
			chain.rows.push(row);
			connections.push(Array(child.v, parent.v, modifiers, node.id));
			
			const parentPathHome = (systemsInChainMap[node.parent.systemID] || { pathHome:[]}).pathHome;
			row.pathHome = parentPathHome.concat(node.child);
			
			if(!node.calculated) { 
				systemsInChainMap[node.child.systemID] = row; // store for loops/chain modifiers
			}	
		}

		// Apply critical/destab line colors
		connections.reverse(); // so we apply to outer systems first

		const exits = Object.keys(systemsInChainMap).filter(function(x) { return x < 31000000; });
		return {map: chain, lines: connections, systemsInChainMap: systemsInChainMap, exits: exits};
	}


	this.setActiveTab = function(newIndex) {
		$("#chainTabs .tab").removeClass("current");
		options.chain.active = newIndex;
		if(newIndex != null) {
			$("#chainTabs .tab").eq(newIndex).addClass('current');
		}
		
		options.save();
		chain.redraw();
		tripwire.parse(tripwire.client, "refresh");
	}

	this.redraw = function() {
		this.useRenderer(options.chain.renderer);
		
		var data = $.extend(true, {}, this.data);
		data.map = $.extend(true, {}, data.rawMap);

		this.draw(data);
	}

	this.nodeHasChildren = function(systemID) {
		const rows = (this.data.map && this.data.map.rows) || [];
		const node = rows.find(function(row) {
			return row.c[0].systemID == systemID;
		});
		return !!node && rows.some(function(row) {
			return row.c[1] && row.c[1].v == node.c[0].v;
		});
	}

	this.nodeIsCollapsed = function(systemID) {
		if (this.renderer && this.renderer.isCollapsed) {
			const collapsed = this.renderer.isCollapsed(systemID);
			if (collapsed !== null) return collapsed;
		}
		return this.collapsedSystems.some(function(id) { return id == systemID; });
	}

	this.renderCollapsedIndicators = function(collapsedSystems) {
		$("#chainMap .collapsed-branch").remove();
		(collapsedSystems || []).forEach(function(systemID) {
			const $node = $("#chainMap [data-nodeid='"+systemID+"']").first();
			if (!$node.length || !chain.nodeHasChildren(systemID)) return;

			const system = tripwire.systems[systemID];
			const label = system && system.name ? "Expand branch from " + system.name : "Expand collapsed branch";
			const $indicator = $('<button type="button" class="collapsed-branch" aria-label="'+_.escape(label)+'"><i data-icon="plus-circle" aria-hidden="true"></i><span>Collapsed</span></button>');
			$indicator.on("click", function(e) {
				e.preventDefault();
				e.stopPropagation();
				chain.renderer.collapse(systemID, false);
			});
			$node.append($indicator);
		});
	}
	
	var drawRetryTimer = null;

	this.draw = function(data) {
		var data = typeof(data) !== "undefined" ? data : {};
		clearTimeout(drawRetryTimer);

		// We need to make sure Google chart is ready and we have signature data for this system before we begin, otherwise delay
		if (!this.renderer.ready() || (Object.keys(data.map||{}).length && !tripwire.client.signatures)) {
			drawRetryTimer = setTimeout(function() { chain.draw(data) }, 100);
			return;
		}

		if (data.map) {
			this.drawing = true;

			this.data.rawMap = $.extend(true, {}, data.map);

			// if (options.chain.active == null || (options.chain.tabs[options.chain.active] && options.chain.tabs[options.chain.active].evescout == false)) {
			// 	if (options.masks.active != "273.0") {
			// 		for (var i in data.map) {
			// 			if (data.map[i].mask == "273.0") {
			// 				delete data.map[i];
			// 			}
			// 		}
			// 	}
			// }

			// Sort so we keep the chain map order the same
			Object.sort(data.map, "id");

			$.extend(data, this.nodes(data.map)); // 250ms -> <100ms
			$.extend(this.data, data);
			
			const tab = options.chain.tabs[options.chain.active];
			const collapsedSystems = tab ? (tab.collapsed || []) : (options.chain.collapsed || this.collapsedSystems);
			this.collapsedSystems = collapsedSystems.slice();

			this.renderer.draw(data.map, data.lines, collapsedSystems); // 150ms
			this.renderCollapsedIndicators(collapsedSystems);
			//this.map.draw(this.newView(data.map), this.options); // 150ms

//			this.renderer.lines(data); // 300ms
			this.grid(); // 4ms

			// Apply current system style
			$("#chainMap [data-nodeid='"+viewingSystemID+"']").parent().addClass("currentNode"); // 0.1ms

			// Remove old system effect tooltips and add current ones
			if (WormholeTypeToolTips.attachedElements && WormholeTypeToolTips.attachedElements.length > 0) {
				WormholeTypeToolTips.detach($("#chainMap .whEffect"));
			}
			WormholeTypeToolTips.attach($("#chainMap .whEffect[data-icon]")); // 0.30ms
			WormholeRouteToolTips.attach($("#chainMap .path span[data-tooltip]"));
			SystemActivityToolTips.attach($("#chainMap .nodeClass span[data-tooltip]"));
			
			this.drawing = false;
			
			systemPanel.update();
		}

		// Gather latest system activity
		if (!this.data.activity || new Date() > this.data.activity.expires) {
			data.activity = {};
			(async function() {
				const jumps = await tripwire.esi.universeJumps();
				data.activity.expires = new Date(jumps.expires);
				for (const result of jumps.data) {
					data.activity[result.system_id] = {
						systemID: result.system_id,
						shipJumps: result.ship_jumps
					};
				}
				const kills = await tripwire.esi.universeKills();
				for (const result of kills) {
					const activity = data.activity[result.system_id] ||
						(data.activity[result.system_id] = {systemID: result.system_id});
					activity.podKills = result.pod_kills;
					activity.shipKills = result.ship_kills;
					activity.npcKills = result.npc_kills;
				}
				chain.data.activity = chain.activity(data.activity);
			})().catch(function(error) {
				console.warn("System activity unavailable:", error);
			});
		} else if (data.map) {
			chain.activity(this.data.activity);
		}

		if (data.occupied) { // 3ms
			this.data.occupied = this.occupied(data.occupied);
		}

		if (data.flares) { // 20ms
			this.data.flares = this.flares(data.flares);
		}
	}

	this.updateCollapsed = function(collapsedSystems) {
		this.collapsedSystems = (collapsedSystems || []).slice();
		if (options.chain.tabs[options.chain.active]) {
			options.chain.tabs[options.chain.active].collapsed = this.collapsedSystems;
		} else {
			options.chain.collapsed = this.collapsedSystems;
		}

		this.renderCollapsedIndicators(this.collapsedSystems);
		
		// Apply current system style
		$("#chainMap [data-nodeid='"+viewingSystemID+"']").parent().addClass("currentNode");

		if (WormholeTypeToolTips.attachedElements && WormholeTypeToolTips.attachedElements.length > 0) {
			WormholeTypeToolTips.detach($("#chainMap .whEffect"));
		}
		WormholeTypeToolTips.attach($("#chainMap .whEffect[data-icon]"));

		chain.activity(chain.data.activity);

		chain.occupied(chain.data.occupied);

		chain.flares(chain.data.flares);

		chain.grid();

		options.save();
	}

}
;
// #endregion

// #region guidance_profiles
var guidance_profiles = {
	blueLootSystems: [17,40,41,55,72,53,74,160,162,163,196,197,164,181,187,133,159,903,905,1002,1013,1021,1026,1032,1038,1045,1290,1359,1390,1361,1397,1395,1391,1676,1679,1677,1840,1842,1847,1848,1852,1854,1855,1858,1866,1868,1873,1874,1881,1883,1894,1896,1897,1901,1902,1907,1914,1918,1922,1931,1932,1938,1946,1951,1952,1958,1959,1961,1939,1978,2415,2418,2414,2558,2559,2560,2568,2569,2571,2572,2769,2815,2816,2771,2800,2975,2977,2980,2988,2993,2992,3017,3018,3024,3030,3048,3055,3025,3029,3053,3271,3275,3279,3280,3281,3283,3284,3287,3305,3307,3312,3317,3318,3321,3322,3324,3329,3333,3335,3338,3339,3342,3344,3361,3363,2058,2065,2067,3394,3404,3412,3447,3449,3467,3469,3389,3402,3413,3409,2059,2190,2252,3553,3554,3555,3556,2191,2193,2187,4077,4078,4079,4084,4111,4112,4114,4083,4239,4240,4241,4288,4291,4296,4621,4623,5010,5011,5020,5009,5018,5017,5030,5031,5034,5035,5039,5040,5043,5052,5054,5276,5275],
	chainExits: []
}
;
// #endregion

// #region systemPanel
const systemPanel = new function() {
	this.update = function() {
		// Update dependent controls: Path to chain/home
		const exits = chain.data.exits;
		var html = [
			renderRoute((exits || []).map(function(x) { return x  - 30000000; }), true, 'chain', 'To chain'), 
			renderRoute(guidance_profiles.blueLootSystems, false, 'blue-loot', 'Blue loot buyer')
		].filter(function(x) { return x; }).join('');
		$("#infoExtra").html(html);
		Tooltips.attach($("#infoExtra [data-tooltip]"));
	};
	
	function renderRoute(targets, addPathHome, cssClass, categoryText) {
		const path = targets ? guidance.findShortestPath(tripwire.map.shortest, viewingSystemID - 30000000, targets) : null;
		if(path) {
			const inChain = path.length <= 1;
			const exitSystem = path[path.length - 1] + 30000000;
			const prefixText = inChain ? 'In chain: ' : (path.length - 1) + 'j from ' ;
			const pathHomeText = addPathHome ? chain.data.systemsInChainMap[exitSystem].pathHome.slice().reverse()
				.map(function(n) { return '<a href=".?system=' + tripwire.systems[n.systemID].name + '">' + (n.name || tripwire.systems[n.systemID].name || '???') + '</a>'; })
				.join(' &gt; ') : '<a href=".?system=' + tripwire.systems[exitSystem].name + '">' + tripwire.systems[exitSystem].name + '</a>';
				const pathToChainText = inChain ? '' : '<br/>' + systemRendering.renderPath(path.slice().reverse());
				return '<div class="' + cssClass + '">' + categoryText + ': ' + prefixText + pathHomeText + pathToChainText + '</div>';
		} else { return null; }
	}

}();
;
// #endregion

// #region tripwire/active
tripwire.active = function(data) {
    var editSigs = [];
    var editComments = [];

    for (var x in data) {
        var activity = JSON.parse(data[x].activity);
        editSigs.push(parseInt(activity.editSig));
        editComments.push(parseInt(activity.editComment));

        if (activity.editSig) {
            var $row = $("#sigTable tr[data-id='"+activity.editSig+"']");

            // Only animate when the row is newly marked. This runs on every
            // refresh, so animating unconditionally queued one more 1s
            // animation per poll for as long as somebody kept the signature
            // open -- and the queue only drains while the tab is visible.
            if (!$row.hasClass("editing")) {
                $row.addClass("editing");
                if (!document.hidden) {
                    $row.find("td").stop(true, true)
                        .animate({backgroundColor: "#001b47"}, 1000); //35240A - Yellow
                }
            }
        }

        if (activity.editComment && $("#commentWrapper .comment[data-id='"+activity.editComment+"'] .cke").length > 0) {
            $("#commentWrapper .comment[data-id='"+activity.editComment+"']")
                .addClass("editing")
                .find(".commentStatus").text(data[x].characterName + " is editing").fadeIn();
        }
    }

    $("#sigTable tr.editing").each(function() {
        if ($.inArray($(this).data("id"), editSigs) == -1) {
            $("#sigTable tr[data-id='"+$(this).data("id")+"']")
                //.attr('data-tooltip', '')
                //.removeAttr("title")
                .removeClass("editing")
                .find("td")
                .stop(true, true)
                .animate({backgroundColor: "#111"}, document.hidden ? 0 : 1000, null, function() {$(this).css({backgroundColor: ""});});
        }
    });

    $("#commentWrapper .editing").each(function() {
        if ($.inArray($(this).data("id"), editComments) == -1) {
            $("#commentWrapper .editing[data-id='"+$(this).data("id")+"']")
                .removeClass("editing")
                .find(".commentStatus").fadeOut(function() {$(this).text("")});
        }
    });
}
;
// #endregion

// #region tripwire/addSignature
// Hanldes adding to Signatures section
// ToDo: Use native JS
tripwire.makeSigInfo = function(sig, wormhole) {
	wormhole = wormhole ||	// allow to be passed in to save this lookup
		Object.values(tripwire.client.wormholes).find(function (wh) { return wh.initialID == sig.id || wh.secondaryID == sig.id});
	if (!wormhole) return false;
	var otherSignature = sig.id == wormhole.initialID ? tripwire.client.signatures[wormhole.secondaryID] : tripwire.client.signatures[wormhole.initialID];
	if (!otherSignature) return false;

	let leadsTo;
	if (sig.name) {
	  leadsTo = tripwire.systems[otherSignature.systemID] ?
		"<a href='.?system="+tripwire.systems[otherSignature.systemID].name+"'>"+_.escape(sig.name)+"</a> &ndash; " + systemRendering.renderSystem(systemAnalysis.analyse(otherSignature.systemID), 'a') : 
		_.escape(sig.name);
	} else if (appData.genericSystemTypes[otherSignature.systemID]) {
		leadsTo = appData.genericSystemTypes[otherSignature.systemID];
	} else if (tripwire.systems[otherSignature.systemID]) {
		leadsTo = systemRendering.renderSystem(systemAnalysis.analyse(otherSignature.systemID), 'a');
	} else {
		leadsTo = "";
	}

	const wormholeTypeText = wormhole.type || "???";
	return {
		id: sig.id,
		leadsTo: leadsTo,
		wormhole: wormhole,
		formattedType: (wormhole[wormhole.parent+"ID"] == sig.id ? wormholeTypeText : (wormhole.parent ? "[" + wormholeTypeText + "]" : "")),
		lifeText: {stable: 'Stable', critical4: '&lt;4h', expiring: 'Expiring'}[tripwire.signaturePayload.lifePreset(wormhole, sig)] || wormhole.life,
		massText: {stable: 'Stable', destab: '&lt;50%', critical: '&lt;10%'}[wormhole.mass] || _.escape(wormhole.mass),
	}
}

tripwire.addSig = function(add, option, disabled) {
    var option = option || {};
    var animate = typeof(option.animate) !== 'undefined' ? option.animate : true;
    var disabled = disabled || false;
    var wormhole = {};

	const returnLinkText = add.signatureID ? '<a class="return-link" href="#" onclick="tripwire.setReturnSig(event, ' + add.id + ')">&gt;&gt; Set ' + 
				add.signatureID.substring(0, 3).toUpperCase() + '-' + add.signatureID.substring(3) +
				' as return</a>'
				: '';

    if (add.type == "wormhole") {
		const sigInfo = tripwire.makeSigInfo(add);
		if(!sigInfo) return false;
		
		wormhole = sigInfo.wormhole;
		
		const leadsToText = sigInfo.leadsTo ? sigInfo.leadsTo : 
			add.signatureID && add.signatureID.length && add.signatureID[0] != '?' ? returnLinkText
			: '';	

        var row = "<tr data-id='"+add.id+"' data-tooltip='' "+ (disabled ? 'disabled="disabled"' : '') +">"
            + "<td class='"+ options.signatures.alignment.sigID +"'>"+formatSignatureID(add.signatureID)+"</td>"
            + "<td class='type-tooltip "+ options.signatures.alignment.sigType +"' data-tooltip=\""+this.whTooltip(wormhole)+"\">"+sigInfo.formattedType+"</td>"
            + "<td class='age-tooltip "+ options.signatures.alignment.sigAge + (parseInt(add.lifeLength) === 0 ? " disabled" : "") +"' data-tooltip='"+this.ageTooltip(add)+"'><span data-age='"+add.lifeTime+"'></span></td>"
            + "<td class='"+ options.signatures.alignment.leadsTo +"'>"+leadsToText+"</td>"
            + "<td class='"+wormhole.life+" "+ options.signatures.alignment.sigLife +"'>"+sigInfo.lifeText+"</td>"
            + "<td class='"+wormhole.mass+" "+ options.signatures.alignment.sigMass +"'>"+sigInfo.massText+"</td>"
            + "</tr>";

        var tr = $(row);
    } else {
		const leadsToText = add.type === 'unknown' ? returnLinkText : 
			(add.name ? linkSig(add.name) : '');
        var row = "<tr data-id='"+add.id+"' data-tooltip='' "+ (disabled ? 'disabled="disabled"' : '') +">"
            + "<td class='"+ options.signatures.alignment.sigID +"'>"+formatSignatureID(add.signatureID)+"</td>"
            + "<td class='"+ options.signatures.alignment.sigType +"' title=\""+_.escape(add.name || '')+"\">"+add.type+"</td>"
            + "<td class='age-tooltip "+ options.signatures.alignment.sigAge + (parseInt(add.lifeLength) === 0 ? " disabled" : "") +"' data-tooltip='"+this.ageTooltip(add)+"'><span data-age='"+add.lifeTime+"'></span></td>"
            + "<td class='"+ options.signatures.alignment.leadsTo +"' colspan='3'>"+leadsToText+"</td>"
            + "</tr>";

        var tr = $(row);
    }

    Tooltips.attach($(tr).find("[data-tooltip]"));

    $("#sigTable").append(tr);

    // Add counter
    if (wormhole.life == "critical") {
        $(tr).find('span[data-age]').countdown({until: moment.utc(add.lifeLeft).toDate(), onExpiry: this.pastEOL, alwaysExpire: true, compact: true, format: this.ageFormat, serverSync: this.serverTime.getTime})
            // .countdown('pause')
            .addClass('critical')
            // .countdown('resume');
    } else {
        $(tr).find('span[data-age]').countdown({since: moment.utc(add.lifeTime).toDate(), compact: true, format: this.ageFormat, serverSync: this.serverTime.getTime});
    }

    // Keep the row at its final layout from the first frame. The old
    // wrapInner/slideDown animation temporarily controlled the content height,
    // so pasted rows ignored the configured table density until they settled.
    // A row-level colour pulse provides the same feedback without changing
    // padding or height (and keeps the highlight continuous across cells).
    if (animate && !document.hidden) {
        $(tr)
            .addClass("sig-added")
            .animate({backgroundColor: "#004D16"}, 1000)
            .delay(1000)
            .animate({backgroundColor: "#111"}, 1000, null, function() {
                $(this).removeClass("sig-added").css({backgroundColor: ""});
            });
    }
}

tripwire.setReturnSig = function(event, sigToRemoveId) {
	event.preventDefault();
	const sigToUpdate = tripwire.signatures.returnSig;
	const sigToRemove = tripwire.client.signatures[sigToRemoveId];
	
	if(!(sigToUpdate && sigToRemove)) { return; }
	
	sigDialog.overwriteSignature(sigToRemoveId, function(data) {
		sigToUpdate.signatureID = sigToRemove.signatureID;
		// we need the wormhole part to make refresh.php not think the sig isn't a wormhole any more
		const payload = {"signatures": {"update": [ { wormhole: 'dummy', signatures: [ sigToUpdate ] } ] }};
		tripwire.refresh('refresh', payload);
	});
}
;
// #endregion

// #region tripwire/api
// Handles API updates
tripwire.API = function() {
    this.indicator;
    this.APIrefresh;

    this.API.expire = function() {
        var options = {since: tripwire.API.APIrefresh, until: null, format: "MS", layout: "-{mnn}{sep}{snn}"};
        $("#APItimer").countdown("option", options);
    }

    this.API.refresh = function() {
        $.ajax({
            url: "api_update.php",
            cache: false,
            dataType: "JSON",
            data: "indicator="+tripwire.API.indicator
        }).done(function(data) {
            if (data && data.APIrefresh) {
                tripwire.API.indicator = data.indicator;
                tripwire.API.APIrefresh = new Date(data.APIrefresh);
                activity.refresh(); //Refresh graph

                var options = {until: tripwire.API.APIrefresh, since: null, layout: "{mnn}{sep}{snn}"};
                $("#APItimer").countdown("option", options);
                setTimeout("tripwire.API.refresh();", $.countdown.periodsToSeconds($("#APItimer").countdown('getTimes')) - 30);
            } else if ($("#APItimer").countdown("option", "layout") !== "-{mnn}{sep}{snn}" && $.countdown.periodsToSeconds($("#APItimer").countdown('getTimes')) > 120) {
                setTimeout("tripwire.API.refresh();", ($.countdown.periodsToSeconds($("#APItimer").countdown('getTimes')) - 30) * 1000);
            } else {
                setTimeout("tripwire.API.refresh();", 15000);
            }
        });
    }

    this.API.init = function() {
        $.ajax({
            url: "api_update.php",
            cache: true,
            dataType: "JSON",
            data: "init=true"
        }).done(function(data) {
            tripwire.API.indicator = data.indicator;
            tripwire.API.APIrefresh = new Date(data.APIrefresh);

            $("#APItimer").countdown({until: tripwire.API.APIrefresh, onExpiry: tripwire.API.expire, alwaysExpire: true, compact: true, format: "MS", serverSync: tripwire.serverTime.getTime, onTick: function(t) { $("#APIclock").val(t[5] + 1).trigger("change"); }})
            var timer = $("#APItimer").countdown("option", "layout") === "-{mnn}{sep}{snn}" ? 15 : $.countdown.periodsToSeconds($("#APItimer").countdown('getTimes')) - 30;
            setTimeout("tripwire.API.refresh();", timer * 1000);
        });
    }

    this.API.init();
}
// tripwire.API();
;
// #endregion

// #region tripwire/automapper
const automapState = {
	pendingDecision: false
};

tripwire.autoMapper = function(from, to) {
	console.log('Automapper: Jump from ' + from + ' to ' + to);
	
    var pods = [33328, 670];
    var undo = [];

    // Make sure the automapper is turned on & not disabled
    if (!$("#toggle-automapper").hasClass("active") || $("#toggle-automapper").hasClass("disabled"))
        return false;

	// Not waiting on a decision for the previous jump
	if(automapState.pendingDecision) {
		console.info('Not automapping because there is an automap dialog up');
		return false;
	}

    // Make sure from and to are valid systems
    if (!tripwire.systems[from] || !tripwire.systems[to])
        return false;

    // Make sure from and to are not the same system
    if (from == to)
        return false;
	
	// Not into a special region e.g. abyssal space
	if(tripwire.systems[from].regionID > 12000000 || tripwire.systems[to].regionID > 12000000) {
		console.info('Not automapping into abyssal or other special space');
		return false;
	}
	
	// Do not map likely pod-out transitions unless the other side is J-space.
	// Trade-hub wormholes are legitimate connections and should be recorded.
	const noMapSystems = [30000142, 30002187];	// Jita/Amarr
	const isJSpace = system => system.regionID >= 11000000 && system.regionID < 12000000;
	if((noMapSystems.indexOf(from) >= 0 || noMapSystems.indexOf(to) >= 0) &&
		!isJSpace(tripwire.systems[from]) && !isJSpace(tripwire.systems[to])) {
		console.info('Not automapping into likely pod-out destination');
		return false;
	}

    // Is pilot in a station?
    if (tripwire.client.EVE && tripwire.client.EVE.stationID) {
		console.log('Automapper: Not recording because you are in a station');
        return false;
	}
	
    // Is pilot in a pod?
    if (tripwire.client.EVE && tripwire.client.EVE.shipTypeID && $.inArray(parseInt(tripwire.client.EVE.shipTypeID), pods) >= 0) {
    	console.log('Automapper: Not recording because you are in a pod');
		return false;
	}
	
    // Is this a gate?
    if (typeof(tripwire.map.shortest[from - 30000000]) != "undefined" && typeof(tripwire.map.shortest[from - 30000000][to - 30000000]) != "undefined") {
		console.log('Automapper: Not recording because this jump is a stargate');
        return false;
	}

     // Is this an existing connection?
     if ($.map(tripwire.client.wormholes,
               function(wormhole) {
                 const initial = tripwire.client.signatures[wormhole.initialID];
                 const secondary = tripwire.client.signatures[wormhole.secondaryID];
                 return initial && secondary &&
                   ((initial.systemID == from && secondary.systemID == to) ||
                    (initial.systemID == to && secondary.systemID == from))  ? wormhole : null;
               }).length > 0) {
		console.log('Automapper: Not recording because the connection exists');
       return false;
     }
	 
	 // Are both systems already in chain? Loops do happen but it's much more likely ESI missed a jump
	 function inChain(systemID) { return chain.data.map.rows.filter(r => r.c[0].systemID == systemID).length > 0; }
	if(inChain(from) && inChain(to)) {
		console.info('Not automapping because both systems are already in chain');
		return false;
	}	 

    var payload = {"signatures": {"add": [], "update": []}, "automap": { "character": tripwire.client.EVE.characterID } };

    var wormholes = wormholesForJump(from, to, tripwire.client.wormholes, tripwire.client.signatures);
	
    if (wormholes.length) {
        if (wormholes.length > 1) {
			console.log('Automapper: Multiple sigs matched, asking which one to update');
            $("#dialog-select-signature").dialog({
                autoOpen: true,
                title: "Which Signature?",
                width: 390,
                buttons: {
                    Cancel: function() {
                        $(this).dialog("close");
                    },
                    Ok: function() {
                        var i = $("#dialog-select-signature [name=sig]:checked").val();
                        var wormhole = wormholes[i];
                        var signature = tripwire.client.signatures[wormhole.initialID];
                        var signature2 = tripwire.client.signatures[wormhole.secondaryID];

                        payload.signatures.update.push({
                            "wormhole": {
                                "id": wormhole.id
                            },
                            "signatures": [
                                {
                                    "id": signature.id
                                },
                                {
                                    "id": signature2.id,
                                    "systemID": to
                                }
                            ]
                        });

                        var success = function(data) {
                            if (data.resultSet && data.resultSet[0].result == true) {
                                undo.push({"wormhole": wormhole, "signatures": [signature, signature2]});
                                $("#dialog-select-signature").dialog("close");
                            }
                        }

                        tripwire.refresh('refresh', payload, success);
                    }
                },
                open: function() {
					automapState.pendingDecision = true;
                    $("#dialog-select-signature .optionsTable tbody").empty();
					
					function formatSystem(systemID) {
						const system = systemAnalysis.analyse(systemID);
						return systemRendering.renderSystem(system);
					}
					
					document.getElementById('select-sig-from').innerHTML = formatSystem(from);
					document.getElementById('select-sig-to').innerHTML = formatSystem(to);

                    $.each(wormholes, function(i) {
                        const signature = tripwire.client.signatures[wormholes[i].initialID];
						const sigInfo = tripwire.makeSigInfo(signature, wormholes[i]);
						
                        const tr = "<tr>"
                          + "<td><input type='radio' name='sig' value='"+i+"' id='sig"+i+"' /></td>"
						  + "<td class='centerAlign'>" + formatSignatureID(signature.signatureID) + "</td>"
						  + "<td class='centerAlign'>" + sigInfo.formattedType + "</td>"
						  + "<td class='centerAlign'>" + sigInfo.leadsTo + "</td>"
						  + "<td class='centerAlign " + wormholes[i].life + "'>" + sigInfo.lifeText + "</td>"
						  + "<td class='centerAlign " + wormholes[i].mass + "'>" + sigInfo.massText + "</td>"
                          + "</tr>";
						  
						const trElem = $(tr);
                        $(trElem).find('td').wrapInner("<label for='sig"+i+"' />");
                        $("#dialog-select-signature .optionsTable tbody").append(trElem);
                    });
                }, close: function() {
					automapState.pendingDecision = false;
				}
            });
        } else {
            var wormhole = wormholes[0];
            var signature = tripwire.client.signatures[wormhole.initialID];
            var signature2 = tripwire.client.signatures[wormhole.secondaryID];
			console.log('Automapper: Single signature: w=' + JSON.stringify(wormhole) + ' s1=' + signature.id + '/' + signature.signatureID + ' s2=' + signature2.id + '/' + signature2.signatureID );

            payload.signatures.update.push({
                "wormhole": {
                    "id": wormhole.id
                },
                "signatures": [
                    {
                        "id": signature.id
                    },
                    {
                        "id": signature2.id,
                        "systemID": to
                    }
                ]
            });
            undo.push({"wormhole": wormhole, "signatures": [signature, signature2]});
        }
    } else {
        // Nothing matches, create a new wormhole
		console.log('Automapper: No signatures match, creating a new unknown hole');
        payload.signatures.add.push({
            "wormhole": {
                "type": null,
                "parent": "initial",
                "life": "stable",
                "mass": "stable"
            },
            "signatures": [
                {
                    "systemID": from,
                    "type": "wormhole"
                },
                {
                    "systemID": to,
                    "type": "wormhole"
                }
            ]
        });
    }

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

                sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
            }
        }

        tripwire.refresh('refresh', payload, success);
    }
}

function wormholesForJump(from, to, wormholes, signatures) {
	const toSystem = systemAnalysis.analyse(to);
    const toType = toSystem.genericSystemType[0];
	const toClass = (toSystem.class || [])[0];
	return Object.values(wormholes).filter(function(wormhole) {
        if ( ( signatures[wormhole.initialID] !== undefined ) && ( signatures[wormhole.secondaryID] !== undefined ) ) {
            // Find wormholes that have no set Leads To system, and their initial system is from the wormhole we just jumped from
            if (signatures[wormhole.initialID].systemID == from && !appData.systems[signatures[wormhole.secondaryID].systemID]) {
                if (!bookmarkDestinations.hintsMatch(signatures[wormhole.secondaryID].bookmark || signatures[wormhole.secondaryID].name, appData.systems[to] || {}, appData.systems)) return false;
				const holeTargetTypeName = appData.genericSystemTypes[signatures[wormhole.secondaryID].systemID];
				const holeClasses = systemAnalysis.classForTypeName(holeTargetTypeName);
				if(holeTargetTypeName === toType) {
					// Find wormholes where Leads To is the type we jumped into
					return true;
                } else if (holeClasses && 0 <= holeClasses.indexOf(toClass)) {
                    // Find wormholes that Leads To is generically set to the class we just jumped into
                    return true;
                } else if (wormhole.type && appData.wormholes[wormhole.type] && appData.wormholes[wormhole.type].leadsTo == toType) {
                    // Find wormholes that Type is known to lead to the class we just jumped into
                    return true;
                } else if (signatures[wormhole.secondaryID].systemID === null && (!wormhole.type || !appData.wormholes[wormhole.type])) {
                    // Find wormholes that don't have a Type or any kind of Leads To entered
                    return true;
                }
            }
        }
    });
}

tripwire.showAutomapDecision = function(decision) {
	if (!decision || automapState.pendingDecision === decision.id) return;
	if (automapState.pendingDecision) return;
	if ($(".ui-dialog:visible").length) return;

	var choices = (decision.candidates || []).map(function(candidate) {
		var wormhole = tripwire.client.wormholes[candidate.wormholeID];
		if (!wormhole) return null;
		var signature = tripwire.client.signatures[wormhole.initialID];
		var signature2 = tripwire.client.signatures[wormhole.secondaryID];
		return signature && signature2 ? {
			candidate: candidate,
			wormhole: wormhole,
			signature: signature
		} : null;
	}).filter(Boolean);

	function submit(action, wormholeID) {
		var payload = {
			automapDecision: {
				id: decision.id,
				action: action
			}
		};
		if (wormholeID) payload.automapDecision.wormholeID = wormholeID;
		tripwire.refresh('refresh', payload, function(data) {
			if (data.resultSet && data.resultSet[0] && data.resultSet[0].result == true) {
				$("#dialog-select-signature").dialog("close");
			} else {
				Notify.trigger("Unable to update the selected automap signature", "red");
			}
		});
	}

	function formatSystem(systemID) {
		return systemRendering.renderSystem(systemAnalysis.analyse(systemID));
	}

	$("#dialog-select-signature").dialog({
		autoOpen: true,
		title: "Which Signature?",
		width: 390,
		buttons: {
			"Keep New Connection": function() {
				submit('dismiss');
			},
			"Update Selected": function() {
				var index = $("#dialog-select-signature [name=sig]:checked").val();
				if (index === undefined) return;
				submit('resolve', choices[index].wormhole.id);
			}
		},
		open: function() {
			automapState.pendingDecision = decision.id;
			$("#dialog-select-signature .optionsTable tbody").empty();
			document.getElementById('select-sig-from').innerHTML = formatSystem(decision.fromSystemID);
			document.getElementById('select-sig-to').innerHTML = formatSystem(decision.toSystemID);

			$.each(choices, function(i, choice) {
				var sigInfo = tripwire.makeSigInfo(choice.signature, choice.wormhole);
				var checked = i === 0 ? " checked" : "";
				var row = "<tr>"
					+ "<td><input type='radio' name='sig' value='"+i+"' id='pending-sig"+i+"'"+checked+" /></td>"
					+ "<td class='centerAlign'>" + formatSignatureID(choice.signature.signatureID) + "</td>"
					+ "<td class='centerAlign'>" + sigInfo.formattedType + "</td>"
					+ "<td class='centerAlign'>" + sigInfo.leadsTo + "</td>"
					+ "<td class='centerAlign " + choice.wormhole.life + "'>" + sigInfo.lifeText + "</td>"
					+ "<td class='centerAlign " + choice.wormhole.mass + "'>" + sigInfo.massText + "</td>"
					+ "</tr>";
				var rowElement = $(row);
				rowElement.find('td').wrapInner("<label for='pending-sig"+i+"' />");
				$("#dialog-select-signature .optionsTable tbody").append(rowElement);
			});
		},
		close: function() {
			automapState.pendingDecision = false;
		}
	});
};
;
// #endregion

// #region tripwire/comments
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

	this.comments.setOwner = function($comment, name, modified) {
		$comment.find(".commentOwner")
			.empty()
			.append($("<span>", {class: "commentAuthor", text: name}))
			.append($("<time>", {class: "commentDate", text: modified}));
	};

    this.comments.parse = function(data) {
		// Sanitize note markup before rendering it.
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

				tripwire.comments.setOwner($comment, data[x].modifiedByName, data[x].modified);
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

				tripwire.comments.setOwner($comment, data[x].modifiedByName, data[x].modified);
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
;
// #endregion

// #region tripwire/deleteSignature
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
;
// #endregion

// #region tripwire/editSignature
// Handles changing Signatures section
// ToDo: Use native JS
tripwire.editSig = function(edit, disabled) {
    var disabled = disabled || false;
    var wormhole = {};

    if (edit.type == "wormhole") {
		const sigInfo = tripwire.makeSigInfo(edit);	// see addSignature.js
		if(!sigInfo) return false;
		
		wormhole = sigInfo.wormhole;

        var row = "<tr data-id='"+edit.id+"' data-tooltip='' "+ (disabled ? 'disabled="disabled"' : '') +">"
            + "<td class='"+ options.signatures.alignment.sigID +"'>"+formatSignatureID(edit.signatureID)+"</td>"
            + "<td class='type-tooltip "+ options.signatures.alignment.sigType +"' data-tooltip=\""+this.whTooltip(wormhole)+"\">"+sigInfo.formattedType+"</td>"
            + "<td class='age-tooltip "+ options.signatures.alignment.sigAge + (parseInt(edit.lifeLength) === 0 ? " disabled" : "") +"' data-tooltip='"+this.ageTooltip(edit)+"'><span data-age='"+edit.lifeTime+"'></span></td>"
            + "<td class='"+ options.signatures.alignment.leadsTo +"'>"+(sigInfo.leadsTo || "")+"</td>"
            + "<td class='"+wormhole.life+" "+ options.signatures.alignment.sigLife +"'>"+sigInfo.lifeText+"</td>"
            + "<td class='"+wormhole.mass+" "+ options.signatures.alignment.sigMass +"'>"+sigInfo.massText+"</td>"
            + "</tr>";

        var tr = $(row);
    } else {
        var row = "<tr data-id='"+edit.id+"' data-tooltip='' "+ (disabled ? 'disabled="disabled"' : '') +">"
            + "<td class='"+ options.signatures.alignment.sigID +"'>"+formatSignatureID(edit.signatureID)+"</td>"
            + "<td class='"+ options.signatures.alignment.sigType +"' title=\""+_.escape(edit.name || '')+"\">"+edit.type+"</td>"
            + "<td class='age-tooltip "+ options.signatures.alignment.sigAge + (parseInt(edit.lifeLength) === 0 ? " disabled" : "") +"' data-tooltip='"+this.ageTooltip(edit)+"'><span data-age='"+edit.lifeTime+"'></span></td>"
            + "<td class='"+ options.signatures.alignment.leadsTo +"' colspan='3'>"+(edit.name?linkSig(edit.name):'')+"</td>"
            + "</tr>";

        var tr = $(row);
    }

    Tooltips.attach($(tr).find("[data-tooltip]"));

    // Destroy the pervious countdown to prevent errors on a non-existant DOM element
    $("#sigTable tr[data-id='"+edit.id+"']").find('span[data-age]').countdown("destroy");
    $("#sigTable tr[data-id='"+edit.id+"']").replaceWith(tr);

    $("#sigTable").trigger("update");
    // Update counter
    if (wormhole.life == "critical") {
        $(tr).find('span[data-age]').countdown({until: moment.utc(edit.lifeLeft).toDate(), onExpiry: this.pastEOL, alwaysExpire: true, compact: true, format: this.ageFormat, serverSync: this.serverTime.getTime})
            .addClass('critical');
    } else {
        $(tr).find('span[data-age]').countdown({since: moment.utc(edit.lifeTime).toDate(), compact: true, format: this.ageFormat, serverSync: this.serverTime.getTime});
    }

    if (!document.hidden) {
        $(tr).stop(true, true).effect("pulsate");
    }
}
;
// #endregion

// #region tripwire/esi
tripwire.esi = function() {
    var baseUrl = "https://esi.evetech.net";
    var userAgent = "Tripwire Client " + tripwire.version + " (" + window.location.hostname + ") - " + window.navigator.userAgent;
    const esiCache = new Map();

    async function esiGet(url) {
        const cached = esiCache.get(url);
        const headers = {Accept: "application/json"};
        if (cached) headers["If-None-Match"] = cached.etag;
        const response = await fetch(url, {headers: headers});
        const warning = response.headers.get("warning");
        if (warning) console.warn("ESI API Warning:", warning, url);
        if (response.status === 304) {
            if (!cached) throw new Error("ESI returned 304 without cached data: " + url);
            return {
                data: cached.data,
                expires: response.headers.get("expires") || new Date(Date.now() + 60000).toUTCString()
            };
        }
        if (!response.ok) throw new Error("ESI request failed: " + response.status + " " + url);
        const data = await response.json();
        const etag = response.headers.get("etag");
        const expires = response.headers.get("expires") || new Date(Date.now() + 60000).toUTCString();
        esiCache.delete(url);
        if (etag) {
            esiCache.set(url, {etag: etag, data: data});
            if (esiCache.size > 100) esiCache.delete(esiCache.keys().next().value);
        }
        return {data: data, expires: expires};
    }

    async function esiData(url) {
        return (await esiGet(url)).data;
    }
    this.esi.connection = true;
    this.esi.characters = {};

	function updateTracking(character) {
		// Visibility settings are consumed by the backend tracker from the saved
		// preferences. Character state itself is server-owned.
		options.save();
	}
	this.esi.updateTracking = updateTracking;	// so it can be called outside

    this.esi.typeLookup = function(typeID) {
        return esiData(baseUrl + "/v3/universe/types/" + typeID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.stationLookup = function(stationID) {
        return esiData(baseUrl + "/v2/universe/stations/" + stationID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.setDestination = function(destinationID, characterID, clear_waypoints, beginning) {
        clear_waypoints = clear_waypoints ? clear_waypoints : false;
        beginning = beginning ? beginning : false;
        const xhr = $.ajax({
            url: "esi.php",
            type: "POST",
            dataType: "JSON",
            data: {mode: "waypoint", targetID: destinationID, characterID: characterID, clear: clear_waypoints, beginning: beginning, _csrf: init.csrfToken}
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.showInfo = function(targetID, characterID) {
        const xhr = $.ajax({
            url: "esi.php",
            type: "POST",
            dataType: "JSON",
            data: {mode: "showInfo", targetID: targetID, characterID: characterID, _csrf: init.csrfToken}
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.eveStatus = function() {
        return esiData(baseUrl + "/v1/status/?" + $.param({user_agent: userAgent}));
    }

    this.esi.idLookup = function(eveIDs) {
        const xhr = $.ajax({
            url: baseUrl + "/v2/universe/names/?" + $.param({"user_agent": userAgent}),
            type: "POST",
            dataType: "JSON",
            contentType: "application/json",
            processData: false,
            data: JSON.stringify(eveIDs)
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.characterLookup = function(eveID) {
        return esiData(baseUrl + "/characters/" + eveID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.corporationLookup = function(eveID) {
        return esiData(baseUrl + "/v4/corporations/" + eveID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.allianceLookup = function(eveID) {
        return esiData(baseUrl + "/v3/alliances/" + eveID + "/?" + $.param({user_agent: userAgent}));
    }

    this.esi.search = function(searchString, categories, strict) {
        const xhr = $.ajax({
            url: "esi.php",
            type: "POST",
            dataType: "JSON",
            data: {mode: "search", search: searchString, categories: categories, strict: strict, _csrf: init.csrfToken}
        });
        return xhr.always(function(){
            const warn = xhr.getResponseHeader('warning');
            if (warn) console.warn('ESI API Warning: ', warn, this.url);
        });
    }

    this.esi.universeJumps = function() {
        return esiGet(baseUrl + "/v1/universe/system_jumps/?" + $.param({user_agent: userAgent}));
    }

    this.esi.universeKills = function() {
        return esiData(baseUrl + "/v2/universe/system_kills/?" + $.param({user_agent: userAgent}));
    }

    // Wrapper to make lookups easier
    this.esi.fullLookup = async function(eveIDs) {
        const data = await tripwire.esi.idLookup(eveIDs);
        await Promise.all(data.map(async function(item) {
            if (item.category === "character") {
                const character = await tripwire.esi.characterLookup(item.id);
                $.extend(item, character);
                item.corporation = await tripwire.esi.corporationLookup(character.corporation_id);
                if (item.corporation.alliance_id) {
                    item.alliance = await tripwire.esi.allianceLookup(item.corporation.alliance_id);
                }
            } else if (item.category === "corporation") {
                const corporation = await tripwire.esi.corporationLookup(item.id);
                $.extend(item, corporation);
                if (corporation.alliance_id) {
                    item.alliance = await tripwire.esi.allianceLookup(corporation.alliance_id);
                }
            } else if (item.category === "alliance") {
                $.extend(item, await tripwire.esi.allianceLookup(item.id));
            }
        }));
        return data;
    }

    this.esi.parse = function(characters) {
        for (characterID in tripwire.esi.characters) {
            if (!(characterID in characters)) {
                delete tripwire.esi.characters[characterID];
                tracking.remove(characterID);
                if (options.tracking.active == characterID) {
                    tripwire.EVE(false, true);
                    $("#removeESI").attr("disabled", "disabled");
                }
            }
        }

        for (characterID in characters) {
            if (options.tracking.active == "new") {
                options.tracking.active = characterID;
            }

            if (!(characterID in tripwire.esi.characters)) {
                var $clone = tracking.add(characters[characterID]);
				
                if (options.tracking.active == characterID) {
                    $clone.addClass("active");
                    $("#removeESI").removeAttr("disabled");
                }

            }

            tripwire.esi.characters[characterID] = characters[characterID];
			tracking.update(characters[characterID]);
        }
		
		set_tracking_text();

		// Location, ship and online state are polled by the background npm
		// scheduler. Keep rendering the selected character's last known location
		// when offline; online remains a separate status indicator.
		if (tripwire.esi.characters[options.tracking.active]) {
			var activeCharacter = tripwire.esi.characters[options.tracking.active];
			tripwire.EVE(activeCharacter);
		}
    }
}
tripwire.esi();
;
// #endregion

// #region tripwire/eve
function trackedSystemID(character, systems) {
    if (!character || character.systemID === null || character.systemID === undefined) return null;
    var systemID = Number(character.systemID);
    return Number.isSafeInteger(systemID) && systems[systemID] ? systemID : null;
}

function shouldFollowTrackedSystem(previousSystemID, currentSystemID, followEnabled, characterChange) {
    return !characterChange && followEnabled && previousSystemID !== null
        && currentSystemID !== null && previousSystemID !== currentSystemID;
}

function shouldUseTrackedSystemAsInitialView(defaultPending, currentSystemID) {
    return defaultPending && currentSystemID !== null;
}

// Handles data from EVE in-game data
tripwire.EVE = function(EVE, characterChange) {
    var systemChange = this.client.EVE && this.client.EVE.systemChange || false;
    var previousSystemID = trackedSystemID(this.client.EVE, this.systems);
    var currentSystemID = trackedSystemID(EVE, this.systems);

    if (EVE && currentSystemID) {
        // Location transitions and automapping are handled by the background
        // scheduler. The browser only follows and renders the selected pilot.

        // System follower
        if (shouldUseTrackedSystemAsInitialView(defaultToTrackedSystem, currentSystemID)) {
            defaultToTrackedSystem = false;
            if (currentSystemID != viewingSystemID) {
                tripwire.systemChange(currentSystemID);
            }
        } else if (shouldFollowTrackedSystem(previousSystemID, currentSystemID, options.buttons.follow, characterChange)
            && $(".ui-dialog:visible").length == 0) {
            tripwire.systemChange(currentSystemID);
        }

        if (!$("#search").hasClass("active")) {
            $("#currentSpan").show();
        }

        // Enable auto-mapper
        $("#toggle-automapper").removeClass("disabled");

        // Update current system
        // add system to Leads To dropdown
        if ($("#dialog-signature [data-autocomplete='sigSystems']").hasClass("custom-combobox")) {
            $("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete("removeFromSelect");
            $("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete("addToSelect", tripwire.systems[currentSystemID]);
        }
        $("#EVEsystem").html(systemRendering.renderSystem(systemAnalysis.analyse(currentSystemID)));
    } else if (EVE) {
        // ESI may report online before the first backend location observation.
        // Keep follow mode inert until a real, known system is available.
        $("#EVEsystem").text("Locating...");
        $("#currentSpan").show();
        $("#toggle-automapper").addClass("disabled");
    } else {
        // Update current system
        $("#EVEsystem").html("Not tracking");
        $("#currentSpan").hide();
        // Disable automapper
        $("#toggle-automapper").addClass("disabled");
        // remove system from Leads To dropdown
        if ($("#dialog-signature [data-autocomplete='sigSystems']").hasClass("custom-combobox")) {
            $("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete("removeFromSelect");
        }
    }

    this.client.EVE = EVE ? {
        characterID: EVE.characterID,
        characterName: EVE.characterName,
        systemID: currentSystemID,
        systemName: EVE.systemName,
        shipTypeID: EVE.shipTypeID,
        shipTypeName: EVE.shipTypeName,
        stationID: EVE.stationID,
        stationName: EVE.stationName,
        locationDate: EVE.locationDate,
        shipDate: EVE.shipDate,
        systemChange: systemChange
    } : null;
	// The selected pilot can change without changing the viewed system.
	if (window.killIntel) killIntel.refresh(viewingSystemID);
}
;
// #endregion

// #region tripwire/genericSystemTypes
appData.genericSystemTypes = [
	"Null-Sec", "Low-Sec", "High-Sec",
	"Class-1", "Class-2", "Class-3", "Class-4", "Class-5", "Class-6", "Class-13", 
	"Triglavian",
	"Unknown", "Unknown (small)", "Dangerous",
	"Class-14", "Class-15", "Class-16", "Class-17", "Class-18", "Drifter",
	];
;
// #endregion

// #region tripwire/parse
tripwire.parse = function(server, mode) {
    var data = $.extend(true, {}, server);

    var updateSignatureTable = false;
	const newSigsInSystem = { };

	// A jump can change viewingSystemID while the poll that observed it is
	// still being parsed. In that race the signature may enter `list` before
	// addSig can render it (its wormhole partner can arrive in the following
	// system-change response). The cache therefore cannot prove that a row is
	// on screen; reconcile against the table as well.
	function signatureRowExists(signatureID) {
		return $("#sigTable tbody tr[data-id]").filter(function() {
			return String($(this).data("id")) === String(signatureID);
		}).length > 0;
	}

    if (options.chain.active == null || (options.chain.tabs[options.chain.active] && options.chain.tabs[options.chain.active].evescout != true)) {
        if (options.masks.active != "273.0") {
            for (var key in data.signatures) {
                if (data.signatures[key].mask == "273.0") {
                    delete data.signatures[key];
                }
            }
        }
    }

    if (mode == 'refresh') {
        // preserve client.EVE across refresh otherwise tracking/automapper will be confused
        var EVE = this.client.EVE;
        this.client = server;
        this.client.EVE = EVE;

        for (var key in data.signatures) {
            if (data.signatures[key].systemID != viewingSystemID) {
                continue;
            }
			newSigsInSystem[key] = data.signatures[key];
            var disabled = data.signatures[key].mask == "273.0" && options.masks.active != "273.0" ? true : false;

            // Check for differences
            if (!tripwire.signatures.list[key] || !signatureRowExists(key)) {
				tripwire.signatures.list[key] = data.signatures[key];	// To reduce race condition chance
                this.addSig(data.signatures[key], {animate: true}, disabled);
                updateSignatureTable = true;
            } else if (tripwire.signatures.list[key].modifiedTime !== data.signatures[key].modifiedTime) {
                var edit = false;
                for (column in data.signatures[key]) {
                    if (data.signatures[key][column] != tripwire.signatures.list[key][column] && column != "editing") {
                        edit = true;
                    }
                }

                if (edit) {
                    this.editSig(data.signatures[key], disabled);
                } else {
                    // this.sigEditing(data.signatures[key]);
                }
            }
        }

        // Sigs needing removal
        for (var key in tripwire.signatures.list) {
            if (!data.signatures[key]) {
                this.deleteSig(key);
            }
        }
    } else if (mode == 'init' || mode == 'change') {
        this.client = server;

        for (var key in data.signatures) {
            if (data.signatures[key].systemID != viewingSystemID) {
                continue;
            }
			newSigsInSystem[key] = data.signatures[key];
            var disabled = data.signatures[key].mask == "273.0" && options.masks.active != "273.0" ? true : false;
			
			if(!tripwire.signatures.list[key] || !signatureRowExists(key)) {
				this.addSig(data.signatures[key], {animate: false}, disabled);
				updateSignatureTable = true;
			}
            if (data.signatures[key].editing) {
                this.sigEditing(data.signatures[key]);
            }
        }
    } else { return; }	// unknown type of parse request so do nothing

    if (updateSignatureTable) {
        $("#sigTable").trigger("update");
    }
    tripwire.signatures.list = data.signatures;
	tripwire.signatures.currentSystem = newSigsInSystem;
		
    // set the sig count in the UI
    var signatureCount = 0;
    $.map(data.signatures, function(signature) {signature.systemID == viewingSystemID ? signatureCount++ : null;});
    $("#signature-count").text(signatureCount);
}

/** Find if there is an unknown return sig. The markup is always generated (in addSignature.js) */
tripwire.updateReturnStatus = function() {
	const inSigId = $("#chainMap [data-nodeid='"+viewingSystemID+"']:not(.calc)").attr('data-insigid');
	const wormholeId = $("#chainMap [data-nodeid='"+viewingSystemID+"']:not(.calc)").attr('data-sigid');
	const wormhole = tripwire.client.wormholes[wormholeId] || {};
	// One of the two ends should be in this system, In sig will be the wrong end, so find the other end
	const returnSigId = wormhole.initialID == inSigId ? wormhole.secondaryID : wormhole.initialID;
	tripwire.signatures.returnSig = tripwire.signatures.list[returnSigId];
	const needReturn = tripwire.signatures.returnSig && (tripwire.signatures.returnSig.signatureID == '???' || tripwire.signatures.returnSig.signatureID == '' || tripwire.signatures.returnSig.signatureID === null || tripwire.signatures.returnSig.signatureID === undefined);
	document.getElementById('sigTableWrapper').className = needReturn ? 'return-visible' : 'return-invisible';	
}
;
// #endregion

// #region tripwire/bookmarks
// Classify names only when a known naming convention supplies the site type.
// References: https://wiki.eveuniversity.org/List_of_data_and_relic_sites
// and https://wiki.eveuniversity.org/Wormhole_sites
tripwire.bookmarkSiteType = function(name) {
    var normalized = (name || "").trim().replace(/\s+/g, " ");
    // Exact matches avoid confusing named anomalies with exploration-site prefixes.
    var combatSites = [
        "Rampant Drone Fabricator", "Besieged Covert Research Facility",
        "Perimeter Ambush Point", "Perimeter Camp", "Phase Catalyst Node", "The Line",
        "Perimeter Checkpoint", "Perimeter Hangar", "The Ruins of Enclave Cohort 27", "Sleeper Data Sanctuary",
        "Fortification Frontier Stronghold", "Outpost Frontier Stronghold", "Solar Cell", "The Oruze Construct",
        "Frontier Barracks", "Frontier Command Post", "Integrated Terminus", "Sleeper Information Sanctum",
        "Core Garrison", "Core Stronghold", "Oruze Osobnyk", "Quarantine Area",
        "Core Citadel", "Core Bastion", "Strange Energy Readings", "The Mirror"
    ];
    if (combatSites.some(function(site) { return site.toLowerCase() === normalized.toLowerCase(); })) return "Combat";
    if (/^(Limited|Standard|Superior) Sleeper Cache$/i.test(normalized)) return "Data";
    if (/^(?:(Common|Ordinary) Perimeter|(Average|Unexceptional) Frontier|(Exceptional|Infrequent|Isolated|Rarified|Uncommon|Unusual) Core) Deposit$/i.test(normalized)) return "Ore";
    if (/^Unsecured(?: |$)/i.test(normalized)) return "Data";
    if (/^Forgotten(?: |$)/i.test(normalized)) return "Relic";
    if (/^(Crumbling|Decayed|Ruined) (Angel|Blood|Guristas|Sansha|Serpentis) .+/i.test(normalized)) return "Relic";
    if (/^(Local|Regional|Central) (Angel|Blood|Guristas|Sansha|Serpentis) .+/i.test(normalized)) return "Data";
    // Exact gas-site names: a generic Reservoir suffix is not sufficient.
    if (/^(?:(?:Barren|Minor|Ordinary|Sizeable|Sizable|Token) Perimeter|(?:Bountiful|Vast) Frontier|(?:Instrumental|Vital) Core) Reservoir$/i.test(normalized)) return "Gas";
    return null;
};

// Bookmark folders and timestamps are deliberately excluded from signature data.
tripwire.parseBookmark = function(row) {
    var title = row.split("\t")[0].trim();
    // Unprefixed bookmarks use a full signature ID followed by the site name.
    // Requiring a name keeps ordinary tab-separated scanner rows on their own path.
    if (/^[A-Z]{3}-\d{3}\s+\S/i.test(title)) title = "Z " + title;
    var match = /^(Z|GS|DC|RC|HS|LS|NS|TR|PC|DR|C\d+|C\?)\s+([A-Z]{3}|\?\?\?)(?:-?(\d{3}))?(?:\s+(.*))?$/i.exec(title);
    if (!match) return null;
    var code = match[1].toUpperCase();
    var text = (match[4] || "").trim();
    var scanner = {id: [match[2].toUpperCase(), match[3] || ""], bookmark: true};
    if (code === "Z") {
        scanner.name = text || undefined;
        var siteType = tripwire.bookmarkSiteType(text);
        if (siteType) scanner.type = siteType;
        else scanner.fallbackType = "Other";
    } else if ({GS: 1, DC: 1, RC: 1}[code]) {
        scanner.type = {GS: "Gas", DC: "Data", RC: "Relic"}[code];
        // These bookmarks mark a camp for this signature, not a different site.
        if (text && !/^(?:[?-]+|-\*-)$/.test(text)) scanner.name = text;
    } else {
        scanner.type = "Wormhole";
        scanner.destinationCode = code;
        // EVE/browser clipboard text can contain an escaped less-than sign.
        // Decode only that character; bookmark text is never interpreted as HTML.
        text = text.replace(/&(?:lt|#0*60|#x0*3c);/ig, "<")
            .replace(/\*/g, " ").replace(/<\s*(1|4)\s*h\b/ig, function(_, hours) {
            scanner.lifeHours = Math.min(scanner.lifeHours || 4, Number(hours));
            return " ";
        }).replace(/<\s*(10|50)\s*%/g, function(_, percent) {
            if (percent === "10" || !scanner.mass) scanner.mass = percent === "10" ? "critical" : "destab";
            return " ";
        }).replace(/\s+/g, " ").trim();
        var label = {HS: "High-Sec", LS: "Low-Sec", NS: "Null-Sec", TR: "Triglavian", PC: "Triglavian", DR: "Drifter"}[code];
        if (code === "C?") label = null;
        else if (!label) label = "Class-" + code.slice(1);
        scanner.destinationID = label ? appData.genericSystemTypes.indexOf(label) : null;
        if (scanner.destinationID === -1) return null;
        if (text && !/^[?-]+$/.test(text)) {
            scanner.destinationHint = text;
            var destination = bookmarkDestinations.resolve(text, code, tripwire.systems, appData.regions || {});
            if (destination !== null) scanner.destinationID = destination;
        }
    }
    return scanner;
};
// #endregion

// #region tripwire/paste
// Handles pasting sigs from EVE
tripwire.pasteSignatures = function() {
    var processing = false;
	var pasteNotice = null;
	var pendingMapping = null;

    var rowParse = function(row) {
        var bookmark = tripwire.parseBookmark(row);
        if (bookmark) return bookmark;
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

    function unknownBookmarkMatches(scan, signature) {
        if (signature.systemID != viewingSystemID || signature.type !== "wormhole") return false;
        return Object.values(tripwire.client.wormholes || {}).some(function(hole) {
            if (hole.type === "GATE") return false;
            var otherID = hole.initialID == signature.id ? hole.secondaryID : (hole.secondaryID == signature.id ? hole.initialID : null);
            var other = (tripwire.client.signatures || {})[otherID];
            if (!other) return false;
            if (tripwire.systems[other.systemID] && scan.destinationCode) {
                if (Number(scan.destinationID) >= 10000000) return other.systemID == scan.destinationID;
                return bookmarkDestinations.matches(scan.destinationHint, scan.destinationCode,
                    tripwire.systems[other.systemID], appData.regions || {}, tripwire.systems);
            }
            if (other.systemID != scan.destinationID) return false;
            return Number(scan.destinationID) >= 10000000 ||
                (other.bookmark || other.name || "").toLowerCase() === (scan.destinationHint || "").toLowerCase();
        });
    }

    function applyBookmarkState(entry, scanner, existingWormhole, existingSignatures) {
        if (scanner.mass) {
            entry.wormhole.mass = existingWormhole && existingWormhole.mass === "critical" ? "critical" : scanner.mass;
        }
        if (!scanner.lifeHours) return;
        entry.wormhole.life = "critical";
        var now = tripwire.serverTime && tripwire.serverTime.time || new Date();
        var deadline = new Date(now).getTime() + scanner.lifeHours * 3600000;
        // Re-pasting an aging bookmark must not extend an existing EOL timer.
        var earlier = existingWormhole && existingWormhole.life === "critical" && (existingSignatures || []).some(function(sig) {
            var expiry = sig && sig.lifeLeft && Date.parse(sig.lifeLeft.replace(" ", "T") + "Z");
            return expiry && expiry <= deadline;
        });
        if (earlier) return;
        entry.wormhole.lifeHours = scanner.lifeHours;
        // Also covers conversion of a regular signature to a new wormhole pair.
        entry.signatures.forEach(function(sig) {
            sig.lifeLeft = new Date(deadline).toISOString().slice(0, 19).replace("T", " ");
        });
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
        var removedUndo = [];
		var pendingWormholes = [];
		var pastedIDs = {};
        // Empty systems may omit these collections from the refresh response.
        var signatures = tripwire.client.signatures || {};
        var wormholes = tripwire.client.wormholes || {};

        // Resolve abbreviated IDs against both this paste and the current system,
        // then merge rows before building writes (GS + Z often describe one site).
        var scans = paste.map(rowParse).filter(Boolean);
        var knownIDs = Object.values(signatures).filter(function(sig) {
            return sig.systemID == viewingSystemID && sig.signatureID;
        }).map(function(sig) { return sig.signatureID.toUpperCase().replace("-", ""); });
        scans.forEach(function(scan) { if (scan.id[1]) knownIDs.push(scan.id.join("")); });
        var merged = {};
        scans.forEach(function(scan) {
            if (!scan.id[1]) {
                var matches = Array.from(new Set(knownIDs.filter(function(id) {
                    return id.length === 6 && id.slice(0, 3) === scan.id[0];
                })));
                if (matches.length > 1) return; // Never guess between ambiguous prefixes.
                if (matches.length === 1) scan.id[1] = matches[0].slice(3);
            }
            var key = scan.id[0] === "???" ? "unknown:" + scan.destinationID + ":" + (scan.destinationHint || "").toLowerCase() : scan.id.join("");
            merged[key] = merged[key] || {};
            Object.keys(scan).forEach(function(field) {
                if (field === "lifeHours" && merged[key][field]) merged[key][field] = Math.min(merged[key][field], scan[field]);
                else if (field === "mass" && merged[key][field] === "critical") return;
                else if (scan[field] !== undefined) merged[key][field] = scan[field];
            });
        });
        // Reuse an unidentified connection only when the match is unique in both
        // directions: one destination candidate and one pasted bookmark claiming it.
        var connections = Object.values(wormholes).filter(function(hole) { return hole.type !== "GATE"; }).map(function(hole) {
            var a = signatures[hole.initialID], b = signatures[hole.secondaryID];
            if (!a || !b) return null;
            var local = a.systemID == viewingSystemID ? a : (b.systemID == viewingSystemID ? b : null);
            return local ? {hole: hole, local: local, other: local === a ? b : a} : null;
        }).filter(Boolean);
        var claims = {}, matchesByKey = {};
        Object.keys(merged).forEach(function(key) {
            var scan = merged[key];
            if (!scan.bookmark || scan.type !== "Wormhole") return;
            var matches = connections.filter(function(connection) {
                var id = connection.local.signatureID;
                return (scan.id[0] === "???" || !id || /^\?+$/.test(id)) && unknownBookmarkMatches(scan, connection.local);
            });
            matchesByKey[key] = matches;
            matches.forEach(function(connection) { claims[connection.hole.id] = (claims[connection.hole.id] || 0) + 1; });
        });
        for (var i in merged) {
            var scanner = merged[i];

            if (scanner.id) {
				pastedIDs[(scanner.id[0] + scanner.id[1]).toUpperCase()] = true;
                var localSignatures = Object.values(signatures).filter(function(sig) {
                    return sig.systemID == viewingSystemID && sig.signatureID;
                });
                var signature = localSignatures.find(function(sig) {
                    return sig.signatureID.toUpperCase().replace("-", "") === scanner.id.join("");
                });
                if (!signature && scanner.id[1]) {
                    var fullMatches = new Set(knownIDs.filter(function(id) {
                        return id.length === 6 && id.slice(0, 3) === scanner.id[0];
                    }));
                    var prefixMatches = localSignatures.filter(function(sig) {
                        return sig.signatureID.toUpperCase() === scanner.id[0];
                    });
                    // Leave the abbreviated row unresolved if multiple full IDs
                    // share its prefix. Exact full-ID rows are still imported.
                    if (fullMatches.size === 1 && prefixMatches.length === 1) signature = prefixMatches[0];
                }
                if (scanner.id[0] === "???") signature = undefined;
                var matches = matchesByKey[i] || [];
                if (matches.length === 1 && claims[matches[0].hole.id] === 1) {
                    var match = matches[0];
                    // Repair the generic duplicate made by an earlier paste, retaining
                    // the mapped connection's real destination, type, state and history.
                    var duplicate = signature && connections.find(function(connection) { return connection.local.id == signature.id; });
                    if (!signature || (duplicate && !tripwire.systems[duplicate.other.systemID] && tripwire.systems[match.other.systemID])) {
                        if (duplicate && duplicate.hole.id != match.hole.id) {
                            payload.signatures.remove = payload.signatures.remove || [];
                            payload.signatures.remove.push(duplicate.hole);
                            removedUndo.push({wormhole: duplicate.hole, signatures: [signatures[duplicate.hole.initialID], signatures[duplicate.hole.secondaryID]]});
                        }
                        signature = match.local;
                        if (scanner.id[0] === "???" && signature.signatureID && !/^\?+$/.test(signature.signatureID)) {
                            var existingID = signature.signatureID.toUpperCase().replace("-", "");
                            scanner.id = [existingID.slice(0, 3), existingID.slice(3)];
                        }
                    }
                } else if (scanner.id[0] === "???" && matches.length > 1) {
                    continue;
                }
                if (!scanner.type && scanner.fallbackType && (!signature || !signature.type || signature.type === 'unknown' || signature.type === 'other')) {
                    scanner.type = scanner.fallbackType;
                }
                if (signature) {
                    // Update signature (only non-wormholes can be updated to a wormhole)
                    if (scanner.type == "Wormhole" && (signature.type != "wormhole" || scanner.bookmark || (signature.signatureID || "").toUpperCase() !== scanner.id.join(""))) {
                        var wormhole = $.map(wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0] || {};
                        var otherSignature = wormhole.id ? (signature.id == wormhole.initialID ? signatures[wormhole.secondaryID] : signatures[wormhole.initialID]) : {};
                        payload.signatures.update.push({
                            "wormhole": {
                                "id": wormhole.id || null,
                                "type": wormhole.type || null,
                                "parent": wormhole.parent,
                                "life": wormhole.life || "stable",
                                "mass": wormhole.mass || "stable"
                            },
                            "signatures": [
                                {
                                    "id": signature.id,
                                    "signatureID": scanner.id.join(""),
                                    "systemID": viewingSystemID,
                                    "type": "wormhole",
                                    "name": signature.name
                                },
                                {
                                    "id": otherSignature.id || null,
                                    "signatureID": otherSignature.signatureID || null,
                                    "systemID": otherSignature.systemID >= 10000000 ? otherSignature.systemID : (scanner.destinationID != null ? scanner.destinationID : (otherSignature.systemID == null ? null : otherSignature.systemID)),
                                    "type": "wormhole",
                                    "name": scanner.bookmark ? bookmarkDestinations.displayName(otherSignature.name) : otherSignature.name,
                                    "bookmark": scanner.destinationHint || otherSignature.bookmark
                                }
                            ]
                        });

                        applyBookmarkState(payload.signatures.update[payload.signatures.update.length - 1], scanner, wormhole, [signature, otherSignature]);

                        // Keep the stored connection orientation, including its parent side.
                        if (wormhole.id && wormhole.secondaryID == signature.id) {
                            payload.signatures.update[payload.signatures.update.length - 1].signatures.reverse();
                        }

                        if (wormholes[wormhole.id]) {
							undo.push({"wormhole": wormholes[wormhole.id], "signatures": [signatures[signature.id], signatures[otherSignature.id]]});
						} else {
							// used to be just a regular signature
							undo.push(signatures[signature.id]);
						}
                    // Make sure we are only updating when we have new info (we never turn wormholes into regular signatures)
                    } else if (signature.type != "wormhole" && ((scanner.type && scanner.type.toLowerCase() != signature.type) || (scanner.name && scanner.name != signature.name) || (signature.signatureID || "").toUpperCase() !== scanner.id.join(""))) {
                        payload.signatures.update.push({
                            "id": signature.id,
                            "signatureID": scanner.id.join(""),
                            "systemID": viewingSystemID,
                            "type": scanner.type || signature.type || 'unknown',
                            "name": scanner.name || signature.name,
                            "lifeLength": options.signatures.pasteLife * 60 * 60
                        });
                        undo.push(signatures[signature.id]);
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
                                    "systemID": scanner.destinationID == null ? null : scanner.destinationID,
                                    "bookmark": scanner.destinationHint,
                                    "type": "wormhole",
                                    "lifeLength": options.signatures.pasteLife * 60 * 60
                                }
                            ]
                        };
                        applyBookmarkState(addition, scanner);
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
        processing = true;
		submitPaste(payload, undo, candidates.length ? function(data) {
			var mappable = [];
			$.each(pendingWormholes, function(index, item) {
				var created = data.results && data.results[addIndexes[index]];
				if (created && created.wormhole) {
					mappable.push({signatureID: item.signatureID, created: created});
				}
			});
			if (mappable.length) setMappingPending(mappable, candidates, payload.systemID);
		} : null, removedUndo);
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
            if (processing || $(this).data("systemID") != viewingSystemID) return;

			var notice = $(this).closest(".jBox-Notice").data("jBox");
            var paste = $(this).data("paste").split("\n");
            var pasteIDs = [];
            var pastePrefixes = [];
            var unknownBookmarks = [];
            var removes = [];
            var undo = [];

            for (var i in paste) {
                var scan = rowParse(paste[i]);
                if (scan) {
                    if (scan.id[0] === "???") {
                        unknownBookmarks.push(scan);
                        continue;
                    }
                    pasteIDs.push(scan.id.join("").toLowerCase());
                    if (!scan.id[1]) pastePrefixes.push(scan.id[0].toLowerCase());
                }
            }

            // An unrecognized clipboard must never be treated as an empty scan.
            if (!pasteIDs.length && !unknownBookmarks.length) return;
            for (var i in tripwire.client.signatures) {
                var signature = tripwire.client.signatures[i];

                if (unknownBookmarks.some(function(scan) { return unknownBookmarkMatches(scan, signature); })) continue;
                if (signature.systemID == viewingSystemID && signature.signatureID && !pasteIDs.some(function(id) {
                    var current = signature.signatureID.toLowerCase().replace("-", "");
                    return id === current || (current.length === 3 && id.slice(0, 3) === current);
                }) && $.inArray(signature.signatureID.slice(0, 3).toLowerCase(), pastePrefixes) === -1 && signature.signatureID !== "???") {
                    if (signature.type == "wormhole") {
                        var wormhole = $.map(tripwire.client.wormholes || {}, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0] || {};
                        var otherSignature = wormhole.id ? (signature.id == wormhole.initialID ? tripwire.client.signatures[wormhole.secondaryID] : tripwire.client.signatures[wormhole.initialID]) : {};
                        if (wormhole.id && wormhole.type !== "GATE") {
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
                var payload = {"systemID": viewingSystemID, "signatures": {"remove": removes}};

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
		pasteNotice.wrapper.find("#fullPaste").data("paste", paste).data("systemID", viewingSystemID)
            .toggle(paste.split("\n").some(function(row) { return !!rowParse(row); }));
	}

    this.pasteSignatures.init();
}
tripwire.pasteSignatures();
;
// #endregion

// #region tripwire/redo
tripwire.redo = function() {
    if (tripwire.signatures.redo[viewingSystemID].length > 0) {
        $("#redo").addClass("disabled");
        var lastIndex = tripwire.signatures.redo[viewingSystemID].length -1;
        var data = {"systemID": viewingSystemID, "signatures": {"add": [], "remove": [], "update": []}};

        var redoItem = tripwire.signatures.redo[viewingSystemID][lastIndex];
        var undo = $.map(redoItem.signatures, function(signature) {
            // grab the current signature so we can restore the way it is now
            if (signature.wormhole && tripwire.client.wormholes[signature.wormhole.id]) {
                // it was a wormhole and still is
                return {"wormhole": tripwire.client.wormholes[signature.wormhole.id], "signatures": [tripwire.client.signatures[signature.signatures[0].id], tripwire.client.signatures[signature.signatures[1].id]]};
            } else if (tripwire.client.signatures[signature.id] && tripwire.client.signatures[signature.id].type == "wormhole") {
                // it was a regular signature but is now a wormhole
                var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0];
                return {"wormhole": wormhole, "signatures": [tripwire.client.signatures[wormhole.initialID], tripwire.client.signatures[wormhole.secondaryID]]};
            } else if (signature.wormhole && tripwire.client.signatures[signature.signatures[0].id]) {
                // it was a wormhole but is now a regular signature
                return tripwire.client.signatures[signature.signatures[0].id];
            } else {
                // it was a regular signature and still is
                return tripwire.client.signatures[signature.id];
            }
        });

        switch(redoItem.action) {
            case "add":
                data.signatures.add = data.signatures.add.concat(redoItem.signatures);
                break;
            case "remove":
                data.signatures.remove = data.signatures.remove.concat($.map(redoItem.signatures, function(signature) { return signature.wormhole ? signature.wormhole : signature.id }));
                break;
            case "update":
                data.signatures.update = data.signatures.update.concat(redoItem.signatures);
                break;
        }

        var success = function(data) {
            if (data.resultSet && data.resultSet[0].result == true) {
                tripwire.signatures.redo[viewingSystemID].pop();

                $("#undo").removeClass("disabled");
                if (viewingSystemID in tripwire.signatures.undo) {
                    if (redoItem.action == "add") {
                        // we are adding new signatures we removed so we need the new ids
                        tripwire.signatures.undo[viewingSystemID].push({"action": redoItem.action, "signatures": data.results});
                    } else if (redoItem.action == "update") {
                        tripwire.signatures.undo[viewingSystemID].push({"action": redoItem.action, "signatures": undo});
                    } else {
                        tripwire.signatures.undo[viewingSystemID].push({action: redoItem.action, signatures: redoItem.signatures});
                    }
                } else {
                    if (redoItem.action == "add") {
                        tripwire.signatures.undo[viewingSystemID] = [{"action": redoItem.action, "signatures": data.results}];
                    } else if (redoItem.action == "update") {
                        tripwire.signatures.undo[viewingSystemID] = [{"action": redoItem.action, "signatures": undo}];
                    } else {
                        tripwire.signatures.undo[viewingSystemID] = [{action: redoItem.action, signatures: redoItem.signatures}];
                    }
                }

                sessionStorage.setItem("tripwire_redo", JSON.stringify(tripwire.signatures.redo));
                sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
            }
        }

        var always = function(data) {
            if (tripwire.signatures.redo[viewingSystemID].length > 0) {
                $("#redo").removeClass("disabled");
            }
        }

        tripwire.refresh('refresh', data, success, always);
    }
}
;
// #endregion

// #region tripwire/serverStatus
// Handles pulling TQ status & player count
tripwire.serverStatus = async function() {
    clearTimeout(tripwire.serverStatus.timer);

    try {
        const data = await tripwire.esi.eveStatus();
        if (data && data.players && data.players > 0) {
            if (!tripwire.serverStatus.data || tripwire.serverStatus.data.players !== data.players) {
                $('#serverStatus .bar-value').text(Intl.NumberFormat().format(data.players));

                // Only pulse when the tab is actually being looked at, and
                // clear any backlog first. jQuery animates off
                // requestAnimationFrame, which is suspended while the tab is
                // hidden, but .effect() still queues -- so a tab left open in
                // the background accumulates one 5-pulse effect per player
                // count change and plays all of them at once on return.
                if (tripwire.serverStatus.data && !document.hidden) {
                    $("#serverStatus").stop(true, true).effect('pulsate', {times: 5});
                }
            }
            tripwire.serverStatus.data = data;
        } else {
            $('#serverStatus').addClass("is-down").find('.bar-value').text("offline");
        }
    } catch (error) {
        $('#serverStatus').addClass("is-down").find('.bar-value').text("offline");
        console.warn("EVE server status unavailable:", error);
    } finally {
        tripwire.serverStatus.timer = setTimeout(tripwire.serverStatus, 15000);
    }
}
tripwire.serverStatus();

tripwire.updateServerTime = function() {
	document.getElementById('serverTime').innerText = moment.utc().format('HH:mm')
};
setInterval(tripwire.updateServerTime, 5000);
tripwire.updateServerTime();
;
// #endregion

// #region tripwire/signature-payload
// One place that knows the shape of a signature update.
//
// The Add/Edit dialog built its update payload and its undo entry inline,
// from form fields, in about a hundred lines that also infer wormhole parent
// and type from what was typed. Inline editing needs the same payload and
// the same undo entry but from the records the client already holds, not
// from a form. Two copies of that shape would drift, and the failure mode of
// drift here is not an error -- it is a wormhole quietly linked to the wrong
// signature. So the shape lives here and both callers use it.
//
// What is deliberately NOT here: the dialog's form parsing (which side is
// the parent, what the type string means). That is form-specific and stays
// with the form. This module only knows what a signature record, a wormhole
// record, an update payload and an undo entry look like.

tripwire.signaturePayload = (function() {

	// The fields the server reads for a signature update; nothing else is sent.
	function signatureRecord(sig) {
		return {
			"id":          sig.id,
			"signatureID": sig.signatureID,
			"systemID":    sig.systemID,
			"type":        sig.type,
			"name":        sig.name,
			"bookmark":    sig.bookmark,
			"lifeLength":  sig.lifeLength
		};
	}

	function wormholeRecord(wh) {
		return {
			"id":     wh.id,
			"type":   wh.type,
			"parent": wh.parent,
			"life":   wh.life,
			"mass":   wh.mass
		};
	}

	function wormholeForSignature(sigId) {
		var holes = tripwire.client.wormholes || {};
		for (var k in holes) {
			if (holes[k].initialID == sigId || holes[k].secondaryID == sigId) { return holes[k]; }
		}
		return null;
	}

	// Wormholes still use the database-compatible stable/critical states. The
	// critical state is presented as either <4h or Expiring from the shared signature
	// expiry, so no schema change is needed for the more useful picker.
	function lifePreset(wormhole, signature) {
		if (!wormhole || wormhole.life === "stable") { return "stable"; }
		if (!signature || !signature.lifeLeft) { return "critical4"; }
		var now = tripwire.serverTime.time || new Date();
	return moment.utc(signature.lifeLeft).diff(moment.utc(now), "seconds") <= 3600 ? "expiring" : "critical4";
	}

	// The update payload for a wormhole and its two signatures. The dialog
	// passes objects it built from the form; inline editing passes records.
	function wormholeUpdatePayload(wormhole, sigA, sigB) {
		return {"signatures": {"update": [{"wormhole": wormhole, "signatures": [sigA, sigB]}]}};
	}

	function signatureUpdatePayload(sig) {
		return {"signatures": {"update": [sig]}};
	}

	// The undo entry for an update to the signature with this id, capturing
	// its state *before* the update: the wormhole and both sides if it is a
	// wormhole now, the bare signature otherwise. undo.js reads
	// `entry.wormhole.id` and `entry.signatures[n].id` to find the current
	// state when it comes to redo, so the records go in whole.
	function undoEntryFor(sigId) {
		var sig = tripwire.client.signatures[sigId];
		if (!sig) { return null; }
		var wh = wormholeForSignature(sigId);
		if (sig.type === "wormhole" && wh) {
			return {"wormhole": wh, "signatures": [tripwire.client.signatures[wh.initialID], tripwire.client.signatures[wh.secondaryID]]};
		}
		return sig;
	}

	// Push an undo entry for the viewing system and turn the control on.
	// Mirrors what the dialog's success handler does.
	function recordUndo(systemID, action, entries) {
		$("#undo").removeClass("disabled");
		if (systemID in tripwire.signatures.undo) {
			tripwire.signatures.undo[systemID].push({action: action, signatures: entries});
		} else {
			tripwire.signatures.undo[systemID] = [{action: action, signatures: entries}];
		}
		sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
	}

	// Change one or more fields on an existing wormhole. Everything else is
	// sent exactly as the client holds it. Returns the payload and the undo
	// entry, or null if the wormhole or either side is missing.
	function changeWormhole(wormholeId, changes) {
		var wh = tripwire.client.wormholes[wormholeId];
		if (!wh) { return null; }
		var a = tripwire.client.signatures[wh.initialID], b = tripwire.client.signatures[wh.secondaryID];
		if (!a || !b) { return null; }
		var undo = undoEntryFor(a.id);
		var updated = $.extend(wormholeRecord(wh), changes);
		return {
			payload: wormholeUpdatePayload(updated, signatureRecord(a), signatureRecord(b)),
			undo: [undo]
		};
	}

	return {
		signatureRecord: signatureRecord,
		wormholeRecord: wormholeRecord,
		wormholeForSignature: wormholeForSignature,
		lifePreset: lifePreset,
		wormholeUpdatePayload: wormholeUpdatePayload,
		signatureUpdatePayload: signatureUpdatePayload,
		undoEntryFor: undoEntryFor,
		recordUndo: recordUndo,
		changeWormhole: changeWormhole
	};
})();
;
// #endregion

// #region tripwire/sync
tripwire.sync = function(mode, data, successCallback, alwaysCallback) {	
    var data = typeof(data) === "object" ? $.extend(true, {}, data) : {};

    // Grab any pending changes
    $.extend(true, data, tripwire.data);

    // Whether this request carries a signature action, so the response can
    // be checked for the list that action should have changed.
    var sentAction = !!(data.signatures && (data.signatures.add || data.signatures.update || data.signatures.remove));

    // Remove old timer to prevent multiple
    if (this.timer) clearTimeout(this.timer);
    if (this.xhr) {
		console.log('Awaiting existing XHR ' + this.xhr.data.mode + ': ', this.xhr);
		tripwire.data = data;
		this.timer = setTimeout(function() { tripwire.sync(mode, data, successCallback, alwaysCallback); }, 50);
		return false;
	}

    if (mode == 'refresh' || mode == 'change') {
        // The server resends the signature list only when the count differs or
        // the client's newest modifiedTime is OLDER than the database's -- at
        // one-second resolution. Two edits inside the same second (a paste
        // that adds, then a paste that updates the same row; or two people)
        // leave count and time equal, and the second edit is invisible to
        // every client until something else changes. After an action whose
        // response omitted the list, the next request declares itself stale
        // so the list comes back whole.
        data.signatureCount = tripwire.forceFullSync ? -1 : tripwire.serverSignatureCount;
        data.signatureTime = tripwire.forceFullSync ? "1970-01-01 00:00:00" : maxTimeByProperty(this.client.signatures, "modifiedTime");
        tripwire.forceFullSync = false;

        data.flareCount = chain.data.flares ? chain.data.flares.flares.length : 0;
        data.flareTime = chain.data.flares ? chain.data.flares.last_modified : 0;

        data.commentCount = Object.keys(this.comments.data||{}).length;
        data.commentTime = maxTimeByProperty(this.comments.data, "modified");

        data.activity = this.activity;
    } else {
        // Expand Tripwire with JSON data from EVE Data Dump and other static data
        $.extend(this, appData);

        this.aSigSystems = Object.assign(
			// Using the index as a key here because numeric keys always come first and we want these before real systems
			// see https://stackoverflow.com/questions/47881998/
			appData.genericSystemTypes.reduce(function(o, s, i) { o[i] = systemAnalysis.analyse(s); o[i].name = s; return o; }, {} ),
			this.systems);
		
        $(".systemsAutocomplete").inlinecomplete({source: this.systems, renderer: 'system', maxSize: 10, delay: 0});
    }

    data.mode = mode != "init" ? "refresh" : "init";
    data.systemID = viewingSystemID;
    data.systemName = viewingSystem;
    data.instance = tripwire.instance;
    data.version = tripwire.version;

    this.xhr = $.ajax({
        url: "refresh.php",
        data: data,
        type: "POST",
        dataType: "JSON",
        cache: false
    }).done(function(data) {
        if (data) {
            tripwire.server = data;
            if(data.signatures) { // Save this count before we delete entries
                tripwire.serverSignatureCount = Object.keys(data.signatures||{}).length;
            }

            if (data.wormholes) {
                // Purge bad wormhole signatures
                var wormholeInitialIDs = {};
                var wormholeSecondaryIDs = {};
                Object.values(data.wormholes).forEach(function (wh) {
                    wormholeInitialIDs[parseInt(wh.initialID)] = wh.id;
                    wormholeSecondaryIDs[parseInt(wh.secondaryID)] = wh.id;
                })
                for (var i in data.signatures) {
                  if (data.signatures[i].type == "wormhole") {
                    var id = data.signatures[i].id;
                    if (wormholeInitialIDs[id] === undefined && wormholeSecondaryIDs[id] === undefined) {
                      delete data.signatures[i];
                    }
                  }
                }
            }

            if (data.esi) {
                tripwire.esi.parse(data.esi);
            }

            if (data.sync) {
                tripwire.serverTime.time = new Date(data.sync);
            }

            if (data.signatures) {
                tripwire.parse(data, mode);
            } else if (sentAction && data.resultSet && data.resultSet[0] && data.resultSet[0].result == true) {
                // The action succeeded but the list did not come back: the
                // same-second case. Ask again, stale, straight away.
                tripwire.forceFullSync = true;
                setTimeout(function() { tripwire.refresh(); }, 150);
            }

            if (data.comments) {
                tripwire.comments.parse(data.comments);
            }

            if (data.wormholes || data.occupied || data.flares) {
                tripwire.chainMap.parse({"map": data.wormholes || null, "occupied": data.occupied || null, "flares": data.flares || null});
            } else if (chain.data.occupied && chain.data.occupied.length && !data.occupied) {
                // send update to remove all occupied system indicators
                tripwire.chainMap.parse({"occupied": []});
            }

			if (data.automapDecision && tripwire.showAutomapDecision) {
				tripwire.showAutomapDecision(data.automapDecision);
			}

			tripwire.updateReturnStatus();

            tripwire.active(data.activity);

            if (data.notify && !$("#serverNotification")[0]) Notify.trigger(data.notify, "yellow", false, "serverNotification");
			
			$('[data-command=ping]')[data.discord_integration ? 'show' : 'hide']();
        }

        tripwire.data = {tracking: {}, esi: {}};
        successCallback ? successCallback(data) : null;
    }).always(function(data, status) {
        // Back off hard while the tab is hidden. Nobody is reading a chain
        // they cannot see, and a corp leaves these open all day -- at five
        // seconds each that is 720 pointless round trips an hour per idle tab.
        // Returning is instant: visibility-refresh.js refreshes on becoming
        // visible, so nothing is stale on the way back.
        // (Also drops the string form, which is an implicit eval.)
        //
        // A closure, not `setTimeout(tripwire.refresh, ...)`. refresh() calls
        // this.sync(), and a detached reference runs with `this` as window,
        // so the very first scheduled poll threw "this.sync is not a
        // function" and nothing was ever scheduled again. The page loaded
        // once and never polled: measured, zero refresh.php calls in twelve
        // seconds. The string form had been doing this right for a decade.
        tripwire.timer = setTimeout(function() { tripwire.refresh(); },
            document.hidden ? tripwire.refreshRateHidden : tripwire.refreshRate);

        alwaysCallback ? alwaysCallback(data) : null;

        if (data.status == 403) {
            window.location.href = ".";
        } else if (status != "success" && status != "abort" && tripwire.connected == true) {
            tripwire.connected = false;
            $("#ConnectionSuccess").click();
            Notify.trigger("Error syncing with server", "red", false, "connectionError");
        } else if (status == "success" && tripwire.connected == false) {
            tripwire.connected = true;
            $("#connectionError").click();
            Notify.trigger("Successfully reconnected with server", "green", 5000, "connectionSuccess");
        }
		
		tripwire.xhr = null;
    });
	this.xhr.data = data;
	
    return true;
};

function maxTimeByProperty(obj, prop) {
	var maxTimeString = "", maxTime;

	for (var key in obj) {
		if (!maxTime || maxTime < new Date(obj[key][prop])) {
			maxTime = new Date(obj[key][prop]);
			maxTimeString = obj[key][prop];
		}
	}
	return maxTimeString;
}

tripwire.sync("init");
;
// #endregion

// #region tripwire/systemChange
// Change the currently viewed system
tripwire.systemChange = function(systemID, mode) {
	const system = systemAnalysis.analyse(systemID);
	if(!system || !system.name) { return; }
	// Hourly ESI activity is unavailable for wormhole systems.
	$("#infoWidget").toggleClass("is-wormhole", !!system.class);
	if (window.placeSystemLinks) placeSystemLinks();
		
    if (mode != "init") {
        $("#infoSecurity").removeClass();
        $("#infoStatics").empty();

        viewingSystem = system.name;
        viewingSystemID = systemID;

        // Reset activity
        activity.refresh(true);
        killIntel.refresh(systemID);

        // Reset signatures
        $("#sigTable span[data-age]").countdown("destroy");
        $("#sigTable tbody").empty();
        $("#signature-count").text('0');
        tripwire.signatures.list = {};
        tripwire.client.signatures = null;

        // Reset chain map
        chain.redraw();

        // Reset comments
        $("#notesWidget .content .comment:visible").remove();
        tripwire.comments.data = null;

        // Change the URL & history
        history.replaceState(null, null, "?system="+viewingSystem);

        tripwire.refresh("change");
    }

    // Change the title
    document.title = system.name + " - " + app_name;

    $("#infoSystem").text(system.name);

    // Current system favorite
    $.inArray(parseInt(viewingSystemID), options.favorites) != -1 ? $("#system-favorite").attr("data-icon", "star").addClass("active") : $("#system-favorite").attr("data-icon", "star-empty").removeClass("active");
	
    if (system.class) {
        // Security
        $("#infoSecurity").html("<span class='" + system.systemTypeClass+" pointer'>Class " + system.class + "</span>");

        // Effects
        if (system.effect) {
            var tooltip = "<table cellpadding=\"0\" cellspacing=\"1\">";
            for (var x in tripwire.effects[system.effect]) {
                var effect = tripwire.effects[system.effect][x].name;
                var base = tripwire.effects[system.effect][x].base;
                var bad = tripwire.effects[system.effect][x].bad;
                var whClass = system.class > 6 ? 6 : system.class;
                var modifier = 0;

                switch (Math.abs(base)) {
                    case 15:
                        modifier = base > 0 ? 7 : -7;
                        break;
                    case 30:
                        modifier = base > 0 ? 14 : -14;
                        break;
                    case 60:
                        modifier = base > 0 ? 28 : -28;
                        break;
                }

                tooltip += "<tr><td>" + effect + "</td><td style=\"padding-left: 25px; text-align: right;\" class=\"" + (bad ? "critical" : "stable") + "\">";
                tooltip += base + (modifier * (whClass -1)) + "%</td></tr>";
            }
            tooltip += "</table>";
            $("#infoSecurity").append("&nbsp;<span class='pointer' data-tooltip='" + tooltip + "'>" + system.effect + "</span>");
        }

        // Statics
        for (var x in system.statics) {
            var type = system.statics[x];
            var wormhole = appData.wormholes[type];
            var color = "wh";

            switch (wormhole.leadsTo) {
                case "High-Sec":
                    color = "hisec";
                    break;
                case "Low-Sec":
                    color = "lowsec";
                    break;
                case "Null-Sec":
                    color = "nullsec";
                    break;
            }

            $("#infoStatics").append("<div><span class='"+ color +"'>&#9679;</span> <b class='"+ color +"'>"+ wormhole.leadsTo +"</b> via <span>"+ wormholeRendering.renderWormholeType(wormhole, type, system) +"</span></div>");
        }

        // Faction
        $("#infoFaction").html("&nbsp;");
    } else {
        // Security
		const securityText = {HS: 'High-Sec', LS: 'Low-Sec', NS: 'Null-Sec', 'Trig': 'Triglavian' }[system.systemTypeName];
       $("#infoSecurity").addClass(system.systemTypeClass).html(securityText + " " + system.baseSecurity.toFixed(2) + system.systemTypeModifiers.join(' '));

        // Faction
        if(fw) { $("#infoFaction").html(fw.factionMarkup(system)); }
		
		// Gates
		const connections = guidance.connections(tripwire.map.shortest, viewingSystemID);
		if(connections.length) {
			// Built here rather than through renderSystem, which emits the
			// security as parenthesised text: "Ikuchi ( HS )". Six of those
			// wrap to three rows and the brackets carry no information. The
			// security becomes a coloured badge on the chip instead -- same
			// fact, roughly half the width, readable by colour before you read
			// the letters.
			$('#infoStatics').append('<p class="gate-list"><b class="gate-list-label">Gates</b>' + connections.map(c => {
				const system = systemAnalysis.analyse(c.systemID);
				if (c.closed) {
					return '<span class="gate-chip is-closed" title="Closed">' + system.name + '</span>';
				}
				return '<a class="gate-chip" href=".?system=' + encodeURIComponent(system.name) + '">' +
					'<span class="gate-name">' + system.name + '</span>' +
					'<span class="type-label gate-sec ' + system.systemTypeClass + '">' + system.systemTypeName + '</span>' +
					'</a>';
			}).join('') + '</p>');
		}
		
		// Route to favourites
		for (var fi in options.favorites) {
			const f = options.favorites[fi];
			const path = guidance.findShortestPath(tripwire.map.shortest, f, viewingSystemID);
			if(path) { $('#infoStatics').append('<p><b><a href=".?system=' + tripwire.systems[f].name + '">' +tripwire.systems[f].name + '</a></b>: ' + systemRendering.renderPath(path) + '</p>'); }
		}
    }

	Tooltips.attach($("#infoStatics [data-tooltip]"));
    Tooltips.attach($("#infoSecurity [data-tooltip]"));

    // Region
    $("#infoRegion").text(tripwire.regions[system.regionID].name);

    // Info Links
    $("#infoWidget .infoLink").each(function() {
        this.href = $(this).data("href").replace(/\$systemName/gi, system.name).replace(/\$systemID/gi, systemID);
    });

    // Reset undo/redo
    tripwire.signatures.undo[systemID] && tripwire.signatures.undo[systemID].length > 0 ? $("#undo").removeClass("disabled") : $("#undo").addClass("disabled");
    tripwire.signatures.redo[systemID] && tripwire.signatures.redo[systemID].length > 0 ? $("#redo").removeClass("disabled") : $("#redo").addClass("disabled");

    // Reset delete signature icon
    $("#sigTable tr.selected").length == 0 ? $("#signaturesWidget #delete-signature").addClass("disabled") : $("#signaturesWidget #delete-signature").removeClass("disabled");
}

setTimeout(() => tripwire.systemChange(viewingSystemID, "init"), 0);
;
// #endregion

// #region tripwire/tutorials
var tutorial;

// infoWidget
$("#infoWidget .tutorial").click(function() {
    tutorial = introJs().setOptions({
        showStepNumbers: false,
        steps: [
            {
                element: document.querySelector("#infoWidget"),
                intro: "<h4>System information widget</h4><br/><p>Displays information on the currently <b>selected</b> Tripwire system.</p>"
            },
            {
                element: document.querySelector("#infoGeneral"),
                intro: "<p>This section includes:<br/>System Name<br/>Security Rating<br/>Region<br/>Owning Faction Name</p><br/><p>If the selected system is a wormhole with a system effect, that will also be shown - hover over it to view the effect breakdown.</p>"
            },
            {
                element: document.querySelector("#activityGraph"),
                intro: "<p>For K space systems, a graph is shown here containing hourly ship jump and kill information from the EVE API.</p><br/><p>Each category can be toggled by clicking the keys above the graph, and the time period selected with the links below.</p>"
            },
            {
                element: document.querySelector("#infoStatics"),
                intro: "<p>If a wormhole system is selected, its static wormhole types will appear here. (A static is a wormhole which is always present; when it is closed or expires, a new one will spawn.)</p><br/><p>In K space, the route to each of your favorite systems is shown here.</p>"
            },
            {
                element: document.querySelector("#favorite-control-wrapper"),
                intro: "<p>Use the star to toggle whether this is a 'favorite' system. It shows orange when the current system is a favorite. The other button shows the Favorites panel which will show you all your favorite systems.</p><br/><p>'Favorite' systems in K space can be shown in the chain map, and in the routing panel to the lower left.</p>"
            },
            {
                element: document.querySelector("#show-favorite"),
                intro: "<p>Use this toggle to show favorite systems and their routes on the chain map.</p>"
            },
            {
                element: document.querySelector("#infoExtra"),
                intro: "<p>For K space systems, the shortest route to the currently visible chain will be shown here, along with the route within the chain.</p>"
            },
            {
                element: document.querySelector("#infoLinks"),
                intro: "<p>These are some quick links to various sites for this specific system.</p>"
            },			
        ]
    }).start();
});

// signaturesWidget
$("#signaturesWidget .tutorial").click(function() {
    tutorial = introJs().setOptions({
        showStepNumbers: false,
        steps: [
            {
                element: document.querySelector("#signaturesWidget"),
                intro: "<h4>System signatures widget</h4><br/><p>Displays all signatures and wormholes in the currently <b>selected</b> Tripwire system.</p>"
            },
            {
                element: document.querySelector("#add-signature"),
                intro: "<p>Add new signatures and wormholes manually by clicking the + icon.</p><br/><p>Copy & Paste EVE scanner results anywhere once Tripwire has focus to add or update signatures, repeated pastes will only update with new information.</p>"
            },
            {
                element: document.querySelector("#delete-signature"),
                intro: "<p>Click here or use the keyboard shortcut <b>DELETE</b> to delete <b>selected</b> signatures from this system.</p><br/><p>Click on a row to select it, click multiple rows to delete multiple signatures at once, click a selected row again to unselect it.</p>"
            },
            {
                element: document.querySelector("#signature-count"),
                intro: "<p>This shows the current count of signatures, including wormholes, in the selected system.</p>"
            },
            {
                element: document.querySelector("#undo"),
                intro: "<p>Click here or use the keyboard shortcut <b>CTRL-Z</b> to undo the last changes you made in this sytem (this includes clipboard pasted changes).</p><br/><p>You can undo multiple times as history is kept in the browser.</p>"
            },
            {
                element: document.querySelector("#redo"),
                intro: "<p>Click here or use the keyboard shortcut <b>CTRL-Y</b> to redo the last changes you made in this system (this includes clipboard pasted changes).</p><br/><p>You can redo multiple times as history is kept in the browser.</p>"
            },
            {
                element: document.querySelector("#toggle-automapper"),
                intro: "<p>Click here to toggle the Auto-mapper feature on (orange) or off.</p><br/><p>This feature only works when an in-game character is being actively tracked, otherwise this icon appears disabled.</p><br/><p>The automapper will watch for a change in your in-game system not via a star gate and try to automatically add or update wormholes.</p><br/><p>First it tries to seach for wormholes already added but missing a leads to system, this includes via wormhole type (B274) or with a leads to of 'High-Sec' for example.</p><br/><p>Next it searches for wormholes without any type or leads to at all.</p><br/><p>Finally if there are no wormholes or they all have a leads to system already, it will add a new wormhole.</p><br/><p>If at any time if finds multiple wormholes it can update, a dialog window will appear asking which wormhole you want to update.</p>"
            },
            {
                element: document.querySelector("#sigTable"),
                intro: "<p>Each column can be sorted by clicking the column label, sort by multiple columns by holding the shift key.</p><br/><p>Right-click a column to change the text-alignment.</p>"
            }
        ]
    }).start();
});

// notesWidget
$("#notesWidget .tutorial").click(function(e) {
    e.preventDefault();

    tutorial = introJs().setOptions({
        showStepNumbers: false,
        exitOnEsc: false,
        exitOnOverlayClick: false,
        skipLabel: "Abort",
        steps: [
            {
                element: document.querySelector("#notesWidget"),
                intro: "<h4>System notes widget</h4><br/><p>Displays comments based on the currently <b>selected</b> Tripwire system.</p><br/><p>The rest of this tutorial will guide you through actually adding a comment, but don't worry we will switch you to your private Tripwire mask so we don't disturb anyone else.</p><br/><p>When you finish or leave this tutorial we will switch you back to your previous Tripwire mask.</p>"
            },
            {
                element: document.querySelector("#add-comment"),
                intro: "<p>Now click the + icon to begin adding a new comment in this system (" + viewingSystem + ").</p>"
            },
            {
                element: document.querySelector("#notesWidget"),
                intro: "<p>Type some basic text now and click save.</p>"
            },
            {
                element: document.querySelector("#notesWidget"),
                intro: "<p>This is our newly created comment. Hover over the comment with your mouse to see additional information and controls.</p>"
            },
            {
                element: document.querySelector("#notesWidget"),
				intro: "<p>Use the pin to show this note on <b>every system</b> in the current mask. Click it again to keep the note only on the system you are viewing.</p>"
            },
            {
                element: document.querySelector("#notesWidget"),
                intro: "<p>Use the <b>Edit</b> button to modify a comment and the <b>Delete</b> button to remove it.</p><br/><p>You can also quickly edit any comment by double-clicking anywhere on it.</p>"
            },
            {
                element: document.querySelector("#notesWidget"),
                intro: "<p>Click on the <b>Edit</b> now on our comment.</p>"
            },
            {
                element: document.querySelector("#notesWidget"),
                intro: "<p>The toolbar at the top allows you to customize your notes.</p><br/><p>You can also click on the <b>Maximize/Minimize</b> button (the far right toolbar icon) to edit this comment in full screen mode.</p><br/><p>Notes support safe rich-text formatting; executable HTML, CSS, and JavaScript are removed.</p>"
            },
            {
                element: document.querySelector("#notesWidget"),
                intro: "<p>This concludes the tutorial, we will now switch you back to your previous Tripwire mask and delete the comment we created.</p>"
            }
        ]
    }).start();

    tutorial.onchange(function(element) {
        switch(tutorial._currentStep) {
            case 1:
                $(".introjs-prevbutton, .introjs-nextbutton").hide();

                console.log("switch mask to private");
                tutorial.previousMask = options.masks.active;
                options.masks.active = options.character.id + ".1";
                options.save();

                tutorial.stepFunc = function() {
                    setTimeout(function() {
                        tutorial._options.steps[2].element = $("#notesWidget").find(".comment:has(.cke_toolbar)")[0];
                        tutorial.setOption("steps", tutorial._options.steps);

                        tutorial.exiting = false;
                        tutorial.exit().start().goToStep(3);
                        tutorial.exiting = true;
                    }, 200);
                }

                $("#notesWidget #add-comment").on("click", tutorial.stepFunc);
                break;
            case 2:
                $(".introjs-prevbutton, .introjs-nextbutton").hide();
                $("#notesWidget #add-comment").off("click", tutorial.stepFunc);

                tutorial.stepFunc = function() {
                    tutorial.comment = $(this).closest(".comment");
                    setTimeout(function() {
                        tutorial._options.steps[3].element = tutorial.comment[0];
                        tutorial._options.steps[4].element = tutorial.comment.find(".commentSticky")[0];
                        tutorial._options.steps[5].element = tutorial.comment.find(".commentControls")[0];
                        tutorial._options.steps[6].element = tutorial.comment.find(".commentControls")[0];
                        tutorial.setOption("steps", tutorial._options.steps);

                        tutorial.exiting = false;
                        tutorial.exit().start().goToStep(4);
                        tutorial.exiting = true;
                    }, 200);
                }

                $("#notesWidget").on("click", ".commentSave", tutorial.stepFunc);
                break;
            case 6:
                $(".introjs-prevbutton, .introjs-nextbutton").hide();
                $("#notesWidget").off("click", ".commentSave", tutorial.stepFunc);

                tutorial.stepFunc = function() {
                    setTimeout(function() {
                        tutorial._options.steps[7].element = $("#notesWidget").find(".comment:has(.cke_toolbar)")[0];
                        tutorial._options.steps[8].element = $("#notesWidget").find(".comment:has(.cke_toolbar)")[0];
                        tutorial.setOption("steps", tutorial._options.steps);

                        tutorial.exiting = false;
                        tutorial.exit().start().goToStep(8);
                        tutorial.exiting = true;
                    }, 200);
                }

                $("#notesWidget").on("click", ".commentEdit", tutorial.stepFunc);
                break;
        }
    });

    tutorial.onexit(function() {
        if (tutorial.exiting) {
            $(".commentCancel:visible").click();
            // delete the tutorial comment that was created
            if (tutorial.comment) {
                var data = {"mode": "delete", "commentID": tutorial.comment.data("id")};

                $.ajax({
                    url: "comments.php",
                    type: "POST",
                    data: data,
                    dataType: "JSON"
                }).done(function(data) {
                    if (data && data.result == true) {
                        tutorial.comment.remove();
                    }
                });
            }

            if (tutorial.previousMask) {
                setTimeout(function() {
                    console.log("change mask back, delete comment", tutorial.previousMask);
                    options.masks.active = tutorial.previousMask;
                    options.save();
                }, 200);
            }

            // remove event listeners
            $("#notesWidget #add-comment").off("click", tutorial.stepFunc);
            $("#notesWidget").off("click", ".commentSave", tutorial.stepFunc);
            $("#notesWidget").off("click", ".commentEdit", tutorial.stepFunc);
            $("#notesWidget").off("click", ".cke_toolgroup:has(.cke_button__toolbarswitch)", tutorial.stepFunc);
        }
    });

    tutorial.previousMask;
    tutorial.comment;
    tutorial.stepFunc;
    tutorial.exiting = true;
});
;
// #endregion

// #region tripwire/undo
tripwire.undo = function() {
    if (tripwire.signatures.undo[viewingSystemID].length > 0) {
        $("#undo").addClass("disabled");
        var lastIndex = tripwire.signatures.undo[viewingSystemID].length -1;
        var data = {"systemID": viewingSystemID, "signatures": {"add": [], "remove": [], "update": []}};

        var undoItem = tripwire.signatures.undo[viewingSystemID][lastIndex];
        var redo = $.map(undoItem.signatures, function(signature) {
            // grab the current signature so we can restore the way it is now
            if (signature.wormhole && tripwire.client.wormholes[signature.wormhole.id]) {
                // it was a wormhole and still is
                return {"wormhole": tripwire.client.wormholes[signature.wormhole.id], "signatures": [tripwire.client.signatures[signature.signatures[0].id], tripwire.client.signatures[signature.signatures[1].id]]};
            } else if (tripwire.client.signatures[signature.id] && tripwire.client.signatures[signature.id].type == "wormhole") {
                // it was a regular signature but is now a wormhole
                var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0];
                return {"wormhole": wormhole, "signatures": [tripwire.client.signatures[wormhole.initialID], tripwire.client.signatures[wormhole.secondaryID]]};
            } else if (signature.wormhole && tripwire.client.signatures[signature.signatures[0].id]) {
                // it was a wormhole but is now a regular signature
                return tripwire.client.signatures[signature.signatures[0].id];
            } else {
                // it was a regular signature and still is
                return tripwire.client.signatures[signature.id];
            }
        });

        switch(undoItem.action) {
            case "add":
                data.signatures.remove = data.signatures.remove.concat($.map(undoItem.signatures, function(signature) { return signature.wormhole ? signature.wormhole : signature.id }));
                break;
            case "remove":
                data.signatures.add = data.signatures.add.concat(undoItem.signatures);
                break;
            case "update":
                data.signatures.update = data.signatures.update.concat(undoItem.signatures);
                break;
        }

        var success = function(data) {
            // An entry the server cannot act on -- "Signature ID not found",
            // typically an id-0 entry left in sessionStorage from before
            // addSignature returned real ids -- must not sit on top of the
            // stack forever, or undo is dead for the rest of the session.
            if (!(data.resultSet && data.resultSet[0] && data.resultSet[0].result == true)) {
                tripwire.signatures.undo[viewingSystemID].pop();
                sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
                if (data.resultSet && data.resultSet[0] && data.resultSet[0].value) { Notify.trigger("Nothing to undo: " + data.resultSet[0].value); }
                return;
            }
            if (data.resultSet && data.resultSet[0].result == true) {
                tripwire.signatures.undo[viewingSystemID].pop();

                $("#redo").removeClass("disabled");
                if (viewingSystemID in tripwire.signatures.redo) {
                    if (undoItem.action == "remove") {
                        // we are adding new signatures we removed so we need the new ids
                        tripwire.signatures.redo[viewingSystemID].push({"action": undoItem.action, "signatures": data.results});
                    } else if (undoItem.action == "update") {
                        tripwire.signatures.redo[viewingSystemID].push({"action": undoItem.action, "signatures": redo});
                    } else {
                        tripwire.signatures.redo[viewingSystemID].push({"action": undoItem.action, "signatures": undoItem.signatures});
                    }
                } else {
                    if (undoItem.action == "remove") {
                        tripwire.signatures.redo[viewingSystemID] = [{"action": undoItem.action, "signatures": data.results}];
                    } else if (undoItem.action == "update") {
                        tripwire.signatures.redo[viewingSystemID] = [{"action": undoItem.action, "signatures": redo}];
                    } else {
                        tripwire.signatures.redo[viewingSystemID] = [{"action": undoItem.action, "signatures": undoItem.signatures}];
                    }
                }

                sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
                sessionStorage.setItem("tripwire_redo", JSON.stringify(tripwire.signatures.redo));
            }
        }

        var always = function(data) {
            if (tripwire.signatures.undo[viewingSystemID].length > 0) {
                $("#undo").removeClass("disabled");
            }
        }

        tripwire.refresh('refresh', data, success, always);
    }
}
;
// #endregion

// #region activity-graph
var activity = new function() {
	this.graph;
	this.options;
	this.view;
	this.span = 24;
	this.columns = [
		{id: "time", label: "Time", role: "domain", type: "string", calc: function(d, r) { return d.getValue(r, 0) + "h"; }},
		{id: "jumps", label: "Jumps", role: "data", type: "number", sourceColumn: 1, column: 1, title: "Jumps", short: "Jumps"},
		{id: "podkills", label: "Pod Kills", role: "data", type: "number", sourceColumn: 2, column: 2, title: "Pod Kills", short: "Pods"},
		{id: "shipkills", label: "Ship Kills", role: "data", type: "number", sourceColumn: 3, column: 3, title: "Ship Kills", short: "Ships"},
		{id: "npckills", label: "NPC Kills", role: "data", type: "number", sourceColumn: 4, column: 4, title: "NPC Kills", short: "NPC"},
		//{id: "annotationLabel", label: "Test", role: "annotation", type: "string", sourceColumn: 5, title: "Test"},
		//{id: "annotationText", label: "Test", role: "annotationText", type: "string", sourceColumn: 6, title: "Test"}
	];

	this.getData = function(span, cache) {
		var span = typeof(span) !== "undefined" ? span : this.span;
		var cache = typeof(cache) !== "undefined" ? cache : true;
		var systemID = viewingSystemID;
		// ESI's hourly system activity feed does not cover wormhole space.
		if (systemAnalysis.analyse(systemID).class) {
			if (activity.graph) activity.graph.clearChart();
			activity.view = null;
			return false;
		}

		// Google hasn't finished loading yet
		if (!activity.graph) {
				setTimeout(function() {activity.getData(span, cache)}, 500);
				return false;
		}

		return $.ajax({
			url: "activity_graph.php",
			data: {systemID: systemID, time: span},
			type: "GET",
			dataType: "JSON",
			cache: cache
		}).done(function(json) {
			if (systemID != viewingSystemID || systemAnalysis.analyse(viewingSystemID).class) return;
			if (json) {
				json.rows.reverse();
				activity.view = new google.visualization.DataView(new google.visualization.DataTable(json));
				activity.view.setColumns(activity.columns);

				// A window with almost no readings should not hold full height
				// for three gridlines and a dot.
				var withData = json.rows.filter(function(r) {
					return r.c.slice(1).some(function(c) { return c && c.v !== null && c.v > 0; });
				}).length;
				// The height has to be given to the chart, not applied to the
				// container as CSS. Google Charts renders a fixed-height SVG;
				// shrinking the box around it afterwards leaves the SVG
				// overflowing -- measured: an 84px box holding a 170px chart,
				// painting 86px over the range buttons and links below it.
				// Nothing at all to plot reads as a broken chart if it is drawn
				// anyway: axes, gridlines and no line. Say so instead.
				var $g = $("#activityGraph");
				if (!withData) {
					activity.graph.clearChart();
					$g.addClass("is-empty").attr("data-empty", "No activity recorded yet \u2014 the hourly feed fills in from here.");
					return;
				}
				$g.removeClass("is-empty").removeAttr("data-empty");

				var sparse = withData < 3;
				var c = activity.tokens();
				$("#activityGraph").toggleClass("is-sparse", sparse);
				activity.options.height = sparse ? 92 : (window.systemFit ? systemFit.graphHeight() : 170);
				activity.options.chartArea = sparse
					? {left: 48, top: 10, right: 12, bottom: 22}
					: {left: 48, top: 24, right: 12, bottom: 28};
				activity.options.legend = sparse
					? {position: "none"}
					: {position: "none"};
				activity.renderLegend();

				activity.graph.draw(activity.view, activity.options);
			}
		});
	};

	// Google's legend paginates in a panel this narrow ("1/2" with arrows),
	// which is a pager where a legend should be. This is the same four
	// series as chips in the controls row, in the same colours the chart
	// draws them, toggling the same columns the built-in legend did.
	this.toggleSeries = function(c) {
		if (activity.columns[c].sourceColumn) {
			activity.columns[c].label = activity.columns[c].title + " (off)";
			delete activity.columns[c].sourceColumn;
		} else {
			activity.columns[c].sourceColumn = activity.columns[c].column;
			activity.columns[c].label = activity.columns[c].title;
		}
		activity.view.setColumns(activity.columns);
		activity.options.animation.duration = 0;
		activity.graph.draw(activity.view, activity.options);
		activity.options.animation.duration = 500;
		activity.renderLegend();
	};

	this.renderLegend = function() {
		var $bar = $("#activityGraphControls");
		if (!$bar.length) { return; }
		var $legend = $("#activityLegend");
		if (!$legend.length) {
			$legend = $('<span id="activityLegend" role="group" aria-label="Series"></span>').prependTo($bar);
		}
		var c = activity.tokens();
		var colours = {jumps: c.jumps, podkills: c.pod, shipkills: c.ship, npckills: c.npc};
		$legend.empty();
		activity.columns.forEach(function(col, i) {
			if (col.role !== "data") { return; }
			var on = !!col.sourceColumn;
			$('<button type="button" class="legend-chip"></button>')
				.toggleClass("off", !on)
				.attr("aria-pressed", on ? "true" : "false")
				.attr("title", on ? "Hide " + col.title : "Show " + col.title)
				.append($('<i class="swatch"></i>').css("background", colours[col.id]))
				.append(document.createTextNode(col.short || col.title))
				.on("click", function() { activity.toggleSeries(i); })
				.appendTo($legend);
		});
	};

	this.selectHandler = function() {
		var selections = activity.graph.getSelection();

		if (selections[0] && selections[0].row == null) {
			var c = selections[0].column;

			activity.toggleSeries(c);
		}
	}

	// Chart styling reads from the design tokens rather than hard-coding hexes,
	// so the graph follows whichever theme is loaded instead of being a
	// differently-coloured island in the panel.
	this.tokens = function() {
		const cs = getComputedStyle(document.documentElement);
		const t = n => cs.getPropertyValue(n).trim();
		return {
			// The axis wants the opposite of what the panel border wants. A
			// gridline is a reading aid behind the data, so it sits below the
			// border weight; the numbers beside it are content and were being
			// rendered at muted-foreground, which is a weight meant for labels
			// you skim past, not values you read off a chart. Two dedicated
			// tokens rather than borrowing two that pull the wrong way.
			text:   t("--chart-axis-text") || t("--muted-foreground") || "#999",
			line:   t("--chart-gridline")  || t("--border")           || "#454545",
			axisLine: t("--border-strong") || t("--border") || "#454545",
			jumps:  t("--data-info")        || "#47a2fe",
			pod:    t("--data-critical")    || "#ff4747",
			ship:   t("--data-warn")        || "#f5b544",
			npc:    t("--data-good")        || "#50d25a",
			font:   "Montserrat, system-ui, sans-serif"
		};
	};

	this.buildOptions = function() {
		const c = activity.tokens();
		const axis = {color: c.text, fontName: c.font, fontSize: 11};
		return {
			isStacked: false,
			backgroundColor: "transparent",

			// Series in the order the columns are declared: jumps, pod, ship, npc.
			// Semantic rather than decorative -- kills are danger colours, jumps
			// are neutral traffic.
			colors: [c.jumps, c.pod, c.ship, c.npc],
			// Four equal area fills in a muted palette lost distinction from
			// each other. Jumps is the traffic reading and gets the one real
			// fill; the three kill series are thinner strokes with a whisper
			// of area so they still read as bands where they overlap.
			areaOpacity: 0.10,
			lineWidth: 1.25,
			pointSize: 0,
			series: {
				0: {lineWidth: 2, areaOpacity: 0.22},
				1: {lineWidth: 1.25, areaOpacity: 0.08},
				2: {lineWidth: 1.25, areaOpacity: 0.08},
				3: {lineWidth: 1.25, areaOpacity: 0.08}
			},
			// A sparse window (a preview, or a gap in the cron) must read as
			// isolated readings rather than a line drawn through nothing.
			interpolateNulls: false,

			hAxis: {
				textStyle: axis,
				showTextEvery: 3,
				baselineColor: c.axisLine,
				gridlines: {color: "transparent"}
			},
			vAxis: {
				textStyle: axis,
				viewWindowMode: "maximized",
				viewWindow: {min: 0},
				maxValue: 5,
				baselineColor: c.axisLine,
				gridlines: {color: c.line, count: 4},
				minorGridlines: {count: 0}
			},

			height: 170,
			chartArea: {left: 48, top: 24, right: 12, bottom: 28},
			legend: {position: "top", alignment: "start",
			         textStyle: {color: c.text, fontName: c.font, fontSize: 11}},
			animation: {duration: 300, easing: "out"},
			tooltip: {showColorCode: true, textStyle: {fontName: c.font, fontSize: 12}},
			focusTarget: "category",
			crosshair: {trigger: "both", orientation: "vertical",
			            color: c.line, opacity: 0.6}
		};
	};

	this.init = function() {
		activity.graph = new google.visualization.AreaChart(document.getElementById("activityGraph"));
		activity.options = activity.buildOptions();

		google.visualization.events.addListener(activity.graph, "select", activity.selectHandler);

		activity.getData(activity.span);
	}

	this.time = function(span) {
		switch(span) {
			case 24:
				this.options.hAxis.showTextEvery = 3;
				break;
			case 48:
				this.options.hAxis.showTextEvery = 6;
				break;
			case 168:
				this.options.hAxis.showTextEvery = 24;
				break;
		}

		this.span = span;
		this.getData(span);
	}

	this.redraw = function() {
		this.graph.draw(this.view, this.options);
	}

	// The chart reads its colours from the tokens at build time, so a theme
	// switch rebuilds the options -- keeping the fitted height, chart area
	// and tick spacing -- and redraws in place.
	this.retheme = function() {
		if (!this.graph || !this.options) return;
		var keep = {height: this.options.height, chartArea: this.options.chartArea, every: this.options.hAxis.showTextEvery};
		this.options = this.buildOptions();
		this.options.height = keep.height;
		this.options.chartArea = keep.chartArea;
		this.options.legend = {position: "none"};
		this.options.hAxis.showTextEvery = keep.every;
		this.renderLegend();
		if (this.view) this.redraw();
	}

	this.refresh = function(cache) {
		this.getData(this.span, cache);
	}

	google.charts.setOnLoadCallback(this.init);
}
;
// #endregion

// #region command-palette
// Command palette and the bare-key layer.
//
// Renders entirely from tripwire.keyboard, so what the palette lists, what the
// keys do, and what "?" prints are the same list by construction.

(function() {
    var $palette, $input, $list, $help, items = [], cursor = 0;

    function build() {
        $palette = $(
            '<div id="cmd-palette" class="hidden" role="dialog" aria-modal="true" aria-label="Command palette">' +
              '<div class="cmd-box">' +
                '<input id="cmd-input" type="text" autocomplete="off" spellcheck="false" ' +
                       'placeholder="Type a command, or a system name to jump to…" aria-label="Command" />' +
                '<ul id="cmd-list" role="listbox"></ul>' +
                '<div class="cmd-foot"><span><b>↑↓</b> move</span><span><b>↵</b> run</span>' +
                  '<span><b>esc</b> close</span><span><b>?</b> shortcuts</span></div>' +
              '</div>' +
            '</div>').appendTo("body");

        $input = $palette.find("#cmd-input");
        $list  = $palette.find("#cmd-list");

        // Clicking the backdrop closes; clicking inside must not.
        $palette.on("mousedown", function(e) { if (e.target === $palette[0]) { close(); } });
        $input.on("input", function() { render($input.val()); });
        $list.on("mousedown", "li", function(e) { e.preventDefault(); run($(this).index()); });

        $help = $(
            '<div id="cmd-help" class="hidden" role="dialog" aria-label="Keyboard shortcuts">' +
              '<div class="cmd-box"><h2>Keyboard shortcuts</h2><table>' +
              tripwire.keyboard.bindings.map(function(b) {
                  return "<tr><th>" + b.keys + "</th><td>" + b.does + "</td></tr>";
              }).join("") +
              '</table><p>Every command is also in the palette — press <b>/</b>.</p></div>' +
            '</div>').appendTo("body");

        $help.on("mousedown", function(e) { if (e.target === $help[0]) { $help.addClass("hidden"); } });
    }

    function candidates(query) {
        var q = (query || "").toLowerCase().trim();
        var k = tripwire.keyboard;
        var all = k.actions.concat(
            k.selectionActions ? k.selectionActions() : [],
            k.chainTabActions ? k.chainTabActions() : [],
            k.maskActions ? k.maskActions() : [],
            k.panelActions ? k.panelActions() : []);
        var acts = all.filter(function(a) {
            return !q || a.label.toLowerCase().indexOf(q) > -1 || a.group.toLowerCase().indexOf(q) > -1;
        });
        return acts.concat(tripwire.keyboard.systemActions(q));
    }

    function render(query) {
        items = candidates(query);
        cursor = 0;
        if (!items.length) {
            $list.html('<li class="cmd-empty" role="presentation">No matching command</li>');
            return;
        }
        $list.html(items.map(function(a, i) {
            var off = a.enabled && !a.enabled();
            return '<li role="option" class="' + (i === 0 ? "sel " : "") + (off ? "off " : "") +
                   (a.destructive ? "danger" : "") + '" aria-selected="' + (i === 0) + '">' +
                     '<span class="cmd-label">' + a.label + '</span>' +
                     '<span class="cmd-group">' + a.group + '</span>' +
                     (a.keys ? '<span class="cmd-keys">' + a.keys + '</span>' : '') +
                   '</li>';
        }).join(""));
    }

    function move(delta) {
        if (!items.length) { return; }
        cursor = (cursor + delta + items.length) % items.length;
        $list.children().removeClass("sel").attr("aria-selected", "false")
             .eq(cursor).addClass("sel").attr("aria-selected", "true")[0]
             .scrollIntoView({block: "nearest"});
    }

    function run(i) {
        var a = items[i];
        if (!a) { return; }
        if (a.enabled && !a.enabled()) { return; }   // listed but unavailable
        close();
        a.perform();
    }

    function open() {
        $help.addClass("hidden");
        $palette.removeClass("hidden");
        $input.val("");
        render("");
        $input.focus();
    }

    function close() {
        $palette.addClass("hidden");
        $input.blur();
    }

    function isOpen() { return $palette && !$palette.hasClass("hidden"); }

    $(function() {
        build();

        // Keys inside the palette. Bound to the input so they never reach the
        // global handler below.
        $input.on("keydown", function(e) {
            if (e.key === "Escape")     { e.preventDefault(); close(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
            else if (e.key === "ArrowUp")   { e.preventDefault(); move(-1); }
            else if (e.key === "Enter")     { e.preventDefault(); run(cursor); }
        });

        // Global layer. Stands down whenever the keystroke belongs to a field
        // or an open dialog, which is what makes it safe to use bare keys.
        $(document).on("keydown.cmdPalette", function(e) {
            // Escape closes whatever is open, wherever focus happens to be --
            // the input's own handler covers the normal case, this covers focus
            // having moved elsewhere.
            if (e.key === "Escape") {
                if (!$help.hasClass("hidden")) { $help.addClass("hidden"); return; }
                if (isOpen()) { close(); return; }
            }
            if (isOpen() || tripwire.keyboard.isTyping(e.target)) { return; }

            if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
                e.preventDefault();
                open();
            } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "/") {
                e.preventDefault();
                open();
            } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === "?") {
                e.preventDefault();
                $help.toggleClass("hidden");
            }
        });
    });
})();
;
// #endregion

// #region comments
$("body").on("dblclick", ".comment", function(e) {
	// Once a note is being edited, double-click belongs to the editor (for
	// native word selection) rather than the display-mode edit shortcut.
	if ($(e.target).closest(".rte").length) return;

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
				tripwire.comments.setOwner($comment, data.comment.modifiedByName, data.comment.modifiedDate);
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
;
// #endregion

// #region dialog-polish
// Tags dialog buttons by role so CSS can style them as roles rather than by
// position. The previous rule used :last-child, which made "Close" the primary
// action in Settings -- Save sits first there and Close last.
//
// Hooks dialogopen from outside, so no dialog source is touched.

(function() {
	var PRIMARY = ["save", "add", "ok", "apply", "create", "confirm", "send", "search", "login", "import"];
	var DESTRUCTIVE = ["delete", "remove", "reset"];
	var QUIET = ["cancel", "close"];

	// Three roles. Everything else is an ordinary secondary action and sits
	// between the quiet action and the primary. The CSS orders by role, so a
	// dialog whose config lists Cancel first still renders it beside Save.
	function tag() {
		$(".ui-dialog-buttonpane button").each(function() {
			var label = $.trim($(this).text()).toLowerCase();
			$(this).toggleClass("is-primary", PRIMARY.indexOf(label) > -1)
			       .toggleClass("is-destructive", DESTRUCTIVE.indexOf(label) > -1)
			       .toggleClass("is-quiet", QUIET.indexOf(label) > -1);
		});
	}

	// Every dialog gets the same skin class, whatever its own config asked
	// for. Done at the prototype so no dialog source is touched.
	if ($.ui && $.ui.dialog) {
		var base = $.ui.dialog.prototype.options.dialogClass || "";
		$.ui.dialog.prototype.options.dialogClass = $.trim(base + " tw-dialog");
	}

	$(function() {
		$(document).on("dialogopen", ".ui-dialog", function() { setTimeout(tag, 0); });
		// Buttons are shown/hidden per mode (Add vs Save), so retag on change too.
		$(document).on("click", ".ui-dialog-buttonpane button", function() { setTimeout(tag, 0); });
	});
})();
;
// #endregion

// #region editor
// Rich-text editor for system notes. Output uses the tags sanitiseHtml allows.

tripwire.editor = (function() {
	var instances = {};

	// execCommand is formally deprecated but is the only broadly supported way
	// to do this without a large dependency, which is the thing being removed.
	// Every command below is one of the stable, universally implemented set.
	var TOOLS = [
		{cmd: "bold",              label: "B",  title: "Bold",          style: "font-weight:700"},
		{cmd: "italic",            label: "I",  title: "Italic",        style: "font-style:italic"},
		{cmd: "underline",         label: "U",  title: "Underline",     style: "text-decoration:underline"},
		{cmd: "strikeThrough",     label: "S",  title: "Strikethrough", style: "text-decoration:line-through"},
		{sep: true},
		{cmd: "insertUnorderedList", label: "•", title: "Bulleted list"},
		{cmd: "insertOrderedList",   label: "1.", title: "Numbered list"},
		{sep: true},
		{cmd: "createLink",        label: "🔗", title: "Link"},
		{cmd: "unlink",            label: "⛓", title: "Remove link"},
		{sep: true},
		{cmd: "removeFormat",      label: "Tx", title: "Clear formatting"}
	];

	// The colours notes actually use: the brand accent and the data semantics,
	// so a note can mark something critical in the same red the map uses.
	var COLOURS = ["--foreground", "--primary", "--data-critical", "--data-warn", "--data-good", "--data-info", "--data-loot-pink"];

	function resolve(token) {
		return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
	}

	function build($host, id) {
		var $wrap = $('<div class="rte"></div>');
		var $bar = $('<div class="rte-bar" role="toolbar"></div>').appendTo($wrap);
		var $area = $('<div class="rte-area" contenteditable="true"></div>')
			.attr("id", id + "-rte")
			.html($host.html());
		var savedRange = null;

		function rememberSelection() {
			var selection = window.getSelection();
			if (selection.rangeCount && $area[0].contains(selection.anchorNode)) {
				savedRange = selection.getRangeAt(0).cloneRange();
			}
		}

		function restoreSelection() {
			if (!savedRange) { return; }
			var selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(savedRange);
		}

		TOOLS.forEach(function(t) {
			if (t.sep) { $('<span class="rte-sep"></span>').appendTo($bar); return; }
			$('<button type="button" class="rte-btn"></button>')
				.attr("title", t.title)
				.attr("aria-label", t.title)
				.attr("data-cmd", t.cmd)
				.attr("style", t.style || "")
				.text(t.label)
				// mousedown, not click: the selection is still live before focus moves.
				.on("mousedown", function(e) {
					e.preventDefault();
					if (t.cmd === "createLink") {
						var url = window.prompt("Link URL");
						if (!url) { return; }
						if (!/^(https?:|mailto:|\/|#)/i.test(url)) { url = "https://" + url; }
						document.execCommand("createLink", false, url);
					} else {
						document.execCommand(t.cmd, false, null);
						// removeFormat clears text styles but leaves hyperlinks behind.
						if (t.cmd === "removeFormat") { document.execCommand("unlink", false, null); }
					}
				})
				.appendTo($bar);
		});

		// Keep the selection while the native select has focus. The values are
		// legacy HTML font sizes because execCommand applies them reliably to a
		// partial selection; note CSS maps those values to predictable pixels.
		$('<select class="rte-size" title="Text size" aria-label="Text size">' +
			'<option value="" selected>Size</option>' +
			'<option value="1">Small</option>' +
			'<option value="2">Default</option>' +
			'<option value="3">Medium</option>' +
			'<option value="4">Large</option>' +
			'<option value="5">X-large</option>' +
		'</select>')
			.on("mousedown", rememberSelection)
			.on("change", function() {
				var value = this.value;
				if (!value) { return; }
				restoreSelection();
				document.execCommand("fontSize", false, value);
				this.value = "";
				$area.trigger("focus");
				rememberSelection();
			})
			.appendTo($bar);

		$('<span class="rte-sep"></span>').appendTo($bar);
		COLOURS.forEach(function(token) {
			var colour = resolve(token) || "#ccc";
			$('<button type="button" class="rte-swatch"></button>')
				.attr("title", "Text colour")
				.css("background", colour)
				.on("mousedown", function(e) {
					e.preventDefault();
					document.execCommand("foreColor", false, colour);
				})
				.appendTo($bar);
		});

		// Paste as text unless it is already ours: pasting from a browser drags
		// in spans, classes and inline styles that the sanitiser would strip
		// anyway, leaving surprising gaps.
		$area.on("paste", function(e) {
			var cb = e.originalEvent && e.originalEvent.clipboardData;
			if (!cb) { return; }
			e.preventDefault();
			document.execCommand("insertText", false, cb.getData("text/plain"));
		});
		$area.on("keyup mouseup input focus", rememberSelection);

		$wrap.append($area);
		$host.after($wrap).hide();
		return {$wrap: $wrap, $area: $area};
	}

	return {
		// CKEDITOR.replace(id, config) -> tripwire.editor.replace(id)
		replace: function(id, onReady) {
			var $host = $("#" + id);
			if (!$host.length) { return null; }
			var parts = build($host, id);
			instances[id] = {
				host: $host,
				wrap: parts.$wrap,
				area: parts.$area,
				getData: function() { return parts.$area.html(); },
				focus: function() { parts.$area.trigger("focus"); }
			};
			if (typeof onReady === "function") { setTimeout(function() { onReady(instances[id]); }, 0); }
			return instances[id];
		},

		instances: instances,

		get: function(id) { return instances[id]; },

		// CKEditor's destroy(true) discards edits; destroy(false) keeps them.
		destroy: function(id, discard) {
			var inst = instances[id];
			if (!inst) { return; }
			if (!discard) { inst.host.html(inst.getData()); }
			inst.wrap.remove();
			inst.host.show();
			delete instances[id];
		}
	};
})();
;
// #endregion

// #region firefox-jquery-css-zoom
// Firefox (and some other browsers) don't support 'zoom' CSS
// This snippet hooks up a variant using transform(scale) to JQuery
// See e.g. https://medium.com/@sai_prasanna/simulating-css-zoom-with-css3-transform-scale-461d1b9762d6
if (document.createElement("detect").style.zoom != ""){
	$.cssNumber.zoom = true;
    $.cssHooks.zoom = {
        get: function(elem, computed, extra) {
            var value = $(elem).data('zoom');
            return value != null ? value : 1;
        },
        set: function(elem, scale) {
            var $e = $(elem);
            var e = $e[0];
            var data = $e.data('zoom');
            if (data == null) {
                $e.data('origWidth', e.clientWidth);
                $e.data('origHeight', e.clientHeight);
            }
            $e.data('zoom', scale);
            const width = $e.data('origWidth');
            const height = $e.data('origHeight');
            e.style.transform = 'scale(' + scale + ')';
            e.style.transformOrigin = '0 0';
            const bot = (height/scale - height);
            const right = (width/scale - width);
            e.style.marginBottom = (-bot) + 'px';
            e.style.marginRight = (-right) + 'px';
        }
    };
}
;
// #endregion

// #region fw
const fw = new _FactionWarfare();

function _FactionWarfare() {
	const _this = this;
	this.listeners = [];
	this.data = null;
	this.systems = {};
	this.SamanuniAthounonGateOpen = true;
	
	/** Refresh the FW data from the public ESI endpoint */
	this.refresh = function() {
		$.ajax({
			url: 'cached_third_party.php?key=fw',
			type: "GET",
			dataType: "JSON"
		}).done(function(data, status, xhr) {	
			if(!_.isEqual(data, _this.data)) {
				console.info('Updating faction warfare status');
				_this.data = data;
				_this.parse(data);
				tripwire.systemChange(viewingSystemID);
				guidance.clearCache();
			}
		}).fail(function(xhr, status, error) {
			console.warn('Failed to fetch FW data from ESI: ' + status, error);
		});
	};	
	
	this.parse = function(data) {
		this.systems = {};
		for(var i = 0; i < data.length; i++) { this.systems[data[i].solar_system_id] = data[i]; }
		this.SamanuniAthounonGateOpen = this.systems[30003856].occupier_faction_id == 500001;
	}
	
	// Guidance plugin
	this.adjustJumpCost = function(from, to, cost) {
		const gateOpen = this.SamanuniAthounonGateOpen || !((from == 3856 && to == 45322) || (to == 3856 && from == 45322));
		return gateOpen ? cost : -1;
	}.bind(this);	// because it's called from outside
	guidance.jumpCostModifiers.push(this.adjustJumpCost);
	
	/** Gets the markup for faction text for a system. If it's in FW, it will show contested status; if not it will just show the faction */
	this.factionMarkup = function(system) {
		return system.factionID ? (
			_this.systems[system.systemID] ? 
				appData.factions[_this.systems[system.systemID].occupier_faction_id].name + ' (FW: ' + 
					(_this.systems[system.systemID].contested == 'uncontested' ? 'uncontested' : 
						Math.floor(100 * _this.systems[system.systemID].victory_points / _this.systems[system.systemID].victory_points_threshold) + '% contested') + ')'
				: appData.factions[system.factionID].name
		) : "&nbsp;";
	};
	
	setInterval(this.refresh, 3600000);
	this.refresh();	
}
;
// #endregion

// #region header-ship
// The ship under the pilot's name. The backend tracker writes ESI state into
// the tracking dropdown; this mirrors the active character's hull into the
// letterhead, and clears it when nothing is tracked.
(function() {
	function sync() {
		var $el = $("#hdr-ship");
		if (!$el.length) return;
		var chars = window.tripwire && tripwire.esi && tripwire.esi.characters;
		var c = chars && window.options && options.tracking ? chars[options.tracking.active] : null;
		var type = c && c.shipTypeName;
		if (!type) { $el.addClass("hidden").empty(); return; }
		// The hull only. What the pilot named the ship is theirs, not a fact
		// the desk needs.
		$el.text(type).removeClass("hidden");
	}
	$(function() {
		sync();
		if (!window.MutationObserver) return;
		// esi.js writes hull and name into the dropdown rows; set_tracking_text
		// flips the tracked-name span when the active character changes.
		var opts = {childList: true, characterData: true, subtree: true, attributes: true};
		["tracking", "user-track"].forEach(function(id) {
			var t = document.getElementById(id);
			if (t) new MutationObserver(sync).observe(t, opts);
		});
	});
})();
;
// #endregion

// #region header
// The header names the system you are viewing. The panels already do, but the
// header is where the eye goes for "where am I", and until now it answered
// with the character's location -- a different fact. #infoSystem is the
// source of truth the system panel keeps current; this mirrors it.
(function() {
	function sync() {
		var name = $("#infoSystem").text().trim();
		if (name) { $("#hdr-system").text(name); }
	}
	$(function() {
		sync();
		var target = document.getElementById("infoSystem");
		if (target && window.MutationObserver) {
			new MutationObserver(sync).observe(target, {childList: true, characterData: true, subtree: true});
		}
		$("#hdr-system").on("click", function(e) { e.preventDefault(); $("#search").trigger("click"); });
	});
})();
;
// #endregion

// #region inline-wormhole-edit
// Life and mass, edited on the row.
//
// These are the two wormhole fields that change during a session -- a hole
// goes end-of-life, mass goes critical -- and until now each change meant
// double-click, wait for the dialog, change one field, save. On a tablet the
// dialog is the whole workflow. Click the cell, pick from a chip set, done.
//
// The payload and the undo entry come from tripwire.signaturePayload, the
// same module the dialog uses, built from the records the client already
// holds with one field changed. Nothing here knows the shape of an update.
//
// Leads-to is not edited here: it needs the system autocomplete and the
// wormhole-type inference the dialog does, and that stays in the dialog.

(function() {
	var FIELDS = {
		5: {key: "life", options: [
			{value: "stable",    label: "Stable", life: "stable"},
			{value: "critical4", label: "<4h",    life: "critical", lifeHours: 4, className: "critical"},
			{value: "critical1", label: "<1h",    life: "critical", lifeHours: 1, className: "critical"},
			{value: "expiring",  label: "Expiring", life: "critical", lifeHours: 1, className: "critical"}
		]},
		6: {key: "mass", options: [
			{value: "stable",   label: "Stable"},
			{value: "destab",   label: "<50%"},
			{value: "critical", label: "<10%"}
		]}
	};

	function close() {
		$("#inline-edit").remove();
		$(document).off("mousedown.inlineEdit keydown.inlineEdit");
	}

	function open($td, field, wormhole) {
		close();

		var $pop = $('<div id="inline-edit" role="listbox"></div>')
			.attr("aria-label", "Set " + field.key);

		field.options.forEach(function(opt) {
			var signature = tripwire.client.signatures[$td.closest("tr").data("id")];
			var currentValue = field.key === "life" ? tripwire.signaturePayload.lifePreset(wormhole, signature) : wormhole[field.key];
			var current = currentValue === opt.value;
			$('<button type="button" role="option"></button>')
				.addClass("inline-chip " + (opt.className || opt.value))
				.attr("aria-selected", current ? "true" : "false")
				.text(opt.label)
				.on("click", function(e) {
					e.preventDefault(); e.stopPropagation();
					if (!current) {
						var changes = {};
						changes[field.key] = opt.life || opt.value;
						if (opt.lifeHours) { changes.lifeHours = opt.lifeHours; }
						apply(wormhole.id, changes, $td);
					}
					close();
				})
				.appendTo($pop);
		});

		$("body").append($pop);

		var r = $td[0].getBoundingClientRect();
		$pop.css({
			top: Math.round(r.bottom + 4) + "px",
			left: Math.round(Math.min(r.left, window.innerWidth - $pop.outerWidth() - 8)) + "px"
		});
		$pop.find("[aria-selected=true]").trigger("focus");

		setTimeout(function() {
			$(document).on("mousedown.inlineEdit", function(e) {
				if (!$(e.target).closest("#inline-edit").length) { close(); }
			});
			$(document).on("keydown.inlineEdit", function(e) {
				if (e.key === "Escape") { close(); }
			});
		}, 0);
	}

	function apply(wormholeId, changes, $td) {
		var built = tripwire.signaturePayload.changeWormhole(wormholeId, changes);
		if (!built) { return; }

		$td.addClass("is-saving");
		var systemID = viewingSystemID;

		var success = function(data) {
			if (data.resultSet && data.resultSet[0].result == true) {
				tripwire.signaturePayload.recordUndo(systemID, "update", built.undo);
			}
		};
		var always = function() { $td.removeClass("is-saving"); };

		tripwire.refresh("refresh", built.payload, success, always);
	}

	$(function() {
		// Delegated: rows are re-rendered by the refresh cycle.
		$("#sigTable").on("click", "tbody tr[data-id] > td:nth-child(5), tbody tr[data-id] > td:nth-child(6)", function(e) {
			var $td = $(this), $tr = $td.closest("tr");
			// Non-wormhole rows span leads-to across these columns and have no 5th cell.
			if ($tr.children("td").length < 6) { return; }
			var sig = tripwire.client.signatures[$tr.data("id")];
			if (!sig || sig.type !== "wormhole") { return; }
			var wh = tripwire.signaturePayload.wormholeForSignature(sig.id);
			if (!wh) { return; }

			e.preventDefault();
			e.stopPropagation();   // a click here is an edit, not a row selection
			open($td, FIELDS[$td.index() + 1], wh);
		});

		// Mark the cells so they read as editable.
		var tag = function() {
			$("#sigTable tbody tr[data-id]").each(function() {
				var $tr = $(this);
				if ($tr.children("td").length >= 6) {
					$tr.children("td").slice(4, 6).addClass("inline-editable");
				}
			});
		};
		tag();
		var target = document.getElementById("sigTable");
		if (target && window.MutationObserver) {
			var pending = null;
			new MutationObserver(function() { clearTimeout(pending); pending = setTimeout(tag, 60); })
				.observe(target, {childList: true, subtree: true});
		}
	});
})();
;
// #endregion

// #region keyboard-actions
// The single source of truth for what the keyboard can do.
//
// Both the command palette and the bare-key handler render from this file, and
// so does the "?" overlay, so bindings and their documentation cannot drift
// apart. Every action dispatches the control the mouse would have used -- this
// layer adds ways to invoke behaviour, never new behaviour.

tripwire.keyboard = (function() {
    // A control counts as unavailable when it is missing, hidden, or carries
    // the app's own .disabled marker (undo/redo/automapper use it).
    function control(selector) {
        var $el = $(selector);
        return $el.length && !$el.hasClass("disabled") && $el.is(":visible") ? $el : null;
    }

    function click(selector) {
        return {
            enabled: function() { return !!control(selector); },
            perform: function() {
                var $el = control(selector);
                if ($el) { $el.click(); }
            }
        };
    }

    // id, label and group are what the palette lists; keys is what the bare-key
    // handler binds and what the "?" overlay prints.
    var ACTIONS = [
        {id: "add-signature",    label: "Add signature",              group: "Signatures", keys: null,  target: "#add-signature"},
        {id: "edit-signature",   label: "Edit selected signature",    group: "Signatures", keys: null,  target: "#edit-signature"},
        {id: "delete-signature", label: "Delete selected signature",  group: "Signatures", keys: null,  target: "#delete-signature", destructive: true},
        {id: "undo",             label: "Undo last signature change", group: "Signatures", keys: "Ctrl+Z", target: "#undo"},
        {id: "redo",             label: "Redo signature change",      group: "Signatures", keys: "Ctrl+Y", target: "#redo"},

        {id: "toggle-automapper", label: "Toggle auto-mapper",        group: "Chain",      keys: null,  target: "#toggle-automapper"},
        {id: "show-viewing",      label: "Add current system to chain", group: "Chain",    keys: null,  target: "#show-viewing"},
        {id: "show-favorite",     label: "Add favourites to chain",     group: "Chain",    keys: null,  target: "#show-favorite"},
        {id: "sort-chain",        label: "Sort chain children like table", group: "Chain", keys: null,  target: "#chain-sort-lock"},
        {id: "new-tab",           label: "New chain tab",               group: "Chain",    keys: null,  target: "#newTab"},

        {id: "search",            label: "Toggle system search",      group: "Navigate",   keys: null,  target: "#search"},
        {id: "follow",            label: "Follow my in-game system",  group: "Navigate",   keys: null,  target: "#follow"},
        {id: "favorite",          label: "Add or remove favourite",   group: "Navigate",   keys: null,  target: "#system-favorite"},
        {id: "favorites",         label: "Show all favourites",       group: "Navigate",   keys: null,  target: "#favorite-dropdown-toggle"},

        {id: "add-comment",       label: "Add comment",               group: "Comments",   keys: null,  target: "#add-comment"},
        {id: "sort-comments",     label: "Sort comments by date",     group: "Comments",   keys: null,  target: "#comment-sort"},

        {id: "settings",          label: "Settings",                  group: "App",        keys: null,  target: "#settings"},
        {id: "mask",              label: "Switch mask",               group: "App",        keys: null,  target: "#mask-menu-link"}
    ].map(function(a) { return $.extend(a, click(a.target)); });

    // Bare-key bindings. Deliberately no destructive key: a stray press must
    // never delete a signature, so deletion is reachable only from the palette,
    // where invoking it is a two-step. Matches the same rule in Aperture.
    var KEY_BINDINGS = [
        {keys: "/",        does: "Open the command palette"},
        {keys: "Ctrl+K",   does: "Open the command palette"},
        {keys: "?",        does: "Show this list"},
        {keys: "Esc",      does: "Close the palette or this list"},
        {keys: "Ctrl+Z",   does: "Undo last signature change"},
        {keys: "Ctrl+Y",   does: "Redo signature change"},
        {keys: "Ctrl+A",   does: "Select all signatures"},
        {keys: "Ctrl+C",   does: "Copy selected signatures"}
    ];

    // Jumping to a system is generated rather than declared -- one entry per
    // known system, resolved lazily so the palette does not build ~8000 rows
    // until someone actually types.
    function systemActions(query) {
        if (!query || query.length < 2 || !tripwire.systems) { return []; }
        var q = query.toLowerCase(), out = [];
        for (var id in tripwire.systems) {
            var name = tripwire.systems[id] && tripwire.systems[id].name;
            if (!name) { continue; }
            if (name.toLowerCase().indexOf(q) === 0) {
                out.push({
                    id: "jump-" + id,
                    label: name,
                    group: "Jump to system",
                    enabled: function() { return true; },
                    perform: (function(n) {
                        return function() { window.location = "?system=" + encodeURIComponent(n); };
                    })(name)
                });
                if (out.length >= 8) { break; }
            }
        }
        return out;
    }

    // True when a keystroke belongs to something else: a field being typed in,
    // or an open dialog. The dialog test cannot be a tag test -- jQuery UI's
    // dialogs put focus on plain containers, so match the role/class instead.
    function isTyping(target) {
        var $t = $(target);
        return $t.is("input, textarea, select, [contenteditable=true]") ||
               $t.closest("[role='dialog'], .ui-dialog, .cke").length > 0;
    }

    // Panel show/hide, generated from the panel registry rather than declared
    // here, so adding a panel adds its command for free. Resolved lazily
    // because the panel registry is initialized later.
    function panelActions() {
        if (!tripwire.panels) { return []; }
        return tripwire.panels.all().map(function(p) {
            return {
                id: "panel-" + p.id,
                label: (tripwire.panels.isVisible(p.id) ? "Hide " : "Show ") + p.title + " panel",
                group: "Panels",
                enabled: function() { return true; },
                perform: function() { tripwire.panels.toggle(p.id); }
            };
        });
    }

    // Jump to a chain tab by name.
    function chainTabActions() {
        return $("#chainTabs .tab").map(function(i, t) {
            var name = $(t).find(".name").text().trim();
            return {
                id: "chain-tab-" + i, label: "Chain: " + name, group: "Chain",
                enabled: function() { return true; },
                perform: function() { if (window.chain && chain.setActiveTab) { chain.setActiveTab(i); } }
            };
        }).get();
    }

    // Switch mask by name.
    function maskActions() {
        return $("#mask-menu-mask-list a").map(function(i, a) {
            var $m = $(a).find(".mask"), name = $m.text().trim();
            return {
                id: "mask-" + $m.data("mask"), label: "Mask: " + name, group: "App",
                enabled: function() { return !$(a).hasClass("active"); },
                perform: function() { $(a).trigger("click"); }
            };
        }).get();
    }

    // Life and mass on the selected wormhole rows, without the dialog.
    function selectionActions() {
        var $rows = $("#sigTable tbody tr.selected");
        if (!$rows.length || !tripwire.signaturePayload) { return []; }
        var whs = $rows.map(function() { var w = tripwire.signaturePayload.wormholeForSignature($(this).data("id")); return w ? w.id : null; }).get();
        if (!whs.length) { return []; }
        var set = function(field, value, label, lifeHours) {
            return {
                id: "sel-" + field + "-" + value, label: label + (whs.length > 1 ? " (" + whs.length + " wormholes)" : ""), group: "Selected wormhole",
                enabled: function() { return true; },
                // The same sequence as the inline editor: build the payload, send
                // it, and record the undo entry only once the server accepts it.
                perform: function() {
                    var systemID = viewingSystemID;
                    whs.forEach(function(id) {
                        var c = {}; c[field] = value;
                        if (lifeHours) { c.lifeHours = lifeHours; }
                        var built = tripwire.signaturePayload.changeWormhole(id, c);
                        if (!built) { return; }
                        tripwire.refresh("refresh", built.payload, function(data) {
                            if (data && data.resultSet && data.resultSet[0] && data.resultSet[0].result == true) {
                                tripwire.signaturePayload.recordUndo(systemID, "update", built.undo);
                            }
                        });
                    });
                }
            };
        };
        return [set("life", "stable", "Life: stable"), set("life", "critical", "Life: <4h", 4), set("life", "critical", "Life: <1h", 1), set("life", "critical", "Life: Expiring", 1),
                set("mass", "stable", "Mass: Stable"), set("mass", "destab", "Mass: <50%"), set("mass", "critical", "Mass: <10%")];
    }

    return {
        actions: ACTIONS,
        panelActions: panelActions,
        chainTabActions: chainTabActions,
        maskActions: maskActions,
        selectionActions: selectionActions,
        bindings: KEY_BINDINGS,
        systemActions: systemActions,
        isTyping: isTyping
    };
})();
;
// #endregion

// #region kill-intel
// zKillboard's system streambox and its latest kill results for the viewed system.
var killIntel = new function() {
	var request = 0;
	var lastKey = null;
	var lastRefresh = 0;
	var cache = {};
	var esiResponses = new Map();
	var maxAge = 5 * 60 * 1000;
	var base = "https://zkillboard.com";

	function validID(value) {
		var id = Number(value);
		return Number.isSafeInteger(id) && id > 0 ? id : null;
	}

	function selectedCharacterID() {
		return validID(options.tracking && options.tracking.active) || validID(init.characterID);
	}

	function setCount(scope, value) {
		$("#killCount" + scope).text(value === null ? "—" : value);
	}

	function setLink(scope, url) {
		var link = $("#killLink" + scope);
		if (url) link.attr("href", url);
		else link.removeAttr("href");
	}

	function setImage(scope, kind, id, shape) {
		var image = $("#killImage" + scope);
		if (id) image.attr("src", "https://images.evetech.net/" + kind + "/" + id + "/" + shape + "?size=64").prop("hidden", false);
		else image.prop("hidden", true).removeAttr("src");
	}

	async function json(url) {
		var isEsi = url.startsWith("https://esi.evetech.net/");
		var cached = isEsi && esiResponses.get(url);
		var headers = {Accept: "application/json"};
		if (cached) headers["If-None-Match"] = cached.etag;
		var response = await fetch(url, {headers: headers});
		if (response.status === 304 && cached) return cached.data;
		if (!response.ok) throw new Error("Killmail request failed: " + response.status);
		var data = await response.json();
		if (isEsi) {
			var etag = response.headers.get("etag");
			esiResponses.delete(url);
			if (etag) {
				esiResponses.set(url, {etag: etag, data: data});
				if (esiResponses.size > 100) esiResponses.delete(esiResponses.keys().next().value);
			}
		}
		return data;
	}

	async function identity(characterID) {
		if (characterID === validID(init.characterID)) {
			return {corporation_id: validID(init.corporationID), alliance_id: validID(init.allianceID)};
		}
		return json("https://esi.evetech.net/characters/" + characterID + "/");
	}

	async function count(systemID, scope, id) {
		if (!id) return null;
		var kills = await json(base + "/api/kills/solarSystemID/" + systemID + "/" + scope + "/" + id + "/");
		if (!Array.isArray(kills)) throw new Error("Invalid killmail response");
		return kills.length;
	}

	this.refresh = function(systemID) {
		var system = validID(systemID || viewingSystemID);
		var character = selectedCharacterID();
		if (!system || !character) return;
		var key = system + ":" + character;
		if (key === lastKey && Date.now() - lastRefresh < maxAge) return;
		lastKey = key;
		lastRefresh = Date.now();
		var current = ++request;
		var frame = document.getElementById("killStreambox");
		if (frame) frame.src = base + "/system/" + system + "/streambox/";
		["Me", "Corp", "Alliance"].forEach(function(scope) { setCount(scope, "…"); setLink(scope, null); });
		setImage("Me", "characters", character, "portrait");
		setImage("Corp", "corporations", null, "logo");
		setImage("Alliance", "alliances", null, "logo");
		var saved = cache[key];
		if (saved && Date.now() - saved.time < maxAge) {
			this.show(saved.data, system, character);
			return;
		}
		identity(character).then(async function(ids) {
			var corp = validID(ids.corporation_id), alliance = validID(ids.alliance_id);
			var values = await Promise.all([
				count(system, "characterID", character),
				count(system, "corporationID", corp),
				count(system, "allianceID", alliance)
			]);
			return {values: values, corp: corp, alliance: alliance};
		}).then(function(data) {
			cache[key] = {data: data, time: Date.now()};
			if (current === request) killIntel.show(data, system, character);
		}).catch(function(error) {
			if (current !== request) return;
			["Me", "Corp", "Alliance"].forEach(function(scope) { setCount(scope, null); });
			console.warn("System kill activity unavailable:", error);
		});
	};

	this.show = function(data, system, character) {
		setCount("Me", data.values[0]);
		setCount("Corp", data.values[1]);
		setCount("Alliance", data.values[2]);
		setImage("Corp", "corporations", data.corp, "logo");
		setImage("Alliance", "alliances", data.alliance, "logo");
		$("#killLinkAlliance").toggle(!!data.alliance);
		setLink("Me", base + "/character/" + character + "/solarSystemID/" + system + "/");
		setLink("Corp", data.corp && base + "/corporation/" + data.corp + "/solarSystemID/" + system + "/");
		setLink("Alliance", data.alliance && base + "/alliance/" + data.alliance + "/solarSystemID/" + system + "/");
	};

	$(function() {
		killIntel.refresh(viewingSystemID);
	});
};
;
// #endregion

// #region mask-menu-dismiss
// The mask menu closes when you click anywhere else, or press Escape.
$(document).on("click", function(e) {
	var menu = document.getElementById("mask-menu");
	if (!menu || menu.style.display === "none") return;
	if ($(e.target).closest("#mask-menu, #mask-menu-link").length) return;
	menu.style.display = "none";
});
$(document).on("keydown", function(e) {
	if (e.key === "Escape") {
		var menu = document.getElementById("mask-menu");
		if (menu && menu.style.display !== "none") menu.style.display = "none";
	}
});
;
// #endregion

// #region maskRendering
/** Functions for rendering things relating to masks */
const maskRendering = new function() { 
	/** Render a mask, as returned from masks.php */
	this.renderMask = function(mask) {
		const icons = { global: 'eye', character: 'user', personal: 'user', corporate: 'star', alliance: 'star' };

		return '<span class="mask" data-mask="' + mask.mask + '">'
			+ '<i data-icon="' + icons[mask.ownerType] + '" class="' + mask.ownerType + '"></i>'
			+ mask.label
			+ '</span>';
	}
	
	this.update = function(masks, newActive) {
		const activeMask = masks.find(x => newActive !== undefined ? x.mask === newActive : x.active);
		document.getElementById('mask').innerHTML = maskRendering.renderMask(activeMask);
		const list = document.getElementById('mask-menu-mask-list');
		list.innerHTML = '';
		masks.filter(m => m.owner || (m.joined || m.joinedBy == 'alliance') || m == activeMask).map(m => {
			const a = document.createElement('a');
			a.href = '#';
			a.innerHTML = this.renderMask(m);
			if(m === activeMask) { a.className = 'active'; }
			a.addEventListener('click', e => {
				maskFunctions.updateActiveMask(m.mask, () => document.getElementById('mask-menu').style.display = 'none');
			});
			list.appendChild(a);
		});
	}
};
;
// #endregion

// #region mass
// Model and data binding for mass related UI
tripwire.massOptions = {
	higgs: false,
	prop: false
}
	
tripwire.resetMassOptions = function() {
	$("#hot-jump").removeClass("active").attr("aria-pressed", "false");
	tripwire.massOptions.prop = false;		
	$("#higgs-jump").removeClass("active").attr("aria-pressed", "false");
	tripwire.massOptions.higgs = false;
};

$("#hot-jump").click(function() {
	if ($(this).hasClass("active")) {		
		$(this).removeClass("active").attr("aria-pressed", "false");
		tripwire.massOptions.prop = false;
	} else {
		$(this).addClass("active").attr("aria-pressed", "true");
		tripwire.massOptions.prop = true;
	}
});

$("#higgs-jump").click(function() {
	if ($(this).hasClass("active")) {
		$(this).removeClass("active").attr("aria-pressed", "false");
		tripwire.massOptions.higgs = false;
	} else {
		$(this).addClass("active").attr("aria-pressed", "true");
		tripwire.massOptions.higgs = true;
	}
});
;
// #endregion

// #region panel-menu
// Panel visibility menu, on the topbar's layout control.
//
// That control used to arm gridster's drag-and-resize. The desktop layout is a
// CSS grid now, so there is nothing to drag -- but "which panels do I want" is
// still a real question, and the panel registry already answers it. The
// control opens that instead of doing nothing.

(function() {
	function close() { $("#panel-menu").remove(); $(document).off("mousedown.panelMenu"); }

	function open($btn) {
		close();
		if (!tripwire.panels) { return; }

		var $menu = $('<div id="panel-menu" role="menu"></div>');

		tripwire.panels.all().forEach(function(p) {
			var on = tripwire.panels.isVisible(p.id);
			$('<button type="button" role="menuitemcheckbox"></button>')
				.attr("aria-checked", on ? "true" : "false")
				.append($('<span class="tick"></span>').text(on ? "✓" : ""))
				.append($("<span></span>").text(p.title))
				.on("click", function(e) {
					e.stopPropagation();
					tripwire.panels.toggle(p.id);
					open($btn);          // re-render so the ticks follow
				})
				.appendTo($menu);
		});

		$("body").append($menu);

		var r = $btn[0].getBoundingClientRect();
		$menu.css({
			top: Math.round(r.bottom + 4) + "px",
			// keep it on screen when the control sits near the right edge
			left: Math.round(Math.min(r.left, window.innerWidth - $menu.outerWidth() - 8)) + "px"
		});

		setTimeout(function() {
			$(document).on("mousedown.panelMenu", function(e) {
				if (!$(e.target).closest("#panel-menu, #layout").length) { close(); }
			});
		}, 0);
	}

	$(function() {
		$("#layout").attr("data-tooltip", "Show or hide panels").on("click", function(e) {
			e.preventDefault();
			e.stopPropagation();
			if ($("#panel-menu").length) { close(); } else { open($(this)); }
		});
	});
})();
;
// #endregion

// #region panel-resize
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
		var splitter = event.currentTarget;
		var splitterStart = parseFloat(splitter.style.left) || 0;
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
			// The splitter is absolutely positioned rather than part of the grid,
			// so moving the tracks does not move it. Keep its hit area attached to
			// the boundary throughout the drag.
			splitter.style.left = Math.round(splitterStart + leftWidth - leftRect.width) + "px";
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
		var splitter = event.currentTarget;
		var splitterStart = parseFloat(splitter.style.top) || 0;
		var rect = el.getBoundingClientRect();
		var startY = event.clientY;
		var firstRowBottom = rect.top;
		var firstRowTop = Infinity;
		Array.prototype.forEach.call(document.querySelectorAll(".gridWidget"), function(panel) {
			if (getComputedStyle(panel).display === "none") { return; }
			var panelRect = panel.getBoundingClientRect();
			if (panelRect.top < firstRowTop - 1) {
				firstRowTop = panelRect.top;
				firstRowBottom = panelRect.bottom;
			} else if (Math.abs(panelRect.top - firstRowTop) <= 1) {
				firstRowBottom = Math.max(firstRowBottom, panelRect.bottom);
			}
		});
		var startTopHeight = firstRowBottom - rect.top;
		function move(e) {
			var topHeight = Math.max(MIN_ROW, Math.min(rect.height - MIN_ROW, startTopHeight + e.clientY - startY));
			settings().rowRatio = topHeight / rect.height;
			el.style.setProperty("--top-row", Math.round(topHeight) + "px");
			splitter.style.top = Math.round(splitterStart + topHeight - startTopHeight) + "px";
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
;
// #endregion

// #region panels
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
;
// #endregion

// #region paste-button
// A visible way in for the tool's main loop.
//
// Pasting probe-scanner results has always been the primary way signatures
// get into Tripwire, and it has never had a control on screen -- Ctrl-V with
// nothing focused. New corp members find it in the tutorial or not at all,
// and on a tablet there is no Ctrl-V to find.
//
// The button reads the clipboard directly where the browser allows it (a
// user gesture is enough in Chromium; Firefox and Safari prompt or refuse),
// and otherwise falls back to the existing hidden textarea and asks for the
// keystroke. Either way the text ends up in the same parsePaste path the
// keystroke uses, so the two routes cannot drift.

var __tripwirePasteIngest;
(function() {
	function ingest(text) {
		if (!text || !text.trim()) {
			Notify.trigger("Nothing on the clipboard looked like scanner results.");
			return;
		}
		tripwire.pasteSignatures.notifyPaste(text);
		tripwire.pasteSignatures.parsePaste(text);
	}

	__tripwirePasteIngest = ingest;

	function fallback() {
		$("#clipboard").focus();
		Notify.trigger("Press Ctrl-V (or &#8984;V) now to paste your scan results.");
	}

	$(function() {
		$(document).on("click", "#paste-signatures", function(e) {
			e.preventDefault();
			if (navigator.clipboard && navigator.clipboard.readText) {
				navigator.clipboard.readText().then(ingest, fallback);
			} else {
				fallback();
			}
		});
	});
})();

// Paste from anywhere.
//
// paste.js only listens on a hidden textarea it focuses when Ctrl-V is
// pressed with nothing else focused. Click the system name (which opens
// search), or the palette, or any field, and focus is in an input -- so the
// keystroke pastes there and the scan never reaches the parser. That is
// "I can't paste sigs" from the user's side of the screen.
//
// If what is being pasted looks like probe-scanner output -- tab-separated
// rows starting with a signature id -- it is a scan wherever it lands. The
// exceptions are places where a person is genuinely editing text: the
// signature dialog, the notes editor, and settings.
(function() {
	var SCAN = /^[A-Z]{3}-\d{3}\t/m;
	document.addEventListener("paste", function(e) {
		var t = e.target;
		if (t && t.closest && t.closest("#dialog-signature, .rte, #dialog-options, #clipboard")) { return; }
		var cb = e.clipboardData; if (!cb) { return; }
		var text = cb.getData("text/plain") || "";
		if (!SCAN.test(text)) { return; }
		e.preventDefault();
		e.stopPropagation();
		if (t && t.blur) { t.blur(); }
		__tripwirePasteIngest(text);
	}, true);
})();
;
// #endregion

// #region pwa
// Install on a phone. Chrome and Edge raise beforeinstallprompt when the
// manifest and service worker are in place; iOS Safari never does, so there
// the tip says where Add to Home Screen lives. The tip appears only on a
// phone-width screen, only outside an installed app, and only until it is
// dismissed once.
(function() {
	var KEY = "tripwire.install.dismissed";
	var deferred = null;

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/sw.js").catch(function(err) {
			// Installability depends on this; a silent failure would look like
			// a phone that simply never offers to install.
			console.warn("Tripwire: service worker not registered -", err && err.message);
		});
	}

	function standalone() {
		return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
	}
	function phone() { return window.matchMedia && matchMedia("(max-width: 767px)").matches; }
	function dismissed() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
	function dismiss() { try { localStorage.setItem(KEY, "1"); } catch (e) {} $("#install-tip").remove(); }
	function ios() { return /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream; }

	function show(mode) {
		if ($("#install-tip").length || standalone() || dismissed() || !phone()) return;
		var text = mode === "prompt"
			? "Install Tripwire on this phone"
			: "Install: tap Share, then Add to Home Screen";
		var $tip = $('<div id="install-tip" role="status"><span class="tip-text"></span></div>');
		$tip.find(".tip-text").text(text);
		if (mode === "prompt") {
			$('<button type="button" class="tip-install">Install</button>').on("click", function() {
				if (!deferred) return;
				deferred.prompt();
				deferred.userChoice.then(function() { deferred = null; dismiss(); });
			}).appendTo($tip);
		}
		$('<button type="button" class="tip-close" aria-label="Not now">×</button>').on("click", dismiss).appendTo($tip);
		$("#topbar").after($tip);
	}

	window.addEventListener("beforeinstallprompt", function(e) {
		e.preventDefault();
		deferred = e;
		show("prompt");
	});
	window.addEventListener("appinstalled", dismiss);

	$(function() {
		if (ios() && !standalone()) show("ios");
	});

	// For checking the tip without a phone: tripwireInstallTip("prompt"|"ios").
	window.tripwireInstallTip = function(mode) { $("#install-tip").remove(); try { localStorage.removeItem(KEY); } catch (e) {} show(mode || "ios"); };
})();
;
// #endregion

// #region sanitise-html
// HTML sanitiser for user-authored content (system notes).
//
// Replaces a regex-based filter that was bypassable. The old one stripped
// disallowed tags and rewrote `on\w+=` to neutralise handlers, but the pattern
// required the equals sign to touch the attribute name -- so
//
//     <img src=x onerror =alert(1)>
//
// passed through untouched and executed on render, with no click, in the
// session of every corp member who opened the system. `javascript:` in an href
// was not filtered at all.
//
// Regexes cannot sanitise HTML: the parser accepts whitespace, newlines and
// entity encodings the pattern does not anticipate. This parses the input with
// the browser's own parser -- in an inert document, so nothing loads or
// executes while inspecting it -- then keeps only allowlisted elements and
// attributes and rebuilds the markup.

var sanitiseHtml = (function() {
	// Formatting CKEditor produces, and nothing that can navigate or execute.
	var ALLOWED_TAGS = {
		b:1, i:1, em:1, strong:1, u:1, s:1, strike:1, sub:1, sup:1,
		font:1, span:1, p:1, br:1, hr:1, div:1, pre:1, blockquote:1,
		h1:1, h2:1, h3:1, h4:1, h5:1, h6:1,
		ul:1, ol:1, li:1,
		table:1, thead:1, tbody:1, tr:1, td:1, th:1,
		a:1, img:1
	};

	// Per-tag attribute allowlist. Anything not named here is dropped, which is
	// what makes an unanticipated handler (onerror, onpointerover, on-anything)
	// impossible rather than merely unmatched.
	var ALLOWED_ATTRS = {
		'*': {style: 1, title: 1, dir: 1},
		a:   {href: 1, target: 1, rel: 1},
		font:{color: 1, size: 1, face: 1},
		td:  {colspan: 1, rowspan: 1},
		th:  {colspan: 1, rowspan: 1},
		// img was in the previous allowlist, so it stays -- dropping it would
		// silently strip pictures out of notes people already wrote. Worth
		// knowing: an image from an arbitrary host reveals the viewer's IP to
		// that host every time the note is opened. If that matters to the corp,
		// remove img here and the concern goes with it.
		img: {src: 1, alt: 1, width: 1, height: 1}
	};

	// Schemes a link may use. Relative URLs are allowed and everything else --
	// javascript:, data:, vbscript: -- is not.
	var SAFE_URL = /^(?:https?:|mailto:|\/|#|\.{0,2}\/)/i;

	// style is kept because notes use colour, but anything that can fetch or
	// execute from within CSS is removed.
	var UNSAFE_CSS = /(?:expression|javascript:|vbscript:|url\s*\(|@import|behaviou?r\s*:|-moz-binding)/i;
	var SAFE_STYLES = {
		color: /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s+-]+\)|[a-z]+)$/i,
		'background-color': /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.,%\s+-]+\)|[a-z]+)$/i,
		// A deliberately finite set keeps notes readable and prevents stored
		// content from taking over the panel while preserving common rich-text
		// sizes from older editors.
		'font-size': /^(?:(?:8|9|10|11|12|13|14|16|18|20|24|28|32|36|48)px|(?:0\.75|0\.875|1|1\.125|1\.25|1\.5|2|2\.5|3)(?:em|rem)|(?:75|80|87\.5|100|112\.5|125|150|200|250|300)%|xx-small|x-small|small|medium|large|x-large|xx-large)$/i,
		'text-align': /^(?:left|right|center|justify|start|end)$/i,
		'font-weight': /^(?:normal|bold|bolder|lighter|[1-9]00)$/i,
		'font-style': /^(?:normal|italic|oblique)$/i,
		'text-decoration': /^(?:(?:none|underline|overline|line-through)\s*)+$/i
	};

	function cleanStyle(value) {
		if (UNSAFE_CSS.test(value)) { return null; }

		var declarations = [];
		value.split(';').forEach(function(declaration) {
			var colon = declaration.indexOf(':');
			if (colon < 1) { return; }
			var property = declaration.slice(0, colon).trim().toLowerCase();
			var propertyValue = declaration.slice(colon + 1).trim();
			if (SAFE_STYLES[property] && SAFE_STYLES[property].test(propertyValue)) {
				declarations.push(property + ': ' + propertyValue);
			}
		});
		return declarations.length ? declarations.join('; ') : null;
	}

	function cleanNode(node) {
		// Comments can hide conditional markup; drop them.
		if (node.nodeType === 8) { node.remove(); return; }
		if (node.nodeType !== 1) { return; }

		var tag = node.tagName.toLowerCase();

		// Clean descendants before possibly unwrapping this element. Cleaning
		// only the original top-level list lets a forbidden wrapper smuggle an
		// unvisited child into the result, for example:
		//
		//     <section><img src=x onerror=alert(1)></section>
		//
		// Once section is removed, that img is a top-level node and would retain
		// its event handler. Recursing first ensures every surviving descendant
		// has passed the attribute allowlist.
		Array.prototype.slice.call(node.childNodes).forEach(cleanNode);

		if (!ALLOWED_TAGS[tag]) {
			// Keep the text, lose the element -- so stripping <script> does not
			// silently delete a paragraph someone wrote around it.
			var parent = node.parentNode;
			while (node.firstChild) { parent.insertBefore(node.firstChild, node); }
			parent.removeChild(node);
			return;
		}

		var permitted = ALLOWED_ATTRS[tag] || {};
		var global = ALLOWED_ATTRS['*'];

		// Copy first: removing while iterating skips entries.
		Array.prototype.slice.call(node.attributes).forEach(function(attr) {
			var name = attr.name.toLowerCase();
			var value = attr.value;

			if (!permitted[name] && !global[name]) { node.removeAttribute(attr.name); return; }

			if (name === 'href' || name === 'src') {
				if (!SAFE_URL.test(value.trim())) { node.removeAttribute(attr.name); return; }
			}
			if (name === 'style') {
				var safe = cleanStyle(value);
				if (safe === null) { node.removeAttribute(attr.name); return; }
				node.setAttribute('style', safe);
			}
			if (tag === 'font' && name === 'size' && !/^[1-7]$/.test(value.trim())) {
				node.removeAttribute(attr.name);
			}
		});

		// A link that opens a new tab must not hand the opener over with it.
		if (tag === 'a' && node.getAttribute('target')) {
			node.setAttribute('rel', 'noopener noreferrer');
		}

	}

	return function sanitiseHtml(html) {
		if (html == null) { return ''; }

		// An inert document: images do not load and scripts do not run while
		// the tree is being inspected.
		var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');

		Array.prototype.slice.call(doc.body.childNodes).forEach(cleanNode);
		return doc.body.innerHTML;
	};
})();

// Rich-text editors represent an empty document with markup such as <div><br></div>.
// Treat that, whitespace, non-breaking spaces, and zero-width characters as empty;
// an actual image still counts as note content.
function noteHtmlHasContent(html) {
	var doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
	var text = (doc.body.textContent || '').replace(/[\s\u00a0\u200b\ufeff]+/g, '');
	return text.length > 0 || !!doc.body.querySelector('img[src]');
}
;
// #endregion

// #region settings-characters
// Characters, on the Account tab.
//
// An account can hold several EVE characters -- a main and a scout alt --
// and the one marked active drives the map. Adding and removing them lived
// only in the dropdown under the header portrait, which is not where anyone
// looks for account management. This lists them where Settings > Account
// is, with the same three actions the dropdown has, wired to the same code:
// add goes through SSO with login=esi; remove queues the id on
// tripwire.data.esiDelete for the next refresh, exactly as tracking.js does;
// set-active triggers the dropdown row's own click handler so the two views
// cannot disagree.

tripwire.settingsCharacters = (function() {
	function ownerID() {
		return options.character && options.character.id || null;
	}

	function render() {
		var $list = $("#dialog-options #characters");
		if (!$list.length) { return; }
		var chars = tripwire.esi && tripwire.esi.characters || {};
		var ids = Object.keys(chars);
		var active = String(options.tracking && options.tracking.active || "");
		$list.empty();

		if (!ids.length) {
			var owner = ownerID();
			$list.append(
				$('<div class="char-row is-owner"></div>')
					.append(owner ? $('<img class="char-portrait" alt="" />').attr("src", "https://images.evetech.net/characters/" + owner + "/portrait?size=128") : "")
					.append($('<div class="char-meta"></div>')
						.append($('<div class="char-name"></div>').text($("#user-no-track").text() || "Signed in"))
						.append($('<div class="char-note"></div>').text("No characters tracked yet. Add one to follow it on the map.")))
			);
			return;
		}

		ids.forEach(function(id) {
			var c = chars[id];
			var isActive = String(id) === active;
			var $row = $('<div class="char-row"></div>').attr("data-characterid", id).toggleClass("is-active", isActive);
			$row.append($('<img class="char-portrait" alt="" />').attr("src", "https://images.evetech.net/characters/" + id + "/portrait?size=128"));
			var $meta = $('<div class="char-meta"></div>')
				.append($('<div class="char-name"></div>').text(c.characterName || id))
				.append($('<div class="char-note"></div>').text(isActive ? "Active. The map follows this character." : "Tracked"));
			$row.append($meta);
			var $acts = $('<div class="char-actions"></div>');
			if (!isActive) {
				$('<button type="button" class="char-btn"></button>').text("Set active")
					.on("click", function() {
						// The dropdown row's own handler does the work.
						$("#tracking .tracking-clone[data-characterid='" + id + "']").trigger("click");
						render();
					}).appendTo($acts);
			} else {
				$('<span class="char-badge"></span>').text("Active").appendTo($acts);
			}
			$('<button type="button" class="char-btn is-destructive"></button>').text("Remove")
				.on("click", function() { remove(id); })
				.appendTo($acts);
			$row.append($acts);
			$list.append($row);
		});
	}

	function remove(id) {
		if (String(options.tracking.active) === String(id)) {
			options.tracking.active = null;
			tripwire.EVE(false, true);
			options.save();
			$("#removeESI").attr("disabled", "disabled");
		}
		if (typeof tracking !== "undefined" && tracking.remove) { tracking.remove(id); }
		// tracking.js tests `esi.delete` but pushes to `esiDelete`; the
		// refresh reads `esiDelete`. Guard the one that is read.
		if ($.isArray(tripwire.data.esiDelete)) { tripwire.data.esiDelete.push(id); } else { tripwire.data.esiDelete = [id]; }
		if (typeof set_tracking_text === "function") { set_tracking_text(); }
		$("#dialog-options #characters .char-row[data-characterid='" + id + "']").remove();
		if (!$("#dialog-options #characters .char-row").length) { render(); }
	}

	$(function() {
		$(document).on("click", "#addESI", function(e) {
			e.preventDefault();
			window.location.href = "login.php?mode=sso&login=esi";
		});
	});

	return {render: render, remove: remove};
})();
;
// #endregion

// #region settings-panels
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
;
// #endregion

// #region sig-align
// The signature table's header wears the same per-column alignment classes
// as its cells (Settings > Signatures), so the two line up whatever is set.
(function() {
	var COLS = ["sigID", "sigType", "sigAge", "leadsTo", "sigLife", "sigMass"];
	function apply() {
		var a = window.options && options.signatures && options.signatures.alignment;
		if (!a) { return; }
		$("#sigTable thead th").each(function(i) {
			$(this).removeClass("leftAlign centerAlign rightAlign").addClass(a[COLS[i]] || "leftAlign");
		});
	}
	$(function() {
		apply();
		$(document).on("dialogclose", ".ui-dialog", apply);
		$(document).on("tripwire:options", apply);
	});
	window.sigAlign = { apply: apply };
})();
;
// #endregion

// #region signature-filter
// Signature filter bar, after Aperture's SignatureModule.
//
// Single-choice group filters and live counts above the signature table.
// Everything is derived from data Tripwire already holds -- signature type,
// name, and the linked wormhole -- so this adds no schema and no requests.
//
// Additive: the table markup in addSignature.js is untouched. Rows are tagged
// after render and filtered by visibility, which survives the five-second
// refresh re-rendering them.

tripwire.sigFilter = (function() {
	var STORE = "tripwire:signatures:filter";

	// Order matches the probe scanner's own grouping.
	var GROUPS = [
		{key: "wormhole", label: "Wormhole"},
		{key: "combat",   label: "Combat"},
		{key: "relic",    label: "Relic"},
		{key: "data",     label: "Data"},
		{key: "gas",      label: "Gas"},
		{key: "ore",      label: "Ore"},
		{key: "other",    label: "Other"},
		{key: "unknown",  label: "Unknown"}
	];

	// Aperture's site-safety split: a combat site is somewhere you can be
	// shot by rats, an exploration site is not. A wormhole is neither.
	var ACTIVITY = {combat: "combat", relic: "explore", data: "explore", gas: "explore", ore: "explore"};

	var state = load();
	var $bar, $stats;

	function validGroup(key) {
		return key === "all" || GROUPS.some(function(group) { return group.key === key; });
	}

	function load() {
		try {
			var raw = JSON.parse(localStorage.getItem(STORE));
			if (raw && validGroup(raw.group)) {
				return {group: raw.group};
			}
			// Migrate the original multi-select state when it has one clear choice.
			if (raw && Array.isArray(raw.groups) && raw.groups.length === 1 && validGroup(raw.groups[0])) {
				return {group: raw.groups[0]};
			}
		} catch (e) { /* absent or corrupt -- fall through to defaults */ }
		return {group: "all"};
	}

	function save() {
		try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
	}

	function signatures() {
		return (tripwire.client && tripwire.client.signatures) || {};
	}

	function wormholeFor(sigId) {
		var holes = (tripwire.client && tripwire.client.wormholes) || {};
		for (var w in holes) {
			if (holes[w].initialID == sigId || holes[w].secondaryID == sigId) { return holes[w]; }
		}
		return null;
	}

	// "Scanned" means the row is actually useful: it has a group, and the thing
	// that identifies it. For a wormhole that is its type; for a cosmic site,
	// its name. Mirrors Aperture's definition.
	function isScanned(sig) {
		if (!sig || !sig.type || sig.type === "unknown") { return false; }
		if (sig.type === "wormhole") {
			var w = wormholeFor(sig.id);
			return !!(w && w.type && w.type !== "????");
		}
		return !!sig.name;
	}

	function visibleRows() {
		return $("#sigTable tbody tr[data-id]");
	}

	function apply() {
		var sigs = signatures();
		var total = 0, unscanned = 0, wormholes = 0;

		visibleRows().each(function() {
			var sig = sigs[$(this).data("id")];
			if (!sig) { return; }

			var group = sig.type || "unknown";
			var scanned = isScanned(sig);

			total++;
			if (!scanned) { unscanned++; }
			if (group === "wormhole") { wormholes++; }

			// Tag for styling (activity glyph, unscanned emphasis) regardless
			// of whether the row is filtered out.
			$(this).attr("data-group", group)
			       .attr("data-activity", ACTIVITY[group] || "")
			       .toggleClass("sig-unscanned", !scanned);

			$(this).toggleClass("sig-filtered", state.group !== "all" && state.group !== group);
		});

		if ($stats) {
			var parts = [total + (total === 1 ? " signature" : " signatures")];
			if (unscanned) { parts.push(unscanned + " unscanned"); }
			if (wormholes) { parts.push(wormholes + (wormholes === 1 ? " wormhole" : " wormholes")); }
			$stats.text(parts.join(" · "));
		}

		if ($bar) {
			$bar.find("[data-group-chip]").each(function() {
				var selected = state.group === $(this).attr("data-group-chip");
				$(this).toggleClass("on", selected).attr("aria-pressed", selected ? "true" : "false");
			});
		}
	}

	function selectGroup(key) {
		state.group = validGroup(key) ? key : "all";
		save(); apply();
	}

	function build() {
		var $wrapper = $("#sigTableWrapper");
		if (!$wrapper.length || $("#sigFilterBar").length) { return; }

		$bar = $('<div id="sigFilterBar" class="sig-filter"></div>');

		var $chips = $('<div class="sig-filter-groups"></div>').appendTo($bar);
		GROUPS.forEach(function(g) {
			$('<button type="button" class="sig-chip"></button>')
				.attr("data-group-chip", g.key)
				.text(g.label)
				.on("click", function() { selectGroup(g.key); })
				.appendTo($chips);
		});

		$('<button type="button" class="sig-chip"></button>')
			.attr("data-group-chip", "all")
			.attr("title", "Show all signature types")
			.text("All")
			.on("click", function() { selectGroup("all"); })
			.appendTo($chips);

		$stats = $('<span class="sig-stats"></span>').appendTo($bar);

		$wrapper.before($bar);
	}

	$(function() {
		build();
		apply();

		// The table is re-rendered by the refresh cycle; re-tag when it changes.
		var target = document.getElementById("sigTable");
		if (target && window.MutationObserver) {
			var pending = null;
			new MutationObserver(function() {
				clearTimeout(pending);
				pending = setTimeout(apply, 60);
			}).observe(target, {childList: true, subtree: true});
		}
	});

	return {apply: apply, state: function() { return state; }};
})();
;
// #endregion

// #region signature-toolbar
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
;
// #endregion

// #region system-compact
// The System panel, two rows shorter.
//
// The graph's range links (Week / 48h / 24h) were a row of their own under
// the legend, and the external links another row under that. The ranges are
// a control, so they move into the panel's header bar; the external links
// share the legend's row, right-aligned. In wormhole space the chart row is
// hidden, so the links move beside the killmail counts. Nodes are moved, not rebuilt,
// so their inline handlers and systemChange's href filling keep working.
function placeSystemLinks() {
	var $links = $("#infoLinks");
	if (!$links.length) return;
	if ($("#infoWidget").hasClass("is-wormhole")) {
		$links.prependTo("#killIntel .kill-intel-heading").removeClass("in-legend-row");
	} else {
		$links.appendTo("#activityGraphControls").addClass("in-legend-row");
	}
}

(function() {
	$(function() {
		var $ranges = $("#activityGraphControls > a");
		if ($ranges.length) {
			var $wrap = $('<span id="sys-range" class="sys-range-hdr" role="group" aria-label="Activity range"></span>');
			$ranges.appendTo($wrap);
			$("#infoWidget > .controls .bar-right").prepend($wrap);
			// Nothing marked the current range before; the graph starts at 24h.
			var current = (window.activity && activity.span) || 24;
			$wrap.find("a").each(function() {
				var m = /activity\.time\((\d+)\)/.exec($(this).attr("href") || "");
				$(this).attr("data-span", m ? m[1] : "").toggleClass("active", !!m && +m[1] === current);
			}).on("click", function() {
				$wrap.find("a").removeClass("active");
				$(this).addClass("active");
			});
		}
		placeSystemLinks();
	});
})();
;
// #endregion

// #region system-fit
// The System panel fits, by default.
//
// The top row was a fixed 46vh and the graph a fixed 170px, so on anything
// under 1080px tall the panel scrolled: at 1440x900 it had 370px and needed
// 479; at 1280x800, 324 against 504. The reference (Tripwire as shipped)
// shows name, graph, ranges, links and gates with no scrollbar, and this
// fork keeps that.
//
// Two dials, in this order. The graph gives up height first, down to a
// floor where it still reads. If the rest of the panel plus that floor is
// still taller than the row, the row grows to take it (capped, so the chain
// keeps a real share), and the chain takes what is left -- the trade the
// layout notes already chose: a map that pans beats a panel you scroll.
var systemFit = new function() {
	var MIN = 96, MAX = 170, ROW = 0.40, ROW_CAP = 0.64;
	var appliedRow = null, self = this;

	// The row only ever grows, and remembers. Switching between a k-space
	// system (gates, blue loot, legend) and a J-space one (statics, often no
	// activity) changed what the panel needed by ~50px, and a row that
	// followed it made all four panels jump on every system change. Now the
	// row is the largest any visited system has needed at this window height,
	// kept in localStorage, so after the first visit it does not move.
	function rowKey() { return "tripwire.toprow." + window.innerHeight; }
	function storedRow() { try { return parseFloat(localStorage.getItem(rowKey())) || null; } catch (e) { return null; } }
	function storeRow(px) { try { localStorage.setItem(rowKey(), String(Math.round(px))); } catch (e) {} }

	function panel() { return document.querySelector("#infoWidget > .content.sys-panel"); }
	function px(v) { return parseFloat(v) || 0; }

	// Everything in the panel except the chart itself: siblings, margins,
	// flex gap, padding, and the graph's own margins.
	function others(p) {
		var cs = getComputedStyle(p);
		var total = px(cs.paddingTop) + px(cs.paddingBottom);
		var gap = px(cs.rowGap), visible = 0;
		Array.prototype.forEach.call(p.children, function(k) {
			var ks = getComputedStyle(k);
			if (ks.display === "none") return;
			visible++;
			total += px(ks.marginTop) + px(ks.marginBottom);
			if (k.id !== "activityGraph") total += k.getBoundingClientRect().height;
		});
		return total + gap * Math.max(0, visible - 1);
	}
	// The chart's container is a few px taller than the chart it holds.
	function overhead() {
		var g = document.getElementById("activityGraph");
		var box = g ? g.getBoundingClientRect().height : 0;
		var drawn = activity && activity.options && activity.options.height;
		return (box > 0 && drawn && box >= drawn) ? box - drawn : 8;
	}

	// Grow the top row if the panel cannot hold the graph at its floor.
	function fitRow(p, need) {
		var grid = document.querySelector(".gridster > ul");
		if (!grid || window.innerWidth < 960) return;
		// A manually dragged splitter is authoritative. Do not make the row jump
		// back to the automatic System-panel fit on the next render.
		if (options.panels && parseFloat(options.panels.rowRatio)) return;
		var widget = document.getElementById("infoWidget");
		var chrome = widget.getBoundingClientRect().height - p.clientHeight;
		var wanted = need + chrome;
		var row = Math.max(ROW * window.innerHeight, Math.min(wanted, ROW_CAP * window.innerHeight));
		row = Math.max(row, appliedRow || 0, storedRow() || 0);
		if (appliedRow !== null && Math.abs(row - appliedRow) < 1) return;
		appliedRow = row;
		storeRow(row);
		grid.style.setProperty("--top-row", Math.round(row) + "px");
	}

	// The chart height that fits the panel now. Sets the row as a side effect.
	this.graphHeight = function() {
		var p = panel();
		if (!p) return MAX;
		var rest = others(p), over = overhead();
		fitRow(p, rest + MIN + over);
		var avail = p.clientHeight - rest - over;
		return Math.round(Math.max(MIN, Math.min(MAX, avail)));
	};

	this.run = function() {
		var p = panel(), g = document.getElementById("activityGraph");
		if (!p || !g || !activity || !activity.view || !activity.graph) return;
		if (g.classList.contains("is-empty") || g.classList.contains("is-sparse")) {
			fitRow(p, others(p) + g.getBoundingClientRect().height);
			return;
		}
		var h = self.graphHeight();
		if (h !== activity.options.height) {
			activity.options.height = h;
			activity.redraw();
		}
	};

	var pending = null;
	function schedule() {
		if (pending) return;
		pending = requestAnimationFrame(function() { pending = null; self.run(); });
	}

	$(function() {
		// Apply the remembered row before anything is measured.
		var grid = document.querySelector(".gridster > ul"), remembered = storedRow();
		if (grid && remembered && window.innerWidth >= 960) {
			appliedRow = remembered;
			grid.style.setProperty("--top-row", Math.round(remembered) + "px");
		}
		var p = panel();
		if (!p || !window.ResizeObserver) return;
		var ro = new ResizeObserver(schedule);
		ro.observe(p);
		Array.prototype.forEach.call(p.children, function(k) { ro.observe(k); });
		$(window).on("resize", schedule);
	});
};
;
// #endregion

// #region theme-toggle
// The room lights. Sun and moon on the letterhead: the
// button shows the light you would switch to. A stored choice wins over the
// OS; with no choice the page follows the OS and the button still works.
var themeToggle = new function() {
	var KEY = "tripwire.theme", self = this;
	var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

	this.effective = function() {
		var set = document.documentElement.getAttribute("data-theme");
		if (set === "dark" || set === "light") return set;
		return (media && media.matches) ? "dark" : "light";
	};

	this.apply = function(theme) {
		document.documentElement.setAttribute("data-theme", theme);
		try { localStorage.setItem(KEY, theme); } catch (e) {}
		self.paint();
		$(document).trigger("tripwire:theme", theme);
		if (window.activity && activity.retheme) activity.retheme();
	};

	this.paint = function() {
		var dark = self.effective() === "dark";
		var label = dark ? "Switch to light" : "Switch to dark";
		$("#theme-toggle").text(dark ? "☀" : "☾").attr({title: label, "aria-label": label});
	};

	$(function() {
		self.paint();
		$("#theme-toggle").on("click", function() { self.apply(self.effective() === "dark" ? "light" : "dark"); });
		if (media && media.addEventListener) media.addEventListener("change", self.paint);
	});
};
;
// #endregion

// #region tracking
const tracking = {
	remove: function(characterID) {
		$("#tracking .tracking-clone[data-characterid='"+ characterID +"']").remove();		
	},
	add: function(character) {
		var $clone = $("#tracking-clone").clone();
		$clone.attr("data-characterid", character.characterID);
		$clone.find(".avatar img").addClass("avatar").attr("src", "https://images.evetech.net/characters/"+ character.characterID +"/portrait?size=64");
		$clone.find(".name").html(character.characterName);
		$clone.removeAttr("id");
		$clone.removeClass("hidden");
		$clone.addClass("tracking-clone");

		$("#tracking").append($clone);
		Tooltips.attach($clone.find(".avatar [data-tooltip]"));
		
		const charOptions = options.tracking.characterOptions[character.characterID] || tracking.defaultCharacterOptions;
		if(charOptions.show) { $clone.find('.show').addClass('active'); }
		if(charOptions.showShip) { $clone.find('.show-ship').addClass('active'); }
		
		return $clone;
	},
	update: function(character) {
		var $row = $("#tracking .tracking-clone[data-characterid='"+ character.characterID +"']");
		var system = character.systemID ? systemAnalysis.analyse(character.systemID) : null;
		$row.find(".system").html(system ? systemRendering.renderSystem(system) : "&nbsp;");
		$row.find(".station").text(character.stationName || "");
		$row.find(".shipname").text(character.shipName || "");
		$row.find(".ship").text(character.shipTypeName || "");
		$row.find(".online")
			.toggleClass("stable", character.online == true)
			.toggleClass("critical", character.online != true);
	},
	defaultCharacterOptions: { show: true, showShip: true }
	
};

$("#track").on("click", ".tracking-clone", function() {
	var characterID =$(this).attr("data-characterid");
	$("#tracking .tracking-clone").removeClass("active");

	if (options.tracking.active == characterID) {
		options.tracking.active = null;
		tripwire.EVE(false, true);
		$("#removeESI").attr("disabled", "disabled");
	} else {
		options.tracking.active = characterID;

		if (tripwire.esi.characters[options.tracking.active]) {
			$("#tracking .tracking-clone[data-characterid='"+ options.tracking.active +"']").addClass("active");
			var activeCharacter = tripwire.esi.characters[options.tracking.active];
			tripwire.EVE(activeCharacter, true);
		}

		$("#removeESI").removeAttr("disabled");
	}
	set_tracking_text();
	options.save();
});

$("#track").on("click", ".tracking-clone i.interactable", function(e) {
	const elem = e.target;
	const container = $(elem).closest('.tracking-clone')[0];
	const characterID = container.dataset.characterid;
	const wasActive = $(elem).hasClass('active');
	if(wasActive) {
		$(elem).removeClass('active');
	} else {
		$(elem).addClass('active');
	}
	e.stopPropagation();
	
	if(!options.tracking.characterOptions[characterID]) { options.tracking.characterOptions[characterID] = tracking.defaultCharacterOptions; }
	
	options.tracking.characterOptions[characterID][elem.dataset.property] = !wasActive;
	tripwire.esi.updateTracking(tripwire.esi.characters[characterID]);
});

$("#login").on("click", "#removeESI", function() {
	var characterID = options.tracking.active;

	options.tracking.active = null;
	tripwire.EVE(false, true);
	options.save();

	$("#tracking .tracking-clone[data-characterid='"+ characterID +"']").remove();

	$("#removeESI").attr("disabled", "disabled");

	if ($.isArray(tripwire.data.esi.delete)) {
		tripwire.data.esiDelete.push(characterID);
	} else {
		tripwire.data.esiDelete = [characterID];
	}
});


/** Set UI text based on the current tracked character */
function set_tracking_text() {
	var character = tripwire.esi.characters[options.tracking.active];
	var characterID = character ? character.characterID : options.character.id;
	document.getElementById('user-avatar').src = 'https://images.evetech.net/characters/' + characterID + '/portrait?size=128';

	if(character) {
		document.getElementById('user-track-name').textContent = character.characterName;
		document.getElementById('user-track').style.display = '';
		document.getElementById('user-no-track').style.display = 'none';
	} else {
		document.getElementById('user-track').style.display = 'none';
		document.getElementById('user-no-track').style.display = '';	
	}
}
;
// #endregion

// #region visibility-refresh
// Refresh the moment a hidden tab is looked at again.
//
// sync.js drops to a one-minute cadence while the tab is hidden. That is only
// acceptable if returning is instant, so this cancels the pending long timer
// and refreshes straight away on becoming visible.

(function() {
	$(function() {
		document.addEventListener("visibilitychange", function() {
			if (document.hidden || typeof tripwire === "undefined" || !tripwire.refresh) { return; }
			if (tripwire.timer) { clearTimeout(tripwire.timer); tripwire.timer = null; }
			tripwire.refresh();
		});
	});
})();
;
// #endregion

// #region wormholeAnalysis
const wormholeAnalysis = new function() {
	/** Finds the ID for a target system or system type for the given system name text and wormhole type.
	@param systemText The name of a system, or a system class from appData.genericSystemTypes, e.g. 'Low-Sec'
	@param wormholeType The type text of a wormhole e.g. 'U210'
	@return An ID - either a systemID (31001031), a system type ID (7) or null if there isn't enough information */
	this.targetSystemID = function(systemText, wormholeType) {
		const lookupText = systemText || (appData.wormholes[(wormholeType + '').toUpperCase()] || {}).leadsTo;
		if(!lookupText) { return null; }
		if (Object.index(appData.systems, "name", lookupText, true)) {
			// Leads To is a normal EVE system, so use the sytem ID
			return Object.index(appData.systems, "name", lookupText, true)
		} else if (wormholeType && appData.wormholes[wormholeType.toUpperCase()]) {
			// Leads To can be determined by the wormhole type, so lets use what we know it leads to
			if (appData.genericSystemTypes.findIndex((item) => lookupText.replace(' ', '-').toLowerCase() === item.toLowerCase()) > -1) {
				return appData.genericSystemTypes.findIndex((item) => lookupText.replace(' ', '-').toLowerCase() === item.toLowerCase());
			}
		} else if (appData.genericSystemTypes.findIndex((item) => lookupText.toLowerCase() === item.toLowerCase()) !== -1) {
			// Leads To is one of the valid types we allow, so use of of those indexes as reference
			return appData.genericSystemTypes.findIndex((item) => systemText.toLowerCase() === item.toLowerCase());
		} else { return null; }
	};
	
	/** Get all the eligible wormhole types for this connection.
	If both systems are known (e.g. C3 to C2) then only wormhole types matching that specific connection will be returned. If either side is unknown then all connections to/from the known side are listed, which will be quite large. If both are unknown then return null (as it could be any wormhole).
	@param sourceID The system ID, type ID (into genericSystemType) or chain format string (e.g. 2|1232) for the source system
	@param targetID As above for the target system
	@param dataSource A source set of wormhole types to evaluate (defaults to appData.wormholes)
	@return An object of the form { from: [...], to: [...] } where each list is the wormhole types (from appData.wormholes) eligible for that direction */
	this.eligibleWormholeTypes = function(sourceDef, targetDef, dataSource) {
		const coerce = function(def) { return def === undefined || def === null || def.genericSystemType ? def : systemAnalysis.analyse(def); };
		const source = coerce(sourceDef), target = coerce(targetDef);
		
		if(!source && !target) { return null; }
		
		const from = [], to = [];
		const systemTypeMatch = function(possibleSystems, genericTypes) {
			return genericTypes.some(genericType => possibleSystems.indexOf(genericType) >= 0 ||
				(genericType.indexOf('/') >= 0 && _.some(genericType.substring('Class-'.length).split('/'), x => possibleSystems.indexOf('Class-' + x) >= 0))
			);
		};
		const matches = function(possibleSystems, exclusions, system) {
			if(typeof possibleSystems === 'string') { possibleSystems = [possibleSystems]; }
			return (!system) || (
				((!possibleSystems) || (possibleSystems.indexOf(system.name) >= 0 || systemTypeMatch(possibleSystems, system.genericSystemType))) && 
				((!exclusions) || exclusions.indexOf(system.genericSystemType) < 0)	// no exclusion
			);
		}
		Object.entries(dataSource || appData.wormholes).forEach(function(e) {
			const wt = e[1], key = e[0];
			if(matches(wt.from, wt.notFrom, source) && matches(wt.leadsTo, wt.notLeadsTo, target)) { from.push(objAndKey(wt, key)); }
			if(matches(wt.from, wt.notFrom, target) && matches(wt.leadsTo, wt.notLeadsTo, source)) { to.push(objAndKey(wt, key)); }
		});
		return { from: from, to: to };
	}
	
	function objAndKey(o, k) { return o && Object.assign({key: k}, o); }
	
	/** Placeholder wormholes which don't have an exact known type, but still provide some information */
	this.dummyWormholes = {
		"GATE": { from: [ "Null-Sec", "Low-Sec", "High-Sec", "Triglavian"], leadsTo: [ "Null-Sec", "Low-Sec", "High-Sec", "Triglavian"] },
		"SML": { "key": "SML", "jump": 5000000, "dummy": true },
		"MED": { "key": "MED", "jump": 62000000, "mass": 500000000, "dummy": true },
		"LRG": { "key": "LRG", "jump": 375000000, "mass": 2000000000, "dummy": true },
		"XLG": { "key": "XLG", "jump": 2000000000, "mass": 3300000000, "dummy": true },
	};
	
	/** Get the wormhole type object from the type names for a sig pair. One of the types is probably K162 */
	this.wormholeFromTypePair = function(type1, type2) {
		return appData.wormholes[type1] || appData.wormholes[type2] ||
			this.dummyWormholes[type1] || this.dummyWormholes[type2] ||
			undefined;	// we don't know anything
	}
	
	this.likelyWormhole = function(system1, system2) {
		const class1 = systemAnalysis.analyse(system1).genericSystemType,
			class2 = systemAnalysis.analyse(system2).genericSystemType;
		
		function isHighClass(classes) { return classes && classes.some(c => ['Class-5', 'Class-6' ].indexOf(c) >= 0); }
		function isKSpace(classes) { return classes && classes.toString().indexOf('-Sec') >= 0; }
		function inferKSpace(genericTypes) {
			return isHighClass(genericTypes) ? 'XLG' :
			genericTypes == 'Class-1' ? 'MED' :
			'LRG';
		}
		
		return this.dummyWormholes[
			isKSpace(class1) ? inferKSpace(class2) : isKSpace(class2) ? inferKSpace(class1) :
			String(class1 + '/' + class2).indexOf('-13') >= 0 ? 'SML' :
			class1 == 'Class-1' || class2 == 'Class-1' ? 'MED' :
			isHighClass(class1) && isHighClass(class2) ? 'XLG' :
			'LRG'
		];
	}
}
;
// #endregion

// #region dialogs/admin-dialog
$("#admin").click(function(e) {
	e.preventDefault();

	if ($(this).hasClass("disabled")) {
		return false;
	}

	if (!$("#dialog-admin").hasClass("ui-dialog-content")) {
		var refreshTimer = null;
		var $total = null;
		var $ajax = null;

		function refreshWindow() {
			if ($ajax) $ajax.abort();
			$total.text("Total: " + $("#dialog-admin .window .hasFocus table tr[data-id]").length);

			$ajax = $.ajax({
				url: "admin.php",
				type: "POST",
				data: {mode: $("#dialog-admin .menu .active").attr("data-window")},
				dataType: "JSON"
			}).done(function(data) {
				if (data && data.results) {
					var rows = data.results;
					var ids = [];

					for (var i = 0, l = rows.length; i < l; i++) {
						var $row = $("#dialog-admin .window .hasFocus tbody tr[data-id='"+ rows[i].id +"']");
						ids.push(rows[i].id.toString()); // we do a string compare lower down

						if ($row.length) {
							for (col in rows[i]) {
								var $col = $row.find("[data-col='"+col+"']");
								$col.html(($col.attr("data-format") == "number" ? Intl.NumberFormat().format(rows[i][col]) : rows[i][col]) || "&nbsp;");
							}
						} else {
							$row = $("#dialog-admin .window .hasFocus table tr.hidden").clone();
							$row.attr("data-id", rows[i].id);

							for (col in rows[i]) {
								var $col = $row.find("[data-col='"+col+"']");
								$col.html(($col.attr("data-format") == "number" ? Intl.NumberFormat().format(rows[i][col]) : rows[i][col]) || "&nbsp;");
							}

							$row.removeClass("hidden");

							$("#dialog-admin .window .hasFocus tbody").append($row);
						}
					}

					$("#dialog-admin .window .hasFocus table tr[data-id]").each(function() {
						if ($.inArray($(this).data("id").toString(), ids) == -1) {
							$(this).remove();
						}
					});

					$("#dialog-admin .window .hasFocus table").trigger("update", [true]);
				} else {
					$("#dialog-admin .window .hasFocus table tr[data-id]").remove();
				}

				$total.text("Total: " + $("#dialog-admin .window .hasFocus table tr[data-id]").length);
			});

			if ($("#dialog-admin").dialog("isOpen") && $("#dialog-admin .menu .active").attr("data-refresh")) {
				refreshTimer = setTimeout(refreshWindow, $("#dialog-admin .menu .active").attr("data-refresh"));
			}
		}

		$("#dialog-admin").dialog({
			autoOpen: true,
			modal: true,
			height: 350,
			width: 800,
			buttons: {
				Close: function() {
					$(this).dialog("close");
				}
			},
			create: function() {
				// menu toggle
				$("#dialog-admin").on("click", ".menu li", function(e) {
					e.preventDefault();
					$menuItem = $(this);
					clearTimeout(refreshTimer);

					$("#dialog-admin .menu .active").removeClass("active");
					$menuItem.addClass("active");
					$("div.ui-dialog[aria-describedby='dialog-admin'] .ui-dialog-traypane").text("");

					$("#dialog-admin .window [data-window]").removeClass("hasFocus").hide();
					$("#dialog-admin .window [data-window='"+ $menuItem.data("window") +"']").addClass("hasFocus").show();

					refreshWindow();
				});

				$("#dialog-admin [data-sortable='true']").tablesorter({
					sortReset: true,
					widgets: ['saveSort'],
					sortList: [[0,0]]
				});

				// dialog bottom tray
				$($(this)[0].parentElement).find(".ui-dialog-buttonpane").append("<div class='ui-dialog-traypane'></div>");
				$total = $("div.ui-dialog[aria-describedby='dialog-admin'] .ui-dialog-traypane");
			},
			open: function() {
				$menuItem = $("#dialog-admin .menu li.active");
				refreshWindow();
			},
			close: function() {
				clearTimeout(refreshTimer);
			}
		});
	} else if (!$("#dialog-admin").dialog("isOpen")) {
		$("#dialog-admin").dialog("open");
	}
});
;
// #endregion

// #region dialogs/base-dialog
// Dialog effects
$("#wrapper").addClass("transition");

$(document).on("dialogopen", ".ui-dialog", function (event, ui) {
	// Add additional full screen overlay for 2nd level dialog
	if ($(".ui-dialog:visible").length == 2 && $(this).hasClass("dialog-modal"))
		$("body").append($("<div id='overlay' class='overlay' />").css("z-index", $(this).css("z-index") - 1));
	else if ($("#overlay"))
		$("#overlay").css("z-index", $(this).css("z-index") - 1);

	if (!$(this).hasClass("dialog-noeffect"))
		$("#wrapper").addClass("blur");
});

$(document).on("dialogclose", ".ui-dialog", function (event, ui) {
	if (!$(".ui-dialog").is(":visible"))
		$("#wrapper").removeClass("blur");

	if ($(".ui-dialog:visible").length == 1)
		$("#overlay").remove();
	else if ($("#overlay"))
		$("#overlay").css("z-index", $(this).css("z-index") - 2);

	//if ($(".ui-dialog:visible").length == 0 && options.buttons.follow && viewingSystemID != tripwire.client.EVE.systemID)
	//	window.location = "?system="+tripwire.client.EVE.systemName;
});
;
// #endregion

// #region dialogs/mask-dialog
const maskFunctions = {
		getMasks: function() {
			// Get masks
			$.ajax({
				url: "masks.php",
				type: "POST",
				dataType: "JSON"
			}).done(function(response) {
				if (response && response.masks) {
					tripwire.masks = response.masks;
					maskRendering.update(tripwire.masks);
					$("#dialog-masks #masks #default").text("");
					$("#dialog-masks #masks #owned").text("");
					$("#dialog-masks #masks #invited").text("");
					
					const iconBar = mask => 
						'<span class="icon_bar">' +
						(mask.optional ? '<a href="#" class="icon ' + (mask.joined ? 'closeIcon' : 'joinIcon') + '" data-tooltip="' + (mask.joined ? 'Remove from quick switch' : 'Add to quick switch') + '">' +
							(mask.joined ? '×' : '+') + '</a>' : '')
						+ '</span>';


					for (var x in response.masks) {
						var mask = response.masks[x];
						var node = $(''
							+ '<input type="radio" name="mask" id="mask'+x+'" value="'+mask.mask+'" class="selector" data-owner="'+mask.owner+'" data-admin="'+mask.admin+'" />'
							+ '<label for="mask'+x+'"><img src="'+mask.img+'" />'
							+ iconBar(mask)
							+ '<span class="source_bar ' + mask.joinedBy+'">&nbsp;</span>'
							+ '<span class="selector_label">'+maskRendering.renderMask(mask)
								+ ((mask.joined || mask.owner) ? ' <i data-icon="star" data-tooltip="On quick switch"></i>' : '')
							+ '</span></label>');

						$("#dialog-masks #masks #"+mask.type).append(node);
					}

					var node = $(''
						+ '<input type="checkbox" name="create" id="create-mask" class="selector" />'
						+ '<label for="create-mask"><i data-icon="plus" style="font-size: 3em; margin-left: 16px; margin-top: 16px; display: block;"></i>'
						+ '<span class="source_bar personal">&nbsp;</span>'
						+ '<span class="selector_label">Create</span></label>');
					
					node.click(function(e) {
						e.preventDefault();
						$("#dialog-createMask").dialog("open");
					});
					$("#dialog-masks #masks #owned").append(node);
					
					const activeMask = response.masks.find(x => x.active);
					$("#dialog-masks input[name='mask']").filter("[value='"+activeMask.mask+"']").attr("checked", true).trigger("change");

					// toggle mask admin icon
					document.getElementById('admin').style.display = activeMask.admin ? '' : 'none';
					
					// fix tooltips for new elements
					Tooltips.attach($("#dialog-masks").find("[data-tooltip]"));
				}
			});
		}, 
		updateActiveMask: function(newActive, afterFunction) {
				var maskChange = false;
				if (options.masks.active != newActive) {
					maskChange = true;
					options.masks.active = newActive;
					maskRendering.update(tripwire.masks, newActive);
				}

				options.save() // Performs AJAX
					.done(function() {
						if (maskChange) {
							// Reset signatures
							$("#sigTable span[data-age]").countdown("destroy");
							$("#sigTable tbody").empty()
							$("#signature-count").text(0);
							tripwire.signatures.list = {};
							tripwire.client.signatures = [];

							tripwire.refresh('change');
						}
						if(afterFunction) { afterFunction(); }
					});		
		},
};

$("#dialog-masks").dialog({
	autoOpen: false,
	width: 450,
	minHeight: 400,
	modal: true,
	buttons: {
		Save: function() {
			maskFunctions.updateActiveMask($("#dialog-masks input[name='mask']:checked").val(), () => {
				// toggle mask admin icon
				document.getElementById('admin').disabled = !$("#dialog-masks input[name='mask']:checked").data("admin");			
				$(this).dialog("close");
			});
		},
		Close: function() {
			$(this).dialog("close");
		}		
	}, 

		open: function() { maskFunctions.getMasks(); }
	
});

$("#mask-menu-link").click(function(e) {
	e.preventDefault();
	const elem = document.getElementById('mask-menu');
	elem.style.display = elem.style.display == 'none' ? '' : 'none';
});

$("#mask-link").click(function(e) {
	e.preventDefault();

	if ($(this).hasClass("disabled"))
		return false;
	
	$("#dialog-masks").dialog('open');
 });
 
// Mask selections
$("#masks").on("change", "input.selector:checked", function() {
	if ($(this).data("owner")) {
		$("#maskControls #edit").removeAttr("disabled");
		$("#maskControls #delete").removeAttr("disabled");
	} else {
		$("#maskControls #edit").attr("disabled", "disabled");
		$("#maskControls #delete").attr("disabled", "disabled");
	}

	if ($(this).val() != 0.0 && $(this).val().split(".")[1] == 0) {
		$("#dialog-masks #leave").removeAttr("disabled");
	} else {
		$("#dialog-masks #leave").attr("disabled", "disabled");
	}
});

const joinMask = maskID => {
	const completeFunction = () => {
						$.ajax({
							url: "masks.php",
							type: "POST",
							data: {mask: maskID, mode: "join"},
							dataType: "JSON"
						}).done(function(response) {
							if (response && response.result) {
								maskFunctions.getMasks();
								$("#dialog-joinMask").dialog("close");
							}
						});	
	};
	
	const mask = tripwire.masks.find(m => m.mask === maskID);
	if(!mask) { throw 'unknown mask ' + maskID; }
	
	if(mask.joinedBy === 'corporate') {
				$("#dialog-confirm #msg").text("This will add the mask '" + mask.label + " to the quick switch list for your whole corporation. Is that what you want?");
				$("#dialog-confirm").dialog("option", {
					buttons: {
						Confirm: function() {
							completeFunction();
							$(this).dialog("close");
						},
						Cancel: function() {
							$(this).dialog("close");
						}
					}
				}).dialog("open");		
	} else { completeFunction(); }
};

			// Mask join
			$("#dialog-masks #masks").on("click", ".joinIcon", function() {
				var maskElem = $(this).closest("input.selector+label").prev();
				joinMask(maskElem.val());
			});

			// Mask leave
			$("#dialog-masks #masks").on("click", ".closeIcon", function() {
				var maskElem = $(this).closest("input.selector+label").prev();
				const mask = tripwire.masks.find(m => m.mask === maskElem.val());
				if(!mask) { throw 'unexpected mask ' + maskElem.val(); }
				
				const completeFunction = () => {
							var send = {mode: "leave", mask: maskElem.val()};
							$.ajax({
								url: "masks.php",
								type: "POST",
								data: send,
								dataType: "JSON"
							}).done(function(response) {
								if (response && response.result) {
									maskFunctions.getMasks();

									$("#dialog-confirm").dialog("close");
								} else {
									$("#dialog-confirm").dialog("close");

									$("#dialog-error #msg").text("Unable to delete");
									$("#dialog-error").dialog("open");
								}
							});			
				};
				if(mask.joinedBy === 'corporate') {
					$("#dialog-confirm #msg").text("This will remove the mask '" + mask.label + " from the quick switch list for your whole corporation. Is that what you want?");
					$("#dialog-confirm").dialog("option", {
						buttons: {
							Confirm: function() {
								completeFunction();
								$(this).dialog("close");
							},
							Cancel: function() {
								$(this).dialog("close");
							}
						}
					}).dialog("open");							
				} else { completeFunction(); }
				
			});

			// Mask delete
			$("#maskControls #delete").click(function() {
				var mask = $("#masks input.selector:checked");
				$("#dialog-confirm #msg").text("Are you sure you want to delete this mask?");
				$("#dialog-confirm").dialog("option", {
					buttons: {
						Delete: function() {
							var send = {mode: "delete", mask: mask.val()};

							$.ajax({
								url: "masks.php",
								type: "POST",
								data: send,
								dataType: "JSON"
							}).done(function(response) {
								if (response && response.result) {
									maskFunctions.getMasks();
									$("#dialog-confirm").dialog("close");
								} else {
									$("#dialog-confirm").dialog("close");

									$("#dialog-error #msg").text("Unable to delete");
									$("#dialog-error").dialog("open");
								}
							});
						},
						Cancel: function() {
							$(this).dialog("close");
						}
					}
				}).dialog("open");
			});

			// User Create mask
			$("#dialog-createMask").dialog({
				autoOpen: false,
				dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
				buttons: {
					Create: function() {
						$("#dialog-createMask form").submit();
					},
					Cancel: function() {
						$(this).dialog("close");
					}
				},
				create: function() {
					$("#dialog-createMask #accessList").on("click", "#create_add+label", function() {
						$("#dialog-EVEsearch").dialog("open");
					});

					$("#dialog-createMask form").submit(function(e) {
						e.preventDefault();

						$.ajax({
							url: "masks.php",
							type: "POST",
							data: $(this).serialize(),
							dataType: "JSON"
						}).done(function(response) {
							if (response && response.result) {
								maskFunctions.getMasks();

								$("#dialog-createMask").dialog("close");
							} else if (response && response.error) {
								$("#dialog-error #msg").text(response.error);
								$("#dialog-error").dialog("open");
							} else {
								$("#dialog-error #msg").text("Unknown error");
								$("#dialog-error").dialog("open");
							}
						});
					});

					$("#dialog-createMask select").selectmenu({width: 100});
				},
				open: function() {
					$("#dialog-createMask input[name='name']").val("");
					$("#dialog-createMask #accessList :not(.static)").remove();
				}
			});

			$("#dialog-createMask #accessList").on("click", ".maskRemove", function() {
				$(this).closest("input.selector+label").prev().remove();
				$(this).closest("label").remove();
			});
			
			function makeAccessListNode(item, prefix, name) {
				const extraAttributes = prefix == 'edit' ? 'checked="checked" onclick="return false"' : '';
				const buttons = prefix == 'edit' ? '<input type="button" class="maskRemove" value="Remove" style="position: absolute; bottom: 3px; right: 3px;" />' : '';
				if (item.category == "character") {
					return $(''
						+ '<div class="maskNode"><input type="checkbox" ' + extraAttributes + ' name="' + name + '" id="' + prefix + '_'+item.id+'_1373" value="'+item.id+'_1373" class="selector" />'
						+ '<label for="' + prefix + '_'+item.id+'_1373">'
						+ '	<img class="avatar" alt="" src="https://images.evetech.net/characters/'+item.id+'/portrait?size=64" />'
						+ '	<span class="selector_label">Character</span>'
						+ '	<div class="info">'
						+ '		'+item.name + '<br/>'
						+ '		'+item.corporation.name+'<br/>'
						+ '		'+(item.alliance ? item.alliance.name : '')+'<br/>'
						+ buttons
						+ '	</div>'
						+ '</label></div>');

				} else if (item.category == "corporation") {
					return $(''
						+ '<div class="maskNode"><input type="checkbox" ' + extraAttributes + ' name="' + name + '" id="' + prefix + '_'+item.id+'_2" value="'+item.id+'_2" class="selector" />'
						+ '<label for="' + prefix + '_'+item.id+'_2">'
						+ '	<img class="logo" alt="" src="https://images.evetech.net/corporations/'+item.id+'/logo?size=64" />'
						+ '	<span class="selector_label">Corporation</span>'
						+ '	<div class="info">'
						+ '		'+item.name+'<br/>'
						+ '		'+(item.alliance ? item.alliance.name : '')+'<br/>'
						+ buttons
						+ '	</div>'
						+ '</label></div>');

				} else if (item.category == "alliance") {
					return $(''
						+ '<div class="maskNode"><input type="checkbox" ' + extraAttributes + ' name="' + name + '" id="' + prefix + '_'+item.id+'_3" value="'+item.id+'_3" class="selector" />'
						+ '<label for="' + prefix + '_'+item.id+'_3">'
						+ '	<img class="logo" alt="" src="https://images.evetech.net/alliances/'+item.id+'/logo?size=64" />'
						+ '	<span class="selector_label">Alliance</span>'
						+ '	<div class="info">'
						+ '		'+item.name+'<br/>'
						+ buttons
						+ '	</div>'
						+ '</label></div>');
				}				
			}

			$("#dialog-editMask").dialog({
				autoOpen: false,
				dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
				buttons: {
					Save: function() {
						$("#dialog-editMask form").submit();
					},
					Cancel: function() {
						$(this).dialog("close");
					}
				},
				create: function() {
					$("#dialog-editMask #accessList").on("click", ".maskRemove", function() {
						$(this).closest("input.selector+label").prev().attr("name", "deletes[]").hide();
						$(this).closest("label").hide();
					});

					$("#dialog-editMask #accessList").on("click", "#edit_add+label", function() {
						$("#dialog-EVEsearch").dialog("open");
					});

					$("#dialog-editMask form").submit(function(e) {
						e.preventDefault();

						$.ajax({
							url: "masks.php",
							type: "POST",
							data: $(this).serialize(),
							dataType: "JSON"
						}).done(function(response) {
							if (response && response.result) {
								$("#dialog-editMask").dialog("close");
							} else if (response && response.error) {
								$("#dialog-error #msg").text(response.error);
								$("#dialog-error").dialog("open");
							} else {
								$("#dialog-error #msg").text("Unknown error");
								$("#dialog-error").dialog("open");
							}
						});
					});
				},
				open: function() {
					var mask = $("#dialog-masks input[name='mask']:checked").val();
					$("#dialog-editMask input[name='mask']").val(mask);
					$("#dialog-editMask #accessList label.static").hide();
					$("#dialog-editMask #loading").show();
					$("#dialog-editMask #name").text($("#dialog-masks input[name='mask']:checked+label .selector_label").text());

					$.ajax({
						url: "masks.php",
						type: "POST",
						data: {mode: "edit", mask: mask},
						dataType: "JSON"
					}).then(function(response) {
						if (response && response.results && response.results.length) {
							return tripwire.esi.fullLookup(response.results)
								.then(function(results) {
									if (results) {
										for (var x in results) {
											var node = makeAccessListNode(results[x], 'edit', '');
											$("#dialog-editMask #accessList .static:first").before(node);
										}
									}
								});
						}
					}).then(function(response) {
						$("#dialog-editMask #accessList label.static").show();
						$("#dialog-editMask #loading").hide();
					}).fail(function() {
						$("#dialog-editMask #loading").hide();
						$("#dialog-error #msg").text("Unable to load access list from ESI");
						$("#dialog-error").dialog("open");
					});
				},
				close: function() {
					$("#dialog-editMask #accessList :not(.static)").remove();
				}
			});

			// EVE search dialog
			$("#dialog-EVEsearch").dialog({
				autoOpen: false,
				dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
				buttons: {
					Add: function() {
						if ($("#accessList input[value='"+$("#EVESearchResults input").val()+"']").length) {
							$("#dialog-error #msg").text("Already has access");
							$("#dialog-error").dialog("open");
							return false;
						}

						$("#EVESearchResults .info").append('<input type="button" class="maskRemove" value="Remove" style="position: absolute; bottom: 3px; right: 3px;" />');
						$("#EVESearchResults input:checked").attr("checked", "checked");
						$("#EVESearchResults input:checked").attr("onclick", "return false");

						var nodes = $("#EVESearchResults .maskNode:has(input:checked)");

						if ($("#dialog-createMask").dialog("isOpen"))
							$("#dialog-createMask #accessList .static:first").before(nodes);
						else if ($("#dialog-editMask").dialog("isOpen"))
							$("#dialog-editMask #accessList .static:first").before(nodes);

						$(this).dialog("close");
					},
					Close: function() {
						$(this).dialog("close");
					}
				},
				create: function() {
					$("#EVEsearch").submit(function(e) {
						e.preventDefault();

						if ($("#EVEsearch input[name='name']").val() == "") {
							return false;
						}

						$("#EVESearchResults, #searchCount").text("");
						$("#EVEsearch #searchSpinner").show();
						$("#EVEsearch input[type='submit']").attr("disabled", "disabled");
						$("#dialog-EVEsearch").parent().find(".ui-dialog-buttonpane button:contains('Add')").attr("disabled", true).addClass("ui-state-disabled");

						tripwire.esi.search($("#EVEsearch input[name='name']").val(), $("#EVEsearch input[name='category']:checked").map((x, e) => e.value).get().join(','), $("#EVEsearch input[name='exact']")[0].checked)
							.done(function(results) {
								if (results && (results.character || results.corporation || results.alliance)) {
									// limit results
									results = [].concat(results.character || [],results.corporation || [], results.alliance || []);
									total = results.length;
									results = results.slice(0, 10);
									return tripwire.esi.fullLookup(results)
										.then(function(results) {
											$("#EVEsearch #searchCount").html("Found: "+total+"<br/>Showing: "+(total<10?total:10));
											if (results) {
												for (var x in results) {
													var node = makeAccessListNode(results[x], 'find', 'adds[]');
													$("#EVESearchResults").append(node);
												}
											}
						}).catch(function(error) {
							console.warn("Unable to load ESI search results:", error);
							$("#dialog-error #msg").text("Unable to load search results from ESI");
							$("#dialog-error").dialog("open");
						}).finally(function() {
											$("#EVEsearch #searchSpinner").hide();
											$("#EVEsearch input[type='submit']").removeAttr("disabled");
											$("#dialog-EVEsearch").parent().find(".ui-dialog-buttonpane button:contains('Add')").removeAttr("disabled").removeClass("ui-state-disabled");
										});
								} else {
									$("#dialog-error #msg").text("No Results");
									$("#dialog-error").dialog("open");

									$("#EVEsearch #searchSpinner").hide();
									$("#EVEsearch input[type='submit']").removeAttr("disabled");
									$("#dialog-EVEsearch").parent().find(".ui-dialog-buttonpane button:contains('Add')").removeAttr("disabled").removeClass("ui-state-disabled");
								}
							}).fail(data => {
									$("#dialog-error #msg").text("Error from ESI while searching");
									$("#dialog-error").dialog("open");
									
									$("#EVEsearch #searchSpinner").hide();
									$("#EVEsearch input[type='submit']").removeAttr("disabled");
									$("#dialog-EVEsearch").parent().find(".ui-dialog-buttonpane button:contains('Add')").removeAttr("disabled").removeClass("ui-state-disabled");								
							});
					});
				},
				close: function() {
					$("#EVEsearch input[name='name']").val("");
					$("#EVESearchResults, #searchCount").text("");
				}
			});
			
			$("#maskControls #edit").click(function() {
				$("#dialog-editMask").dialog("open");
			});
;
// #endregion

// #region dialogs/mass-dialog

		$("#dialog-mass").dialog({
			autoOpen: false,
			width: "auto",
			height: "auto",
			dialogClass: "dialog-noeffect ui-dialog-shadow",
			buttons: {
				Close: function() {
					$(this).dialog("close");
				}
			},
			open: function() {
				var wormholeID = $(this).data("id");
				var systemID = $(this).data("systemID");
				var wormhole = tripwire.client.wormholes[wormholeID];
				var signature = tripwire.client.signatures[wormhole.initialID];
				var otherSignature = tripwire.client.signatures[wormhole.secondaryID];
				
				const fromSystem = systemAnalysis.analyse(signature.systemID), toSystem = systemAnalysis.analyse(otherSignature.systemID);
				
				const wormholeType = wormhole.type ? tripwire.wormholes[wormhole.type] : 
					Object.assign({from: fromSystem.genericSystemType, leadsTo: toSystem.genericSystemType }, wormholeAnalysis.likelyWormhole(signature.systemID, otherSignature.systemID));

				$("#dialog-mass").dialog("option", "title", "From "+fromSystem.name+" to "+toSystem.name);
				document.getElementById('mass-systems').innerHTML = "From "+systemRendering.renderSystem(fromSystem)+
				" To "+systemRendering.renderSystem(toSystem) +
				" via "+wormholeRendering.renderWormholeType(wormholeType, wormhole.type, fromSystem, toSystem);

				$("#dialog-mass #massTable tbody tr").remove();
				document.getElementById('mass-jumped').innerText = '?';
				document.getElementById('mass-capacity').innerText = '?';

				var payload = {wormholeID: wormhole.id};

				$.ajax({
					url: "mass.php",
					type: "POST",
					data: payload,
					dataType: "JSON"
				}).done(function(data) {
					if (data && data.jumps) {
						const massData = parseMassData(data.jumps);
						document.getElementById('mass-jumped').innerText = wormholeRendering.renderMass(massData.totalMass);
						document.getElementById('mass-capacity').innerText = wormholeType.mass ? wormholeRendering.renderMass(wormholeType.mass) : 'Unknown';
						document.getElementById('mass-placeholder-desc').style.display = wormholeType.dummy ? '' : 'none';
						for (x in massData.jumps) {
							const j = massData.jumps[x];
							
							const massMarkup = (j.massClass === 'Small' ? '' :
									'<i data-icon="prop-mod" class="' + (j.prop ? ' active' : 'inactive') + '"></i>' +
									'<i data-icon="anchor" class="' + (j.higgs ? ' active' : 'inactive') + '"></i> '
								) + wormholeRendering.renderMass(j.mass);
							$("#dialog-mass #massTable tbody").append("<tr class='mass-" + getMassClass(j.mass) + "'><td>"+j.characterName+"</td><td>"+(j.targetSystem == systemID ? "Into " + systemRendering.renderSystem(toSystem, 'span') : "Return to " + systemRendering.renderSystem(fromSystem, 'span'))+"</td><td>"+j.shipName+"</td><td>"+massMarkup+"</td><td>"+j.time+"</td></tr>");
						}
						// Summary rows
                        $("#dialog-mass #massTable tbody").append("<tr id='small-mass'><td></td><td></td><td>Small jumps</td><td>"+ wormholeRendering.renderMass(massData.smallMass) +"</td><td></td></tr>");
                        $("#dialog-mass #massTable tbody").append("<tr id='medium-mass'><td></td><td></td><td>Medium jumps</td><td>"+ wormholeRendering.renderMass(massData.mediumMass) +"</td><td></td></tr>");
                        $("#dialog-mass #massTable tbody").append("<tr id='large-mass'><td></td><td></td><td>Large jumps</td><td>"+ wormholeRendering.renderMass(massData.largeMass) +"</td><td></td></tr>");
                        $("#dialog-mass #massTable tbody").append("<tr><td></td><td></td><td></td><th>"+ wormholeRendering.renderMass(massData.totalMass) +"</th><td></td></tr>");
					}
				});
			}
		});

function getMassClass(jumpMass) {
	return jumpMass <= 5e6 ? 'Small' :
	 jumpMass <= 80e6 ? 'Medium' :
	 jumpMass <= 500e6 ? 'Large' :
	 'X-Large';
}

function parseMassData(jumps) {
	const result = { totalMass: 0, smallMass: 0, mediumMass: 0, largeMass: 0, xlMass: 0, jumps: [] };
	for (x in jumps) {
		const shipData = appData.mass[jumps[x].shipTypeID];
		if(!shipData) { continue; }	// sometimes ship is not recorded, or ship isn't in SDE dump yet
		const originalMass = parseFloat(shipData.mass);
		const shipFlagsText = jumps[x].shipType.split('|', 2)[1] || '';
		const shipFlags = { higgs: shipFlagsText.indexOf('h') >= 0, prop: shipFlagsText.indexOf('p') >= 0 };
		const massClass = getMassClass(originalMass);
		const jumpMass = (originalMass + (shipFlags.prop ? (massClass === 'X-Large' ? 500e6 : 50e6) : 0)) * (shipFlags.higgs ? 2 : 1);
		result.totalMass += jumpMass;
		switch(massClass) {
			case 'Small': result.smallMass += jumpMass; break;
			case 'Medium': result.mediumMass += jumpMass; break;
			case 'Large': result.largeMass += jumpMass; break;
			case 'X-Large': result.xlMass += jumpMass; break;
		}
		result.jumps.push( { 
			originalMass: originalMass, mass: jumpMass, massClass: massClass,
			higgs: shipFlags.higgs, prop: shipFlags.prop, shipName: shipData.typeName,
			targetSystem: jumps[x].toID, 
			characterName: jumps[x].characterName.split('|')[0],
			time: jumps[x].time 
		});
	}
	return result;
}
;
// #endregion

// #region dialogs/options-dialog
function fitOptionsDialogToViewport() {
	var $content = $("#dialog-options");
	if (!$content.hasClass("ui-dialog-content")) return;

	var scale = parseFloat($("body").css("zoom")) || 1;
	var gutter = 16;
	var maxHeight = Math.max(120, Math.floor((window.innerHeight - gutter * 2) / scale));
	var maxWidth = Math.max(240, Math.floor((window.innerWidth - gutter * 2) / scale));
	var $frame = $content.closest(".ui-dialog");
	$frame.css({
		"max-height": maxHeight + "px",
		"max-width": maxWidth + "px",
		"top": (gutter / scale) + "px"
	});

	if ($content.dialog("isOpen")) {
		$content.dialog("option", "position", {my: "center top", at: "center top", of: window});
		// jQuery UI calculates offsets before body zoom is painted. Pin them again
		// afterwards in unscaled CSS pixels so the physical placement is exact.
		var left = Math.max(gutter / scale, (window.innerWidth / scale - $frame.outerWidth()) / 2);
		$frame.css({"top": (gutter / scale) + "px", "left": left + "px"});
	}

	var chromeHeight = $frame.children(".ui-dialog-titlebar").outerHeight(true)
		+ $frame.children(".ui-dialog-buttonpane").outerHeight(true);
	$content.css("--options-dialog-content-max-height", Math.max(0, maxHeight - chromeHeight) + "px");
}

var optionsDialogSaved = false;

function decorateOptionsDialogActions() {
	var $frame = $("#dialog-options").closest(".ui-dialog");
	var actions = {
		Cancel: {icon: "times", role: "is-quiet"},
		Save: {icon: "check", role: "is-primary"}
	};

	$frame.find(".ui-dialog-buttonpane button").each(function() {
		var $button = $(this);
		var label = $.trim($button.text());
		var action = actions[label];
		if (!action) return;
		$button.addClass(action.role);
		if (!$button.find("[data-icon]").length) {
			$button.prepend('<i data-icon="' + action.icon + '" aria-hidden="true"></i>');
		}
	});

	$frame.find(".ui-dialog-titlebar-close")
		.attr({"aria-label": "Close settings", title: "Close settings"})
		.show();
}

$(".options").click(function(e) {
	e.preventDefault();

	if ($(this).hasClass("disabled"))
		return false;

	$("#dialog-options").dialog({
		autoOpen: false,
		width: 450,
		minHeight: 0,
		modal: true,
		closeOnEscape: true,
		dialogClass: "dialog-options-frame",
		buttons: {
			Save: function() {
				$("#dialog-options").parent().find(".ui-dialog-buttonpane button:contains('Save')").attr("disabled", true).addClass("ui-state-disabled");
				
				options.chain.sigNameLocation = $("#dialog-options #chainSigNameLocation").val();
				options.chain.routingLimit = 1 * $("#dialog-options #chainRoutingLimit").val();
				options.chain.routeSecurity = $("#dialog-options #chainRouteSecurity").val();
				options.chain.routeIgnore.enabled = $("#dialog-options #route-ignore-enabled").prop('checked');
				options.chain.routeIgnore.systems = $("#dialog-options #route-ignore").val().split(",").map(x => x.trim());

				options.chain.gridlines = $("#dialog-options #gridlines").prop("checked");
				options.chain.aura = $("#dialog-options #aura").prop("checked");
				options.chain.scrollWithoutCtrl = $("#dialog-options #scrollWithoutCtrl").prop("checked");

				options.chain.nodeSpacing.x = $("#dialog-options #node-spacing-x-slider").slider("value");
				options.chain.nodeSpacing.y = $("#dialog-options #node-spacing-y-slider").slider("value");
				
				options.chain.lineWeight = $("#dialog-options #node-spacing-line-weight-slider").slider("value");
				
				options.chain["node-reference"] = $("#dialog-options input[name=node-reference]:checked").val();
				
				options.chain.renderer = $("#dialog-options #renderer").val();
				options.chain.nodeSpacingByRenderer = options.chain.nodeSpacingByRenderer || {};
				options.chain.nodeSpacingByRenderer[options.chain.renderer] = $.extend({}, options.chain.nodeSpacing);

				options.signatures.editType = $("#dialog-options #editType").val();

				options.signatures.pasteLife = $("#dialog-options #pasteLife").val();

				options.signatures.copySeparator = $("#dialog-options #copySeparator").val();

				options.signatures.rowPadding = $("#dialog-options #signature-row-padding-slider").slider("value");

				options.background = $("#dialog-options #background-image").val();

				options.uiscale = $("#dialog-options #uiscale-slider").slider("value");

				options.apply();
				options.save(); // Performs AJAX

				optionsDialogSaved = true;
				$("#dialog-options").dialog("close");
				$("#dialog-options").parent().find(".ui-dialog-buttonpane button:contains('Save')").attr("disabled", false).removeClass("ui-state-disabled");

			},
			Cancel: function() {
				$(this).dialog("close");
			}
		},
		open: function() {
			optionsDialogSaved = false;
			fitOptionsDialogToViewport();
			decorateOptionsDialogActions();

			// Get user stats data
			$.ajax({
				url: "user_stats.php",
				type: "POST",
				dataType: "JSON"
			}).done(function(data) {
				for (i in data.stats) {
					for (x in data.stats[i]) {
						$("#optionsAccordion #"+ x).text(data.stats[i][x]);
					}
				}

				$("#optionsAccordion #systems_visited").text(data.system_visits);
				$("#optionsAccordion #logins").text(data.account.logins);
				$("#optionsAccordion #lastLogin").text(data.account.lastLogin);
				$("#optionsAccordion #username").text(data.username);
			});

			$("#dialog-options #editType").val(options.signatures.editType);
			$("#dialog-options #pasteLife").val(options.signatures.pasteLife);
			$("#dialog-options #copySeparator").val(options.signatures.copySeparator);
			$("#dialog-options #signature-row-padding-slider").slider("value", options.signatures.rowPadding);
			$("#dialog-options #chainRoutingLimit").val(options.chain.routingLimit);
			$("#dialog-options #chainSigNameLocation").val(options.chain.sigNameLocation);
			$("#dialog-options #chainRouteSecurity").val(options.chain.routeSecurity);
			$("#dialog-options #route-ignore-enabled").prop('checked', options.chain.routeIgnore.enabled);
			$("#dialog-options #route-ignore").val(options.chain.routeIgnore.systems.join(','));
			$("#dialog-options #renderer").val(options.chain.renderer);
			$("#dialog-options input[name='node-reference'][value='"+options.chain["node-reference"]+"']").prop("checked", true);
			// Stored as booleans by save() but as the strings "true"/"false" by
			// older saves, so both spellings have to read as on.
			var on = function(v) { return v === true || v === "true"; };
			$("#dialog-options #gridlines").prop("checked", on(options.chain.gridlines));
			$("#dialog-options #aura").prop("checked", on(options.chain.aura));
			$("#dialog-options #scrollWithoutCtrl").prop("checked", on(options.chain.scrollWithoutCtrl));
			$("#dialog-options #node-spacing-x-slider").slider("value", options.chain.nodeSpacing.x);
			$("#dialog-options #node-spacing-y-slider").slider("value", options.chain.nodeSpacing.y);
			$("#dialog-options #node-spacing-line-weight-slider").slider("value", options.chain.lineWeight);
			$("#dialog-options #background-image").val(options.background);
			if (tripwire.settingsCharacters) { tripwire.settingsCharacters.render(); }
			if (tripwire.settingsPanels) { tripwire.settingsPanels.render(); }
		},
		create: function() {
			decorateOptionsDialogActions();

			$(window).off("resize.tripwireOptions").on("resize.tripwireOptions", function() {
				if ($("#dialog-options").dialog("isOpen")) fitOptionsDialogToViewport();
			});

			// Tabs. Twenty-four controls in one 1,056px scroll was the previous
			// arrangement; five short panes means the pane you want is one click
			// and no scrolling. Plain buttons rather than jQuery UI tabs so the
			// strip is styled by the same rules as every other control.
			$("#optionsAccordion .settings-tabs [role=tab]").on("click", function() {
				var tab = $(this).attr("data-tab");
				$("#optionsAccordion [role=tab]").attr("aria-selected", "false");
				$(this).attr("aria-selected", "true");
			$("#optionsAccordion .settings-pane").each(function() {
				this.hidden = $(this).attr("data-pane") !== tab;
			});
			fitOptionsDialogToViewport();
		});
			function setUpSlider(id, value, change, range) {
				range = Object.assign({min: 0.7, max:1.4, step:0.05}, range);
				$("#" + id).slider({
					min: range.min,
					max: range.max,
					step: range.step,
					value: value == null ? 1.0 : value,
					change: function(e, ui) {
						$("label[for='" + id + "']").text(ui.value);
						if (change) change(e, ui);
					},
					slide: function(e, ui) {
						$("label[for='" + id + "']").text(ui.value);
					}
				});

				$("label[for='" + id + "']").text($("#" + id).slider("value"));
			}
			setUpSlider('uiscale-slider', options.uiscale, function(e, ui) {
						$("body").css("zoom", ui.value);
						fitOptionsDialogToViewport();
					});
			setUpSlider('node-spacing-x-slider', options.chain.nodeSpacing.x, undefined, { min: 0.7, max: 4, step: 0.05 });
			setUpSlider('node-spacing-y-slider', options.chain.nodeSpacing.y, undefined, { min: 0.7, max: 4, step: 0.05 });
			setUpSlider('node-spacing-line-weight-slider', options.chain.lineWeight, undefined, { min: 0.5, max: 1.5 });
			$("#dialog-options #renderer").on("change.nodeSpacing", function() {
				const renderer = $(this).val();
				const defaults = renderer === 'orgChart' ? {x: 1.4, y: 1.4} : {x: 2, y: 2};
				const spacing = (options.chain.nodeSpacingByRenderer || {})[renderer] || defaults;
				$("#node-spacing-x-slider").slider("value", spacing.x);
				$("#node-spacing-y-slider").slider("value", spacing.y);
			});
			setUpSlider('signature-row-padding-slider', options.signatures.rowPadding, function(e, ui) {
				var value = ui.value;
				$("#sigTable").css({
					"--signature-cell-padding": value + "px",
					"--signature-mobile-padding-y": (value * 7 / 6) + "px",
					"--signature-mobile-padding-x": (value * 10 / 6) + "px"
				});
			}, { min: 0, max: 6, step: 1 });

			$("#dialog-pwChange").dialog({
				autoOpen: false,
				resizable: false,
				minHeight: 0,
				dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
				buttons: {
					Save: function() {
						$("#pwForm").submit();
					},
					Cancel: function() {
						$(this).dialog("close");
					}
				},
				close: function() {
					$("#pwForm input[name='password'], #pwForm input[name='confirm']").val("");
					$("#pwError").text("").hide();
				}
			});

			$("#pwChange").click(function() {
				$("#dialog-pwChange").dialog("open");
			});

			$("#pwForm").submit(function(e) {
				e.preventDefault();

				$("#pwError").text("").hide();

				$.ajax({
					url: "options.php",
					type: "POST",
					data: $(this).serialize(),
					dataType: "JSON"
				}).done(function(response) {
					if (response && response.result) {
						$("#dialog-msg #msg").text("Password changed");
						$("#dialog-msg").dialog("open");

						$("#dialog-pwChange").dialog("close");
					} else if (response && response.error) {
						$("#pwError").text(response.error).show("slide", {direction: "up"});
					} else {
						$("#pwError").text("Unknown error").show("slide", {direction: "up"});
					}
				});
			});

			$("#dialog-usernameChange").dialog({
				autoOpen: false,
				resizable: false,
				minHeight: 0,
				dialogClass: "ui-dialog-shadow dialog-noeffect dialog-modal",
				buttons: {
					Save: function() {
						$("#usernameForm").submit();
					},
					Cancel: function() {
						$(this).dialog("close");
					}
				},
				open: function() {
					$("#usernameForm #username").html($("#dialog-options #username").html());
				},
				close: function() {
					$("#usernameForm [name='username']").val("");
					$("#usernameError").text("").hide();
				}
			});

			$("#usernameChange").click(function() {
				$("#dialog-usernameChange").dialog("open");
			});

			$("#usernameForm").submit(function(e) {
				e.preventDefault();

				$("#usernameError").text("").hide();

				$.ajax({
					url: "options.php",
					type: "POST",
					data: $(this).serialize(),
					dataType: "JSON"
				}).done(function(response) {
					if (response && response.result) {
						$("#dialog-msg #msg").text("Username changed");
						$("#dialog-msg").dialog("open");

						$("#dialog-options #username").text(response.result);

						$("#dialog-usernameChange").dialog("close");
					} else if (response && response.error) {
						$("#usernameError").text(response.error).show("slide", {direction: "up"});
					} else {
						$("#usernameError").text("Unknown error").show("slide", {direction: "up"});
					}
				});
			});


		},
		close: function() {
			if (!optionsDialogSaved) options.apply();
			optionsDialogSaved = false;
		}
	});

	$("#dialog-options").dialog("open");
});
;
// #endregion

// #region dialogs/ping-dialog
const sendPing = function(dialog, pingType) {
					const text = $('#ping-text').val();
					if(text.trim() === '' && !confirm('You are sending a ping with no text. Are you sure you want to do that?\n\nIf not, press Cancel and enter some text and try again.')) { return; }					const _this = dialog;
					var payload = {systemName: _this.systemName, systemText: _this.systemText, message: $('#ping-text').val(), pingType: pingType };
					$.ajax({
						url: "ping.php",
						type: "POST",
						data: payload,
						dataType: "text"
					}).done(function(data) {	$(_this).dialog("close"); })
					.fail(function(xhr, status, error) { console.log(status, error); });	
}

		$("#dialog-ping").dialog({
			autoOpen: false,
			height: "auto",
			width: 350,
			dialogClass: "dialog-noeffect ui-dialog-shadow",
			buttons: {
				Send: function() { sendPing(this); },
				'@here': function() { sendPing(this, 'here'); },
				'@everyone': function() { sendPing(this, 'everyone'); },
				Cancel: function() {
					$(this).dialog("close");
				},
			},
			open: function() {
				const wormholeID = $(this).data("id");
				const systemID = $(this).data("systemID");
				const wormhole = tripwire.client.wormholes[wormholeID];
				const fromSignature = wormhole ? tripwire.client.signatures[wormhole.initialID] : { name: null};
				
				this.systemName = tripwire.systems[systemID].name;
				this.systemText = this.systemName + (fromSignature.name !== null && fromSignature.name.length ? ' (' + fromSignature.name + ')' : '');
				
				$("#dialog-ping").dialog("option", "title", "Ping about "+this.systemText);
				$('#ping-text').val('');
				$('#ping-text').focus();
			}
		});
;
// #endregion

// #region dialogs/signature-delete-dialog
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
;
// #endregion

// #region dialogs/signature-dialog-keyboard
// Keyboard operation for the signature dialog.

(function() {
    var SIG = "#dialog-signature";

    // jQuery UI's autocomplete menu. While it is open Enter belongs to it, not
    // to the form.
    function suggestionOpen() {
        return $(".ui-autocomplete:visible, .ui-menu:visible").length > 0;
    }

    function isWormhole() {
        return $(SIG + " [name='signatureType']").val() === "wormhole";
    }

    // What has to be filled before the row is useful on the map. The signature
    // id always; for a wormhole also its type and where it leads, because those
    // are what the chain is drawn from. Name and the other side are optional.
    function requiredFields() {
        var names = ["signatureID_Alpha"];
        if (isWormhole()) { names.push("wormholeType", "leadsTo"); }
        return names
            .map(function(n) { return $(SIG + " [name='" + n + "']").filter(":visible").first(); })
            .filter(function($f) { return $f.length > 0; });
    }

    function isMissing($field) {
        var value = $.trim($field.val() || "");
        return !value || ($field.attr("name") === "signatureID_Alpha" && value === "???");
    }

    function markMissing() {
        $(SIG + " .sig-missing").removeClass("sig-missing");
        requiredFields().forEach(function($f) {
            if (isMissing($f)) { $f.addClass("sig-missing"); }
        });
    }

    // Land on the first thing still needing an answer rather than a fixed
    // field -- today focus goes to Name, which is optional, while Type and
    // Leads are what gate a usable chain.
    function focusFirstUnfilled() {
        var fields = requiredFields();
        for (var i = 0; i < fields.length; i++) {
            if (isMissing(fields[i])) {
                fields[i].trigger("focus").trigger("select");
                return;
            }
        }
        var $name = $(SIG + " [name='wormholeName'], " + SIG + " [name='signatureName']")
                        .filter(":visible").first();
        if ($name.length) { $name.trigger("focus"); }
    }

    // The next wormhole signature in this system that still has no type, so
    // Ctrl-Enter can walk a freshly pasted scan without touching the mouse.
    function nextUnfinished(afterId) {
        var sigs = tripwire.client && tripwire.client.signatures;
        var holes = (tripwire.client && tripwire.client.wormholes) || {};
        if (!sigs) { return null; }

        var systemID = sigDialogVM.viewingSystemID;
        var ids = Object.keys(sigs).filter(function(id) {
            var s = sigs[id];
            return s && s.systemID == systemID && s.type === "wormhole" && id != afterId;
        }).sort();

        for (var i = 0; i < ids.length; i++) {
            var hole = null;
            for (var w in holes) {
                if (holes[w].initialID == ids[i] || holes[w].secondaryID == ids[i]) { hole = holes[w]; break; }
            }
            if (!hole || !hole.type || hole.type === "????") { return ids[i]; }
        }
        return null;
    }

    function saveAndNext() {
        var current = sigDialogVM.sigId;
        var next = nextUnfinished(current);

        $("#form-signature").trigger("submit");

        if (next) {
            // Let the save round-trip settle before reopening, otherwise the
            // dialog's own close handler fights the reopen.
            setTimeout(function() {
                sigDialog.openSignatureDialog({data: {mode: "update", source: "next", signature: next}});
            }, 250);
        }
    }

    $(function() {
        // Enter commits from anywhere in the form. The dialog is already a
        // form, so this is mostly a matter of not letting the keystroke fall
        // through to the dialog chrome.
        $(document).on("keydown", "#form-signature", function(e) {
            if (e.key !== "Enter") { return; }
            if (suggestionOpen()) { return; }              // Enter is picking a suggestion
            if ($(e.target).is("textarea, button")) { return; }

            e.preventDefault();
            if (e.ctrlKey || e.metaKey) { saveAndNext(); }
            else { $("#form-signature").trigger("submit"); }
        });

        // A fresh dialog is not a failed one. Nothing reads red until you have
        // left a required field empty or tried to save; after a save attempt
        // the marks track every keystroke.
        var attempted = false;
        $(document).on("input change", "#form-signature", function() { if (attempted) { markMissing(); } });
        $(document).on("focusout", "#form-signature", function(e) {
            var $f = $(e.target);
            if (!$f.is("input")) { return; }
            var required = requiredFields().some(function($r) { return $r[0] === $f[0]; });
            if (required && isMissing($f)) { $f.addClass("sig-missing"); }
            else { $f.removeClass("sig-missing"); }
        });
        $(document).on("submit", "#form-signature", function() { attempted = true; markMissing(); });
        $(document).on("click", ".ui-dialog-buttonpane button", function() {
            if (!$(this).closest(".ui-dialog").find(SIG).length) { return; }
            if ($(this).text().trim() === "Cancel") { return; }
            attempted = true; markMissing();
        });

        $(document).on("dialogopen", ".ui-dialog", function() {
            if (!$(this).find(SIG).length) { return; }

            // Deferred: the dialog's own open handler populates fields, and
            // this has to run after it.
            setTimeout(function() {
                attempted = false;
                $(SIG + " .sig-missing").removeClass("sig-missing");
                focusFirstUnfilled();

                // Keep Delete off the keyboard path entirely. It sits beside
                // Save, and a mistyped Tab-Enter should never be able to
                // destroy a signature. It stays clickable.
                $(SIG).parent().find("button:contains('Delete')").attr("tabindex", "-1");
            }, 0);
        });
    });
})();
;
// #endregion

// #region dialogs/signature-dialog
const sigDialog = {};
const sigDialogVM = {};

sigDialog.positionInViewport = function() {
	const dialog = $("#dialog-signature");
	if (!dialog.hasClass("ui-dialog-content") || !dialog.dialog("isOpen")) return;

	dialog.dialog("option", "position", {
		my: "center",
		at: "center",
		of: window,
		collision: "fit"
	});
};

sigDialog.openSignatureDialog = function(e) {
	if(e.preventDefault) { e.preventDefault(); }	// Allow calls with fake event-like objects too
	sigDialogVM.mode = e.data.mode;
	
	switch(sigDialogVM.mode) {
		case 'update':
			if (e.data.source == "sig-row") {
				$("#sigTable tr.selected").removeClass("selected");
				$(this).closest("tr").addClass("selected");
				sigDialogVM.sigId = $(this).data('id');
			} else if (e.data.source == "edit-sig") {
				var elements = $("#sigTable tbody tr.selected");
				if (elements.length !== 1) {
					return false;
				} else {
					sigDialogVM.sigId = $(elements[0]).data('id');
				}
			} else { sigDialogVM.sigId = e.data.signature; }
			break;
		default: delete sigDialogVM.sigId;
	}
	
	sigDialogVM.viewingSystemID = ( sigDialogVM.sigId ) ? tripwire.client.signatures[sigDialogVM.sigId].systemID : viewingSystemID;
	sigDialogVM.viewingSystem = tripwire.systems[sigDialogVM.viewingSystemID];
	
	if (!$("#dialog-signature").hasClass("ui-dialog-content")) {
		$("#dialog-signature").dialog({
			autoOpen: true,
			resizable: false,
			dialogClass: "dialog-noeffect ui-dialog-shadow",
			position: {my: "center", at: "center", of: window, collision: "fit"},
			buttons: {
				Delete: function() {
					const d = $(this);
					openDeleteDialog({ signatures: [tripwire.client.signatures[sigDialogVM.sigId]] }, () => d.dialog('close') );
				},
				Save: function() {
					$("#form-signature").submit();
				},
				Add: function() {
					$("#form-signature").submit();
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			},
			create: function() {
				var aSigWormholes = Object.assign({}, appData.wormholes, wormholeAnalysis.dummyWormholes, { K162: {} } );
				
				function system_select_item_mapper(items) {
					return items.concat(appData.genericSystemTypes).map(function(name) {
						return Object.assign({name:name}, systemAnalysis.analyse(name)); 
					});
				}

				$("#dialog-signature [name='signatureType'], #dialog-signature [name='signatureLife']").selectmenu({width: 100});
				$("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete({source: tripwire.aSigSystems, renderer: 'system', select_item_mapper: system_select_item_mapper, extraMatch: (term, value) => term.toUpperCase() === value.systemTypeName, maxSize: 10, delay: 0});
				
				function getTargetName() { return $("#dialog-signature .leadsTo:visible").val(); }
				function getTargetSystem() {
					return wormholeAnalysis.targetSystemID(getTargetName(), undefined);	
				};
				
				function sigTypeDropdownFiller(extractor) {
					return function() {
						const eligible = wormholeAnalysis.eligibleWormholeTypes(sigDialogVM.viewingSystemID, getTargetSystem());
						return extractor(eligible);
					}
				}
				const sigTypeFromFiller =  sigTypeDropdownFiller(function(x) { return x.from; });
				const sigTypeToFiller =  sigTypeDropdownFiller(function(x) { return x.to; });
				
				function renderInbound(item) {	// Render with the type of the systems, if we know, so we don't get "from: [drifter wormholes]" if we know we're in a C2
					return wormholeRendering.renderWormholeType(item, item.key, getTargetName(), sigDialogVM.viewingSystem.name);
				}
				function renderOutbound(item) {	// As above
					return wormholeRendering.renderWormholeType(item, item.key, sigDialogVM.viewingSystem.name, getTargetName());
				}
				
				$("#dialog-signature [data-autocomplete='sigTypeFrom']").inlinecomplete({source: aSigWormholes, renderer: renderOutbound, maxSize: 10, delay: 0, customDropdown: sigTypeFromFiller});
				$("#dialog-signature [data-autocomplete='sigTypeTo']").inlinecomplete({source: aSigWormholes, renderer: renderInbound, maxSize: 10, delay: 0, customDropdown:sigTypeToFiller});
				
				function updateQuickSelect(elem, filler) {
					elem.innerHTML = '';
					const values = filler();
					if(values.length < 4) {
						values.forEach(type => {
							const button = document.createElement('button');
							button.className = 'quick-select';
							if(type.jump <= 5000000) { button.className += ' frig'; }
							button.textContent = type.key;
							button.value = type.key;
							button.type = 'button'; // otherwise it is 'submit'
							button.tabIndex = -1; // keyboard users will just want to type in the autocomplete field
							elem.appendChild(button);
						});
					}
				}
				function updateQuickSelects() {
					updateQuickSelect(document.getElementById('wormholeTypeQuickSelectFrom'), sigTypeFromFiller);
					updateQuickSelect(document.getElementById('wormholeTypeQuickSelectTo'), sigTypeToFiller);
				}
				
				$('#wormholeTypeQuickSelectFrom').on('click', e => $("#dialog-signature input[name='wormholeType']").val(e.target.value).change());
				$('#wormholeTypeQuickSelectTo').on('click', e => $("#dialog-signature input[name='wormholeType2']").val(e.target.value).change());

				$("#dialog-signature #durationPicker").durationPicker();
				$("#dialog-signature #durationPicker").on("change", function() {
					// prevent negative values
					if (this.value < 0) {
						this.value = 0;
						$(this).change();
					}
				});

				// A whole id in the first field -- "ABC-123" pasted from the
				// scanner, or typed straight through -- splits itself across the
				// two fields rather than being clipped to "ABC" by the filter.
				$("#dialog-signature [name='signatureID_Alpha'], #dialog-signature [name='signatureID2_Alpha']").on("input", function() {
					var m = /^([a-zA-Z?]{3})-?([0-9?]{1,3})/.exec(this.value);
					if (m) {
						var numeric = this.name === "signatureID_Alpha" ? "signatureID_Numeric" : "signatureID2_Numeric";
						this.value = m[1];
						$("#dialog-signature [name='" + numeric + "']").val(m[2]).trigger("focus");
						return;
					}
					while (!/^[a-zA-Z?]*$/g.test(this.value)) {
						this.value = this.value.substring(0, this.value.length -1);
					}
				});

				// Move to the numeric ID after filling out alpha ID -- and absorb
				// the habitual Tab that follows. Measured: type "ZZQ", focus has
				// already moved, Tab moves it again to the type menu, the digits
				// go there, and the row saves as "ZZQ-###". The Tab pressed right
				// after an auto-advance, into a still-empty numeric field, means
				// "next field", and the numeric field is the next field.
				var autoAdvancedAt = 0;
				$("#dialog-signature [name='signatureID_Alpha']").on("input", function() {
					if (this.value.length === 3) {
						autoAdvancedAt = Date.now();
						$("#dialog-signature [name='signatureID_Numeric']").select();
					}
				});
				$("#dialog-signature [name='signatureID_Numeric']").on("keydown", function(e) {
					if (e.key === "Tab" && !e.shiftKey && this.value === "" && Date.now() - autoAdvancedAt < 1500) {
						e.preventDefault();
					}
				});

				$("#dialog-signature [name='signatureID2_Alpha']").on("input", function() {
					if (this.value.length === 3) {
						$("#dialog-signature [name='signatureID2_Numeric']").select();
					}
				});

				// Ensure second signature ID field only accepts numbers
				$("#dialog-signature [name='signatureID_Numeric'], #dialog-signature [name='signatureID2_Numeric']").on("input", function() {
					while (!/^[0-9?]*$/g.test(this.value)) {
						this.value = this.value.substring(0, this.value.length -1);
					}
				});
				
				// Positioning hack to separate delete button visually
				$("#dialog-signature").parent().find("button:contains('Delete')").css( { position: 'absolute', left: '30px' } );

				// Select value on click
				$("#dialog-signature .signatureID, #dialog-signature .wormholeType").on("click", function() {
					$(this).select();
				});
				
				// Update quick selectors when the leadsTo system changes
				$("#dialog-signature [name='leadsTo']").on("change", updateQuickSelects);
				
				// Shortcut buttons to update leadsTo
				$('#leadsToQuickBar').on('click', e => {
					let target = e.target;
					while(target.tagName !== 'BUTTON') { target = target.parentElement; }
					$("#dialog-signature [name='leadsTo']").val(target.value).change();
				});

				// Auto fill opposite side wormhole w/ K162
				$("#dialog-signature .wormholeType").on("input, change", function() {
					if (this.value.length > 0 && aSigWormholes[this.value.toUpperCase()] != -1 && this.value.toUpperCase() != "K162") {
						$("#dialog-signature .wormholeType").not(this).val("K162");

						// Also auto calculate duration
						if (appData.wormholes[this.value.toUpperCase()]) {
							$("#dialog-signature #durationPicker").val(appData.wormholes[this.value.toUpperCase()].life.substring(0, 2) * 60 * 60).change();
						}
					} else if (this.value.toUpperCase() === "K162") {
						if (aSigWormholes[$("#dialog-signature .wormholeType").not(this).val().toUpperCase()] || $("#dialog-signature .wormholeType").not(this).val().toUpperCase() === "K162") {
							$("#dialog-signature .wormholeType").not(this).val("????");
						}
					} else if (this.value == "????") {
						$("#dialog-signature .wormholeType").not(this).val("K162");
					}
				});

				// Toggle between wormhole and regular signatures
				$("#dialog-signature").on("selectmenuchange", "[name='signatureType']", function() {
					if (this.value == "wormhole") {
						$("#dialog-signature #site").slideUp(200, function() {
							$(this).hide(0);
							sigDialog.positionInViewport();
						});
						$("#dialog-signature #wormhole").slideDown(200, function() {
							$(this).show(200, sigDialog.positionInViewport);
						});
					} else {
						$("#dialog-signature #site").slideDown(200, function() {
							$(this).show(200, sigDialog.positionInViewport);
						});
						$("#dialog-signature #wormhole").slideUp(200, function() {
							$(this).hide(0);
							sigDialog.positionInViewport();
						});
					}

					ValidationTooltips.close();
				});

				$("#form-signature").submit(function(e) {
					e.preventDefault();
					var form = $(this).serializeObject();
					var lifePresets = {critical4: 4, critical1: 1, expiring: 1};
					var valid = true;
					ValidationTooltips.close();

					// Validate full signature ID fields (blank | 3 characters)
					$.each($("#dialog-signature .signatureID:visible"), function() {
						if (this.value.length > 0 && this.value.length < 3) {
							ValidationTooltips.open({target: $(this)}).setContent("Must be 3 characters in length!");
							$(this).select();
							valid = false;
							return false;
						}
					});
					if (!valid) return false;

					// Validate full signature ID doesn't already exist in current system
					if (form.signatureID_Alpha.length === 3 && form.signatureID_Numeric.length === 3) {
						for(var sigKey in tripwire.client.signatures) {
							const existing = tripwire.client.signatures[sigKey];
							if((existing.id != sigDialogVM.sigId) && // not the sig we are editing
								(existing.signatureID == form.signatureID_Alpha.toLowerCase() + form.signatureID_Numeric) && // same name
								(existing.systemID == sigDialogVM.viewingSystemID) // in current system
							) {
								ValidationTooltips.open({target: $("#dialog-signature .signatureID:first")}).setContent("Signature ID already exists! <input type='button' autofocus='true' id='overwrite' value='Overwrite' style='margin-bottom: -4px; margin-top: -4px; font-size: 0.8em;' data-id='"+ sigKey +"' />");
								$("#overwrite").focus();
								valid = false;
								return false;
							}
						}
					}
					if (!valid) return false;

					// Validate wormhole types (blank | wormhole)
					$.each($("#dialog-signature .wormholeType:visible"), function() {
						if (this.value.length > 0 && !aSigWormholes[this.value.toUpperCase()] && this.value != "????") {
							ValidationTooltips.open({target: $(this)}).setContent("Must be a valid wormhole type!");
							$(this).select();
							valid = false;
							return false;
						}
					});
					if (!valid) return false;

					// Validate leads to system (blank | system)
					$.each($("#dialog-signature .leadsTo:visible"), function() {
						if (this.value.length > 0 && appData.genericSystemTypes.findIndex((item) => this.value.toLowerCase() === item.toLowerCase()) == -1 && !findSystemID(this.value)) {
							ValidationTooltips.open({target: $(this)}).setContent("Must be a valid leads to system!");
							$(this).select();
							valid = false;
							return false;
						}
					});
					if (!valid) return false;

					// Validate leads to isn't the viewing system which causes a inner loop
					$.each($("#dialog-signature .leadsTo:visible"), function() {
						if (this.value.length > 0 && this.value.toLowerCase() === sigDialogVM.viewingSystem.name.toLowerCase()) {
							ValidationTooltips.open({target: $(this)}).setContent("Wormhole cannot lead to the same system it comes from!");
							$(this).select();
							valid = false;
							return false;
						}
					});
					if (!valid) return false;

					var payload = {};
					var undo = [];
					if (form.signatureType === "wormhole") {
						var signature = {
							"signatureID": form.signatureID_Alpha + form.signatureID_Numeric,
							"systemID": sigDialogVM.viewingSystemID,
							"type": "wormhole",
							"name": form.wormholeName,
							"lifeLength": form.signatureLength
						};
						var leadsTo = wormholeAnalysis.targetSystemID(form.leadsTo, form.wormholeType);

						var signature2 = {
							"signatureID": form.signatureID2_Alpha + form.signatureID2_Numeric,
							"systemID": leadsTo,
							"type": "wormhole",
							"name": form.wormholeName2,
							"lifeLength": form.signatureLength
						};
						var type = null;
						var parent = null;
						if (form.wormholeType.length > 0 && aSigWormholes[form.wormholeType.toUpperCase()] && form.wormholeType.toUpperCase() != "K162") {
							parent = "initial";
							type = form.wormholeType.toUpperCase();
						} else if (form.wormholeType2.length > 0 && aSigWormholes[form.wormholeType2.toUpperCase()] && form.wormholeType2.toUpperCase() != "K162") {
							parent = "secondary";
							type = form.wormholeType2.toUpperCase();
						} else if (form.wormholeType.toUpperCase() == "K162") {
							parent = "secondary";
							type = "????";
						} else if (form.wormholeType2.toUpperCase() == "K162") {
							parent = "initial";
							type = "????";
						}
						var wormhole = {
							"type": type,
							"parent": parent,
							"life": lifePresets[form.wormholeLife] ? "critical" : "stable",
							"mass": form.wormholeMass
						};
						if (lifePresets[form.wormholeLife]) {
							wormhole.lifeHours = lifePresets[form.wormholeLife];
						}
						if (sigDialogVM.mode == "update") {
							signature.id = $("#dialog-signature").data("signatureid");
							signature2.id = $("#dialog-signature").data("signature2id");
							wormhole.id = $("#dialog-signature").data("wormholeid");

							// Update the initial and type based on which side of the wormhole we are editing
							if (tripwire.client.wormholes[wormhole.id]) {
								if (form.wormholeType.length > 0 && aSigWormholes[form.wormholeType.toUpperCase()] && form.wormholeType.toUpperCase() != "K162") {
									wormhole.parent = tripwire.client.wormholes[wormhole.id].initialID == signature.id ? "initial" : "secondary";
									wormhole.type = form.wormholeType.toUpperCase();
								} else if (form.wormholeType2.length > 0 && aSigWormholes[form.wormholeType2.toUpperCase()] && form.wormholeType2.toUpperCase() != "K162") {
									wormhole.parent = tripwire.client.wormholes[wormhole.id].initialID == signature.id ? "secondary" : "initial";
									wormhole.type = form.wormholeType2.toUpperCase();
								} else if (form.wormholeType.toUpperCase() == "K162") {
									wormhole.parent = tripwire.client.wormholes[wormhole.id].initialID == signature.id ? "secondary" : "initial";
									wormhole.type = "????";
								} else if (form.wormholeType2.toUpperCase() == "K162") {
									wormhole.parent = tripwire.client.wormholes[wormhole.id].initialID == signature.id ? "initial" : "secondary";
									wormhole.type = "????";
								}
							}

							// Shape and undo entry come from the shared module, so the
							// inline editor and this dialog cannot drift apart.
							payload = tripwire.signaturePayload.wormholeUpdatePayload(wormhole, signature, signature2);
							undo.push(tripwire.signaturePayload.undoEntryFor(signature.id));
						} else {
							payload = {"signatures": {"add": [{"wormhole": wormhole, "signatures": [signature, signature2]}]}};
						}
					} else {
						if (sigDialogVM.mode == "update") {
							var signature = {
								"id": $("#dialog-signature").data("signatureid"),
								"signatureID": form.signatureID_Alpha + form.signatureID_Numeric,
								"systemID": sigDialogVM.viewingSystemID,
								"type": form.signatureType,
								"name": form.signatureName,
								"lifeLength": form.signatureLength
							};
							payload = tripwire.signaturePayload.signatureUpdatePayload(signature);
							undo.push(tripwire.signaturePayload.undoEntryFor(signature.id));
						} else {
							var signature = {
								"signatureID": form.signatureID_Alpha + form.signatureID_Numeric,
								"systemID": sigDialogVM.viewingSystemID,
								"type": form.signatureType,
								"name": form.signatureName,
								"lifeLength": form.signatureLength
							};
							payload = {"signatures": {"add": [signature]}};
						}
					}

					$("#dialog-signature").parent().find(":button:contains('Save')").button("disable");

					var success = function(data) {
						if (data.resultSet && data.resultSet[0].result == true) {
							$("#dialog-signature").dialog("close");

							$("#undo").removeClass("disabled");

							if (sigDialogVM.mode == "add") {
								undo = data.results;
							}
							if (sigDialogVM.viewingSystemID in tripwire.signatures.undo) {
								tripwire.signatures.undo[sigDialogVM.viewingSystemID].push({action: sigDialogVM.mode, signatures: undo});
							} else {
								tripwire.signatures.undo[sigDialogVM.viewingSystemID] = [{action: sigDialogVM.mode, signatures: undo}];
							}

							sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
						}
					}

					var always = function() {
						$("#sigEditForm input[type=submit]").removeAttr("disabled");
						$("#dialog-signature").parent().find(":button:contains('Save')").button("enable");
					}

					tripwire.refresh('refresh', payload, success, always);
				});
			},
			open: function() {
				$("#dialog-signature").data("signatureid", "");
				$("#dialog-signature").data("signature2id", "");
				$("#dialog-signature").data("wormholeid", "");

				$("#dialog-signature input[type!='radio']").val("");
				$("#dialog-signature [name='signatureType']").val("unknown").selectmenu("refresh");

				$("#dialog-signature [name='wormholeLife'][value='stable']").prop("checked", true);
				$("#dialog-signature [name='wormholeMass'][value='stable']").prop("checked", true);
				
				$("#dialog-signature #site").show();
				$("#dialog-signature #wormhole").hide();

				// Side labels
				$("#dialog-signature .sideLabel:first").text(sigDialogVM.viewingSystem.name + " Side");
				$("#dialog-signature .sideLabel:last").text("Other Side");

				// Default signature life
				$("#dialog-signature #durationPicker").val(options.signatures.pasteLife * 60 * 60).change();

				var id = sigDialogVM.sigId;
				if (sigDialogVM.mode == "update" && id && tripwire.client.signatures[id]) {
					var signature = tripwire.client.signatures[id];
					$("#dialog-signature").data("signatureid", id);

					// Change the dialog buttons
					$("#dialog-signature").parent().find("button:contains('Add')").hide();
					$("#dialog-signature").parent().find("button:contains('Save')").show();
					$("#dialog-signature").parent().find("button:contains('Delete')").show();

					// Change the dialog title
					$("#dialog-signature").dialog("option", "title", "Edit Signature");

					if (signature.type == "wormhole") {
						var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == id || wormhole.secondaryID == id) return wormhole; })[0];
						var otherSignature = id == wormhole.initialID ? tripwire.client.signatures[wormhole.secondaryID] : tripwire.client.signatures[wormhole.initialID];
						$("#dialog-signature").data("signature2id", otherSignature.id);
						$("#dialog-signature").data("wormholeid", wormhole.id);
						
						const sigAlpha = signature.signatureID ? signature.signatureID.substr(0, 3) : "???";
						$("#dialog-signature input[name='signatureID_Alpha']").val(sigAlpha);
						$("#dialog-signature input[name='signatureID_Numeric']").val(signature.signatureID ? signature.signatureID.substr(3, 5) : "");
						$("#dialog-signature [name='signatureType']").val(signature.type).selectmenu("refresh").trigger("selectmenuchange");
						$("#dialog-signature [name='wormholeName']").val(signature.name);
						$("#dialog-signature [name='leadsTo']").val(tripwire.systems[otherSignature.systemID] ? tripwire.systems[otherSignature.systemID].name : (appData.genericSystemTypes[otherSignature.systemID] ? appData.genericSystemTypes[otherSignature.systemID] : ""));

						$("#dialog-signature input[name='signatureID2_Alpha']").val(otherSignature.signatureID ? otherSignature.signatureID.substr(0, 3) : "???");
						$("#dialog-signature input[name='signatureID2_Numeric']").val(otherSignature.signatureID ? otherSignature.signatureID.substr(3, 5) : "");
						$("#dialog-signature [name='wormholeName2']").val(otherSignature.name);
						var lifePreset = tripwire.signaturePayload.lifePreset(wormhole, signature);
						$("#dialog-signature [name='wormholeLife'][value='"+lifePreset+"']").prop("checked", true);
						$("#dialog-signature [name='wormholeMass'][value='"+wormhole.mass+"']").prop("checked", true);
						if (wormhole[wormhole.parent+"ID"] == signature.id) {
							$("#dialog-signature input[name='wormholeType']").val(wormhole.type).change();
						} else if (wormhole[wormhole.parent+"ID"] == otherSignature.id) {
							$("#dialog-signature input[name='wormholeType2']").val(wormhole.type).change();
						}
						$("#dialog-signature #durationPicker").val(signature.lifeLength).change();
						
						// Focus the sig ID, if it isn't set, otherwise the wormhole type
						if(sigAlpha != '???') { $("#dialog-signature input[name='wormholeType']").select(); }
						else { $("#dialog-signature input[name='signatureID_Alpha']").select(); }
						
						// Trigger the VM/display updates based on system
						$("#dialog-signature [name='leadsTo']").change();
					} else {
						$("#dialog-signature input[name='signatureID_Alpha']").val(signature.signatureID ? signature.signatureID.substr(0, 3) : "???");
						$("#dialog-signature input[name='signatureID_Numeric']").val(signature.signatureID ? signature.signatureID.substr(3, 5) : "");
						$("#dialog-signature [name='signatureType']").val(signature.type).selectmenu("refresh").trigger("selectmenuchange");
						$("#dialog-signature [name='signatureName']").val(signature.name);
						$("#dialog-signature #durationPicker").val(signature.lifeLength).change();
						
						// Not a wormhole - always focus the sig ID
						$("#dialog-signature input[name='signatureID_Alpha']").select();
					}

					// Hightlight first ID section, if not set, otherwise the name
				} else {
					// Change the dialog buttons
					$("#dialog-signature").parent().find("button:contains('Add')").show();
					$("#dialog-signature").parent().find("button:contains('Delete')").hide();
					$("#dialog-signature").parent().find("button:contains('Save')").hide();

					// Change the dialog title
					$("#dialog-signature").dialog("option", "title", "Add Signature");

					$("#dialog-signature [name='signatureType']").val(options.signatures.editType || "unknown").selectmenu("refresh")
					if ($("#dialog-signature [name='signatureType']").val() === "wormhole") {
						$("#dialog-signature #site").hide();
						$("#dialog-signature #wormhole").show();
					}
				}

				sigDialog.positionInViewport();
			},
			close: function() {
				ValidationTooltips.close();
				$("#sigTable tr.selected").removeClass("selected");
				$("#dialog-signature").data("signatureid", "");
				$("#dialog-signature").data("signature2id", "");
				$("#dialog-signature").data("wormholeid", "");
			}
		});
	} else if (!$("#dialog-signature").dialog("isOpen")) {
		$("#dialog-signature").dialog("open");
	}
};

$("#sigTable tbody").on("dblclick", "tr", {mode: "update", source:"sig-row"}, sigDialog.openSignatureDialog);
$("#edit-signature").on("click", {mode: "update", source:"edit-sig"}, sigDialog.openSignatureDialog);
$("#add-signature").click({mode: "add"}, sigDialog.openSignatureDialog);

// Signature overwrite. Attached to document because the element gets recreated each time
sigDialog.overwriteSignature = function(sigToRemove, completeFunction, always) {
	var payload = {"signatures": {"remove": []}, "systemID": viewingSystemID};
	var undo = [];

	var signature = tripwire.client.signatures[sigToRemove];
	if (signature.type != "wormhole") {
		undo.push(signature);
		payload.signatures.remove.push(signature.id);
	} else {
		var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.initialID == signature.id || wormhole.secondaryID == signature.id) return wormhole; })[0];
		undo.push({"wormhole": wormhole, "signatures": [tripwire.client.signatures[wormhole.initialID], tripwire.client.signatures[wormhole.secondaryID]]});
		payload.signatures.remove.push(wormhole);
	}

	var success = function(data) {
		$("#undo").removeClass("disabled");
		if (viewingSystemID in tripwire.signatures.undo) {
			tripwire.signatures.undo[viewingSystemID].push({action: "remove", signatures: undo});
		} else {
			tripwire.signatures.undo[viewingSystemID] = [{action: "remove", signatures: undo}];
		}

		sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
		
		completeFunction(data);
	}

	tripwire.refresh('refresh', payload, success, always);
}

/** Delegate the next action after sig overwrite to the save dialog */
sigDialog.delegateSave = function(data) {
	if (data.resultSet && data.resultSet[0].result == true) {
		ValidationTooltips.close();

		if ($("#dialog-signature").parent().find(":button:contains('Save')")) {
			$("#dialog-signature").parent().find(":button:contains('Save')").click();
		} else {
			$("#dialog-signature").parent().find(":button:contains('Add')").click();
		}
	}
}

$(document).on("click", "#overwrite", function() { 
	$("#overwrite").attr("disable", true);
	sigDialog.overwriteSignature($(this).data("id"), sigDialog.delegateSave, function() {
		$("#overwrite").removeAttr("disable");
	}); 
});
;
// #endregion

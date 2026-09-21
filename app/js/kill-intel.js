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

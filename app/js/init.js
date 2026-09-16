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

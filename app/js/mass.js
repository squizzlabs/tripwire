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

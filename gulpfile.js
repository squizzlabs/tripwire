const gulp = require('gulp');
const concat = require('gulp-concat');

// Source order is significant: several legacy scripts publish globals that
// later modules extend. Keep the readable source files as the debugging unit
// and concatenate them only to avoid dozens of requests on each page load.
const jsSources = [
	'app/js/helpers.js',
	'app/js/data-mutators/*.js',
	'app/js/map-data-suppliers/*.js',
	'app/js/init.js',
	'app/js/options.js',
	'app/js/layout.js',
	'app/js/tripwire.js',
	'app/js/global-hooks.js',
	'app/js/wormholeRendering.js',
	'app/js/widget-*.js',
	'app/js/systemAnalysis.js',
	'app/js/system-mutators/*.js',
	'app/js/guidance.js',
	'app/js/systemRendering.js',
	'app/js/chain-map-renderer*.js',
	'app/js/chain-map.js',
	'app/js/guidance_profiles.js',
	'app/js/systemPanel.js',
	'app/js/tripwire/*.js',
	'app/js/*.js',
	'app/js/**/*.js'
];

const cssSources = [
	'app/css/_tokens.css',
	'app/css/base.css',
	'app/css/*.css',
	'app/css/**/*.css',
	// Overrides and themes must come last. Excluding them from the broad globs
	// prevents gulp from deduplicating their explicitly ordered entries.
	'!app/css/_override-*.css',
	'!app/css/_theme-*.css',
	'app/css/_override-*.css',
	'app/css/_theme-base.css',
	'app/css/_theme-refit.css'
];

function buildJavaScript() {
	return gulp.src(jsSources)
		.pipe(concat('app.js'))
		.pipe(gulp.dest('public/js'));
}

function buildStyles() {
	return gulp.src(cssSources)
		.pipe(concat('app.css'))
		.pipe(gulp.dest('public/css'));
}

gulp.task('js', buildJavaScript);
gulp.task('css', buildStyles);
gulp.task('default', gulp.parallel(buildJavaScript, buildStyles));

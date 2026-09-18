const assert = require('assert');
const { include } = require('./helpers/helpers');

describe('Responsive signature toolbar', function() {
	let width;
	let observed;
	let widget;
	let previous;

	before(function() {
		previous = {
			document: global.document,
			window: global.window,
			ResizeObserver: global.ResizeObserver,
			$: global.$
		};

		width = 700;
		const classes = new Set();
		widget = {
			getBoundingClientRect: function() { return {width: width}; },
			classList: {
				toggle: function(name, enabled) {
					if (enabled) { classes.add(name); } else { classes.delete(name); }
				},
				contains: function(name) { return classes.has(name); }
			}
		};

		global.document = {
			getElementById: function(id) { return id === 'signaturesWidget' ? widget : null; }
		};
		global.$ = function(argument) {
			if (typeof argument === 'function') { argument(); }
			return {on: function() {}};
		};
		global.ResizeObserver = function(callback) {
			observed = callback;
			this.observe = function() {};
		};
		global.window = {ResizeObserver: global.ResizeObserver};

		include('app/js/signature-toolbar');
	});

	after(function() {
		global.document = previous.document;
		global.window = previous.window;
		global.ResizeObserver = previous.ResizeObserver;
		global.$ = previous.$;
	});

	it('compacts labels based on panel width, not viewport width', function() {
		assert.strictEqual(widget.classList.contains('signature-toolbar-compact'), true);
		assert.strictEqual(widget.classList.contains('signature-toolbar-wrap'), false);
	});

	it('wraps and restores the toolbar as the panel is resized', function() {
		width = 500;
		observed();
		assert.strictEqual(widget.classList.contains('signature-toolbar-wrap'), true);

		width = 900;
		observed();
		assert.strictEqual(widget.classList.contains('signature-toolbar-compact'), false);
		assert.strictEqual(widget.classList.contains('signature-toolbar-wrap'), false);
	});
});

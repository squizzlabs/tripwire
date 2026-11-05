const assert = require('assert');
const { include } = require('./helpers/helpers');

describe('Org-chart collapsing', function() {
	before(function() {
		include('chain-map-renderer-base');
		include('chain-map-renderer-orgchart-top');
		include('chain-map-renderer-orgchart-side');
		include('chain-map-renderer-radial');
		include('chain-map-renderer-orgchart');
	});

	it('exposes the collapse API in every map layout', function() {
		const owner = {updateCollapsed: function() {}};
		const renderers = [
			new ChainMapRendererOrgchart(owner),
			new ChainMapRendererOrgchartTop(owner),
			new ChainMapRendererOrgchartSide(owner),
			new ChainMapRendererRadial(owner)
		];

		renderers.forEach(function(renderer) {
			assert.strictEqual(typeof renderer.collapse, 'function');
			assert.strictEqual(typeof renderer.isCollapsed, 'function');
		});
	});

	it('centres the root axis in both directional tree layouts', function() {
		const owner = {updateCollapsed: function() {}};
		assert.deepStrictEqual(new ChainMapRendererOrgchartTop(owner).centringOptions, {x: true, rootNode: true});
		assert.deepStrictEqual(new ChainMapRendererOrgchartSide(owner).centringOptions, {y: true, rootNode: true});
	});

	describe('Classic Tree root spacing', function() {
		let savedGlobals;
		let renderer;
		let table;

		beforeEach(function() {
			savedGlobals = {document: global.document, google: global.google, options: global.options};
			table = {
				style: {paddingLeft: '900px', paddingRight: '400px'},
				getBoundingClientRect: () => ({left: 0, right: 3000})
			};
			global.document = {
				querySelector: () => table,
				getElementById: id => id === 'chainMap'
					? {style: {setProperty: function() {}}}
					: {getBoundingClientRect: () => ({left: 50, width: 100})}
			};
			global.google = {visualization: {
				DataView: function(data) { return data; },
				DataTable: function(data) { return data; }
			}};
			global.options = {chain: {}};
			renderer = new ChainMapRendererOrgchart({});
			renderer.map = {draw: function() {}};
		});

		afterEach(function() {
			Object.assign(global, savedGlobals);
		});

		function draw(parents) {
			renderer.draw({rows: parents.map((parent, index) => ({
				c: [{v: index + 1}, {v: parent}]
			}))}, [], []);
		}

		it('keeps K-space roots at the start of the chart without artificial padding', function() {
			draw([null, null, null, 1, 2, 3]);
			assert.strictEqual(table.style.paddingLeft, '0px');
			assert.strictEqual(table.style.paddingRight, '0px');
		});

		it('still balances a single root with an asymmetric subtree', function() {
			draw([null, 1, 1]);
			assert.strictEqual(table.style.paddingLeft, '2800px');
			assert.strictEqual(table.style.paddingRight, '0px');
		});

		it('clears single-root padding when switching to a multi-root or empty map', function() {
			draw([null, 1]);
			draw([null, null, 1, 2]);
			assert.strictEqual(table.style.paddingLeft, '0px');
			draw([null, 1]);
			draw([]);
			assert.strictEqual(table.style.paddingLeft, '0px');
			assert.strictEqual(table.style.paddingRight, '0px');
		});
	});

	it('does not cancel top-tree horizontal spacing while sizing wide nodes', function() {
		const renderer = new ChainMapRendererOrgchartTop({updateCollapsed: function() {}});
		global.options = {chain: {nodeSpacing: {x: 0.7, y: 1}}};
		const compactArc = renderer.calcMinArc({requestedSize: {width: 110}});

		global.options.chain.nodeSpacing.x = 1.4;
		const spaciousArc = renderer.calcMinArc({requestedSize: {width: 110}});

		// Arc allocation must stay stable so project() can scale the resulting
		// node positions by the selected spacing value.
		assert.strictEqual(spaciousArc, compactArc);
	});

	it('collapses a Classic Tree system from the context-menu renderer API', function() {
		const systemID = 30000142;
		let collapsedRows = [];
		let collapseCall = null;
		let savedSystems = null;

		global.$ = function(selector) {
			return {
				attr: function(name) {
					return selector.indexOf('[data-nodeid=') >= 0 && name === 'id' ? 'node7' : undefined;
				},
				data: function(name) {
					return selector === '#chainMap #node7' && name === 'nodeid' ? systemID : undefined;
				}
			};
		};

		const renderer = new ChainMapRendererOrgchart({
			updateCollapsed: function(systems) { savedSystems = systems; }
		});
		renderer.map = {
			collapse: function(row, collapsed) {
				collapseCall = {row: row, collapsed: collapsed};
				collapsedRows = collapsed ? [row] : [];
			},
			getCollapsedNodes: function() { return collapsedRows; }
		};

		renderer.collapse(systemID, true);

		assert.deepStrictEqual(collapseCall, {row: 6, collapsed: true});
		assert.deepStrictEqual(savedSystems, [systemID]);
		assert.strictEqual(renderer.isCollapsed(systemID), true);

		renderer.collapse(systemID, false);

		assert.deepStrictEqual(collapseCall, {row: 6, collapsed: false});
		assert.deepStrictEqual(savedSystems, []);
		assert.strictEqual(renderer.isCollapsed(systemID), false);
	});
});

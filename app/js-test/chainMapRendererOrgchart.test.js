const assert = require('assert');
const { include } = require('./helpers/helpers');

describe('Org-chart collapsing', function() {
	before(function() {
		include('app/js/chain-map-renderer-base');
		include('app/js/chain-map-renderer-orgchart-top');
		include('app/js/chain-map-renderer-orgchart-side');
		include('app/js/chain-map-renderer-radial');
		include('app/js/chain-map-renderer-orgchart');
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
		});
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

		renderer.collapse(systemID, false);

		assert.deepStrictEqual(collapseCall, {row: 6, collapsed: false});
		assert.deepStrictEqual(savedSystems, []);
	});
});

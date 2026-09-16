const assert = require('assert');
const { spawnSync } = require('child_process');
const { join } = require('path');

const projectRoot = join(__dirname, '..', '..');

function sanitise(html) {
	const encoded = Buffer.from(html).toString('base64');
	const script = 'require "note-html.inc.php"; echo sanitizeNoteHtml(base64_decode($argv[1]));';
	const result = spawnSync('php', ['-r', script, encoded], {
		cwd: projectRoot,
		encoding: 'utf8'
	});
	assert.strictEqual(result.status, 0, result.stderr);
	return result.stdout;
}

function hasContent(html) {
	const encoded = Buffer.from(html).toString('base64');
	const script = 'require "note-html.inc.php"; echo noteHtmlHasContent(base64_decode($argv[1])) ? "yes" : "no";';
	const result = spawnSync('php', ['-r', script, encoded], {
		cwd: projectRoot,
		encoding: 'utf8'
	});
	assert.strictEqual(result.status, 0, result.stderr);
	return result.stdout === 'yes';
}

describe('system note HTML sanitiser', function() {
	it('removes event handlers nested in forbidden wrappers', function() {
		const result = sanitise('<section><img src="/missing" onerror ="alert(1)"></section>');
		assert.match(result, /^<img /);
		assert.doesNotMatch(result, /onerror/i);
	});

	it('removes executable elements, URLs, and CSS', function() {
		const result = sanitise([
			'<script>alert(1)</script>',
			'<svg onload="alert(2)"></svg>',
			'<a href="javascript:alert(3)" onclick="alert(4)">bad</a>',
			'<span style="background:url(javascript:alert(5))">styled</span>'
		].join(''));

		assert.doesNotMatch(result, /<(?:script|svg)\b/i);
		assert.doesNotMatch(result, /(?:javascript:|onclick|onload|style=)/i);
	});

	it('keeps supported note formatting', function() {
		const result = sanitise('<p><strong>Safe</strong> <span style="color: #fff; font-size: 18px; position: fixed">sized colour</span> <font size="5">large</font> <a href="https://example.com" target="_blank">link</a></p>');
		assert.match(result, /<strong>Safe<\/strong>/);
		assert.match(result, /style="color: #fff; font-size: 18px"/);
		assert.match(result, /<font size="5">large<\/font>/);
		assert.doesNotMatch(result, /position/i);
		assert.match(result, /href="https:\/\/example\.com"/);
		assert.match(result, /rel="noopener noreferrer"/);
	});

	it('removes unsafe or disruptive note sizes', function() {
		const result = sanitise('<span style="font-size: 999px">huge</span><font size="99">also huge</font>');
		assert.doesNotMatch(result, /font-size|size=/i);
	});

	it('rejects rich-text markup that has no content', function() {
		assert.strictEqual(hasContent(''), false);
		assert.strictEqual(hasContent('<div><br></div><p>&nbsp;\u200b</p>'), false);
		assert.strictEqual(hasContent('<p>Actual note</p>'), true);
		assert.strictEqual(hasContent('<img src="/map.png" alt="Map">'), true);
	});
});

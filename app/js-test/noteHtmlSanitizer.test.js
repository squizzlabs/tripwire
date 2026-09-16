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
		const result = sanitise('<p><strong>Safe</strong> <span style="color: #fff; position: fixed">colour</span> <a href="https://example.com" target="_blank">link</a></p>');
		assert.match(result, /<strong>Safe<\/strong>/);
		assert.match(result, /style="color: #fff"/);
		assert.doesNotMatch(result, /position/i);
		assert.match(result, /href="https:\/\/example\.com"/);
		assert.match(result, /rel="noopener noreferrer"/);
	});
});

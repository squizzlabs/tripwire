const fs = require("fs");
const { readSource } = require("./source");

function read(section) {
  return (section.startsWith('public/') ? fs.readFileSync(section + '.js', 'utf8') : readSource(section))
	.replace(/^var /, '')
	.replace(/^const /, '')
	.replace(/\nconst /, '');
}
function include(section) {
	return eval.apply(global, [
		read(section) + '\n//# sourceURL=app.js/' + section
	]);
}
function loadJSON(f) {
	return JSON.parse(fs.readFileSync(f + '.json').toString());
}
function fake$(prop, fn) {
	if(!global.$) { global.$ = () => global.$; }	// this construction allows $.xyz and $('...').xyz to resolve
	if(!global.$[prop]) { global.$[prop] = fn; }
}

/** Fake out a call to $.ajax with static data from the given source.
Can call with no arguments to set up the $.ajax infrastructure.
The action in done() will be dispatched synchronously to simplify testing */
function fakeAjax(url, responseFile) {
	let responseData = null; 
	if(url || responseFile) {
		console.debug('faking URL ' + url);
		responseData = fs.readFileSync(responseFile).toString();
		if(responseFile.endsWith('.json')) { responseData = JSON.parse(responseData); }
		if(!responseData) { throw "couldn't read " + responseFile; }
		fakeAjaxRequestMap[url] = responseData;
	}
	
	// Create a fake $.ajax that will look up previously faked requests
	fake$();
	if(!$.ajax) {
		const requestBuilder = {};
		let fakeRequestUrl;
		requestBuilder.done = f => {
				if(fakeAjaxRequestMap[fakeRequestUrl] !== undefined) {
					f(fakeAjaxRequestMap[fakeRequestUrl]);
				}
				return requestBuilder;
			};
		requestBuilder.fail = f => {
			if(fakeAjaxRequestMap[fakeRequestUrl] === undefined) {
				f(null, 404, 'Unfaked request ' + fakeRequestUrl);
			}
		};
		$.ajax = data => {
			fakeRequestUrl = data.url;
			console.debug('intercepting URL ' + data.url);
			return requestBuilder;
		}
	}
}
const fakeAjaxRequestMap = {};

module.exports = { include, fakeAjax, loadJSON, fake$ };

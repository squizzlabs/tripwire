const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '../../../public/js/app.js');

function readSource(section) {
    const source = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
    const startMarker = '// #region ' + section + '\n';
    const start = source.indexOf(startMarker);
    const end = source.indexOf('\n// #endregion', start);
    if (start === -1 || end === -1) {
        throw new Error('Unknown application section: ' + section);
    }
    return source.slice(start + startMarker.length, end);
}

module.exports = { appPath, readSource };

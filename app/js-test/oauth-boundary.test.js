const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Browser OAuth boundary', function() {
    it('does not ship OAuth credentials or Authorization headers in application JavaScript', function() {
        const files = [
            path.resolve(__dirname, '../js/tripwire/esi.js'),
            path.resolve(__dirname, '../../public/js/app.min.js')
        ];

        for (const file of files) {
            const source = fs.readFileSync(file, 'utf8');
            assert.doesNotMatch(source, /accessToken|refreshToken|Authorization/);
        }
    });

    it('does not include OAuth credentials in refresh character data', function() {
        const source = fs.readFileSync(
            path.resolve(__dirname, '../../public/refresh.php'),
            'utf8'
        );

        assert.doesNotMatch(source, /\$output\['oauth'\]/);
        assert.doesNotMatch(source, /SELECT e\.characterID, e\.characterName, e\.accessToken/);
    });
});

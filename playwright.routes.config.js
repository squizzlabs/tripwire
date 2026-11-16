// Route tracker browser integration with synthetic map/location data and ESI
// responses. Does not require the authenticated deployment used by other E2E tests.
const {defineConfig} = require('@playwright/test');
module.exports = defineConfig({
    testDir: './e2e',
    testMatch: 'route-tracker.spec.js',
    timeout: 30000,
    workers: 1,
    reporter: 'list',
    use: {headless: true, viewport: {width: 1280, height: 900}}
});

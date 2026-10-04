import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    fullyParallel: false,
    workers: 1,
    timeout: 30000,
    use: { baseURL: 'http://127.0.0.1:4192', trace: 'retain-on-failure' },
    webServer: {
        command: 'node tests/browser/server.mjs',
        url: 'http://127.0.0.1:4192',
        reuseExistingServer: false
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'webkit-ipad', use: { ...devices['iPad Pro 11'], defaultBrowserType: 'webkit' } }
    ]
});

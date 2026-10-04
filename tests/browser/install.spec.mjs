import { test, expect } from '@playwright/test';
import { createAppServer } from './fixture.mjs';

async function ready(page) {
    await expect(page.locator('#offlineStatus')).toHaveText('Ready for offline practice.');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
}
for (const path of ['/', '/music-time/']) {
    test(`manifest, offline relaunch and practice at ${path}`, async ({
        page,
        context,
        browserName
    }) => {
        const server = createAppServer();
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const origin = `http://127.0.0.1:${server.address().port}`;
        const stopServer = async () => {
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
        };
        try {
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await page.goto(`${origin}${path}?progress-report#practiceHeading`);
            await ready(page);
            const manifest = await page.evaluate(async () => {
                const link = document.querySelector('link[rel="manifest"]');
                return { url: link.href, data: await (await fetch(link.href)).json() };
            });
            expect(new URL(manifest.data.start_url, manifest.url).pathname).toBe(path);
            expect(new URL(manifest.data.id, manifest.url).pathname).toBe(path);
            expect(new URL(manifest.data.scope, manifest.url).pathname).toBe(path);
            expect(manifest.data.display).toBe('standalone');
            for (const icon of manifest.data.icons) {
                const result = await page.evaluate(async (src) => {
                    const image = new Image();
                    image.src = src;
                    await image.decode();
                    return `${image.naturalWidth}x${image.naturalHeight}`;
                }, new URL(icon.src, manifest.url).href);
                expect(result).toBe(icon.sizes);
            }
            await expect(page.getByRole('link', { name: 'Progress Report' })).toHaveAttribute(
                'href',
                'http://localhost:4186/'
            );
            await page.locator('#installGuide summary').click();
            await expect(page.locator('#installGuide')).toContainText('Add to Home Screen');
            await page.reload();
            await expect
                .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
                .toBe(true);
            // WebKit offline emulation rejects even locally fulfilled worker responses:
            // https://github.com/microsoft/playwright/issues/42775
            // Stop the real origin in both engines; also exercise Chromium's offline signal.
            await stopServer();
            if (browserName === 'chromium') await context.setOffline(true);
            expect(
                await page.evaluate(() =>
                    fetch('uncached-network-probe').then(
                        () => false,
                        () => true
                    )
                )
            ).toBe(true);
            await page.goto(`${origin}${path}`);
            await expect(page.locator('#startBtn')).toBeEnabled();
            await expect(page.getByRole('link', { name: 'Progress Report' })).toHaveCount(0);
            await page.locator('#startBtn').click();
            await expect(page.locator('#stopwatchDisplay')).not.toHaveText('00:00:00');
            await page.locator('#pauseBtn').click();
            const elapsed = await page.locator('#stopwatchDisplay').textContent();
            await page.reload();
            await expect(page.locator('#stopwatchDisplay')).toHaveText(elapsed);
            await page.locator('#doneBtn').click();
            await expect(page.locator('#stopwatchDisplay')).toHaveText('00:00:00');
            expect(
                await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            ).toBe(true);
            expect(errors).toEqual([]);
        } finally {
            if (server.listening) await stopServer();
        }
    });
}

test('install guidance hides in a standalone window', async ({ page }) => {
    // Browser runners cannot install into iPadOS SpringBoard; emulate only its display signal.
    await page.addInitScript(() => {
        const original = window.matchMedia.bind(window);
        window.matchMedia = (query) =>
            query === '(display-mode: standalone)'
                ? Object.defineProperty(original(query), 'matches', { value: true })
                : original(query);
    });
    await page.goto('/');
    await expect(page.locator('#installGuide')).toBeHidden();
});

test('updates wait for all windows to close and retain practice data', async ({
    page,
    context,
    request
}) => {
    await request.post('/__release?version=1');
    await page.goto('/updates/');
    await ready(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-release', '1');
    await page.locator('#startBtn').click();
    await expect(page.locator('#stopwatchDisplay')).not.toHaveText('00:00:00');
    await page.locator('#pauseBtn').click();
    const saved = await page.evaluate(() => JSON.stringify(localStorage));
    const other = await context.newPage();
    await other.goto('/updates/');
    await request.post('/__release?version=2');
    await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update();
    });
    await expect
        .poll(() =>
            page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting)
        )
        .toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-release', '1');
    await expect(page.locator('#offlineStatus')).toContainText('An update is ready');
    await page.close();
    await other.reload();
    await expect(other.locator('html')).toHaveAttribute('data-release', '1');
    // Keep an out-of-scope window to observe activation without controlling the app.
    const observer = await context.newPage();
    await observer.goto('/manifest.json');
    await other.close();
    await expect
        .poll(() =>
            observer.evaluate(async () => {
                const reg = await navigator.serviceWorker.getRegistration('/updates/');
                return !!reg?.active && !reg.waiting;
            })
        )
        .toBe(true);
    await observer.goto('/updates/');
    await expect(observer.locator('html')).toHaveAttribute('data-release', '2');
    expect(await observer.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
    expect(await observer.evaluate(() => caches.keys())).toHaveLength(1);
    await expect(observer.locator('#startBtn')).toBeEnabled();
});

test('landscape, portrait and narrow layouts remain usable', async ({ page }) => {
    await page.goto('/');
    for (const [width, height] of [
        [1194, 834],
        [834, 1194],
        [375, 812]
    ]) {
        await page.setViewportSize({ width, height });
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
        await expect(page.locator('#startBtn')).toBeVisible();
    }
});

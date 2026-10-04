import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const install = await readFile(new URL('install.js', root), 'utf8');

test('install metadata keeps identity and icon URLs within either deployment scope', () => {
    for (const path of ['/', '/music-time/']) {
        const base = new URL(path, 'https://example.test');
        for (const property of ['id', 'start_url', 'scope'])
            assert.equal(new URL(manifest[property], base).href, base.href);
        for (const icon of manifest.icons)
            assert.ok(new URL(icon.src, base).pathname.startsWith(path));
    }
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.orientation, undefined);
    const doc = new JSDOM(html).window.document;
    assert.equal(doc.querySelector('link[rel="manifest"]').getAttribute('href'), 'manifest.json');
    assert.equal(doc.querySelector('meta[name="apple-mobile-web-app-capable"]').content, 'yes');
    assert.ok(doc.querySelector('meta[name="viewport"]').content.includes('viewport-fit=cover'));
});

test('all declared PNG icons exist at their actual sizes', async () => {
    const icons = [
        ...manifest.icons,
        { src: 'icons/apple-touch-icon.png', sizes: '180x180' },
        { src: 'icons/favicon-32.png', sizes: '32x32' }
    ];
    for (const icon of icons) {
        const bytes = await readFile(new URL(icon.src, root));
        assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
        assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
    }
});

for (const mode of ['browser', 'standalone', 'fullscreen', 'apple']) {
    test(`installation help follows ${mode} display mode without registering in source previews`, () => {
        const dom = new JSDOM(html, {
            runScripts: 'outside-only',
            url: 'https://example.test/music-time/'
        });
        const { window } = dom;
        window.matchMedia = (query) => ({
            matches: query === `(display-mode: ${mode})`,
            addEventListener() {}
        });
        if (mode === 'apple') window.navigator.standalone = true;
        window.eval(install);
        assert.equal(window.document.getElementById('installGuide').hidden, mode !== 'browser');
        assert.equal(window.document.getElementById('offlineStatus').hidden, true);
        window.close();
    });
}

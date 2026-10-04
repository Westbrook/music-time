import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Vector source stays editable; raster exports use the pinned Playwright browser.
const root = new URL('../icons/', import.meta.url);
const source = await readFile(new URL('app.svg', root), 'utf8');
const browser = await chromium.launch();
try {
    for (const [name, size, fullBleed] of [
        ['favicon-32.png', 32, false],
        ['apple-touch-icon.png', 180, true],
        ['icon-192.png', 192, false],
        ['icon-512.png', 512, false],
        ['maskable-512.png', 512, true]
    ]) {
        const page = await browser.newPage({
            viewport: { width: size, height: size },
            deviceScaleFactor: 1
        });
        const svg = fullBleed ? source.replace('rx="112"', 'rx="0"') : source;
        await page.setContent(
            `<style>html,body{margin:0;width:100%;height:100%;}svg{display:block;width:100%;height:100%;}</style>${svg}`
        );
        await writeFile(new URL(name, root), await page.screenshot({ omitBackground: true }));
        await page.close();
    }
} finally {
    await browser.close();
}

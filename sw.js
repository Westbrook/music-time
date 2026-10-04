/* The build replaces these tokens with a content hash and an explicit asset list. */
const VERSION = 'c5aae81403f1a511';
const FILES = ["index.html","styles.css","script.js","install.js","manifest.json","icons/app.svg","icons/favicon-32.png","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png"];
const PREFIX = `practice-timer:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const assetURLs = FILES.map((path) => new URL(path, self.registration.scope).href);
const homeURL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
    // Install atomically; never replace a running practice session with a new version.
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) =>
                cache.addAll(assetURLs.map((url) => new Request(url, { cache: 'reload' })))
            )
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names
                        .filter((name) => name.startsWith(PREFIX) && name !== CACHE)
                        .map((name) => caches.delete(name))
                )
            )
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    const root = new URL('./', self.registration.scope);
    // Only this single-page app's entry points and exact public assets are cached.
    // Never turn an unrelated page, a missing asset, or a report request into app HTML.
    const isHome =
        event.request.mode === 'navigate' &&
        url.origin === root.origin &&
        (url.pathname === root.pathname || url.pathname === new URL(homeURL).pathname);
    const key = isHome ? homeURL : url.href;
    if (!isHome && !assetURLs.includes(key)) return;
    event.respondWith(
        caches.open(CACHE).then(async (cache) => (await cache.match(key)) || fetch(event.request))
    );
});

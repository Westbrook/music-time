(() => {
    const installed = window.matchMedia('(display-mode: standalone)');
    const fullscreen = window.matchMedia('(display-mode: fullscreen)');
    const guide = document.getElementById('installGuide');
    const status = document.getElementById('offlineStatus');
    const updateGuide = () => {
        guide.hidden =
            installed.matches ||
            fullscreen.matches ||
            /** @type {Navigator & { standalone?: boolean }} */ (window.navigator).standalone ===
                true;
    };
    updateGuide();
    installed.addEventListener('change', updateGuide);
    fullscreen.addEventListener('change', updateGuide);

    // Source previews stay uncached; the publish build stamps a coherent offline shell.
    if (
        document.querySelector('meta[name="app-build"]').getAttribute('content') ===
            'development' ||
        !window.isSecureContext ||
        !('serviceWorker' in navigator)
    ) {
        return;
    }
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: './',
                updateViaCache: 'none'
            });
            const showReady = () => {
                status.textContent = registration.waiting
                    ? 'An update is ready. Close all Practice Timer windows and reopen to use it.'
                    : 'Ready for offline practice.';
                status.hidden = false;
            };
            const watchInstall = () => {
                const worker = registration.installing;
                worker?.addEventListener('statechange', () => {
                    if (worker.state === 'installed' || worker.state === 'activated') showReady();
                });
            };
            registration.addEventListener('updatefound', watchInstall);
            watchInstall();
            if (registration.active || registration.waiting) showReady();
        } catch {
            status.textContent =
                'Offline setup is unavailable. You can still practice while online.';
            status.hidden = false;
        }
    });
})();

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import publicFiles from '../../scripts/public-files.cjs';

const files = new Map(
    await Promise.all(
        publicFiles.map(async (file) => [
            file,
            await readFile(new URL(`../../dist/${file}`, import.meta.url))
        ])
    )
);

const mime = {
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/manifest+json',
    svg: 'image/svg+xml',
    png: 'image/png'
};
export function createAppServer() {
    let release = 1;
    return createServer((request, response) => {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname === '/__release' && request.method === 'POST') {
            release = Number(url.searchParams.get('version'));
            response.end('ok');
            return;
        }
        const prefix =
            ['/music-time/', '/updates/'].find((path) => url.pathname.startsWith(path)) || '/';
        const name = url.pathname.slice(prefix.length) || 'index.html';
        let body = files.get(name);
        if (!body) {
            response.writeHead(404);
            response.end('Not found');
            return;
        }
        if (prefix === '/updates/' && name === 'sw.js')
            body = body.toString().replace('const VERSION =', `const VERSION = '${release}-' +`);
        if (prefix === '/updates/' && name === 'index.html')
            body = body
                .toString()
                .replace('<html lang="en">', `<html lang="en" data-release="${release}">`);
        response.writeHead(200, {
            'Content-Type': mime[name.split('.').at(-1)],
            'Cache-Control': 'no-store'
        });
        response.end(body);
    });
}

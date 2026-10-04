import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import publicFiles from './public-files.cjs';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const contents = await Promise.all(publicFiles.map((file) => readFile(new URL(file, root))));
const hash = createHash('sha256');
for (let i = 0; i < publicFiles.length; i++) hash.update(publicFiles[i]).update(contents[i]);
const version = hash.digest('hex').slice(0, 16);

// Publish only runtime assets. Repository metadata and the private report stay local.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(
    publicFiles.map(async (file, index) => {
        const target = new URL(file, output);
        await mkdir(new URL('./', target), { recursive: true });
        let content = contents[index];
        if (file === 'index.html') {
            content = content
                .toString()
                .replace(
                    'name="app-build" content="development"',
                    `name="app-build" content="${version}"`
                );
        } else if (file === 'sw.js') {
            content = content
                .toString()
                .replace('__BUILD_VERSION__', version)
                .replace(
                    '__PRECACHE_FILES__',
                    JSON.stringify(publicFiles.filter((name) => name !== 'sw.js'))
                );
        }
        await writeFile(target, content);
    })
);
await writeFile(new URL('.nojekyll', output), '');
console.log(`Built dist/ with ${publicFiles.length} public assets (version ${version}).`);

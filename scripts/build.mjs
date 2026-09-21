import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
// Publish only runtime assets. Repository metadata and the private report stay local.
const files = ['index.html', 'styles.css', 'script.js'];
const contents = await Promise.all(files.map((file) => readFile(new URL(file, root))));

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((file, index) => writeFile(new URL(file, output), contents[index])));
await writeFile(new URL('.nojekyll', output), '');

console.log('Built dist/ with index.html, styles.css, script.js, and .nojekyll.');

const { readdir } = require('node:fs/promises');
const publicFiles = require('./public-files.cjs');

// gh-pages can retain tracked files from its initial source-branch clone.
// Check nested assets too; a permitted directory must not publish private files.
const allowed = new Set(['.nojekyll', ...publicFiles]);
async function extrasAt(root, path = '') {
    const extras = [];
    for (const entry of await readdir(`${root}/${path}`, { withFileTypes: true })) {
        const name = path + entry.name;
        if (name === '.git') continue;
        if (allowed.has(name) && entry.isFile()) continue;
        if (entry.isDirectory() && [...allowed].some((file) => file.startsWith(`${name}/`))) {
            extras.push(...(await extrasAt(root, `${name}/`)));
        } else {
            extras.push(name);
        }
    }
    return extras;
}
module.exports = async (git) => {
    const extras = await extrasAt(git.cwd);
    if (extras.length) await git.rm(extras);
    const remaining = await extrasAt(git.cwd);
    if (remaining.length) {
        throw new Error(`Unexpected files in Pages checkout: ${remaining.join(', ')}`);
    }
};

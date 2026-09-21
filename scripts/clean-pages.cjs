const { readdir } = require('node:fs/promises');

// gh-pages can retain tracked dotfiles from its initial source-branch clone.
// Clean only its temporary checkout, keeping the public bundle and Git metadata.
const allowed = new Set(['.git', '.nojekyll', 'index.html', 'script.js', 'styles.css']);

module.exports = async (git) => {
    const extras = (await readdir(git.cwd)).filter((name) => !allowed.has(name));
    if (extras.length) await git.rm(extras);
    const remaining = (await readdir(git.cwd)).filter((name) => !allowed.has(name));
    if (remaining.length) {
        throw new Error(`Unexpected files in Pages checkout: ${remaining.join(', ')}`);
    }
};

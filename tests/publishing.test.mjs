import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import Git from 'gh-pages/lib/git.js';
import cleanPages from '../scripts/clean-pages.cjs';

const publicFiles = ['.nojekyll', 'index.html', 'script.js', 'styles.css'];

async function createCheckout(t) {
    const cwd = await mkdtemp(join(tmpdir(), 'practice-pages-test-'));
    t.after(() => rm(cwd, { recursive: true, force: true }));
    const git = new Git(cwd);
    await git.init();
    await git.exec('config', 'user.name', 'Pages Test');
    await git.exec('config', 'user.email', 'pages-test@example.invalid');
    const sourceFiles = [
        ...publicFiles,
        '.github/workflows/quality.yml',
        '.github/.hidden/nested.txt',
        '.progress-report/project.json',
        '.nvmrc',
        'docs/.hidden/nested.txt',
        'package.json'
    ];
    for (const file of sourceFiles) {
        await mkdir(dirname(join(cwd, file)), { recursive: true });
        await writeFile(join(cwd, file), file === '.nojekyll' ? '' : `Fixture: ${file}`);
    }
    await git.add('.');
    await git.exec('commit', '-m', 'Source fixture');
    // gh-pages starts here when the remote has no publication branch yet.
    await git.exec('checkout', '--orphan', 'gh-pages');
    return git;
}

test('Pages cleanup removes inherited dotdirectories and preserves only the public bundle', async (t) => {
    const git = await createCheckout(t);
    const head = await readFile(join(git.cwd, '.git/HEAD'), 'utf8');

    await cleanPages(git);

    assert.deepEqual((await readdir(git.cwd)).sort(), ['.git', ...publicFiles].sort());
    assert.equal(await readFile(join(git.cwd, '.git/HEAD'), 'utf8'), head);
    for (const file of publicFiles) {
        assert.equal(
            await readFile(join(git.cwd, file), 'utf8'),
            file === '.nojekyll' ? '' : `Fixture: ${file}`
        );
    }
    await git.add('.');
    await git.exec('ls-files');
    assert.deepEqual(git.output.trim().split('\n'), publicFiles);
});

test('Pages cleanup refuses unexpected untracked files instead of adding them to publication', async (t) => {
    const git = await createCheckout(t);
    await writeFile(join(git.cwd, '.unexpected-local-data'), 'Keep this local');

    await assert.rejects(
        cleanPages(git),
        /Unexpected files in Pages checkout: \.unexpected-local-data/
    );

    assert.equal(
        await readFile(join(git.cwd, '.unexpected-local-data'), 'utf8'),
        'Keep this local'
    );
    assert.equal(await readFile(join(git.cwd, 'index.html'), 'utf8'), 'Fixture: index.html');
});

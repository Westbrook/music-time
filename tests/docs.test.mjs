import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

// This is deliberately not a general Markdown parser. Repository documentation
// uses ATX (#) headings and inline links with plain or <angle-bracketed> paths.
// Reference-style links and embedded HTML are outside this check's scope.
function withoutFencedCode(markdown) {
    let fence;
    return markdown
        .split(/\r?\n/)
        .map((line) => {
            const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
            if (fence) {
                if (
                    marker?.[0] === fence[0] &&
                    marker.length >= fence.length &&
                    /^ {0,3}(?:`+|~+)\s*$/.test(line)
                ) {
                    fence = undefined;
                }
                return '';
            }
            if (marker) {
                fence = marker;
                return '';
            }
            return line;
        })
        .join('\n');
}

function inlineLinks(markdown) {
    const prose = withoutFencedCode(markdown).replace(/(`+)([^`]|(?!\1)`)*?\1/g, '');
    const links = /\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)/g;
    return [...prose.matchAll(links)].map((match) => match[1] ?? match[2]);
}

function headingIds(markdown) {
    const ids = new Set();
    for (const line of withoutFencedCode(markdown).split('\n')) {
        const heading = /^ {0,3}#{1,6}\s+(.+)$/.exec(line)?.[1];
        if (!heading) continue;
        const base = heading
            .replace(/\s+#+\s*$/, '')
            .trim()
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/<[^>]*>/g, '')
            .toLowerCase()
            .replace(/[^\p{L}\p{M}\p{N}_ -]/gu, '')
            .replace(/ /g, '-');
        let id = base;
        for (let suffix = 1; ids.has(id); suffix++) id = `${base}-${suffix}`;
        ids.add(id);
    }
    return ids;
}

function markdownFiles(directory, recursive = false) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory() && (recursive || entry.name === 'docs')) {
            return markdownFiles(path, true);
        }
        return entry.isFile() && extname(path) === '.md' ? [path] : [];
    });
}

test('documentation parsing ignores fenced and inline code examples', () => {
    const markdown = [
        '[relative](README.md#setup)',
        '[space in path](<some guide.md>)',
        '`[inline example](missing.md)`',
        '````md',
        '[fenced example](missing.md)',
        '```',
        '# Not a heading',
        '````',
        '~~~',
        '[another fenced example](missing.md)',
        '~~~',
        '[same page](#setup)',
        '# Setup'
    ].join('\n');

    assert.deepEqual(inlineLinks(markdown), ['README.md#setup', 'some guide.md', '#setup']);
    assert.deepEqual([...headingIds(markdown)], ['setup']);
});

test('documentation heading anchors preserve code labels and disambiguate duplicates', () => {
    const markdown = [
        '# Setup',
        '## Setup',
        '## Setup-1',
        '## Setup',
        '### **Saved** `dailyData` & [history](README.md) ###'
    ].join('\n');

    assert.deepEqual(
        [...headingIds(markdown)],
        ['setup', 'setup-1', 'setup-1-1', 'setup-2', 'saved-dailydata--history']
    );
});

for (const document of markdownFiles(repositoryRoot).sort()) {
    const source = relative(repositoryRoot, document);
    test(`${source} has valid relative documentation links`, () => {
        for (const link of inlineLinks(readFileSync(document, 'utf8'))) {
            // Do not fetch external sites or mistake protocol-relative URLs for files.
            if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
            const target = new URL(link, pathToFileURL(document));
            const targetPath = fileURLToPath(target);
            const repositoryPath = relative(repositoryRoot, targetPath);
            const context = `${source}: ${link}`;
            assert.ok(
                repositoryPath !== '..' && !repositoryPath.startsWith(`..${sep}`),
                `${context} points outside the repository`
            );
            assert.ok(existsSync(targetPath), `${context} points to a missing file`);
            if (target.hash && extname(targetPath) === '.md') {
                const fragment = decodeURIComponent(target.hash.slice(1));
                const ids = headingIds(readFileSync(targetPath, 'utf8'));
                assert.ok(ids.has(fragment), `${context} points to a missing heading`);
            }
        }
    });
}

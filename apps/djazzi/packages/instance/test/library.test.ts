import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBRARY_SOURCE, librarySkill, seedLibrary } from '../src/library.js';
import { seedWorkdir } from '../src/seed.js';

async function tmp() { return fs.mkdtemp(path.join(os.tmpdir(), 'djazzi-library-')); }

async function fakeLibrary(version: string) {
  const dir = await tmp();
  await fs.mkdir(path.join(dir, 'marketing', 'social'), { recursive: true });
  await fs.writeFile(path.join(dir, 'VERSION'), version + '\n');
  await fs.writeFile(path.join(dir, 'INDEX.md'), '# Djazzi skill library\n\n- `marketing/` (1): Marketing\n');
  await fs.writeFile(path.join(dir, 'marketing', 'INDEX.md'), '- `social` — posts\n');
  await fs.writeFile(path.join(dir, 'marketing', 'social', 'SKILL.md'), 'v' + version);
  return dir;
}

const skill = (dir: string) => fs.readFile(path.join(dir, 'skills', 'djazzi-library', 'SKILL.md'), 'utf8');
const social = (dir: string) => fs.readFile(path.join(dir, 'library', 'marketing', 'social', 'SKILL.md'), 'utf8');

// DJAZZI(28/11/2026): the skill library — one skill in the catalog, the
// playbooks read from the workdir only when needed.
describe('skill library', () => {
  it('copies the library into the workdir and writes the one skill that points to it', async () => {
    const work = await tmp();
    await seedWorkdir({ workDir: work, instanceToken: 't', assistantModel: 'm', librarySource: await fakeLibrary('1') });
    expect(await social(work)).toBe('v1');
    const text = await skill(work);
    expect(text).toMatch(/^---\nname: Skill library\ndescription: .+\ntools: \[file-grep, file-readText, file-list\]\n---\n/);
    expect(text).toContain('- `marketing/` (1): Marketing');
    expect(text).not.toContain('# Djazzi skill library');
  });

  it('replaces the library only when the image brings another version', async () => {
    const work = await tmp();
    await seedLibrary(work, await fakeLibrary('1'));
    await fs.writeFile(path.join(work, 'library', 'stale.md'), 'old');
    const same = await fakeLibrary('1');
    await fs.writeFile(path.join(same, 'marketing', 'social', 'SKILL.md'), 'changed but same version');
    await seedLibrary(work, same);
    expect(await social(work)).toBe('v1');
    await seedLibrary(work, await fakeLibrary('2'));
    expect(await social(work)).toBe('v2');
    await expect(fs.access(path.join(work, 'library', 'stale.md'))).rejects.toThrow();
  });

  it('leaves the workdir alone without a library', async () => {
    const work = await tmp();
    expect(await seedLibrary(work, await tmp())).toBe(false);
    await seedWorkdir({ workDir: work, instanceToken: 't', assistantModel: 'm' });
    await expect(fs.access(path.join(work, 'skills', 'djazzi-library'))).rejects.toThrow();
  });

  it('only names tools a disk skill may name', () => {
    expect(librarySkill('# x\n')).toContain('tools: [file-grep, file-readText, file-list]');
  });

  // The generated library itself (apps/djazzi/scripts/skill-library.py),
  // when it was built here: the image build always makes it.
  it.skipIf(!existsSync(path.join(LIBRARY_SOURCE, 'INDEX.md')))('ships every skill with Djazzi\'s note, an index entry and its licence', async () => {
    const index = await fs.readFile(path.join(LIBRARY_SOURCE, 'INDEX.md'), 'utf8');
    const categories = [...index.matchAll(/^- `([a-z]+)\/` \((\d+)\)/gm)];
    expect(categories.length).toBeGreaterThan(5);
    for (const [, category, count] of categories) {
      const entries = [...(await fs.readFile(path.join(LIBRARY_SOURCE, category, 'INDEX.md'), 'utf8')).matchAll(/^- `([a-z0-9-]+)` — /gm)];
      expect(entries).toHaveLength(Number(count));
      for (const [, id] of entries) {
        const text = await fs.readFile(path.join(LIBRARY_SOURCE, category, id, 'SKILL.md'), 'utf8');
        expect(text, `${category}/${id}`).toContain('> **In Djazzi (read first).**');
        expect(text, `${category}/${id}`).toContain('Never invent figures');
      }
    }
    const sources = await fs.readFile(path.join(LIBRARY_SOURCE, 'SOURCES.md'), 'utf8');
    for (const [, file] of sources.matchAll(/Licence: `(licenses\/[^`]+)`/g)) {
      await expect(fs.access(path.join(LIBRARY_SOURCE, file))).resolves.toBeUndefined();
    }
  });
});

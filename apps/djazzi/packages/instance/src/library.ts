import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Djazzi's skill library (28/11/2026): hundreds of expert playbooks borrowed
// under free licences (apps/djazzi/scripts/skill-library.py builds them into
// ../library). Listing each one in the skill catalog would weigh on every
// chat's prompt, so a single disk skill points to the library and the agent
// reads only the playbook it needs, with the file tools it always has
// (file-grep, file-readText: inside the workdir, nothing to approve). No
// upstream file changes (UPSTREAM.md §2).

/** Where the instance image keeps the generated library (Dockerfile). */
export const LIBRARY_SOURCE = fileURLToPath(new URL('../library/', import.meta.url));
/** Where the agents read it: in the workdir, rewritten when the image brings a new version. */
export const LIBRARY_DIR = 'library';
export const LIBRARY_SKILL_DIR = 'djazzi-library';

export function librarySkill(index: string): string {
  return `---
name: Skill library
description: Expert playbooks for specialised work — marketing and social media, SEO, copywriting, sales, starting and running a business, pricing, finance, operations and productivity, customer follow-up, research, product, compliance, design, music, video, 3D and software engineering. Load when a request needs know-how no other skill covers, or to do a professional task the way an expert would.
tools: [file-grep, file-readText, file-list]
---

# Skill library

\`${LIBRARY_DIR}/\` in the workdir holds hundreds of expert playbooks. Read only the one the task needs:

1. Pick the category below, then read its \`${LIBRARY_DIR}/<category>/INDEX.md\` (one line per skill: \`id\` — what it is for). Unsure of the category: \`file-grep\` a keyword with \`searchPath: "${LIBRARY_DIR}"\` and \`fileGlob: "INDEX.md"\`.
2. Read \`${LIBRARY_DIR}/<category>/<id>/SKILL.md\` with \`file-readText\`, then any file it points to in the same folder when the task needs it.
3. Follow it, under its « In Djazzi » note: Djazzi's context first, the user's language, no invented figures, nothing sent or published without a yes.

Use one or two playbooks per task, not more. Say which one you followed only if the user asks. If none fits, do the task with your own judgment.

${index.replace(/^# .*\n+/, '').trim()}
`;
}

async function readText(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Copies the library into the workdir when the image brings another version
 * (its VERSION), and writes the skill that points to it. Ours entirely: the
 * folder is replaced, never merged. No library in the image: nothing changes.
 */
export async function seedLibrary(workDir: string, source = LIBRARY_SOURCE): Promise<boolean> {
  const version = await readText(path.join(source, 'VERSION'));
  const index = await readText(path.join(source, 'INDEX.md'));
  if (!version || !index) return false;
  const target = path.join(workDir, LIBRARY_DIR);
  if ((await readText(path.join(target, 'VERSION'))) !== version) {
    const fresh = `${target}.new`;
    await fs.rm(fresh, { recursive: true, force: true });
    await fs.cp(source, fresh, { recursive: true });
    await fs.rm(target, { recursive: true, force: true });
    await fs.rename(fresh, target);
  }
  const skillDir = path.join(workDir, 'skills', LIBRARY_SKILL_DIR);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), librarySkill(index));
  return true;
}

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
const { workDir } = vi.hoisted(() => ({ workDir: `/tmp/baarasseurs-test-${process.pid}` }));
vi.mock('../config/config.js', () => ({ WorkDir: workDir }));
vi.mock('../runtime/assembly/copilot/agent.js', () => ({
    buildCopilotAgent: async () => ({
        name: 'rowboatx',
        instructions: 'COPILOT',
        tools: { 'web-search': { type: 'builtin', name: 'web-search' } },
    }),
}));
import { loadAgent } from '../runtime/assembly/registry.js';
import { carriesSkillsForward, hasWorkspaceContext } from '../runtime/assembly/traits.js';
import { askApproval, rememberFor, tallyBaarasseurUsage, updateFor } from './repo.js';
import { baarasseurTools } from '../runtime/tools/domains/baarasseurs.js';
import { addUsage, approvalAnswer, duplicateOf, nextRunAt, parseApprovals, parseUsage, personaInstructions, scheduleCron, parseBaarasseurs, withApproval, type Baarasseur, type BaarasseurApproval } from '@x/shared/dist/baarasseur.js';

const mariama: Baarasseur = {
    id: 'mariama', name: 'Mariama', role: 'Commerciale', mission: 'Relance mes prospects.', color: 'clay',
    tools: ['Gmail', 'WhatsApp'], model: 'deepseek/deepseek-v4', provider: 'rowboat',
    schedule: { every: 'week', day: 1, hour: 8 }, memory: [], createdAt: '2026-10-06T10:00:00Z',
};

async function write(list: unknown[]) {
    await fs.mkdir(path.join(workDir, 'config'), { recursive: true });
    await fs.writeFile(path.join(workDir, 'config', 'baarasseurs.json'), JSON.stringify({ baarasseurs: list }));
}

describe('the baarasseurs (06/10/2026)', () => {
    beforeEach(() => write([mariama]));
    afterAll(() => fs.rm(workDir, { recursive: true, force: true }));

    it('loads one as the copilot with its persona, its memory and name tools and its model', async () => {
        const agent = await loadAgent('baarasseur-mariama');
        expect(agent.instructions.startsWith('COPILOT\n\n# You are Mariama, Commerciale')).toBe(true);
        expect(agent.instructions).toContain('<mission>\nRelance mes prospects.\n</mission>');
        expect(agent.instructions).toContain('every Monday at 8:00');
        expect(Object.keys(agent.tools ?? {})).toEqual(['web-search', 'baarasseur-remember', 'baarasseur-update', 'baarasseur-ask-approval']);
        expect(agent).toMatchObject({ name: 'baarasseur-mariama', model: 'deepseek/deepseek-v4', provider: 'rowboat' });
    });

    it('has the copilot traits, so it keeps the workspace and its skills', () => {
        expect(hasWorkspaceContext('baarasseur-mariama')).toBe(true);
        expect(carriesSkillsForward('baarasseur-mariama')).toBe(true);
    });

    it('hands a removed baarasseur\'s old conversations to the assistant', async () => {
        const agent = await loadAgent('baarasseur-kofi');
        expect(agent).toMatchObject({ name: 'baarasseur-kofi', instructions: 'COPILOT' });
        expect(Object.keys(agent.tools ?? {})).toEqual(['web-search']);
    });

    it('remembers a rule once, keeps the rest of the file, and shows it in the next prompt', async () => {
        // DJAZZI(11/10/2026): learning a rule must preserve the avatar selected in the app.
        await write([{ ...mariama, avatar: 'street' }, { id: 'ibrahim', name: 'Ibrahim', createdAt: 'x', extra: 1 }]);
        expect(await rememberFor('mariama', '  Livraison offerte   au-delà de 50 sacs ')).toEqual(['Livraison offerte au-delà de 50 sacs']);
        expect(await rememberFor('mariama', 'Livraison offerte au-delà de 50 sacs')).toHaveLength(1);
        expect(await rememberFor('nobody', 'x')).toBeNull();
        const raw = JSON.parse(await fs.readFile(path.join(workDir, 'config', 'baarasseurs.json'), 'utf8'));
        expect(raw.baarasseurs[0].avatar).toBe('street');
        expect(raw.baarasseurs[1]).toEqual({ id: 'ibrahim', name: 'Ibrahim', createdAt: 'x', extra: 1 });
        const agent = await loadAgent('baarasseur-mariama');
        expect(agent.instructions).toContain('- Livraison offerte au-delà de 50 sacs');
    });

    // DJAZZI(07/11/2026): the first meeting, then a new name from the conversation.
    it('gets to know the user until it remembers something, and renames itself on request', async () => {
        expect(personaInstructions({ ...mariama, memory: [] })).toContain('## First meeting');
        // DJAZZI(27/11/2026): it never asks again what the person already told Djazzi.
        expect(personaInstructions({ ...mariama, memory: [] })).toContain('never ask what it already says');
        expect(personaInstructions({ ...mariama, memory: ['Appeler l’utilisateur Yann'] })).not.toContain('## First meeting');
        expect(personaInstructions(mariama)).toContain('baarasseur-update');
        expect(personaInstructions({ ...mariama, role: '' })).toContain('## Your title');
        expect(personaInstructions(mariama)).not.toContain('## Your title');
        await write([{ ...mariama, avatar: 'street' }]);
        expect(await updateFor('mariama', { name: '  Awa  ', role: 'Comptable' })).toEqual({ name: 'Awa', role: 'Comptable' });
        expect(await updateFor('mariama', {})).toBeNull();
        expect(await updateFor('nobody', { name: 'x' })).toBeNull();
        const raw = JSON.parse(await fs.readFile(path.join(workDir, 'config', 'baarasseurs.json'), 'utf8'));
        expect(raw.baarasseurs[0]).toMatchObject({ name: 'Awa', role: 'Comptable', avatar: 'street' });
    });

    it('turns hours into cron, and forbids sending during a scheduled run', () => {
        expect(scheduleCron({ every: 'day', hour: 7 })).toBe('0 7 * * *');
        expect(scheduleCron({ every: 'weekday', hour: 9 })).toBe('0 9 * * 1-5');
        expect(scheduleCron({ every: 'month', day: 5, hour: 8 })).toBe('0 8 5 * *');
        expect(personaInstructions(mariama)).toContain('never send, publish, post, pay or delete');
        expect(personaInstructions({ ...mariama, schedule: null })).not.toContain('Your hours');
    });

    it('says when it next works on its own', () => {
        // Wednesday 8 October 2026, 09:30 local time.
        const wed = new Date(2026, 9, 8, 9, 30);
        expect(nextRunAt({ every: 'week', day: 1, hour: 8 }, wed)).toEqual(new Date(2026, 9, 12, 8));
        expect(nextRunAt({ every: 'day', hour: 18 }, wed)).toEqual(new Date(2026, 9, 8, 18));
        expect(nextRunAt({ every: 'day', hour: 8 }, wed)).toEqual(new Date(2026, 9, 9, 8));
        expect(nextRunAt({ every: 'weekday', hour: 8 }, new Date(2026, 9, 9, 9))).toEqual(new Date(2026, 9, 12, 8));
        expect(nextRunAt({ every: 'month', day: 5, hour: 8 }, wed)).toEqual(new Date(2026, 10, 5, 8));
    });

    it('points it to its documents, and says nothing of them when it has none', () => {
        const withDocs = personaInstructions({ ...mariama, documents: ['baarasseurs/mariama/Grille-prix-2026.xlsx'] });
        expect(withDocs).toContain('## Your documents');
        expect(withDocs).toContain('- baarasseurs/mariama/Grille-prix-2026.xlsx');
        expect(personaInstructions(mariama)).not.toContain('Your documents');
        expect(parseBaarasseurs(JSON.stringify({ baarasseurs: [mariama] }))[0].documents).toEqual([]);
    });

    it('drops a broken entry, not the whole team', () => {
        expect(parseBaarasseurs(JSON.stringify({ baarasseurs: [mariama, { id: 'BAD ID' }] })).map((b) => b.id)).toEqual(['mariama']);
        expect(parseBaarasseurs('not json')).toEqual([]);
    });

    // DJAZZI(26/11/2026): the Djazzi Bots page.
    it('puts what waits for the user on the « À valider » list, from the conversation it asked in', async () => {
        await fs.rm(path.join(workDir, 'config', 'baarasseurs-approvals.json'), { force: true });
        expect(personaInstructions(mariama)).toContain('In a scheduled run (nobody is watching), call `baarasseur-ask-approval`');
        const tool = baarasseurTools['baarasseur-ask-approval'];
        const res = await tool.execute({ id: 'mariama', summary: '  Envoyer une relance\n à 3 prospects ', detail: 'Bonjour…' }, { sessionId: 's1', runId: 'r1' });
        expect(res.success).toBe(true);
        const list = parseApprovals(await fs.readFile(path.join(workDir, 'config', 'baarasseurs-approvals.json'), 'utf8'));
        expect(list).toHaveLength(1);
        expect(list[0]).toMatchObject({ bot: 'mariama', sessionId: 's1', runId: 'r1', summary: 'Envoyer une relance à 3 prospects', detail: 'Bonjour…', status: 'pending' });
        expect(await askApproval({ bot: 'nobody', summary: 'x' })).toBeNull();
        expect(await askApproval({ bot: 'mariama', summary: '   ' })).toBeNull();
    });

    it('keeps the list bounded, dropping decided ones before pending ones', () => {
        const one = (id: string, status: BaarasseurApproval['status']): BaarasseurApproval => ({ id, bot: 'm', sessionId: null, runId: '', summary: id, detail: '', createdAt: '2026-11-26T00:00:00Z', status });
        const full = Array.from({ length: 200 }, (_, i) => one(`p${i}`, i === 5 ? 'approved' : 'pending'));
        const next = withApproval(full, one('new', 'pending'));
        expect(next).toHaveLength(200);
        expect(next.some((a) => a.id === 'p5')).toBe(false);
        expect(next.at(-1)?.id).toBe('new');
        expect(approvalAnswer({ summary: 'Envoyer', detail: '', sessionId: null }, true, 'fr')).toContain('Oui');
        expect(approvalAnswer({ summary: 'Envoyer', detail: 'Bonjour…', sessionId: 's1' }, false, 'en')).toBe("No, don't do it: Envoyer. Keep it as a draft and tell me what you suggest instead.");
        // From a scheduled run, the answer opens a new conversation: the draft goes with it.
        expect(approvalAnswer({ summary: 'Envoyer', detail: 'Bonjour…', sessionId: null }, true, 'fr')).toContain('Ce que tu avais préparé :\nBonjour…');
    });

    it('counts each bot\'s tokens by month, and nothing for the assistant', async () => {
        await fs.rm(path.join(workDir, 'config', 'baarasseurs-usage.json'), { force: true });
        tallyBaarasseurUsage('baarasseur-mariama', 100, 20);
        tallyBaarasseurUsage('baarasseur-mariama', 50, 5);
        tallyBaarasseurUsage('copilot', 999, 999);
        await vi.waitFor(async () => {
            const months = parseUsage(await fs.readFile(path.join(workDir, 'config', 'baarasseurs-usage.json'), 'utf8'));
            expect(Object.values(months)[0]).toEqual({ mariama: { inputTokens: 150, outputTokens: 25 } });
        });
        let months = {};
        for (let m = 0; m < 14; m++) months = addUsage(months, 'x', new Date(2026, m, 3), 1, 1);
        expect(Object.keys(months)).toHaveLength(12);
    });

    it('duplicates one under a free name, without what it learnt of the user', () => {
        const copy = duplicateOf({ ...mariama, memory: ['Tutoie-moi'], paused: true }, ['mariama'], 'fr');
        expect(copy.name).toBe('Mariama (copie)');
        expect(copy.id).not.toBe('mariama');
        expect(copy.memory).toEqual([]);
        expect(copy.paused).toBe(true);
        expect(duplicateOf({ ...mariama, schedule: null }, ['mariama'], 'fr').paused).toBe(false);
        expect(parseBaarasseurs(JSON.stringify({ baarasseurs: [{ ...mariama, paused: true }] }))[0].paused).toBe(true);
    });
});

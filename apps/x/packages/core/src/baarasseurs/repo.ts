import fs from "fs/promises";
import path from "path";
import { WorkDir } from "../config/config.js";
import { randomUUID } from "crypto";
import {
    APPROVALS_PATH,
    BAARASSEURS_PATH,
    BAARASSEUR_PREFIX,
    MEMORY_LIMIT,
    USAGE_PATH,
    addUsage,
    parseApprovals,
    parseBaarasseurs,
    parseUsage,
    withApproval,
    type Baarasseur,
    type BaarasseurApproval,
} from "@x/shared/dist/baarasseur.js";

// DJAZZI(06/10/2026): the baarasseurs file, read on every turn so an edit in
// the app applies to the next message. The app writes it whole; the core only
// adds a rule to one baarasseur's memory.

const filePath = () => path.join(WorkDir, BAARASSEURS_PATH);

export async function listBaarasseurs(): Promise<Baarasseur[]> {
    try {
        return parseBaarasseurs(await fs.readFile(filePath(), "utf8"));
    } catch {
        return [];
    }
}

export async function findBaarasseur(id: string): Promise<Baarasseur | null> {
    return (await listBaarasseurs()).find((b) => b.id === id) ?? null;
}

/** Adds one rule to its memory; the oldest goes when it is full. Returns the memory. */
export async function rememberFor(id: string, note: string): Promise<string[] | null> {
    const line = note.replace(/\s+/g, " ").trim().slice(0, 300);
    if (!line) return null;
    let raw: { baarasseurs?: unknown[] } & Record<string, unknown>;
    try {
        raw = JSON.parse(await fs.readFile(filePath(), "utf8"));
    } catch {
        return null;
    }
    const list = Array.isArray(raw.baarasseurs) ? raw.baarasseurs : [];
    const entry = list.find((b) => (b as { id?: unknown })?.id === id) as { memory?: unknown } | undefined;
    if (!entry) return null;
    const memory = Array.isArray(entry.memory) ? entry.memory.filter((m): m is string => typeof m === "string") : [];
    if (!memory.includes(line)) memory.push(line);
    entry.memory = memory.slice(-MEMORY_LIMIT);
    await fs.writeFile(filePath(), JSON.stringify(raw, null, 2));
    return entry.memory as string[];
}

/** Renames it or changes its role, as the user asked in a conversation. Returns it. */
export async function updateFor(id: string, patch: { name?: string; role?: string }): Promise<{ name: string; role: string } | null> {
    const name = patch.name?.replace(/\s+/g, " ").trim().slice(0, 40);
    const role = patch.role?.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!name && role === undefined) return null;
    let raw: { baarasseurs?: unknown[] } & Record<string, unknown>;
    try {
        raw = JSON.parse(await fs.readFile(filePath(), "utf8"));
    } catch {
        return null;
    }
    const list = Array.isArray(raw.baarasseurs) ? raw.baarasseurs : [];
    const entry = list.find((b) => (b as { id?: unknown })?.id === id) as { name?: unknown; role?: unknown } | undefined;
    if (!entry) return null;
    if (name) entry.name = name;
    if (role !== undefined) entry.role = role;
    await fs.writeFile(filePath(), JSON.stringify(raw, null, 2));
    return { name: String(entry.name ?? ""), role: String(entry.role ?? "") };
}

// DJAZZI(26/11/2026): the « À valider » list of the Djazzi Bots page. The bot
// adds what waits for the user; the app marks it approved or refused and says
// so in the bot's conversation.
const approvalsPath = () => path.join(WorkDir, APPROVALS_PATH);

export async function askApproval(input: {
    bot: string;
    summary: string;
    detail?: string;
    sessionId?: string | null;
    runId?: string;
}): Promise<BaarasseurApproval | null> {
    const summary = input.summary.replace(/\s+/g, " ").trim().slice(0, 300);
    if (!summary || !(await findBaarasseur(input.bot))) return null;
    let current: BaarasseurApproval[] = [];
    try {
        current = parseApprovals(await fs.readFile(approvalsPath(), "utf8"));
    } catch {
        // No list yet: the first one.
    }
    const approval: BaarasseurApproval = {
        id: randomUUID(),
        bot: input.bot,
        sessionId: input.sessionId ?? null,
        runId: input.runId ?? "",
        summary,
        detail: (input.detail ?? "").trim().slice(0, 8000),
        createdAt: new Date().toISOString(),
        status: "pending",
    };
    await fs.mkdir(path.dirname(approvalsPath()), { recursive: true });
    await fs.writeFile(approvalsPath(), JSON.stringify({ approvals: withApproval(current, approval) }, null, 2));
    return approval;
}

// DJAZZI(26/11/2026): how much each bot works, counted on this machine from
// its model calls (tokens, not the server's credits).
const usagePath = () => path.join(WorkDir, USAGE_PATH);
let usageWrite: Promise<void> = Promise.resolve();

export function tallyBaarasseurUsage(agentName: string | undefined, input: number, output: number): void {
    if (!agentName?.startsWith(BAARASSEUR_PREFIX)) return;
    const bot = agentName.slice(BAARASSEUR_PREFIX.length);
    // One write at a time: model calls end close together.
    usageWrite = usageWrite.then(async () => {
        let months = {};
        try {
            months = parseUsage(await fs.readFile(usagePath(), "utf8"));
        } catch {
            // No count yet.
        }
        const next = addUsage(months, bot, new Date(), input, output);
        await fs.mkdir(path.dirname(usagePath()), { recursive: true });
        await fs.writeFile(usagePath(), JSON.stringify({ months: next }, null, 2));
    }).catch((err) => console.error("[baarasseurs] usage count", err));
}

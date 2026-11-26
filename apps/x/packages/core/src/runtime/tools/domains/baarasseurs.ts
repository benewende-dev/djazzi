// DJAZZI(06/10/2026): the one tool only a baarasseur gets — keeping a rule
// of its mission. Attached by loadAgent to baarasseur agents, never to the
// copilot itself; it writes to the user's own workspace, hence no approval.

import { z } from "zod";
import { BuiltinToolsSchema } from "../types.js";
import { askApproval, rememberFor, updateFor } from "../../../baarasseurs/repo.js";
import type { ToolContext } from "../exec-tool.js";

export const baarasseurTools: z.infer<typeof BuiltinToolsSchema> = {
    "baarasseur-remember": {
        permission: "none",
        description: "Keep a lasting rule or fact for your mission as a baarasseur (one short line, e.g. « Livraison offerte au-delà de 50 sacs »). It joins « What you remember » in every later conversation. Only for what the user asked you to keep or clearly stated as a rule.",
        inputSchema: z.object({
            id: z.string().describe("Your baarasseur id, as your instructions give it."),
            note: z.string().describe("The rule or fact, in one short line, in the user's language."),
        }),
        execute: async ({ id, note }: { id: string; note: string }) => {
            const memory = await rememberFor(id, note);
            return memory
                ? { success: true, remembered: note, count: memory.length }
                : { success: false, error: "Unknown baarasseur or empty note." };
        },
    },
    // DJAZZI(07/11/2026): the user renames it in a conversation (« appelle-toi Awa »).
    "baarasseur-update": {
        permission: "none",
        description: "Change your own name or role as a baarasseur, when the user asks for it (« Appelle-toi Awa », « tu es maintenant notre comptable »). The app shows the new name at once.",
        inputSchema: z.object({
            id: z.string().describe("Your baarasseur id, as your instructions give it."),
            name: z.string().optional().describe("The new first name, if the user gave one."),
            role: z.string().optional().describe("The new role, 1 to 4 words, if the user gave one."),
        }),
        execute: async ({ id, name, role }: { id: string; name?: string; role?: string }) => {
            const updated = await updateFor(id, { name, role });
            return updated
                ? { success: true, ...updated }
                : { success: false, error: "Unknown baarasseur or nothing to change." };
        },
    },
    // DJAZZI(26/11/2026): what waits for the user, on the Djazzi Bots page.
    "baarasseur-ask-approval": {
        permission: "none",
        description: "As a baarasseur, ask the user to approve something before you do it: sending, publishing, posting, paying, deleting, or anything your mission says needs their agreement. It goes on their « À valider » list in Djazzi; their answer comes back in this conversation. Call it once per action, then stop and wait.",
        inputSchema: z.object({
            id: z.string().describe("Your baarasseur id, as your instructions give it."),
            summary: z.string().describe("What you want to do, in one short line in the user's language (« Envoyer une relance à 3 prospects »)."),
            detail: z.string().optional().describe("The full draft or details the user needs to decide: the messages, the amounts, the recipients."),
        }),
        execute: async ({ id, summary, detail }: { id: string; summary: string; detail?: string }, ctx?: ToolContext) => {
            const approval = await askApproval({ bot: id, summary, detail, sessionId: ctx?.sessionId ?? null, runId: ctx?.runId });
            return approval
                ? { success: true, waiting: approval.summary, note: "It is on the user's list. Do not do it until they say yes." }
                : { success: false, error: "Unknown baarasseur or empty summary." };
        },
    },
};

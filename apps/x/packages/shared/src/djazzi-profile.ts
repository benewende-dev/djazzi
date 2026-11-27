// DJAZZI(27/11/2026): what the person told Djazzi about themselves at the
// start (first name, activity), kept in the agent's notes on them,
// knowledge/Agent Notes/user.md, which core puts in every chat, the bots'
// included (runtime/assembly/workspace-context.ts). The Mac's onboarding
// and the phone write the same block, so every bot knows who it talks to
// and none asks again what the person already said.

/** The agent's notes on the person, read by every chat. */
export const PROFILE_FILE = "knowledge/Agent Notes/user.md";

export interface Profile {
    name: string;
    sector: string | null;
}

const HEADING = "## Told at sign-up";
const LANGUAGE_NAMES: Record<string, string> = { fr: "French", en: "English" };
const START = "<!-- djazzi:profile -->";
const END = "<!-- /djazzi:profile -->";

/** The profile as the agent reads it; empty when nothing was told. */
export function profileBlock(profile: Profile, lang: string): string {
    const lines = [
        profile.name && `- First name: ${profile.name}`,
        profile.sector && `- Activity: ${profile.sector}`,
    ].filter(Boolean);
    if (!lines.length) return "";
    lines.push(`- Language of the app: ${LANGUAGE_NAMES[lang] ?? LANGUAGE_NAMES.en}`);
    // For the agent, not shown: in English whatever the app's language.
    return [START, HEADING, ...lines, END].join("\n");
}

/** The notes with the profile in them: replaced if there, else first; the rest kept. */
export function mergeProfile(existing: string, block: string): string {
    const at = existing.indexOf(START);
    const end = at >= 0 ? existing.indexOf(END, at) : -1;
    const rest = at >= 0 && end >= 0 ? (existing.slice(0, at) + existing.slice(end + END.length)).trim() : existing.trim();
    if (!block) return rest ? `${rest}\n` : "";
    return rest ? `${block}\n\n${rest}\n` : `${block}\n`;
}

/** What the block says, for an app that greets the person by name. */
export function readProfile(notes: string): Profile {
    const at = notes.indexOf(START);
    const end = at >= 0 ? notes.indexOf(END, at) : -1;
    const block = at >= 0 && end >= 0 ? notes.slice(at, end) : "";
    const field = (label: string) => block.match(new RegExp(`^- ${label}: (.+)$`, "m"))?.[1].trim() || "";
    return { name: field("First name"), sector: field("Activity") || null };
}

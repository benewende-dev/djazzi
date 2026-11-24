// DJAZZI(23/11/2026): what a paid page brings, said on its padlock screen,
// the same words on the computer (assets/desktop/workspace.tsx) and the phone
// (work-gate.tsx). Copied by brand.mjs to both apps; the French is in fr.ts.
// No « Work » and no « Chat » any more: the person reads the page's own name.

export type PaidPage = { title: string; text: string };

export const PAID_PAGES: Record<string, PaidPage> = {
  baarasseurs: { title: 'Your agents', text: 'Agents with a name, a role and a face, who work on their own and wait for your approval before anything leaves.' },
  agents: { title: 'Routines', text: 'Your agents act at set times: the morning brief, a weekly follow-up, a report every month.' },
  code: { title: 'Code and projects', text: 'Open a folder, let an agent read, write and run code, and review each change.' },
  workspaces: { title: 'Code and projects', text: 'Open a folder, let an agent read, write and run code, and review each change.' },
  email: { title: 'Email', text: 'Your inbox sorted, answers drafted in your tone, nothing sent without you.' },
  meetings: { title: 'Meetings', text: 'Notes taken for you, a summary and the next steps at the end of each meeting.' },
  apps: { title: 'Apps', text: 'Connect the tools you use every day so your agents can work with them.' },
  spaces: { title: 'Groups', text: 'Talk with your people and your team, and ask Djazzi right in the conversation with @djazzi.' },
  studio: { title: 'Studio', text: 'Videos, motion and 3D made with your agents, with media credits.' },
};

/** A page none of the above names. */
export const ANY_PAID_PAGE: PaidPage = { title: 'This page', text: 'Agents, routines, code, email, meetings, apps, groups and Studio.' };

/** On the plans' padlock: the cheapest plan that opens these pages. */
export const PAID_FROM = 'From the Semaine plan';
/** What the free plan keeps, said under the padlock. */
export const FREE_KEEPS = 'On Découverte you keep conversations with Djazzi, web search, your files, voice, personal tasks and the library.';

/** The phone's route → its page (an agent's conversation is the agents'). */
export function paidPageForPath(path: string | null | undefined): PaidPage {
  const clean = (path ?? '').replace('/(tabs)', '');
  const first = clean.split('/').filter(Boolean)[0] ?? '';
  const key: Record<string, string> = { spaces: 'spaces', s: 'spaces', email: 'email', meetings: 'meetings', studio: 'studio', routines: 'agents', baarasseurs: 'baarasseurs', chat: 'baarasseurs', projects: 'code', apps: 'apps' };
  return PAID_PAGES[key[first] ?? ''] ?? ANY_PAID_PAGE;
}

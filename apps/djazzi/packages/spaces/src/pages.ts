// What Harbor, our Spaces server, says to a person, in Djazzi's words and
// in their language (decided 02/10/2026: we host Spaces ourselves). Harbor
// stays the upstream's code: scripts/brand.mjs (`--only harbor`) copies this
// file into the build as src/djazzi-pages.ts and points its pages here.
//
// Harbor's pages are drawn deep inside its handlers, where the request is
// out of reach: a middleware keeps the language for the time of the request.
import { AsyncLocalStorage } from 'node:async_hooks';

export type Language = 'fr' | 'en';

/** Where someone without the app gets it: the site's download section. */
export const DOWNLOAD_URL = 'https://djazzi.com/#telecharger';

/**
 * The person's language from their Accept-Language: the first of French or
 * English they ask for; another language alone gets English; no header
 * (an app's own request) gets French, Djazzi's first language.
 */
export function pickLanguage(header: string | null | undefined): Language {
  if (!header) return 'fr';
  const asked = header
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';');
      const q = params.map((p) => /^\s*q=([\d.]+)/.exec(p)?.[1]).find(Boolean);
      return { tag, q: q === undefined ? 1 : Number(q), i };
    })
    .filter((a) => a.tag && a.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of asked) {
    if (tag === 'fr' || tag.startsWith('fr-')) return 'fr';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return 'en';
}

const current = new AsyncLocalStorage<Language>();

/** Harbor's middleware: the rest of the request speaks the person's language. */
export function withLanguage<T>(header: string | null | undefined, next: () => Promise<T>): Promise<T> {
  return current.run(pickLanguage(header), next);
}

export function language(): Language {
  return current.getStore() ?? 'fr';
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const TEXT = {
  fr: {
    open: 'Ouvrir dans Djazzi',
    openApp: 'Ouvrir dans l’app Djazzi',
    opensIn: 'Ce lien s’ouvre dans Djazzi',
    expired: 'Cette invitation a expiré.',
    revoked: 'Cette invitation a été retirée.',
    expiredTitle: 'Invitation expirée',
    revokedTitle: 'Invitation retirée',
    askAgain: 'Demandez un nouveau lien à la personne qui vous l’a envoyé.',
    joinTitle: (space: string) => `Rejoindre ${space}`,
    messageTitle: (person: string) => `Écrire à ${person}`,
    invited: (space: string) => `Invitation à rejoindre ${space}`,
    invitedByPerson: (person: string) => `${person} vous invite à lui écrire`,
    invitedTo: (server: string) => `Invitation sur ${server}`,
    by: (who: string) => `De la part de ${who}`,
    noApp: (link: string) => `Pas encore Djazzi ? ${link}, puis rouvrez ce lien.`,
    download: 'Téléchargez l’app',
    browser: (link: string) => `Vous pouvez aussi ${link}.`,
    inBrowser: 'ouvrir ce lien dans votre navigateur',
  },
  en: {
    open: 'Open in Djazzi',
    openApp: 'Open in the Djazzi app',
    opensIn: 'This link opens in Djazzi',
    expired: 'This invite has expired.',
    revoked: 'This invite was revoked.',
    expiredTitle: 'Invite expired',
    revokedTitle: 'Invite revoked',
    askAgain: 'Ask whoever sent it for a new link.',
    joinTitle: (space: string) => `Join ${space}`,
    messageTitle: (person: string) => `Message ${person}`,
    invited: (space: string) => `You’re invited to ${space}`,
    invitedByPerson: (person: string) => `${person} invited you to message them`,
    invitedTo: (server: string) => `You’re invited to ${server}`,
    by: (who: string) => `Invited by ${who}`,
    noApp: (link: string) => `Don’t have Djazzi? ${link}, then open this link again.`,
    download: 'Download it',
    browser: (link: string) => `You can also ${link}.`,
    inBrowser: 'open this link in your browser',
  },
} as const;

const STYLE =
  `<style>body{font:15px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;color:#1a1a1a;background:#f7f8fa}` +
  `main{text-align:center;padding:2rem;max-width:26rem}h1{font-size:1.25rem;margin:0 0 .25rem}p{margin:.25rem 0}.m{color:#5f6672}` +
  `a.b{display:inline-block;margin-top:1rem;padding:.6rem 1.1rem;border-radius:10px;background:#1a6dff;color:#fff;text-decoration:none}` +
  `.s{margin-top:1.25rem;font-size:13px;color:#5f6672}.s a{color:inherit}` +
  `@media (prefers-color-scheme:dark){body{background:#0a0a0a;color:#ececec}.m,.s{color:#9aa1ad}a.b{background:#4d8dff}}</style>`;

const head = (title: string) =>
  `<!doctype html><html lang="${language()}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title>${STYLE}`;

/**
 * The app's deep link, and the web app's address for the same link when the
 * server names one (http.ts Openers, 2026-11-09); `phone` when the browser
 * is a phone's, which launches nothing by itself.
 */
export interface Openers {
  deep: string;
  web?: string;
  phone?: boolean;
}

/** Launch the app at once and offer the download; on a phone, offer the app and launch nothing. */
function openerLinks(o: Openers): string {
  const t = TEXT[language()];
  const download = `<a href="${DOWNLOAD_URL}">${t.download}</a>`;
  const web = o.web ? `<p class="s">${t.browser(`<a href="${escapeHtml(o.web)}">${t.inBrowser}</a>`)}</p>` : '';
  if (o.phone) return `<a class="b" href="${escapeHtml(o.deep)}">${t.openApp}</a><p class="s">${t.noApp(download)}</p>${web}`;
  return (
    `<a class="b" href="${escapeHtml(o.deep)}">${t.open}</a><p class="s">${t.noApp(download)}</p>${web}` +
    `<script>location.replace(${JSON.stringify(o.deep)})</script>`
  );
}

/** A link opened in a browser: handed to the app (http.ts « link landings »). */
export function landingPage(o: Openers): string {
  const t = TEXT[language()];
  return `${head(t.open)}<main><h1>${t.opensIn}</h1>${openerLinks(o)}</main>`;
}

export type InvitePage =
  | { state: 'expired' | 'revoked' }
  | ({ state: 'ok'; space?: string; person?: string; server: string; invitedBy?: string | null } & Openers);

/** /join/<token> opened in a browser (http.ts invitePage): an invite to one space, or someone's link. */
export function invitePage(page: InvitePage): string {
  const t = TEXT[language()];
  if (page.state !== 'ok') {
    const expired = page.state === 'expired';
    return `${head(expired ? t.expiredTitle : t.revokedTitle)}<main><h1>${expired ? t.expired : t.revoked}</h1><p class="m">${t.askAgain}</p></main>`;
  }
  const headline = page.space ? t.invited(page.space) : page.person ? t.invitedByPerson(page.person) : t.invitedTo(page.server);
  const title = page.space ? t.joinTitle(page.space) : page.person ? t.messageTitle(page.person) : t.invitedTo(page.server);
  const by = page.space && page.invitedBy ? `<p class="m">${escapeHtml(t.by(page.invitedBy))}</p>` : '';
  return `${head(title)}<main><h1>${escapeHtml(headline)}</h1>${by}${openerLinks(page)}</main>`;
}

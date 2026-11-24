import { describe, expect, it } from 'vitest';
import { invitePage, landingPage, pickLanguage, withLanguage } from '../src/pages.js';

// Harbor's pages, as a person sees them (src/pages.ts, decided 02/10/2026).

describe('the visitor’s language', () => {
  it('takes the first of French or English they ask for', () => {
    expect(pickLanguage('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(pickLanguage('en-US,en;q=0.9,fr;q=0.8')).toBe('en');
    expect(pickLanguage('de-DE,fr;q=0.5')).toBe('fr');
    expect(pickLanguage('en;q=0.4,fr;q=0.9')).toBe('fr');
  });

  it('answers English to another language, French to an app that says nothing', () => {
    expect(pickLanguage('de-DE')).toBe('en');
    expect(pickLanguage(undefined)).toBe('fr');
    expect(pickLanguage('')).toBe('fr');
  });
});

describe('the pages', () => {
  const deep = 'rowboat://open?type=spaces&server=spaces.djazzi.com&invite=t1';

  it('hands an invite to the app, in French, under our name only', async () => {
    const page = await withLanguage('fr', async () => invitePage({ state: 'ok', space: 'Ventes', server: 'Djazzi', invitedBy: 'Awa', deep }));
    expect(page).toContain('Invitation à rejoindre Ventes');
    expect(page).toContain('De la part de Awa');
    expect(page).toContain('Ouvrir dans Djazzi');
    expect(page).toContain('https://djazzi.com/#telecharger');
    expect(page).toContain(`location.replace(${JSON.stringify(deep)})`);
    expect(page).not.toMatch(/Rowboat|rowboatlabs/);
  });

  it('names the person whose link it is', async () => {
    const page = await withLanguage('fr', async () => invitePage({ state: 'ok', person: 'Fatou', server: 'Djazzi', deep }));
    expect(page).toContain('Fatou vous invite à lui écrire');
  });

  it('launches nothing on a phone, and offers the browser when there is a web app', async () => {
    const web = 'https://app.djazzi.com/open?type=spaces';
    const page = await withLanguage('fr', async () => invitePage({ state: 'ok', space: 'Ventes', server: 'Djazzi', deep, web, phone: true }));
    expect(page).toContain('Ouvrir dans l’app Djazzi');
    expect(page).toContain(web);
    expect(page).not.toContain('location.replace');
  });

  it('never lets a name write into the page', async () => {
    const page = await withLanguage('en', async () => invitePage({ state: 'ok', space: '<img src=x onerror=alert(1)>', server: 'O', deep }));
    expect(page).not.toContain('<img');
    expect(page).toContain('You’re invited to &lt;img');
  });

  it('says why an invite no longer works', async () => {
    expect(await withLanguage('fr', async () => invitePage({ state: 'expired' }))).toContain('Cette invitation a expiré.');
    expect(await withLanguage('en', async () => invitePage({ state: 'revoked' }))).toContain('This invite was revoked.');
  });

  it('opens a link in the app', async () => {
    const page = await withLanguage('en', async () => landingPage({ deep }));
    expect(page).toContain('Open in Djazzi');
    expect(page).toContain(`location.replace(${JSON.stringify(deep)})`);
  });
});

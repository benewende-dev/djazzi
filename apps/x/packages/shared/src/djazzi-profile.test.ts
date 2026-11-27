import { describe, expect, it } from 'vitest';
import { mergeProfile, profileBlock, readProfile } from './djazzi-profile.js';

// DJAZZI(27/11/2026): one block on the person, written by the Mac and the
// phone, read back by the phone to greet them by name.
describe('the profile in the agent notes', () => {
    it('reads back the first name and the activity it wrote', () => {
        const notes = mergeProfile('- Prefers short answers\n', profileBlock({ name: 'Awa', sector: 'Retail and distribution' }, 'fr'));
        expect(readProfile(notes)).toEqual({ name: 'Awa', sector: 'Retail and distribution' });
    });

    it('knows nothing from notes without the block', () => {
        expect(readProfile('- First name: Yann\n')).toEqual({ name: '', sector: null });
        expect(readProfile('')).toEqual({ name: '', sector: null });
    });

    it('keeps a first name told without an activity', () => {
        expect(readProfile(profileBlock({ name: 'Yann', sector: null }, 'en'))).toEqual({ name: 'Yann', sector: null });
    });
});

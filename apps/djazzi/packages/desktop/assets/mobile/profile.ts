import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { RpcClient } from '@x/client';
import { djazziProfile } from '@x/shared';

import { FIRST_NAME_KEY } from '@/components/djazzi-welcome';
import { __djazziT, currentLanguage } from '@/djazzi-i18n/mobile/runtime';

// DJAZZI(27/11/2026): what the person told Djazzi about themselves, as every
// bot reads it: the block in knowledge/Agent Notes/user.md (@x/shared
// djazzi-profile), which the Mac's onboarding writes. The phone's welcome
// kept the first name on the phone only, so a bot asked it again. Here the
// phone puts it in the instance's notes when they have none, and the chat
// greets the person by it.

export type KnownProfile = djazziProfile.Profile;

const NOBODY: KnownProfile = { name: '', sector: null };

/** The person's profile, read from the instance; the phone's first name written there if missing. */
export async function syncProfile(rpc: RpcClient): Promise<KnownProfile> {
  const local = ((await AsyncStorage.getItem(FIRST_NAME_KEY).catch(() => null)) ?? '').trim();
  let notes = '';
  try {
    // Notes it cannot read are never written over: only missing ones start empty.
    const { exists } = await rpc.call('workspace:exists', { path: djazziProfile.PROFILE_FILE });
    if (exists) notes = (await rpc.call('workspace:readFile', { path: djazziProfile.PROFILE_FILE, encoding: 'utf8' })).data;
  } catch {
    return { ...NOBODY, name: local };
  }
  const known = djazziProfile.readProfile(notes);
  if (known.name || !local) return known.name ? known : { ...known, name: local };
  const next = { ...known, name: local };
  const block = djazziProfile.profileBlock(next, currentLanguage());
  await rpc.call('workspace:writeFile', { path: djazziProfile.PROFILE_FILE, data: djazziProfile.mergeProfile(notes, block), opts: { encoding: 'utf8', mkdirp: true } }).catch(() => {});
  return next;
}

/** The profile once the instance answered; nobody until then. */
export function useKnownProfile(rpc: RpcClient | null): KnownProfile {
  const [profile, setProfile] = useState<KnownProfile>(NOBODY);
  useEffect(() => {
    if (!rpc) return;
    let live = true;
    void syncProfile(rpc).then((p) => { if (live) setProfile(p); }, () => {});
    return () => { live = false; };
  }, [rpc]);
  return profile;
}

/** What a bot says first, in the app, before it remembers anything: by name when the person is known. */
export function firstMeeting(bot: string, known: KnownProfile): string {
  if (known.name && known.sector) return __djazziT("Hello $1, I'm $2. Tell me what you would like me to take care of first.", [known.name, bot]);
  if (known.name) return __djazziT("Hello $1, I'm $2. To start, tell me a little about your activity.", [known.name, bot]);
  return __djazziT("Hello, I'm $1. Before we start, what should I call you?", [bot]);
}

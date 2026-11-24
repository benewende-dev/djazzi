import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessions as sessionsShared } from '@x/shared';

import { AnnouncementBanner } from '@/components/announcement-banner';
import { DjazziMark } from '@/components/djazzi-mark';
import { LivingShape, adaptive, useLook } from '@/components/agent-shape';
import { ChatComposer } from '@/components/chat-composer';
import { ModelPill } from '@/components/model-picker';
import { MenuButton } from '@/components/djazzi-side-menu';
import { FIRST_NAME_KEY } from '@/components/djazzi-welcome';
import { useConnection } from '@/lib/connection';
import { connectInstance, SignInError, type SignInProblem } from '@/lib/djazzi-sign-in';
import { useComposerAttachments, stageAttachments } from '@/lib/composer-attachments';
import { useSpacesAccount } from '@/lib/spaces/account';
import { NOTIFY_INTRO_KEY } from '@/lib/push';
import { useModels } from '@/lib/use-models';
import { useVoiceInput } from '@/lib/voice';
import { useColors } from '@/theme/colors';
import { __djazziT as translate } from '@/djazzi-i18n/mobile/runtime';

type Entry = sessionsShared.SessionIndexEntry;

/** Why a device could not be linked, in words (translated on screen). */
const LINK_PROBLEM: Partial<Record<SignInProblem, string>> & { other: string } = {
  too_many_devices: 'Too many devices on this account (10 at most). Remove old ones in the computer app’s settings, then try again.',
  instances_full: 'Early access is full for now: your chats will open as soon as a place frees up.',
  no_instance: 'Your Djazzi can’t be reached right now. Try again in a moment.',
  network: 'No connection. Check your internet, then try again.',
  other: 'This device could not be linked. Try again in a moment.',
};

/** One tap away from a first request, written for the people Djazzi is for. */
const IDEAS = ['Prepare a quote', 'Follow up with my clients', 'Summarize a document'];

const tap = () => { if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync(); };

/** « benewende.yann@… » → BY, as the account shows who is signed in. */
export function initials(email: string | undefined): string {
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local.split(/[._\-+]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase() || '·';
}

/** Good morning until noon, good afternoon until six, then good evening; with the first name when one was given. */
function greeting(name: string | null, hour: number): string {
  if (hour < 12) return name ? translate('Good morning, $1', [name]) : translate('Good morning');
  if (hour < 18) return name ? translate('Good afternoon, $1', [name]) : translate('Good afternoon');
  return name ? translate('Good evening, $1', [name]) : translate('Good evening');
}

// DJAZZI(23/11/2026): the home as the new Claude app's (the founder's call,
// mockup artboard Tel-Accueil at claude.ai/artifact/MMrtTpNSjyPBNFvscbxm6F),
// after Grok Bot's (07/11/2026): the menu and the messages on top, Djazzi
// and a greeting in the middle, three ideas, then the composer with « Talk »
// in view; the bar at the foot (pill-tab-bar.tsx) holds Groups, Tasks and
// Studio, the menu on the left (side-menu.tsx) the agents and the chats.
export default function HomeScreen() {
  const colors = useColors();
  const { pairing, sessions, events, rpc, pair } = useConnection();
  const account = useSpacesAccount();
  const models = useModels();
  const files = useComposerAttachments();
  const voice = useVoiceInput(rpc);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkTried, setLinkTried] = useState(false);
  // DJAZZI(07/11/2026): the face the person chose for their Djazzi (welcome.tsx).
  const look = useLook();
  const dark = useColorScheme() === 'dark';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dictating, setDictating] = useState(false);
  const [hour, setHour] = useState(() => new Date().getHours());
  const input = useRef<TextInput>(null);

  const refresh = useCallback(async () => {
    if (!sessions) return;
    try {
      const list = (await sessions.list()).sessions.filter(sessionsShared.isChatListSession);
      setEntries(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch {
      // Keep the last list while the computer reconnects.
    }
  }, [sessions]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!events) return;
    const offEvents = events.on('sessions:events', () => void refresh());
    const offResync = events.onResync(() => void refresh());
    return () => { offEvents(); offResync(); };
  }, [events, refresh]);
  useEffect(() => { void AsyncStorage.getItem(FIRST_NAME_KEY).then(setName, () => {}); }, []);
  const refreshModels = models.refresh;
  useFocusEffect(useCallback(() => {
    setHour(new Date().getHours());
    void refresh();
    void refreshModels().catch(() => {});
  }, [refresh, refreshModels]));
  // Once linked, say why notifications matter before iPhone asks (notify-intro.tsx).
  useEffect(() => {
    if (!pairing) return;
    let alive = true;
    void (async () => {
      const asked = await AsyncStorage.getItem(NOTIFY_INTRO_KEY).catch(() => 'later');
      if (asked || !alive) return;
      const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
      if (granted || !canAskAgain) { await AsyncStorage.setItem(NOTIFY_INTRO_KEY, granted ? 'yes' : 'later').catch(() => {}); return; }
      if (alive) router.push('/notify-intro');
    })();
    return () => { alive = false; };
  }, [pairing]);

  // The newest chat that stopped to ask the person: said on the home, one tap away.
  const waiting = useMemo(() => entries.find(entry => entry.latestTurnStatus === 'suspended'), [entries]);

  const send = () => {
    if (!draft.trim() && !files.files.length) return;
    tap(); Keyboard.dismiss();
    router.push({ pathname: '/chat', params: { id: '', draft: draft.trim(), submit: '1', attachments: stageAttachments(files.files) } });
    setDraft(''); files.clear();
  };
  const talk = () => { tap(); Keyboard.dismiss(); router.push({ pathname: '/chat', params: { id: '', talk: '1' } }); };
  const dictate = async () => {
    if (!rpc || dictating) return;
    setDictating(true);
    try {
      if (voice.state === 'recording') {
        const text = await voice.finish();
        if (text) setDraft(previous => `${previous.trim()}${previous.trim() ? ' ' : ''}${text}`);
      } else if (await voice.start() === 'denied') {
        Alert.alert('Microphone access', 'Allow microphone access in Settings to dictate a message.');
      }
    } catch {
      await voice.cancel();
      Alert.alert('Dictation', 'Your message could not be transcribed. Please try again.');
    } finally { setDictating(false); }
  };
  const startIdea = (idea: string) => {
    tap();
    setDraft(`${translate(idea)} `);
    setTimeout(() => input.current?.focus(), 50);
  };

  // DJAZZI(09/11/2026): signed in but not linked (the browser at chat.djazzi.com showed it):
  // the account's own session links this device here, and says why when it cannot.
  const accountSession = account.voiceSession();
  const link = async () => {
    if (!accountSession) {
      // In a browser there is no computer to scan: sign in again, with a code or a password.
      if (Platform.OS === 'web') { await account.signOut().catch(() => {}); router.replace('/spaces'); return; }
      router.push('/pairing');
      return;
    }
    setLinking(true);
    setLinkError(null);
    try {
      const server = await connectInstance(accountSession, Platform.OS === 'web' ? 'Navigateur' : 'iPhone');
      await pair({ url: server.url, token: server.key, name: 'Djazzi' });
    } catch (err) {
      setLinkError(err instanceof SignInError ? LINK_PROBLEM[err.reason] ?? LINK_PROBLEM.other : String(err));
    } finally {
      setLinking(false);
    }
  };
  // In a browser, signed out and unlinked: straight to the sign-in.
  useEffect(() => {
    if (Platform.OS === 'web' && !pairing && account.status === 'signedOut') router.replace('/spaces');
  }, [pairing, account.status]);
  // Once, on arriving signed in but unlinked: the reason shows without a tap.
  useEffect(() => {
    if (pairing || !accountSession || linkTried) return;
    setLinkTried(true);
    void link();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing, accountSession, linkTried]);
  if (!pairing) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, backgroundColor: colors.background }}>
      <DjazziMark size={56} motion="loading" />
      <Text style={{ fontSize: 20, fontWeight: '600', color: colors.label }}>{accountSession ? 'Link this device' : Platform.OS === 'web' ? 'Sign in again' : 'Connect your computer'}</Text>
      <Text style={{ fontSize: 15, textAlign: 'center', lineHeight: 22, color: colors.secondaryLabel }}>
        {accountSession ? translate('Your chats and your agents show up here once this device is linked to your Djazzi.') : Platform.OS === 'web' ? translate('Sign in with a code or your password to find your chats and your agents here.') : translate('Your chats and your baarasseurs show up here once the phone is linked to your Djazzi.')}
      </Text>
      <Pressable accessibilityRole="button" disabled={linking} onPress={() => void link()}
        style={{ marginTop: 6, minHeight: 46, paddingHorizontal: 22, borderRadius: 23, justifyContent: 'center', backgroundColor: colors.label, opacity: linking ? 0.6 : 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.background }}>{linking ? translate('Linking…') : accountSession ? translate('Link') : Platform.OS === 'web' ? translate('Sign in') : translate('Connect')}</Text>
      </Pressable>
      {linkError && <Text accessibilityRole="alert" style={{ maxWidth: 420, fontSize: 14, textAlign: 'center', lineHeight: 20, color: colors.destructive }}>{translate(linkError)}</Text>}
    </View>
  );

  const round = { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryBackground } as const;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <MenuButton />
        <Pressable accessibilityRole="button" accessibilityLabel={translate('Messages from Djazzi')} onPress={() => { tap(); router.push('/inbox'); }} style={round}>
          <Image source="sf:bell" style={{ width: 19, height: 19 }} tintColor={colors.label} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 18 }}>
          <AnnouncementBanner />
          <View style={{ alignItems: 'center', gap: 16 }}>
            {look ? <LivingShape shape={look.shape} color={adaptive(look.color, dark)} size={72} /> : <DjazziMark size={64} motion="loading" />}
            <Text accessibilityRole="header" style={{ fontSize: 30, lineHeight: 38, fontWeight: '500', textAlign: 'center', color: colors.label }}>{greeting(name, hour)}</Text>
          </View>
          {waiting && <Pressable accessibilityRole="button" onPress={() => { tap(); router.push({ pathname: '/chat', params: { id: waiting.sessionId } }); }}
            style={({ pressed }) => ({ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.secondaryBackground, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.label }} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, color: colors.label }}>{translate('Waiting for your approval')}</Text>
            <Image source="sf:chevron.right" style={{ width: 11, height: 11 }} tintColor={colors.secondaryLabel} />
          </Pressable>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {IDEAS.map(idea => <Pressable key={idea} accessibilityRole="button" onPress={() => startIdea(idea)}
              style={({ pressed }) => ({ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, justifyContent: 'center', borderWidth: 0.5, borderColor: colors.separator, backgroundColor: pressed ? colors.secondaryBackground : 'transparent' })}>
              <Text style={{ fontSize: 14, color: colors.secondaryLabel }}>{translate(idea)}</Text>
            </Pressable>)}
          </View>
        </ScrollView>
        <View style={{ marginHorizontal: 12, marginBottom: 8 }}>
          <ChatComposer draft={draft} onChange={setDraft} placeholder="Ask Djazzi" inputRef={input}
            files={files.files} onRemove={files.remove} onAttach={() => void files.pick()} picking={files.picking} onSend={send}
            leading={<ModelPill models={models} />}
            onVoice={rpc ? () => void dictate() : undefined} voiceActive={voice.state === 'recording'} busy={voice.state === 'transcribing'}
            onTalk={rpc ? talk : undefined} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

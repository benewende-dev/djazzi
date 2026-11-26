import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Keyboard, Modal, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { baarasseurs as team, billing, sessions as sessionsShared } from '@x/shared';

import { useBaarasseurs } from '@/lib/baarasseurs';
import { useConnection } from '@/lib/connection';
import { searchKey } from '@/lib/team-directory';
import { useWebWide } from '@/components/djazzi-web-frame';
import { useColors } from '@/theme/colors';
import { DjazziBotsGlyph } from '@/components/djazzi-bots-glyph';
import { __djazziT as translate } from '@/djazzi-i18n/mobile/runtime';

// DJAZZI(23/11/2026): the menu on the left (the founder's call, after the new
// Claude app, mockup artboard Tel-Menu at claude.ai/artifact/MMrtTpNSjyPBNFvscbxm6F):
// the bar at the foot holds the four everyday places, this menu the rest: the
// agents, the routines, the library, email and meetings, the recent chats and
// the account. Paid places lead to Work's gate on the free plan, as the
// settings do (settings.tsx).

type Entry = sessionsShared.SessionIndexEntry;
type Path = Parameters<typeof router.push>[0];

/** Recent chats shown; the search looks through all of them. */
const RECENT = 30;

const tap = () => { if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync(); };

/** « benewende.yann@… » → BY. */
function initials(email: string | undefined): string {
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local.split(/[._\-+]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase() || '·';
}

/** The round button that opens the menu, with the menu itself. */
export function MenuButton() {
  const colors = useColors();
  const webWide = useWebWide();
  const [open, setOpen] = useState(false);
  // In the browser on a wide screen, the sidebar is already there (djazzi-web-frame.tsx).
  if (webWide) return <View style={{ width: 46, height: 46 }} />;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={translate('Open the menu')} onPress={() => { tap(); Keyboard.dismiss(); setOpen(true); }}
      style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryBackground }}>
      <Image source="sf:line.3.horizontal" style={{ width: 19, height: 19 }} tintColor={colors.label} />
    </Pressable>
    <SideMenu open={open} onClose={() => setOpen(false)} />
  </>;
}

function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panel = Math.min(320, Math.round(width * 0.82));
  const slide = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(open);
  const { sessions, rpc } = useConnection();
  const { team: agents } = useBaarasseurs();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [info, setInfo] = useState<billing.BillingInfo | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setShown(true);
    Animated.timing(slide, { toValue: open ? 1 : 0, duration: open ? 220 : 180, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      .start(({ finished }) => { if (finished && !open) { setShown(false); setQuery(''); } });
  }, [open, slide]);

  const load = useCallback(async () => {
    if (sessions) {
      try {
        const list = (await sessions.list()).sessions.filter(sessionsShared.isChatListSession);
        setEntries(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      } catch {
        // Keep the last list while the computer reconnects.
      }
    }
    if (rpc) await rpc.call('billing:getInfo', null).then(setInfo, () => {});
  }, [sessions, rpc]);
  useEffect(() => { if (open) void load(); }, [open, load]);

  const byId = useMemo(() => new Map((agents ?? []).map(b => [b.id, b])), [agents]);
  const needle = searchKey(query);
  const found = useMemo(() => {
    const matching = needle ? entries.filter(e => {
      const b = byId.get(team.baarasseurIdOf(e.lastAgentId) ?? '');
      return searchKey(`${e.title ?? ''} ${b?.name ?? ''}`).includes(needle);
    }) : entries;
    return needle ? matching : matching.slice(0, RECENT);
  }, [entries, needle, byId]);
  const plan = info ? billing.getBillingPlanData(info.catalog, info.subscriptionPlanId) : null;

  const go = (path: Path) => { tap(); onClose(); router.push(path); };
  // Each paid page has its own padlock, which names it (work-gate.tsx).
  const work = (path: Path) => go(path);
  const openChat = (entry: Entry) => {
    const b = byId.get(team.baarasseurIdOf(entry.lastAgentId) ?? '');
    go({ pathname: '/chat', params: { id: entry.sessionId, ...(b ? { agent: team.baarasseurAgentId(b.id) } : {}) } });
  };

  const places: Array<{ label: string; icon: string; onPress: () => void }> = [
    { label: 'New chat', icon: 'sf:square.and.pencil', onPress: () => go({ pathname: '/chat', params: { id: '' } }) },
    { label: 'Djazzi Bots', icon: 'djazzi-d', onPress: () => work('/baarasseurs') },
    { label: 'Routines', icon: 'sf:clock', onPress: () => work('/routines') },
    { label: 'Library', icon: 'sf:books.vertical', onPress: () => go('/notes') },
    { label: 'Email', icon: 'sf:envelope', onPress: () => work('/(tabs)/email') },
    { label: 'Meetings', icon: 'sf:calendar', onPress: () => work('/(tabs)/meetings') },
    { label: 'Connect apps', icon: 'sf:square.grid.2x2', onPress: () => go('/connect') },
  ];

  if (!shown) return null;
  return <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: slide }}>
      <Pressable accessibilityRole="button" accessibilityLabel={translate('Close the menu')} onPress={onClose} style={{ flex: 1 }} />
    </Animated.View>
    <Animated.View accessibilityViewIsModal style={{
      position: 'absolute', top: 0, bottom: 0, left: 0, width: panel,
      backgroundColor: colors.secondaryBackground, borderTopRightRadius: 28, borderBottomRightRadius: 28,
      paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 12,
      transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-panel, 0] }) }],
    }}>
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8 }}>
        <Image source={require('@/assets/images/djazzi-tile.png')} style={{ width: 30, height: 30, borderRadius: 9 }} accessibilityIgnoresInvertColors />
        <Text style={{ flex: 1, fontSize: 19, fontWeight: '700', color: colors.label }}>Djazzi</Text>
      </View>
      <View style={{ height: 42, marginTop: 8, marginBottom: 8, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, backgroundColor: colors.background }}>
        <Image source="sf:magnifyingglass" style={{ width: 16, height: 16 }} tintColor={colors.secondaryLabel} />
        <TextInput value={query} onChangeText={setQuery} placeholder={translate('Search')} placeholderTextColor={colors.tertiaryLabel}
          returnKeyType="search" style={{ flex: 1, fontSize: 16, color: colors.label }} />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel={translate('Clear the search')} hitSlop={8} onPress={() => setQuery('')}>
          <Image source="sf:xmark.circle.fill" style={{ width: 16, height: 16 }} tintColor={colors.tertiaryLabel} />
        </Pressable>}
      </View>

      <FlatList data={found} keyExtractor={e => e.sessionId} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1 }}
        ListHeaderComponent={<>
          {!needle && places.map(place => <Pressable key={place.label} accessibilityRole="button" onPress={place.onPress}
            style={({ pressed }) => ({ minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, borderRadius: 12, backgroundColor: pressed ? colors.background : 'transparent' })}>
            {place.icon === 'djazzi-d' ? <DjazziBotsGlyph size={20} color={colors.label} /> : <Image source={place.icon} style={{ width: 20, height: 20 }} tintColor={colors.label} />}
            <Text style={{ flex: 1, fontSize: 16, color: colors.label }}>{translate(place.label)}</Text>
          </Pressable>)}
          {found.length > 0 && <Text style={{ paddingHorizontal: 10, paddingTop: needle ? 4 : 18, paddingBottom: 6, fontSize: 13, fontWeight: '600', color: colors.secondaryLabel }}>{needle ? translate('Conversations found') : translate('Recent chats')}</Text>}
        </>}
        ListEmptyComponent={needle ? <Text style={{ padding: 16, fontSize: 15, color: colors.secondaryLabel }}>No conversation found</Text> : null}
        renderItem={({ item }) => {
          const b = byId.get(team.baarasseurIdOf(item.lastAgentId) ?? '');
          const waiting = item.latestTurnStatus === 'suspended';
          return <Pressable accessibilityRole="button" onPress={() => openChat(item)}
            accessibilityHint={waiting ? translate('Waiting for your approval') : undefined}
            style={({ pressed }) => ({ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: pressed ? colors.background : 'transparent' })}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, color: colors.label }}>{item.title || translate('New chat')}</Text>
            {b && <Text numberOfLines={1} style={{ maxWidth: 90, fontSize: 13, color: colors.tertiaryLabel }}>{b.name}</Text>}
            {waiting && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.label }} />}
          </Pressable>;
        }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 6, borderTopWidth: 0.5, borderTopColor: colors.separator }}>
        <Pressable accessibilityRole="button" onPress={() => go('/plans')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.secondaryLabel }}>{initials(info?.userEmail ?? undefined)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: colors.label }}>{info?.userEmail ?? 'Djazzi'}</Text>
            <Text numberOfLines={1} style={{ fontSize: 13, color: colors.secondaryLabel }}>{plan?.displayName ?? translate('No plan')}</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={translate('Settings')} onPress={() => go('/settings')}
          style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
          <Image source="sf:gearshape" style={{ width: 19, height: 19 }} tintColor={colors.label} />
        </Pressable>
      </View>
    </Animated.View>
  </Modal>;
}

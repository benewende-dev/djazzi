import type { BottomTabBarProps } from 'expo-router/tabs';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConnection } from '@/lib/connection';
import { useSpacesAccount } from '@/lib/spaces/account';
import { useWebWide } from '@/components/djazzi-web-frame';
import { useColors } from '@/theme/colors';
import { __djazziT as translate } from '@/djazzi-i18n/mobile/runtime';

// DJAZZI(23/11/2026): the bar at the foot, a pill as in the new Claude app
// (the founder's call, mockup artboards Tel-Accueil and Tel-Groupes at
// claude.ai/artifact/MMrtTpNSjyPBNFvscbxm6F): the four everyday places one
// touch away; the rest is in the menu on the left (side-menu.tsx). Studio is
// a full screen of its own (presentation fullScreenModal), opened over the
// tabs. Shown on a tab's first screen only, and not in Groups once signed in:
// Spaces has its own bar there (spaces/(tabs)/_layout.tsx), two would stack.

type Place = { name: string; label: string; icon: string; active: string; opens?: '/studio' };

const PLACES: Place[] = [
  { name: 'home', label: 'Djazzi', icon: 'sf:bubble.left', active: 'sf:bubble.left.fill' },
  { name: 'spaces', label: 'Groups', icon: 'sf:person.2', active: 'sf:person.2.fill' },
  { name: 'todo', label: 'Tasks', icon: 'sf:checkmark.square', active: 'sf:checkmark.square.fill' },
  { name: 'studio', label: 'Studio', icon: 'sf:play.rectangle', active: 'sf:play.rectangle.fill', opens: '/studio' },
];
const SHOWN_ON = new Set(['home', 'spaces', 'todo']);

export function PillTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pairing } = useConnection();
  const account = useSpacesAccount();
  const webWide = useWebWide();

  const focused = state.routes[state.index];
  // Deeper than a tab's first screen (a group's chat, an email): no bar.
  const nested = (focused.state?.index ?? 0) > 0;
  // Nobody signed in yet (onboarding, the sign-in screen): nothing to switch to.
  const someone = Boolean(pairing) || account.status === 'signedIn';
  const ownBar = focused.name === 'spaces' && account.status === 'signedIn';
  if (webWide || !SHOWN_ON.has(focused.name) || nested || !someone || ownBar) return null;

  return <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.background }}>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 5, borderRadius: 34, backgroundColor: colors.secondaryBackground, borderWidth: 0.5, borderColor: colors.separator }}>
      {PLACES.map((place) => {
        const route = state.routes.find((r) => r.name === place.name);
        if (!place.opens && !route) return null;
        const selected = route ? state.routes[state.index]?.key === route.key : false;
        const tint = selected ? colors.label : colors.secondaryLabel;
        const onPress = () => {
          if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
          // Studio is a paid page: the free plan sees its padlock (work-gate.tsx).
          if (place.opens) { router.push(place.opens); return; }
          if (!route) return;
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return;
          navigation.navigate(route.name);
        };
        return <Pressable key={place.name} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={translate(place.label)}
          style={{ flex: 1, minHeight: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: selected ? colors.separator : 'transparent' }}>
          <Image source={selected ? place.active : place.icon} style={{ width: 22, height: 22 }} tintColor={tint} />
          <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: selected ? '600' : '500', color: tint }}>{translate(place.label)}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

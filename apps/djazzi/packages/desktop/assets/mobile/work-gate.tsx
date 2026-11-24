import { router, useFocusEffect, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { TopNavigation } from './top-navigation';
import { DjazziMark } from './djazzi-mark';
import { useWorkAccess } from '@/lib/work-access-provider';
import { FREE_KEEPS, PAID_FROM, paidPageForPath } from '@/lib/paid-pages';
import { useColors } from '@/theme/colors';
import { __djazziT as translate } from '@/djazzi-i18n/mobile/runtime';

// DJAZZI(13/10/2026): checking the route itself also covers deep links;
// protected children never mount or load workspace data for a free account.
// DJAZZI(23/11/2026): the padlock names the page it guards and what it
// brings, as on the computer (paid-pages.ts); no « Work » or « Chat » words
// since the phone has neither. The way back leads to Djazzi, the home.
export function WorkGate({ children, enabled = true, chrome = true }: { children: ReactNode; enabled?: boolean; chrome?: boolean }) {
  const colors = useColors();
  const pathname = usePathname();
  const { access, verify } = useWorkAccess();
  useFocusEffect(useCallback(() => { if (enabled) void verify(); }, [enabled, verify]));
  if (!enabled || access === 'paid') return <>{children}</>;
  const page = paidPageForPath(pathname);
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    {chrome && <TopNavigation mode="work" />}
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      {access === 'checking' ? <>
        <DjazziMark size={48} motion="loading" />
        <Text style={{ fontSize: 15, color: colors.secondaryLabel }}>Checking your plan…</Text>
      </> : access === 'free' ? <>
        <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryBackground }}>
          <Image source="sf:lock" style={{ width: 22, height: 22 }} tintColor={colors.label} />
        </View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: colors.secondaryBackground }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondaryLabel }}>{translate(PAID_FROM)}</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '500', textAlign: 'center', color: colors.label }}>{translate(page.title)}</Text>
        <Text style={{ maxWidth: 420, fontSize: 16, lineHeight: 24, textAlign: 'center', color: colors.secondaryLabel }}>{translate(page.text)}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/plans')} style={{ minHeight: 48, borderRadius: 24, paddingHorizontal: 24, backgroundColor: colors.accent, justifyContent: 'center' }}>
          <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '600' }}>View plans</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/home')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, color: colors.accent }}>Back to Djazzi</Text>
        </Pressable>
        <Text style={{ maxWidth: 420, fontSize: 13, lineHeight: 19, textAlign: 'center', color: colors.tertiaryLabel }}>{translate(FREE_KEEPS)}</Text>
      </> : <>
        <DjazziMark size={48} motion="static" />
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '500', textAlign: 'center', color: colors.label }}>Your plan could not be verified</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, textAlign: 'center', color: colors.secondaryLabel }}>Check your connection and try again.</Text>
        <Pressable accessibilityRole="button" onPress={() => void verify()} style={{ minHeight: 48, borderRadius: 24, paddingHorizontal: 24, backgroundColor: colors.accent, justifyContent: 'center' }}>
          <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '600' }}>Retry</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/home')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, color: colors.accent }}>Back to Djazzi</Text>
        </Pressable>
      </>}
    </ScrollView>
  </View>;
}

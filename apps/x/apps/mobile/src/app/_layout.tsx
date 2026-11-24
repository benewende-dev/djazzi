import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { dark as darkColors, light as lightColors } from '@/theme/colors';
import { applyStoredTheme } from '@/lib/theme-preference';

const WarmDarkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: darkColors.background, card: darkColors.background, border: darkColors.separator, text: darkColors.label },
};

// Pin the saved Light/Dark choice before the first screen paints.
void applyStoredTheme();

// Navigation chrome (headers, screen ground) on the same warm white.
const LightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: lightColors.background, card: lightColors.background, border: lightColors.separator, text: lightColors.label },
};
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as Notifications from 'expo-notifications';
import { router, usePathname, useRootNavigationState } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { registerWithMac } from '@/lib/push';
import { AgentResponder } from '@/components/djazzi-agent-responder';
import { useConnection } from '@/lib/connection';
import { ConnectionProvider } from '@/lib/connection';
import { SpacesAccountProvider, useSpacesAccount } from '@/lib/spaces/account';

SplashScreen.preventAutoHideAsync();

// DJAZZI(07/10/2026): tabs at the foot instead of the drawer (the founder's
// call, mockup claude.ai/artifact/5hiVQMibobFRRitE7ictcw, artboards 15 and
// 16): the everyday places in (tabs), everything else pushed over them with
// a native back button.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Nothing else hides the native splash — without this the release build
  // sits on the logo forever (Expo Go masks it).
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
      <ThemeProvider value={colorScheme === 'dark' ? WarmDarkTheme : LightTheme}>
        <ConnectionProvider>
          <SpacesAccountProvider>
          <PushRegistrar />
          <PushNavigator />
          {/* DJAZZI(07/11/2026): taps on the agent's notifications, its approvals (djazzi-agent-responder.tsx). */}
          <AgentResponder />
          {/* Android leaves light status-bar icons on our light pages; follow the
              app's scheme (2026-10-28). iOS already adapts on its own. */}
          {process.env.EXPO_OS === 'android' ? <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} /> : null}
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            {/* Home just redirects into the tabs (or first-launch onboarding). */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
            {/* Floating way back: transparent header, no divider (iOS draws the glass). */}
            <Stack.Screen
              name="chat"
              options={{
                headerTransparent: true,
                headerTitle: '',
                headerBackVisible: false,
                headerLeft: () => <BackButton />,
              }}
            />
            <Stack.Screen name="baarasseurs" options={{ headerShown: false }} />
            <Stack.Screen name="notes" options={{ headerShown: false }} />
            <Stack.Screen name="tasks" options={{ title: 'Tasks' }} />
            <Stack.Screen name="routines" options={{ title: 'Routines' }} />
            <Stack.Screen name="projects" options={{ title: 'Projects' }} />
            <Stack.Screen name="apps" options={{ title: 'Apps and prompts' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
            <Stack.Screen name="partner-code" options={{ title: 'Partner code' }} />
            {/* DJAZZI(07/10/2026): the admin console's messages, behind the home tab's bell. */}
            <Stack.Screen name="inbox" options={{ title: 'Notifications' }} />
            {/* DJAZZI(10/10/2026): the Studio Motion and the agent's files, full screen. */}
            <Stack.Screen name="studio" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="viewer" options={{ title: '', headerTransparent: false, headerStyle: { backgroundColor: '#000000' }, headerTintColor: '#ffffff' }} />
            <Stack.Screen name="pairing" options={{ title: '' }} />
            <Stack.Screen name="pair-dev" options={{ headerShown: false }} />
            {/* Links opened in the app (2026-11-09): each only redirects. */}
            <Stack.Screen name="sign-in" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="join/[token]" options={{ headerShown: false }} />
            <Stack.Screen name="s/[spaceId]/index" options={{ headerShown: false }} />
            <Stack.Screen name="s/[spaceId]/[...rest]" options={{ headerShown: false }} />
            <Stack.Screen name="u/[memberId]" options={{ headerShown: false }} />
          </Stack>
          </SpacesAccountProvider>
        </ConnectionProvider>
      </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

// Re-register the phone's push token + level whenever the Mac connects —
// tokens rotate and prefs change; the call is idempotent.
function PushRegistrar() {
  const { rpc, status } = useConnection();
  useEffect(() => {
    if (status === 'connected' && rpc) void registerWithMac(rpc).catch(() => {});
  }, [status, rpc]);
  return null;
}

// A tapped push lands on its conversation: the payload carries spaceId /
// threadRootId (push.ts on the server); the one server record names the host.
function PushNavigator() {
  const account = useSpacesAccount();
  const pathname = usePathname();
  const navReady = Boolean(useRootNavigationState()?.key);
  // Each notification response is handled ONCE (2026-10-07): the listener and
  // getLastNotificationResponse can both answer the same tap, and replaying
  // it pushed chat + thread again so back walked through the copies.
  const handled = useRef(new Set<string>());
  // A tap is held until the app can act on it (2026-11-09). On a cold start
  // the tap arrived before the navigator was ready and before Home's redirect
  // into Spaces: the push was dropped, or the redirect landed after it and
  // replaced it — and the tap was already marked handled, so it never retried.
  // The app opened on Spaces home instead of the message.
  const [pending, setPending] = useState<Notifications.NotificationResponse | null>(null);
  useEffect(() => {
    const take = (r: Notifications.NotificationResponse) => {
      if (!handled.current.has(responseKey(r))) setPending(r);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) take(last);
    const sub = Notifications.addNotificationResponseReceivedListener(take);
    return () => sub.remove();
  }, []);
  useEffect(() => {
    // pathname '/' = Home has not redirected into Spaces yet.
    if (!pending || !navReady || pathname === '/') return;
    const data = pending.notification.request.content.data as Record<string, unknown> | undefined;
    const spaceId = typeof data?.spaceId === 'string' ? data.spaceId : null;
    const threadRootId = typeof data?.threadRootId === 'string' ? data.threadRootId : null;
    if (!spaceId) {
      setPending(null);
      return;
    }
    // No server record yet: wait for the cached or refreshed one.
    const org = account.orgs?.[0];
    if (!org) return;
    handled.current.add(responseKey(pending));
    setPending(null);
    Notifications.clearLastNotificationResponse();
    const base = { org: org.address, space: spaceId, me: org.memberId };
    // From the tabs: back from the thread goes to the channel, then home.
    if (router.canDismiss()) router.dismissAll();
    router.push({ pathname: '/spaces/chat', params: base });
    if (threadRootId) router.push({ pathname: '/spaces/thread', params: { ...base, root: threadRootId, title: 'Thread', focus: 'latest' } });
  }, [pending, navReady, pathname, account.orgs]);
  return null;
}

function responseKey(r: Notifications.NotificationResponse): string {
  return `${r.notification.request.identifier}:${r.notification.date}`;
}

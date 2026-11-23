import { Tabs } from 'expo-router';
import { TopNavigation } from '@/components/top-navigation';
import { PillTabBar } from '@/components/baarali-pill-tab-bar';

// BAARALI(12/10/2026): keep the existing tab routes and their state.
// BAARALI(23/11/2026): the bar at the foot is back, as a pill (the founder's
// call, after the new Claude app): Baarali, Groups, Tasks and Studio
// (pill-tab-bar.tsx); the menu on the left holds the rest (side-menu.tsx).
export default function TabsLayout() {
  return <Tabs tabBar={(props) => <PillTabBar {...props} />} screenOptions={{ headerShown: false }} backBehavior="history">
    <Tabs.Screen name="home" options={{ title: 'Baarali' }} />
    <Tabs.Screen name="spaces" options={{ title: 'Groups' }} />
    <Tabs.Screen name="todo" options={{ title: 'Tasks' }} />
    <Tabs.Screen name="more" options={{ title: 'Work' }} />
    <Tabs.Screen name="email" options={{ title: 'Email' }} />
    <Tabs.Screen name="meetings" options={{ title: 'Meetings', headerShown: true, header: () => <TopNavigation mode="work" /> }} />
  </Tabs>;
}

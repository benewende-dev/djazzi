import { Text, View } from 'react-native';
import { SafeAreaInsetsContext, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import TasksScreen from '@/app/tasks';
import { MenuButton } from '@/components/djazzi-side-menu';
import { useColors } from '@/theme/colors';

// DJAZZI(23/11/2026): Tasks as a tab of the bar at the foot (pill-tab-bar.tsx).
// The screen is the one /tasks shows (app/tasks.tsx, kept for its links), under
// the header the home wears. The bar holds the foot: the screen's own bottom
// inset is taken away so its field sits right above it.
export default function TasksTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <MenuButton />
      <Text style={{ flex: 1, fontSize: 22, fontWeight: '700', color: colors.label }}>Tasks</Text>
    </View>
    <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0, bottom: 0 }}>
      <TasksScreen />
    </SafeAreaInsetsContext.Provider>
  </SafeAreaView>;
}

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLightStatusBar } from '@/components/djazzi-status-bar';

import { LookPicker } from '@/components/djazzi-welcome';
import { saveLook, useLook } from '@/components/agent-shape';

// DJAZZI(07/11/2026): changing the face of one's Djazzi, from the settings,
// with the onboarding's chooser.
export default function LookScreen() {
  const current = useLook();
  useLightStatusBar();
  const [shape, setShape] = useState(current?.shape ?? 'b');
  const [color, setColor] = useState(current?.color ?? 'white');
  return <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
    <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }}>
      <LookPicker shape={shape} color={color} onShape={setShape} onColor={setColor} />
      <Pressable accessibilityRole="button" onPress={() => { void saveLook({ shape, color }); router.back(); }}
        style={({ pressed }) => ({ height: 58, marginBottom: 12, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', opacity: pressed ? 0.8 : 1 })}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#0A0A0A' }}>Save</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 16, color: '#B5B5B5' }}>Cancel</Text>
      </Pressable>
    </SafeAreaView>
  </View>;
}

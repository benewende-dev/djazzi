import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

// DJAZZI(24/11/2026): the black screens (welcome, choosing one's Djazzi) want
// a white status bar, only while they show. As a mounted <StatusBar>, the
// welcome left it white under the home screen it stays mounted beneath: the
// clock vanished on the light pages (seen in the simulator). On leaving, the
// root's <StatusBar style="auto"> (_layout.tsx) decides again.
export function useLightStatusBar() {
  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle('auto');
  }, []));
}

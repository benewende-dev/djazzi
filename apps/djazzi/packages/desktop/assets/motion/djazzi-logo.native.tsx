import { Image } from 'expo-image';
import { View } from 'react-native';
import { DjazziMark } from './djazzi-mark';
import { useColors } from '@/theme/colors';

// DJAZZI(07/11/2026): the B that looks beside the word in Geist, black and
// white (the founder's sign C; assets/brand/wordmark-*.svg from identity.mjs).
export function DjazziLogo() {
  const colors = useColors();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityLabel="Djazzi">
    <DjazziMark motion="loading" size={32} />
    <Image source={colors.label === '#ffffff' ? require('../../assets/brand/wordmark-light.svg') : require('../../assets/brand/wordmark-dark.svg')}
      contentFit="contain" style={{ width: 92, height: 20 }} accessible={false} />
  </View>;
}

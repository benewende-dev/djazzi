import Svg, { Circle, Path } from 'react-native-svg';

// DJAZZI(26/11/2026): the Djazzi Bots icon on the phone and in the browser —
// the logo's D in a line, with its two eyes, as on the desktop
// (renderer components/djazzi-bots-icon.tsx). In place of « person.2 ».
export function DjazziBotsGlyph({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M5 4h6.5a7.5 8 0 0 1 0 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={11} cy={11} r={1.25} fill={color} />
      <Circle cx={14.6} cy={11} r={1.25} fill={color} />
    </Svg>
  );
}

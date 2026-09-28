/**
 * Category glyph, used inside the map pin and in the list row tile.
 * Category is shown by shape so that nothing depends on colour alone.
 */
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { Category } from '../types';

export function CategoryGlyph({
  category, size = 24, color = colors.ink,
}: { category: Category; size?: number; color?: string }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24' };

  if (category === 'eat') {
    return (
      <Svg {...s} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6.4 3v5.4a1.6 1.6 0 0 0 3.2 0V3" />
        <Path d="M8 9.8V21" />
        <Path d="M16.6 3c-1.9 0-3.1 2-3.1 4.4s1.2 4 3.1 4 3.1-1.6 3.1-4S18.5 3 16.6 3Z" />
        <Path d="M16.6 11.6V21" />
      </Svg>
    );
  }

  if (category === 'drink') {
    return (
      <Svg {...s} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4.6 4.4h14.8L12 12.6V19" />
        <Path d="M8.4 19h7.2" />
      </Svg>
    );
  }

  // Every other category draws two footprints.
  return (
    <Svg {...s} fill={color}>
      <G rotation={-16} origin="8.6, 11">
        <Ellipse cx="8.6" cy="11.6" rx="3.1" ry="4.3" />
        <Circle cx="5.6" cy="5.9" r="1.15" />
        <Circle cx="8.6" cy="5.1" r="1.2" />
        <Circle cx="11.5" cy="5.9" r="1.15" />
      </G>
      <G rotation={14} origin="15.6, 16">
        <Ellipse cx="15.6" cy="16.4" rx="3.1" ry="4.3" />
        <Circle cx="12.6" cy="10.7" r="1.15" />
        <Circle cx="15.6" cy="9.9" r="1.2" />
        <Circle cx="18.5" cy="10.7" r="1.15" />
      </G>
    </Svg>
  );
}

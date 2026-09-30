/**
 * The mascot asleep. Marks the end of a list, an empty list, and the quiet
 * note under a form. `width` sets the size; the height follows the drawing.
 */
import { Image, StyleProp, ImageStyle } from 'react-native';
import { rascalSleep } from '../theme/critters';

export function RascalSleep({ width = 150, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={rascalSleep.source}
      style={[{ width, height: width / rascalSleep.aspect }, style]}
      accessibilityLabel="Rascal asleep"
    />
  );
}

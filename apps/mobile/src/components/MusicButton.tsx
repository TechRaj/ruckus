/**
 * Turns the music on and off. A hand-drawn speaker with no background, so it
 * sits on the map like a doodle rather than a control. Off, the waves are
 * replaced by a small cross.
 */
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PressableScale } from './PressableScale';
import { chooseMusic, useMusicOn } from '../theme/sound';
import { colors } from '../theme/tokens';

export function MusicButton({ size = 30 }: { size?: number }) {
  const on = useMusicOn();
  const ink = colors.ink;

  return (
    <PressableScale
      onPress={() => chooseMusic(!on)}
      haptic="selection"
      scaleTo={0.9}
      accessibilityRole="switch"
      accessibilityLabel="Music"
      accessibilityState={{ checked: on }}
      style={styles.hit}
    >
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* the speaker: slightly uneven lines, as if inked by hand */}
        <Path
          d="M4.6 12.4c-.3 0-.6.3-.6.6l.2 6.4c0 .4.3.6.7.6l4.3-.1 6.9 5.8c.5.4 1.1.1 1.1-.5L16.9 7.2c0-.6-.7-.9-1.1-.5l-6.6 5.9-4.6-.2Z"
          stroke={ink} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"
          fill={on ? colors.flare : 'none'}
        />
        {on ? (
          <>
            <Path d="M21 12.2c1.5 1.1 2.3 2.5 2.2 4.1-.1 1.4-.9 2.6-2 3.6" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M24.6 8.6c2.4 2 3.7 4.6 3.5 7.6-.2 2.8-1.6 5.1-3.4 6.9" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
          </>
        ) : (
          <>
            <Path d="M21.2 12.6l6.2 6.6" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M27.6 12.9l-6.6 6.1" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
          </>
        )}
      </Svg>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  /** The drawing is small; the hit area is not. */
  hit: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});

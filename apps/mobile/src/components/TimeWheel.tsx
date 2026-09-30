/**
 * A time, picked by sliding three drums: hour, minutes, am or pm. Each drum
 * is a ScrollView that snaps to a row, with the chosen row through the band
 * in the middle. Drawn here so it matches the app and needs no native code.
 */
import { useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radius } from '../theme/tokens';

const ROW = 40;
/** Rows above and below the band, so the first and last values can reach it. */
const AROUND = 1;
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 15, 30, 45];
const HALVES = ['am', 'pm'] as const;

export type WheelTime = { hour: number; minute: number; pm: boolean };

/** "7 pm", "7:15 pm": the :00 is left off, matching the quick picks. */
export const wheelText = ({ hour, minute, pm }: WheelTime) =>
  `${hour}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${pm ? 'pm' : 'am'}`;

export function TimeWheel({ value, onChange }: { value: WheelTime; onChange: (t: WheelTime) => void }) {
  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.band} />
      <Drum items={HOURS.map(String)} index={HOURS.indexOf(value.hour)} onIndex={i => onChange({ ...value, hour: HOURS[i] })} />
      <Drum items={MINUTES.map(m => String(m).padStart(2, '0'))} index={MINUTES.indexOf(value.minute)} onIndex={i => onChange({ ...value, minute: MINUTES[i] })} />
      <Drum items={[...HALVES]} index={value.pm ? 1 : 0} onIndex={i => onChange({ ...value, pm: i === 1 })} />
      <LinearGradient pointerEvents="none" colors={[colors.paper, colors.paper + '00']} style={[styles.fade, { top: 0 }]} />
      <LinearGradient pointerEvents="none" colors={[colors.paper + '00', colors.paper]} style={[styles.fade, { bottom: 0 }]} />
    </View>
  );
}

function Drum({ items, index, onIndex }: { items: string[]; index: number; onIndex: (i: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ROW)));
    if (i !== index) onIndex(i);
  };
  return (
    <ScrollView
      ref={ref}
      style={styles.drum}
      contentContainerStyle={{ paddingVertical: ROW * AROUND }}
      contentOffset={{ x: 0, y: Math.max(0, index) * ROW }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW}
      decelerationRate="fast"
      onMomentumScrollEnd={settle}
      /** A slow drag that stops without momentum still settles on a row. */
      onScrollEndDrag={e => { if (!e.nativeEvent.velocity?.y) settle(e); }}
    >
      {items.map((label, i) => (
        <View key={label} style={styles.row}>
          <Text style={[styles.value, i === index && styles.valueOn]}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', height: ROW * (AROUND * 2 + 1),
    borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.hairline, backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute', left: 8, right: 8, top: ROW * AROUND, height: ROW,
    borderRadius: radius.lg, backgroundColor: colors.flareWash,
  },
  drum: { flex: 1 },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: font.bold, fontSize: 18, color: colors.inkMuted },
  valueOn: { color: colors.ink },
  fade: { position: 'absolute', left: 0, right: 0, height: ROW * 0.8 },
});

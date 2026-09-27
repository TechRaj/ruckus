/**
 * A person's critter — §10.5, §13.7.
 *
 * Bare head, no disc. The ears are the clearest silhouette signal at 32px and
 * a circular crop cuts them off; the render also carries its own identity
 * colour, so a pastel disc was duplicating what the art already does.
 * Identity is the pair (critter + colour), never the colour alone.
 */
import { Image, StyleSheet, View } from 'react-native';
import { CRITTER_ASPECT, critterImages } from '../theme/critters';
import { shadow } from '../theme/tokens';
import { Critter, Member } from '../types';

/** `size` is the width; height follows the render's aspect so the ears never squash. */
export function CritterHead({ critter, size = 32 }: { critter: Critter; size?: number }) {
  const source = critterImages[critter];
  if (!source) return <View style={{ width: size, height: size / CRITTER_ASPECT }} />;
  return (
    <Image
      source={source}
      style={[{ width: size, height: size / CRITTER_ASPECT }, shadow.critter]}
      resizeMode="contain"
    />
  );
}

/**
 * Overlapping heads read as a group. No paper ring — the drop shadow on each
 * head already separates them, and a ring needs a disc to sit on. Three at most.
 */
export function CritterStack({ members, size = 32 }: { members: Member[]; size?: number }) {
  return (
    <View style={styles.stack}>
      {members.slice(0, 3).map((m, i) => (
        <View key={m.userId} style={{ marginLeft: i ? -size * 0.4 : 0 }}>
          <CritterHead critter={m.critter} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
});

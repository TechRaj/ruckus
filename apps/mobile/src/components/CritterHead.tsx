/**
 * A person's critter avatar. The head is drawn bare, with nothing behind it.
 * Each critter has its own outline, so identity does not depend on colour.
 */
import { Image, StyleSheet, View } from 'react-native';
import { critterImages } from '../theme/critters';
import { Critter, Member } from '../types';

/** `size` is the width and height of the box the head is fitted into. */
export function CritterHead({ critter, size = 32 }: { critter: Critter; size?: number }) {
  const source = critterImages[critter] ?? critterImages.raccoon;
  return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />;
}

/** Up to three overlapping heads. */
export function CritterStack({ members, size = 32 }: { members: Member[]; size?: number }) {
  return (
    <View style={styles.stack}>
      {members.slice(0, 3).map((m, i) => (
        <View key={m.userId} style={{ marginLeft: i ? -size * 0.3 : 0 }}>
          <CritterHead critter={m.critter} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', alignItems: 'center' },
});

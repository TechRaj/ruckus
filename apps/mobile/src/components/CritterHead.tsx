/**
 * A person's critter avatar on a coloured disc. The head is drawn at 80% of
 * the disc so the ears are not cropped. Each critter has a fixed disc
 * colour, so identity does not depend on colour alone.
 */
import { Image, StyleSheet, View } from 'react-native';
import { CRITTER_ASPECT, critterImages } from '../theme/critters';
import { colors } from '../theme/tokens';
import { Critter, Member } from '../types';

const DISC: Partial<Record<Critter, string>> = {
  raccoon: colors.sky, possum: colors.pink, squirrel: colors.peach, skunk: colors.lilac,
};

/** `size` is the disc diameter. The head keeps the source image's aspect ratio. */
export function CritterHead({ critter, size = 32 }: { critter: Critter; size?: number }) {
  const source = critterImages[critter];
  const head = size * 0.8;
  return (
    <View
      style={[styles.disc, {
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: DISC[critter] ?? colors.paperSunk,
      }]}
    >
      {source ? (
        <Image source={source} style={{ width: head, height: head / CRITTER_ASPECT }} resizeMode="contain" />
      ) : null}
    </View>
  );
}

/**
 * Up to three overlapping heads. The paper border on each disc keeps them
 * visually separate.
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
  disc: {
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: colors.paper,
  },
});

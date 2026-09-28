/**
 * Critter head images. They are pre-rendered PNGs, which is also the format
 * `react-native-maps` markers need. To add a critter, add its image and a
 * line here.
 */
import { ImageSourcePropType } from 'react-native';
import { Critter } from '../types';

const chipmunk = require('../../assets/critters/critter-chipmunk.png');

export const critterImages: Partial<Record<Critter, ImageSourcePropType>> = {
  raccoon: require('../../assets/critters/critter-raccoon.png'),
  possum: require('../../assets/critters/critter-possum.png'),
  chipmunk,
  skunk: require('../../assets/critters/critter-skunk.png'),
  /** Squirrel has no art. Profiles saved as squirrel show the chipmunk. */
  squirrel: chipmunk,
};

/** The mascot, in its peek pose. */
export const rascal = require('../../assets/critters/rascal-peek.png');
/**
 * The mascot hanging from an edge by his paws. `pawLine` is how far down the
 * image the paws grip, as a fraction of its height. Anchor that point to the
 * edge and the claws hang over it.
 */
export const rascalHang = {
  source: require('../../assets/critters/rascal-hang.png'),
  aspect: 384 / 317,
  pawLine: 0.9,
};
/** The sniff and cheer poses have no images yet, so both use the peek pose. */
export const rascalSniff = rascal;
export const rascalCheer = rascal;

/** Critter images are square, with the head centred. */
export const CRITTER_ASPECT = 1;
export const RASCAL_ASPECT = 440 / 428;

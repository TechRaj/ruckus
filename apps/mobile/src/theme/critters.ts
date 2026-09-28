/**
 * Critter head images. They are pre-rendered PNGs, which is also the format
 * `react-native-maps` markers need. To add a critter, add its image and a
 * line here.
 */
import { ImageSourcePropType } from 'react-native';
import { Critter } from '../types';

export const critterImages: Partial<Record<Critter, ImageSourcePropType>> = {
  raccoon: require('../../assets/critters/critter-raccoon.png'),
  possum: require('../../assets/critters/critter-possum.png'),
  squirrel: require('../../assets/critters/critter-squirrel.png'),
  skunk: require('../../assets/critters/critter-skunk.png'),
};

/** The mascot, in its peek pose. */
export const rascal = require('../../assets/critters/rascal-peek.png');
/** The sniff and cheer poses have no images yet, so both use the peek pose. */
export const rascalSniff = rascal;
export const rascalCheer = rascal;

/** Width over height of the source images. They are slightly wider than tall. */
export const CRITTER_ASPECT = 240 / 229;
export const RASCAL_ASPECT = 440 / 428;

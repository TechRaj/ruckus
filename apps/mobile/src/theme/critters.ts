/**
 * Pre-rendered critter heads — §10.2 and §13.7.
 *
 * Every head comes off one low-poly rig: same silhouette, same eye
 * construction, markings and a palette per animal. Shipping them as flat
 * images buys the whole aesthetic with zero runtime 3D, and it is what
 * `react-native-maps` wants for markers anyway.
 *
 * Adding the next four (§13.6) is a render and a line here.
 */
import { ImageSourcePropType } from 'react-native';
import { Critter } from '../types';

export const critterImages: Partial<Record<Critter, ImageSourcePropType>> = {
  raccoon: require('../../assets/critters/critter-raccoon.png'),
  possum: require('../../assets/critters/critter-possum.png'),
  squirrel: require('../../assets/critters/critter-squirrel.png'),
  skunk: require('../../assets/critters/critter-skunk.png'),
};

/** Rascal himself. Three jobs only: peeking, resolving, celebrating (§13.3). */
export const rascal = require('../../assets/critters/rascal-peek.png');
/**
 * The other two poses are still to render off the same rig — nose down and
 * one paw forward; both paws up. Until then the peek pose stands in, and
 * swapping each is one line here.
 */
export const rascalSniff = rascal;
export const rascalCheer = rascal;

/** The renders are wider than tall; keep the ears from squashing. */
export const CRITTER_ASPECT = 240 / 229;
export const RASCAL_ASPECT = 440 / 428;

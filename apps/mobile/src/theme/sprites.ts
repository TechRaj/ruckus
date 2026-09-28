/**
 * Sprite sheets. Each is a grid of equal cells read left to right, top to
 * bottom. `steps` is the order frames play in and how long each one holds,
 * in milliseconds. Frame numbers start at 1. Source art is in design/sprites.
 */
import { ImageSourcePropType } from 'react-native';

export interface SpriteSheet {
  source: ImageSourcePropType;
  columns: number;
  rows: number;
  /** One cell in source pixels, padding included. */
  cell: { width: number; height: number };
  /** Transparent padding around the art inside each cell, in source pixels. */
  padding: number;
  steps: readonly (readonly [frame: number, ms: number])[];
  /** The frame shown under Reduce Motion. */
  rest: number;
}

/**
 * Rascal in the trash can. The can waits, squashes, pops open, and he settles
 * under the lid. The long hold on frame 8 is the pause between loops, and
 * frame 6 ducks him back down before the can closes.
 */
export const trashcan: SpriteSheet = {
  source: require('../../assets/sprites/trashcan.png'),
  columns: 4,
  rows: 2,
  cell: { width: 604, height: 747 },
  padding: 2,
  steps: [
    [1, 800], [2, 90], [3, 110], [4, 120], [5, 130], [6, 110], [7, 110], [8, 2600], [6, 110],
  ],
  rest: 8,
};

const IDLE = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(frame => [frame, 170] as const);

/**
 * Rascal hopping. Frames 6 to 15 are an idle wobble and frames 1 to 5 are one
 * hop. The wobble plays twice, about 3.4 seconds, before each hop.
 */
export const jump: SpriteSheet = {
  source: require('../../assets/sprites/jump.png'),
  columns: 5,
  rows: 3,
  cell: { width: 244, height: 355 },
  padding: 2,
  steps: [...IDLE, ...IDLE, [1, 110], [2, 80], [3, 170], [4, 80], [5, 130]],
  rest: 7,
};

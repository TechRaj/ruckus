/**
 * Den emblems: a coloured coin with one solid mark. The five names are
 * stored on Dens, so do not rename them.
 */
import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

const shapes: Record<string, { coin: string; mark: string; d: React.ReactNode }> = {
  lantern: {
    coin: colors.butter, mark: '#8A6A1E',
    d: <><Rect x="7" y="7" width="10" height="12" rx="4" /><Rect x="9.5" y="3.5" width="5" height="3" rx="1.5" /></>,
  },
  acorn: {
    coin: colors.peach, mark: '#8A4E3A',
    d: <><Path d="M5 9.5C5 6.5 8 5 12 5s7 1.5 7 4.5Z" /><Path d="M6.5 11h11c0 5-2.5 8.5-5.5 9.5-3-1-5.5-4.5-5.5-9.5Z" /></>,
  },
  moon: {
    coin: colors.lilac, mark: '#54439A',
    d: <Path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  },
  peak: {
    coin: colors.sky, mark: '#2F6F8A',
    d: <Path d="M3 19 10 6.5c.4-.7 1.3-.7 1.7 0L15 12l1.5-2.2c.4-.6 1.2-.6 1.6 0L22 19Z" />,
  },
  leaf: {
    coin: '#ACE1AF', mark: '#23644F',
    d: <Path d="M5 19C4 11 9 5 20 4.5 20 15 14.5 20 7 19.5l5-7.5-7 7Z" />,
  },
};

export const EMBLEMS = ['lantern', 'acorn', 'moon', 'peak', 'leaf'] as const;

export function Emblem({ name, size = 40 }: { name: string; size?: number }) {
  const { coin, mark, d } = shapes[name] ?? shapes.lantern;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width="40" height="40" rx="13.5" fill={coin} />
      {/* Marks are drawn on a 24 grid and scaled to fill the 40 coin. */}
      <G transform="translate(3.2 3.2) scale(1.4)" fill={mark}>{d}</G>
    </Svg>
  );
}

/**
 * Den emblems — low-poly, faceted, matte. Same material language as the
 * critters (§10.1): flat shading, one soft key light, no gradients.
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

const shapes: Record<string, React.ReactNode> = {
  lantern: <>
    <Path d="M20 3 33 12v18L20 37 7 30V12Z" fill="#E0C67C" />
    <Path d="M20 3 33 12v18L20 37Z" fill="#CBB167" />
    <Path d="M20 13 26 17v8l-6 4-6-4v-8Z" fill="#FBFAF6" opacity={0.55} />
  </>,
  acorn: <>
    <Path d="M20 37 8 24l4-8h16l4 8Z" fill="#D3A78E" />
    <Path d="M20 37 32 24l-4-8h-8Z" fill="#BE9179" />
    <Path d="M6 13h28l-4 5H10Z" fill="#8A8478" />
  </>,
  moon: <>
    <Path d="M27 4 34 20l-7 16-9-8 4-8-4-8Z" fill="#A9B6C6" />
    <Path d="M27 4 34 20l-7 16Z" fill="#93A0B1" />
    <Circle cx="12" cy="12" r="3" fill="#A9B6C6" />
  </>,
  peak: <>
    <Path d="M20 5 36 34H4Z" fill="#9EC4C2" />
    <Path d="M20 5 36 34H20Z" fill="#86ADAB" />
    <Path d="M20 5 27 18H13Z" fill="#FBFAF6" opacity={0.7} />
  </>,
  leaf: <>
    <Path d="M20 3 34 20 20 37 6 20Z" fill="#A8C4A2" />
    <Path d="M20 3 34 20 20 37Z" fill="#93AF8D" />
    <Path d="M20 6v28" stroke="#FBFAF6" strokeWidth={1.6} opacity={0.6} />
  </>,
};

export const EMBLEMS = ['lantern', 'acorn', 'moon', 'peak', 'leaf'] as const;

export function Emblem({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {shapes[name] ?? shapes.lantern}
    </Svg>
  );
}

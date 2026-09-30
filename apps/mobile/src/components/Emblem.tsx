/**
 * Den emblems: hand-drawn badges. The five names are stored on Dens, so do
 * not rename them.
 */
import { Image } from 'react-native';

const badges: Record<string, number> = {
  lantern: require('../../assets/emblems/lantern.png'),
  acorn: require('../../assets/emblems/acorn.png'),
  moon: require('../../assets/emblems/moon.png'),
  peak: require('../../assets/emblems/peak.png'),
  leaf: require('../../assets/emblems/leaf.png'),
};

export const EMBLEMS = ['lantern', 'acorn', 'moon', 'peak', 'leaf'] as const;

export function Emblem({ name, size = 40 }: { name: string; size?: number }) {
  return <Image source={badges[name] ?? badges.lantern} style={{ width: size, height: size }} />;
}

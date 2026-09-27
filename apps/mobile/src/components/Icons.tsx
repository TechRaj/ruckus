/**
 * One icon set, drawn as SVG paths so they scale and recolour.
 * 24px grid, 1.9 stroke, round caps — §13.6 asks for native-feeling controls,
 * and a consistent stroke weight is most of what that means.
 */
import React from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { colors } from '../theme/tokens';

type P = { size?: number; color?: string };

const stroke = (d: React.ReactNode, size: number, color: string, w = 1.9) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </Svg>
);

export const IconHome = ({ size = 24, color = colors.inkMuted }: P) =>
  stroke(<>
    <Path d="M3.6 10.4 12 3.4l8.4 7v9.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z" />
    <Path d="M9.4 21.6v-6.4h5.2v6.4" />
  </>, size, color);

export const IconPin = ({ size = 24, color = colors.inkMuted }: P) =>
  stroke(<>
    <Path d="M12 21.6c4.5-4.7 6.7-8.2 6.7-10.7a6.7 6.7 0 1 0-13.4 0c0 2.5 2.2 6 6.7 10.7Z" />
    <Circle cx="12" cy="10.7" r="2.4" />
  </>, size, color);

export const IconPeople = ({ size = 24, color = colors.inkMuted }: P) =>
  stroke(<>
    <Circle cx="9.2" cy="8.6" r="3.6" />
    <Path d="M2.8 20.2c0-3.6 2.9-5.9 6.4-5.9s6.4 2.3 6.4 5.9" />
    <Circle cx="17.5" cy="10.5" r="2.8" />
    <Path d="M17 15.1c2.6.3 4.3 2.3 4.3 5.1" />
  </>, size, color);

export const IconSearch = ({ size = 24, color = colors.ink }: P) =>
  stroke(<><Circle cx="10.9" cy="10.9" r="6.9" /><Path d="M15.9 15.9 21 21" /></>, size, color, 2);

export const IconNav = ({ size = 22, color = colors.inkSecondary }: P) =>
  stroke(<Path d="M20.8 3.2 3.6 10.1l7.2 2.9 2.9 7.2Z" />, size, color);

export const IconCalendar = ({ size = 18, color = colors.inkMuted }: P) =>
  stroke(<>
    <Path d="M3.4 7.6a2.6 2.6 0 0 1 2.6-2.6h12a2.6 2.6 0 0 1 2.6 2.6v10.8a2.6 2.6 0 0 1-2.6 2.6H6a2.6 2.6 0 0 1-2.6-2.6Z" />
    <Path d="M3.4 9.6h17.2M8 3v4M16 3v4" />
  </>, size, color, 1.8);

export const IconPlus = ({ size = 22, color = colors.ink }: P) =>
  stroke(<Path d="M12 5v14M5 12h14" />, size, color, 2.3);

export const IconMinus = ({ size = 22, color = colors.inkSecondary }: P) =>
  stroke(<Path d="M5 12h14" />, size, color, 2.3);

export const IconCheck = ({ size = 18, color = colors.ink }: P) =>
  stroke(<Path d="M4.5 12.6 9.5 17.5 19.5 6.8" />, size, color, 2.5);

export const IconChevronDown = ({ size = 16, color = colors.inkMuted }: P) =>
  stroke(<Path d="M5 8.5 12 15.5 19 8.5" />, size, color, 2.1);

export const IconChevronRight = ({ size = 16, color = colors.inkMuted }: P) =>
  stroke(<Path d="M8.5 4 15.5 12 8.5 20" />, size, color, 2.1);

export const IconChevronLeft = ({ size = 22, color = colors.inkSecondary }: P) =>
  stroke(<Path d="M15 4 8 12 15 20" />, size, color, 2.1);

export const IconLink = ({ size = 20, color = colors.inkMuted }: P) =>
  stroke(<>
    <Path d="M10.2 13.8a4.2 4.2 0 0 0 6.1.2l2.6-2.6a4.2 4.2 0 1 0-6-6l-1.5 1.5" />
    <Path d="M13.8 10.2a4.2 4.2 0 0 0-6.1-.2l-2.6 2.6a4.2 4.2 0 0 0 6 6l1.5-1.5" />
  </>, size, color);

export const IconPen = ({ size = 20, color = colors.inkSecondary }: P) =>
  stroke(<Path d="M16.4 3.9a2.3 2.3 0 0 1 3.3 3.3L8.1 18.8l-4.3 1 1-4.3Z" />, size, color);

export const IconExternal = ({ size = 20, color = colors.inkSecondary }: P) =>
  stroke(<>
    <Path d="M13.4 4.6h6v6" /><Path d="M19.4 4.6 10.6 13.4" />
    <Path d="M17.4 13.9v4.6a1.9 1.9 0 0 1-1.9 1.9H5.5a1.9 1.9 0 0 1-1.9-1.9V8.5a1.9 1.9 0 0 1 1.9-1.9h4.6" />
  </>, size, color);

export const IconClose = ({ size = 20, color = colors.inkSecondary }: P) =>
  stroke(<Path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" />, size, color, 2.2);

/** Sparkle for the Today chip — §4 always specified Everyone / Today / people. */
export const IconSparkle = ({ size = 19, color = colors.inkMuted }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <G fill={color}>
      <Path d="M13.4 2.4 15.1 8l5.6 1.7-5.6 1.7-1.7 5.6-1.7-5.6L6.1 9.7 11.7 8Z" />
      <Path d="M6.2 14.6 7.1 17l2.4.9-2.4.9-.9 2.4-.9-2.4L2.9 18l2.4-.9Z" />
    </G>
  </Svg>
);

/** Rascal's paw print — the accent that stands in for a full pose (§13.3). */
export const PawPrint = ({ size = 30, color = colors.hairline }: P) => (
  <Svg width={size} height={size * 0.93} viewBox="0 0 30 28" fill={color}>
    <Path d="M6.2 4.8a3.2 4.2 0 1 0 0 8.4 3.2 4.2 0 1 0 0-8.4Z" />
    <Path d="M13 .8a3.2 4.4 0 1 0 0 8.8 3.2 4.4 0 1 0 0-8.8Z" />
    <Path d="M20.2 1.4a3.2 4.4 0 1 0 0 8.8 3.2 4.4 0 1 0 0-8.8Z" />
    <Path d="M26.2 6.5a3 3.9 0 1 0 0 7.8 3 3.9 0 1 0 0-7.8Z" />
    <Path d="M15.6 12.2c4.9 0 8.6 3.1 8.6 7.2 0 3.4-2.8 5.6-6.2 5.6-2.1 0-2.6-.9-4.6-.9s-2.7.9-4.8.9c-3.3 0-6-2.2-6-5.6 0-4.1 4.4-7.2 9.6-7.2Z" />
  </Svg>
);

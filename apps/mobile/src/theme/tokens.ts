/**
 * Design tokens. Neutrals are structure, `flare` marks anything tappable or
 * selected, pastels identify people and Dens. `flare` is mint by day and lilac
 * by night, and text on it uses `onFlare`.
 */
import { launchedAtNight } from './clock';

export const day = {
  paper: '#FFF9E8',
  paperSunk: '#F7EED2',
  hairline: '#EBDDB8',
  inkMuted: '#86725D',
  inkSecondary: '#7A6450',
  /** Dark brown. */
  ink: '#5B4636',

  flare: '#ACE1AF',
  /** Used for the edge under a button and for borders that need contrast on `paper`. */
  flareDeep: '#7DBF81',
  onFlare: '#24472A',
  flareWash: '#E4F5E4',
  warn: '#C2553D',

  butter: '#FFE08A',
  butterWash: '#FFF1C4',
  peach: '#FFC2AD',
  sky: '#BFE8F7',
  lilac: '#D9C8F5',
  pink: '#FBC4D6',

  /** Apple Maps does not use the map colours. They are for a custom map style such as MapLibre. */
  mapLand: '#D5EFBF',
  mapWater: '#A5DFF2',
  mapParks: '#B1DF9C',
  mapRoads: '#FFF6D9',
  mapLot: '#EBDDB8',
  mapLabel: '#6F9560',

  pin: '#FFF9E8',
  pinInk: '#5B4636',
  pinDim: '#A9C79A',
  vignette: '#5B4636',
  scrim: 'rgba(91,70,54,0.34)',
} as const;

export const dusk = {
  paper: '#2B2F55',
  paperSunk: '#222547',
  hairline: '#444A7D',
  inkMuted: '#AAA8D4',
  inkSecondary: '#D3CFEC',
  ink: '#FFF3D1',

  flare: '#CBBBF3',
  flareDeep: '#9684D6',
  onFlare: '#2A2258',
  flareWash: '#453F7A',
  warn: '#FFA48F',

  butter: '#FFE08A',
  butterWash: '#4A4568',
  peach: '#E8A08F',
  sky: '#5B73B8',
  lilac: '#8275C4',
  pink: '#C47B9F',

  mapLand: '#2F4B55',
  mapWater: '#2A4585',
  mapParks: '#2B5E52',
  mapRoads: '#4C5486',
  mapLot: '#444A7D',
  mapLabel: '#A9CDB9',

  pin: '#FFF3D1',
  pinInk: '#2B2F55',
  pinDim: '#6F7AA8',
  vignette: '#000000',
  scrim: 'rgba(8,10,32,0.58)',
} as const;

export const isNight = launchedAtNight;
export const colors: Record<keyof typeof day, string> = isNight ? dusk : day;

/**
 * Translucent material for the Places sheet only. A tinted fill over a blur
 * with a 1px rim, so the map stays visible through the sheet.
 */
export const glass = {
  fill: isNight ? 'rgba(43,47,85,0.8)' : 'rgba(255,249,232,0.8)',
  rim: isNight ? 'rgba(255,243,209,0.18)' : 'rgba(255,255,255,0.65)',
  depth: 'rgba(8,30,36,0.05)',
  tint: isNight ? 'dark' : 'light',
  /** expo-blur intensity, from 1 to 100. */
  intensity: 40,
} as const;

/** Critters available at launch. Each image includes its own colour, so there is no colour table. */
export const launchCritters = ['raccoon', 'possum', 'chipmunk', 'skunk'] as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { lg: 20, xl: 26, xxl: 34, pill: 999 } as const;

/**
 * Baloo 2 for display text, Nunito for body text. `mono` and `monoRegular`
 * are role names for kickers, progress, hints and mascot lines. The fonts
 * behind them are proportional.
 */
export const font = {
  display: 'Baloo2_800ExtraBold',
  body: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  mono: 'Baloo2_700Bold',
  monoRegular: 'Nunito_500Medium',
} as const;

export const type = {
  /** Screen titles. */
  display: { fontFamily: font.display, fontSize: 34, letterSpacing: -0.3, lineHeight: 40 },
  displaySm: { fontFamily: font.display, fontSize: 26, letterSpacing: -0.2, lineHeight: 31 },
  rowTitle: { fontFamily: font.display, fontSize: 18, letterSpacing: -0.1, lineHeight: 23 },
  /** Uppercase label above a title, letterspaced at 0.14em. */
  kicker: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.7 },
  /** Lowercase hint text. 13 is the smallest font size in the app. */
  hint: { fontFamily: font.monoRegular, fontSize: 13, lineHeight: 18 },
  /** Text inside the mascot's bubble. */
  mascot: { fontFamily: font.monoRegular, fontSize: 14, lineHeight: 20 },
  /** Progress label. Tabular numerals keep the width fixed as the number changes. */
  progress: { fontFamily: font.mono, fontSize: 13, letterSpacing: 1.5, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
  /** A member's comment on a place. */
  take: { fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
  bodyMed: { fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: font.medium, fontSize: 13, lineHeight: 17 },
  chip: { fontFamily: font.mono, fontSize: 15 },
  button: { fontFamily: font.mono, fontSize: 18 },
  tab: { fontFamily: font.mono, fontSize: 14 },
} as const;

/** Durations in ms. Map animations must not use springs that overshoot. */
export const motion = {
  /** Press-in is faster than release. */
  press: 110,
  pressOut: 160,
  /** Sheet travel between detents. Uses the iOS drawer curve. */
  sheet: 380,
  mapPan: 320,
  /** Scrim fade on a modal sheet. Shorter than the sheet's own duration. */
  scrim: 220,
} as const;

/** Pin sizes in px. The hit target is larger than the pin at rest. */
export const pin = {
  rest: 40,
  selected: 52,
  dimmed: 14,
  hitTarget: 48,
} as const;

/**
 * Sizes shared by the sheet and the tab bar. Detents are relative to the tab
 * screen, whose height already excludes the tab bar. Peek is in px, half and
 * full are fractions. Full stays below 1 so part of the map is always visible
 * (CLAUDE.md §4).
 */
export const layout = {
  /** Tab bar content height, before the home-indicator inset is added. */
  tabBar: 72,
  sheetPeek: 104,
  sheetHalf: 0.52,
  sheetFull: 0.88,
} as const;

/** A solid shadow with no blur, offset downward. Gives a button a visible bottom edge. */
export const edge = (color: string, depth = 5) => ({
  shadowColor: color,
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: depth },
});

/** Soft, low-opacity shadows. */
export const shadow = {
  control: {
    shadowColor: '#5B4636',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sheet: {
    shadowColor: '#5B4636',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
  },
  critter: {
    shadowColor: '#5B4636',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
} as const;

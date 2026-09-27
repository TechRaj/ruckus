/**
 * Ruckus design tokens — context §10.3, restyled in the §13.6 design pass.
 *
 * Three tiers, each with exactly one job:
 *   neutrals  carry all structure (surfaces, text, hairlines)
 *   flare     means tappable or selected, and nothing else
 *   pastels   are identity (people, Dens), never information
 *
 * Dusk values are defined but not wired for launch (§9 cut line).
 */

export const day = {
  paper: '#FBFAF6',
  paperSunk: '#F2EEE2',
  hairline: '#E5E0D4',
  inkMuted: '#8A8478',
  inkSecondary: '#5E594F',
  ink: '#242321',

  flare: '#FF6846',
  flareWash: '#FFE9E2',

  /** §13.6 — the map reads a shade warmer than paper so pins sit on top. */
  mapLand: '#F0ECE0',
  /** The one colour borrowed from the tank. Apple Maps ignores it until MapLibre (§11.2). */
  mapWater: '#C2E6EE',
  mapParks: '#E3EBDC',
  mapRoads: '#FBFAF6',
  mapLot: '#DBD5C7',
  mapLabel: '#A79F91',

  pinDim: '#C9C3B5',
  scrim: 'rgba(36,35,33,0.34)',
} as const;

export const dusk = {
  paper: '#1B1917',
  paperSunk: '#252220',
  hairline: '#38332D',
  inkMuted: '#8F887C',
  inkSecondary: '#C9C2B4',
  ink: '#F2EDE3',

  flare: '#FF7A5C',
  flareWash: '#3A2620',

  mapLand: '#211E1B',
  /** The tank at night. */
  mapWater: '#0F2E31',
  mapParks: '#232821',
  mapRoads: '#2E2A26',
  mapLot: '#38332D',
  mapLabel: '#6B655B',

  pinDim: '#4A443C',
  scrim: 'rgba(0,0,0,0.5)',
} as const;

export const colors = day;

/**
 * The one pane of glass — the Places sheet, and nothing else. Paper at 72%
 * over a blur, a 1px rim so it reads as a pane rather than a scrim, and the
 * map ghosting through at every detent (§4, done as material).
 */
export const glass = {
  fill: 'rgba(251,250,246,0.72)',
  rim: 'rgba(255,255,255,0.65)',
  depth: 'rgba(8,30,36,0.05)',
  /** expo-blur intensity, 1–100. */
  intensity: 40,
} as const;

/**
 * The launch roster — urban scavengers (§13.6). Every critter ships as a
 * render carrying its own identity colour (§13.7), so there is no colour
 * table here; the art is the identity.
 */
export const launchCritters = ['raccoon', 'possum', 'squirrel', 'skunk'] as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { lg: 16, xl: 20, xxl: 28, pill: 999 } as const;

/**
 * Three voices — §13.4, extended in the tank pass. Fredoka speaks for the
 * app, Nunito for what you read, and Plex Mono for the machine and for
 * Rascal: kickers, hints, progress numbers, and his lines.
 * Rounded faces want air, so nothing here takes meaningful negative tracking.
 */
export const font = {
  display: 'Fredoka_600SemiBold',
  body: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoRegular: 'IBMPlexMono_400Regular',
} as const;

export const type = {
  /** Screen titles, over the map or at the top of a column. */
  display: { fontFamily: font.display, fontSize: 34, letterSpacing: -0.3, lineHeight: 40 },
  displaySm: { fontFamily: font.display, fontSize: 26, letterSpacing: -0.2, lineHeight: 31 },
  rowTitle: { fontFamily: font.display, fontSize: 18, letterSpacing: -0.1, lineHeight: 23 },
  /** Letterspaced uppercase label above a title. Mono, 0.14em. */
  kicker: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.7 },
  /** Lowercase mono aside — "pull up for the list". Never smaller than this. */
  hint: { fontFamily: font.monoRegular, fontSize: 13, lineHeight: 18 },
  /** What Rascal says, inside his bubble. */
  mascot: { fontFamily: font.monoRegular, fontSize: 14, lineHeight: 20 },
  /** "SNIFFING · 64%" — tabular so the number doesn't jitter. */
  progress: { fontFamily: font.mono, fontSize: 13, letterSpacing: 1.5, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
  /** A friend's one line about a place. */
  take: { fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
  bodyMed: { fontFamily: font.medium, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: font.medium, fontSize: 13, lineHeight: 17 },
  chip: { fontFamily: font.semibold, fontSize: 15 },
  button: { fontFamily: font.bold, fontSize: 17, letterSpacing: -0.2 },
  tab: { fontFamily: font.semibold, fontSize: 11.5, letterSpacing: 0.1 },
} as const;

/** Motion tokens — brief §21. Never spring-overshoot on the map (§12.3). */
export const motion = {
  /** Press down is faster than release: the system responds, then relaxes. */
  press: 110,
  pressOut: 160,
  /** Sheet travel between detents, on the iOS drawer curve. */
  sheet: 380,
  mapPan: 320,
  /** Scrim fade on a modal sheet — faster than the sheet it dims. */
  scrim: 220,
} as const;

/** Pin geometry — §12.1 / §13.6. Render size and hit target differ deliberately. */
export const pin = {
  rest: 40,
  selected: 52,
  dimmed: 14,
  hitTarget: 48,
} as const;

/**
 * Screen geometry the sheet and the tab bar both depend on — §4, §13.1.
 * Detents resolve against the TAB SCREEN, not the window: React Navigation
 * has already taken the bar out of that height. Peek is a pixel height
 * measured to the sheet header (at 18% it was a third taller than anything
 * it had to show); half and full are fractions. Full never reaches 100% —
 * the map keeps a sliver.
 */
export const layout = {
  /** Tab bar content height, before the home-indicator inset is added. */
  tabBar: 49,
  sheetPeek: 104,
  sheetHalf: 0.52,
  sheetFull: 0.88,
} as const;

/** Restrained, matte. No glossy drop shadows anywhere (§10.1). */
export const shadow = {
  control: {
    shadowColor: '#242321',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sheet: {
    shadowColor: '#242321',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
  },
  critter: {
    shadowColor: '#242321',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
} as const;

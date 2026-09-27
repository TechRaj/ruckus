/**
 * Rascal's lines — the tank pass, toned down.
 *
 * Lowercase, plain, short. They say what is true and stop; no jokes, no
 * asides. Empty states and the failed state show a line as plain text; only
 * while Rascal is doing something — sniffing, the save — does one go in a
 * bubble. Nothing here is a headline.
 *
 * Keep them in one place so the register stays consistent, and so the
 * boards (design/) can quote the same strings.
 */
export const lines = {
  emptyStash: 'nothing saved yet.',
  emptyPerson: (name: string) => `${name.toLowerCase()} hasn't saved anything yet.`,
  emptyPersonCategory: (name: string, label: string) =>
    `${name.toLowerCase()} hasn't saved any ${label.toLowerCase()} yet.`,
  emptyToday: "nothing's turning into a plan yet.",
  emptyCategory: (label: string) => `no ${label.toLowerCase()} saved yet.`,
  emptySearch: (q: string) => `nothing matches "${q}".`,
  emptySearchCategory: (q: string, label: string) =>
    `nothing matches "${q}" in ${label.toLowerCase()}.`,
  quietHome: 'quiet so far. saves from your den show up here.',
  noTakes: 'no comments yet.',

  /** While a link resolves. One is picked per run. */
  sniffing: [
    'reading the link…',
    'checking the tagged handle…',
    'matching the place…',
  ],
  hiding: "couldn't find that one. try searching, or add it by hand.",
  saved: 'saved to the stash.',

  /** Hints: mono, lowercase, muted. */
  hint: {
    pullUp: 'pull up for the list',
    pasteLink: 'or share a link to ruckus from any app. it lands here.',
    endOfStash: "that's the whole stash.",
    stillNothing: 'nothing? type the details in by hand.',
    moreDens: 'you can make more dens later. one for the city, one for the road trip.',
    joinLink: 'already in a den? join with a link',
  },
} as const;

export const pickSniffLine = () =>
  lines.sniffing[Math.floor(Math.random() * lines.sniffing.length)];

/**
 * User-facing copy for empty states, link resolving, saves and hints. Lines
 * are lowercase and short. Keep them all in this file so the tone stays
 * consistent.
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
  searchFailed: "couldn't search just now. try again.",
  searchLimit: "that's today's search limit. try again tomorrow.",
  quietHome: 'quiet so far. saves from your den show up here.',
  noTakes: 'no comments yet.',

  /** Shown while a link resolves. One is picked at random each time. */
  sniffing: [
    'reading the link…',
    'checking the tagged handle…',
    'matching the place…',
  ],
  hiding: "couldn't find that one. try searching, or add it by hand.",
  missingEvent: "that event isn't in your den anymore.",
  saved: 'saved to the stash.',

  /** Hints. Rendered in the mono font, muted. */
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

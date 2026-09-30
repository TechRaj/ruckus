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
  caperFailed: "couldn't lock that in. try again.",
  quietHome: 'quiet so far. saves from your den show up here.',
  noTakes: 'no comments yet.',

  /** The Den's free place limit, shown on People once it's nearly used up. */
  room: {
    nearlyFullOwner: 'almost out of room. ruckus pro makes this den unlimited.',
    fullOwner: "this den's full. ruckus pro makes it unlimited.",
    tooMany: (left: number) =>
      (left === 0 ? "this den's full." : `this den has room for ${left} more. untick some to fit.`),
    nearlyFull: (owner: string) => `almost out of room. only ${owner.toLowerCase()} can make more, with ruckus pro.`,
    full: (owner: string) => `this den's full. only ${owner.toLowerCase()} can make room, with ruckus pro.`,
  },

  /** Shown while a link resolves. One is picked at random each time. */
  sniffing: [
    'reading the link…',
    'checking the tagged handle…',
    'matching the place…',
  ],
  hiding: "couldn't find that one. try searching, or add it by hand.",
  missingEvent: "that event isn't in your den anymore.",
  saved: 'one step closer to making plans!',

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

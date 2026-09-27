/**
 * The words the Places sheet uses for the current view. Pure: takes the
 * filter state and says what the kicker, headline and empty line should
 * read. Keeps a 17-line ternary tree out of the screen and lets the copy be
 * checked without rendering anything.
 */
import { lines } from '../theme/lines';
import { CATEGORY_LABEL, Category, Filter } from '../types';

export interface StashView {
  filter: Filter;
  category: Category | null;
  query: string;
  /** Display name of the person filter, if any. */
  who: string | null;
  visibleCount: number;
  stashEmpty: boolean;
}

export function describeView(v: StashView) {
  const cat = v.category ? CATEGORY_LABEL[v.category] : null;
  const catWord = cat?.toLowerCase();
  const q = v.query.trim();

  const kicker = v.who
    ? `${v.who}'s ${catWord ?? 'picks'}`
    : v.filter.kind === 'today'
      ? `Happening today${cat ? ` · ${cat}` : ''}`
      : cat ? `${cat} in the stash` : 'Your shared stash';

  const headline = v.visibleCount === 0
    ? (v.stashEmpty ? 'nothing yet' : 'nothing here')
    : `${v.visibleCount} good idea${v.visibleCount === 1 ? '' : 's'}`;

  const emptyLine = q
    ? (cat ? lines.emptySearchCategory(q, cat) : lines.emptySearch(q))
    : v.who && cat ? lines.emptyPersonCategory(v.who, cat)
    : v.who ? lines.emptyPerson(v.who)
    : cat ? lines.emptyCategory(cat)
    : v.filter.kind === 'today' ? lines.emptyToday : lines.emptyStash;

  return { kicker, headline, emptyLine };
}

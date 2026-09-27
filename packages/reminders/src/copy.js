/**
 * Push copy for a dated Den event.
 *
 * Want-to-go is interest, not a confirmed RSVP. Someone who has already
 * voted is not asked again. Names are other members' display names only;
 * with none, the line does not invent any. At most two names are shown.
 */

const WHEN = { 7: 'next week', 3: 'in 3 days', 1: 'tomorrow' };
const NAME_CAP = 2;

function formatOthers(names) {
  const shown = names.slice(0, NAME_CAP);
  const rest = names.length - shown.length;
  if (rest > 0) {
    const noun = rest === 1 ? 'other' : 'others';
    return `${shown.join(', ')} and ${rest} ${noun} want to go.`;
  }
  if (shown.length === 1) return `${shown[0]} wants to go.`;
  return `${shown[0]} and ${shown[1]} want to go.`;
}

/**
 * @param {object} args
 * @param {string} args.eventName
 * @param {7|3|1} args.offsetDays
 * @param {boolean} args.recipientVoted
 * @param {string[]} args.otherVoterNames display names of other current members who want to go
 */
export function reminderCopy({ eventName, offsetDays, recipientVoted, otherVoterNames }) {
  const when = WHEN[offsetDays];
  if (!when || !eventName) throw new Error('bad reminder copy');
  const names = [...(otherVoterNames ?? [])]
    .map(name => (typeof name === 'string' ? name.trim() : ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const lead = `${eventName} is ${when}.`;
  if (recipientVoted) {
    if (names.length === 0) return `${lead} You want to go.`;
    const friends = names.length === 1 ? '1 friend' : `${names.length} friends`;
    return `${lead} You and ${friends} want to go.`;
  }
  if (names.length === 0) return `${lead} Interested?`;
  return `${lead} ${formatOthers(names)} Interested?`;
}

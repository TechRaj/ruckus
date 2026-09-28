/**
 * One marker per Stash item. The list is memoised because re-creating markers
 * on the native map is expensive. A pin excluded by either filter is drawn as
 * a dot, and avatars show only when the filter is a single person.
 */
import { useMemo } from 'react';
import { Marker } from 'react-native-maps';
import { Category, Member, StashItem, isNearlyAPlan } from '../types';
import { Pin } from '../components/Pin';

export function useStashMarkers({
  stash, focusedUser, category, selectedId, memberById, onPress,
}: {
  stash: StashItem[];
  focusedUser: string | null;
  category: Category | null;
  selectedId: string | null;
  memberById: Map<string, Member>;
  onPress: (item: StashItem) => void;
}) {
  return useMemo(() => stash.map(item => {
    const filteredOut = (focusedUser !== null && item.savedBy !== focusedUser)
      || (category !== null && item.category !== category);
    const selected = selectedId === item.id;
    const state = filteredOut ? 'dimmed' : selected ? 'selected' : 'rest';
    const critter = !filteredOut && focusedUser ? memberById.get(item.savedBy)?.critter : undefined;
    return (
      <Marker
        /**
         * The key includes the visual state. iOS caches a marker's rendered
         * snapshot, so with tracksViewChanges off a pin repaints only when it
         * remounts.
         */
        key={`${item.id}-${state}-${critter ?? ''}`}
        coordinate={{ latitude: item.lat, longitude: item.lng }}
        onPress={() => !filteredOut && onPress(item)}
        tracksViewChanges={false}
        anchor={{ x: 0.5, y: 1 }}
        zIndex={selected ? 10 : 1}
      >
        <Pin category={item.category} state={state} inCaper={isNearlyAPlan(item)} critter={critter} />
      </Marker>
    );
  }), [stash, focusedUser, category, selectedId, memberById, onPress]);
}

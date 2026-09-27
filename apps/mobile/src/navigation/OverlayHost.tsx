/**
 * The save loop, hoisted out of any one screen.
 *
 * Add → confirm → saved can start from the sheet header, from Home, and
 * eventually from the share extension (§5.2), so none of those should own it.
 * Everything reads `overlay` on StashContext.
 */
import { EmptyState } from '../components/EmptyState';
import { SheetModal } from '../components/SheetModal';
import { AddPlaceScreen } from '../screens/AddPlaceScreen';
import { ConfirmScreen } from '../screens/ConfirmScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { useStash } from '../state/StashContext';
import { lines } from '../theme/lines';

export function OverlayHost() {
  const { overlay, openOverlay, select } = useStash();
  const close = () => openOverlay({ kind: 'none' });

  switch (overlay.kind) {
    case 'add':
      return (
        <AddPlaceScreen
          onClose={close}
          onResolve={url => openOverlay({ kind: 'confirm', url })}
          onManual={() => openOverlay({ kind: 'confirm', url: null })}
        />
      );
    case 'confirm':
      return (
        <ConfirmScreen
          sharedUrl={overlay.url}
          startInSearch={overlay.url === null}
          onClose={close}
          onSaved={name => openOverlay({ kind: 'saved', name })}
        />
      );
    case 'saved':
      return (
        <SavedScreen
          name={overlay.name}
          onClose={close}
          onAddAnother={() => openOverlay({ kind: 'add' })}
        />
      );
    case 'detail':
      return (
        <PlaceDetailScreen
          id={overlay.id}
          onClose={() => { select(null); close(); }}
        />
      );
    case 'missing-event':
      return (
        <SheetModal onClose={close} height={0.42}>
          <EmptyState line={lines.missingEvent} />
        </SheetModal>
      );
    default:
      return null;
  }
}

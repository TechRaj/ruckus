/**
 * Hosts the add, confirm, saved and detail screens in one sheet.
 * The flow can start from several screens, so it is driven by `overlay` on StashContext.
 */
import { useRef } from 'react';
import { EmptyState } from '../components/EmptyState';
import { SheetHost, SheetModal } from '../components/SheetModal';
import { AddPlaceScreen } from '../screens/AddPlaceScreen';
import { CaperMadeScreen } from '../screens/CaperMadeScreen';
import { CaperSheet } from '../screens/CaperSheet';
import { ConfirmScreen } from '../screens/ConfirmScreen';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { SignOutSheet } from '../screens/SignOutSheet';
import { DeleteAccountSheet } from '../screens/DeleteAccountSheet';
import { Overlay, useStash } from '../state/StashContext';
import { lines } from '../theme/lines';
import { cleanLink, firstLink, isReelLink, searchHint } from '../lib/links';

export function OverlayHost() {
  const { overlay } = useStash();
  /** Keeps the last screen rendered while the sheet animates closed. */
  const last = useRef<Overlay>(overlay);
  if (overlay.kind !== 'none') last.current = overlay;

  /** A single sheet stays open while the screens change inside it. */
  return (
    <SheetHost open={overlay.kind !== 'none'} contentKey={last.current.kind}>
      <OverlayScreen overlay={last.current} />
    </SheetHost>
  );
}

function OverlayScreen({ overlay }: { overlay: Overlay }) {
  const { openOverlay, select } = useStash();
  const close = () => openOverlay({ kind: 'none' });

  switch (overlay.kind) {
    case 'add':
      return (
        <AddPlaceScreen
          onClose={close}
          onResolve={input => {
            // a pasted link goes to resolving; pasted words (a name, an address) to search
            // "instagram.com/reel/..." pasted without https:// is still a link
            const bare = /^[\w-]+(\.[\w-]+)+\/\S*$/.test(input.trim()) ? `https://${input.trim()}` : null;
            const link = cleanLink(firstLink(input) ?? bare);
            openOverlay(link
              ? { kind: 'confirm', url: link, query: searchHint(link, input) }
              : { kind: 'confirm', url: null, query: input.slice(0, 120) });
          }}
          onManual={() => openOverlay({ kind: 'confirm', url: null })}
        />
      );
    case 'confirm':
      return (
        <ConfirmScreen
          /**
           * Keyed on the link: a second reel shared while this screen is open
           * must start fresh. Without the key the screen kept the first reel's
           * pick and saved it against the second reel's link.
           */
          key={overlay.url ?? `search:${overlay.query ?? ''}`}
          sharedUrl={overlay.url}
          initialQuery={overlay.query || searchHint(overlay.url)}
          /** Only reel links can be read. Any other link is kept as the source and starts in search. */
          startInSearch={!isReelLink(overlay.url)}
          onClose={close}
          /** Back from search returns to Add a place. */
          onBack={() => openOverlay({ kind: 'add' })}
          onSaved={(name, count) => openOverlay({ kind: 'saved', name, count })}
        />
      );
    case 'saved':
      return (
        <SavedScreen
          name={overlay.name}
          count={overlay.count}
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
    case 'caper':
      return (
        <CaperSheet
          id={overlay.id}
          onClose={close}
          onMade={caperId => openOverlay({ kind: 'caper-made', caperId })}
        />
      );
    case 'caper-made':
      return <CaperMadeScreen caperId={overlay.caperId} onClose={close} />;
    case 'sign-out':
      return <SignOutSheet onClose={close} />;
    case 'delete-account':
      return <DeleteAccountSheet onClose={close} />;
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

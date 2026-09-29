/**
 * Map camera controls: pan to a place, zoom, recentre. All of them use
 * `animateToRegion`, because Apple Maps ignores `camera.zoom`. Zoom halves or
 * doubles the region currently on screen.
 */
import { useCallback, useRef } from 'react';
import MapView, { Region } from 'react-native-maps';
import { motion } from '../theme/tokens';
import { StashItem } from '../types';

/**
 * The last resort only: an empty Den and no location. Otherwise the map opens
 * on the Den's own pins (fitTo) or on the user (recentre).
 */
export const TORONTO: Region = {
  latitude: 43.6510, longitude: -79.4100,
  latitudeDelta: 0.032, longitudeDelta: 0.032,
};

const MIN_DELTA = 0.0025;
const MAX_DELTA = 1.2;

export function useMapCamera() {
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(TORONTO);

  /** Pass to MapView's onRegionChangeComplete so zoom starts from the region on screen. */
  const onRegionChangeComplete = useCallback((r: Region) => { regionRef.current = r; }, []);

  /** Centres the place above the middle of the map so the sheet does not cover it. */
  const panTo = useCallback((item: StashItem) => {
    mapRef.current?.animateToRegion({
      latitude: item.lat - 0.006,
      longitude: item.lng,
      latitudeDelta: 0.018, longitudeDelta: 0.018,
    }, motion.mapPan);
  }, []);

  const zoom = useCallback((direction: 1 | -1) => {
    const r = regionRef.current;
    const f = direction > 0 ? 0.5 : 2;
    const clamp = (d: number) => Math.min(MAX_DELTA, Math.max(MIN_DELTA, d * f));
    const next = { ...r, latitudeDelta: clamp(r.latitudeDelta), longitudeDelta: clamp(r.longitudeDelta) };
    regionRef.current = next;
    mapRef.current?.animateToRegion(next, motion.mapPan);
  }, []);

  /**
   * Frame every pin, leaving room for the sheet at the bottom. A Den full of
   * Banff places opens on Banff, not on a default city. Returns false when
   * there's nothing to frame.
   */
  const fitTo = useCallback((points: { lat: number; lng: number }[], bottomInset = 0) => {
    const pts = points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!pts.length) return false;
    if (pts.length === 1) {
      mapRef.current?.animateToRegion({
        latitude: pts[0].lat - 0.006, longitude: pts[0].lng, latitudeDelta: 0.03, longitudeDelta: 0.03,
      }, motion.mapPan);
      return true;
    }
    mapRef.current?.fitToCoordinates(
      pts.map(p => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 120, right: 56, bottom: bottomInset + 48, left: 56 }, animated: true },
    );
    return true;
  }, []);

  /** Recentre on the user if we know where they are, else on the Den's pins, else the fallback. */
  const recentre = useCallback((opts: {
    position?: { lat: number; lng: number } | null;
    points?: { lat: number; lng: number }[];
    bottomInset?: number;
  } = {}) => {
    if (opts.position) {
      mapRef.current?.animateToRegion({
        latitude: opts.position.lat - 0.006, longitude: opts.position.lng,
        latitudeDelta: 0.032, longitudeDelta: 0.032,
      }, motion.mapPan);
      return;
    }
    if (!fitTo(opts.points ?? [], opts.bottomInset)) mapRef.current?.animateToRegion(TORONTO, motion.mapPan);
  }, [fitTo]);

  return { mapRef, onRegionChangeComplete, panTo, zoom, fitTo, recentre };
}

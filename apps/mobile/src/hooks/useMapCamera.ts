/**
 * Map camera controls: pan to a place, zoom, recentre. All of them use
 * `animateToRegion`, because Apple Maps ignores `camera.zoom`. Zoom halves or
 * doubles the region currently on screen.
 */
import { useCallback, useRef } from 'react';
import MapView, { Region } from 'react-native-maps';
import { motion } from '../theme/tokens';
import { StashItem } from '../types';

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

  const recentre = useCallback(() => {
    mapRef.current?.animateToRegion(TORONTO, motion.mapPan);
  }, []);

  return { mapRef, onRegionChangeComplete, panTo, zoom, recentre };
}

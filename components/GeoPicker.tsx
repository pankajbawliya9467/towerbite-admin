'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Circle, Map as LeafletMap, Marker } from 'leaflet';

/**
 * Where a cafe is, for the "order only from inside the building" check. Free OpenStreetMap map (no Google
 * key): click or drag the pin, or paste coordinates / a Google Maps link.
 */
export function GeoPicker({ lat, lng, radius, onChange }: {
  lat: number | null; lng: number | null; radius: number; onChange: (lat: number, lng: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const circle = useRef<Circle | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const [paste, setPaste] = useState('');
  const [pasteErr, setPasteErr] = useState('');

  // Create the map once (Leaflet needs the browser, so it is loaded here, not at build time).
  useEffect(() => {
    let off = false;
    void import('leaflet').then((L) => {
      if (off || !box.current || map.current) return;
      const start: [number, number] = lat != null && lng != null ? [lat, lng] : [28.4595, 77.0266]; // Gurugram
      const m = L.map(box.current, { zoomControl: true }).setView(start, lat != null ? 17 : 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      const icon = L.divIcon({
        className: '',
        html: '<svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 37s-13-11-13-22a13 13 0 0 1 26 0c0 11-13 22-13 22z" fill="#E8590C" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>',
        iconSize: [30, 38],
        iconAnchor: [15, 37],
      });
      const place = (p: [number, number]) => {
        if (!marker.current) {
          marker.current = L.marker(p, { draggable: true, icon }).addTo(m);
          marker.current.on('dragend', () => {
            const ll = marker.current!.getLatLng();
            change.current(round(ll.lat), round(ll.lng));
          });
          circle.current = L.circle(p, { radius, color: '#E8590C', weight: 2, dashArray: '6 4', fillOpacity: 0.12 }).addTo(m);
        }
        marker.current.setLatLng(p);
        circle.current!.setLatLng(p);
      };
      if (lat != null && lng != null) place([lat, lng]);
      m.on('click', (e) => {
        place([e.latlng.lat, e.latlng.lng]);
        change.current(round(e.latlng.lat), round(e.latlng.lng));
      });
      map.current = m;
      (box.current as HTMLDivElement & { _place?: typeof place })._place = place;
    });
    return () => {
      off = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
      circle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin / radius changed from outside (pasted coordinates, radius slider).
  useEffect(() => {
    circle.current?.setRadius(radius);
  }, [radius]);
  useEffect(() => {
    if (lat == null || lng == null || !map.current) return;
    const place = (box.current as (HTMLDivElement & { _place?: (p: [number, number]) => void }) | null)?._place;
    place?.([lat, lng]);
  }, [lat, lng]);

  function applyPasted() {
    const p = parseCoords(paste);
    if (!p) return setPasteErr('Paste numbers like 28.4241, 77.0415, or a Google Maps link that has them.');
    setPasteErr('');
    setPaste('');
    onChange(p[0], p[1]);
    map.current?.setView(p, 17);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="field" value={paste} placeholder="Paste 28.4241, 77.0415 or a Google Maps link"
          onChange={(e) => setPaste(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyPasted())} />
        <button type="button" className="btn sec sm" onClick={applyPasted} disabled={!paste.trim()}>Use</button>
      </div>
      {pasteErr && <div className="err" style={{ marginTop: 6 }}>{pasteErr}</div>}
      <div className="small" style={{ margin: '8px 0' }}>
        Google Maps: right-click the cafe and click the numbers at the top to copy them. Or click / drag the pin below.
      </div>
      <div ref={box} style={{ height: 260, borderRadius: 14, overflow: 'hidden', border: '1.5px solid var(--line)', zIndex: 0 }} />
      <div className="small" style={{ marginTop: 6 }}>
        {lat != null && lng != null ? `Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'No pin yet: click the map where the cafe is.'}
      </div>
    </div>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** "28.42, 77.04", or a Google Maps link with @lat,lng / q=lat,lng / !3dlat!4dlng in it. */
export function parseCoords(text: string): [number, number] | null {
  const t = decodeURIComponent(text.trim());
  const m =
    t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ??
    t.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ??
    t.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ??
    t.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
  return [round(lat), round(lng)];
}

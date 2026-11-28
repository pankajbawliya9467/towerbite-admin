'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { CircleMarker, LatLngExpression, Map as LeafletMap, Polygon, Polyline, TileLayer } from 'leaflet';
import { parseCoords } from './GeoPicker';

export type Area = [number, number][];

const STREET = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ORANGE = '#E8590C';
const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** Metres between two points. */
function metres(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(toRad(b[0] - a[0]) / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(toRad(b[1] - a[1]) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** "About 520 m × 380 m" for the drawn area (its north-south and east-west size). */
export function areaSize(area: Area) {
  const lats = area.map((p) => p[0]);
  const lngs = area.map((p) => p[1]);
  const mid = (Math.min(...lats) + Math.max(...lats)) / 2;
  const ns = metres([Math.min(...lats), lngs[0]], [Math.max(...lats), lngs[0]]);
  const ew = metres([mid, Math.min(...lngs)], [mid, Math.max(...lngs)]);
  const f = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);
  return `${f(ns)} × ${f(ew)}`;
}

/**
 * Draws a location's area on a free OpenStreetMap map (satellite view too). Click around the campus to add
 * corners, click the first corner to close it. Afterwards corners can be dragged; "Redraw" starts again.
 */
export function AreaPicker({ area, onChange, disabled }: { area: Area | null; onChange: (a: Area | null) => void; disabled?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const L = useRef<typeof import('leaflet') | null>(null);
  const tiles = useRef<TileLayer | null>(null);
  const shape = useRef<Polygon | null>(null);
  const line = useRef<Polyline | null>(null);
  const dots = useRef<CircleMarker[]>([]);
  const change = useRef(onChange);
  change.current = onChange;

  /** Corners being drawn now (not closed yet). null = not drawing. */
  const [drawing, setDrawing] = useState<Area | null>(null);
  const drawingRef = useRef<Area | null>(null);
  drawingRef.current = drawing;
  const [satellite, setSatellite] = useState(false);
  const [ready, setReady] = useState(false);
  const [paste, setPaste] = useState('');
  const [pasteErr, setPasteErr] = useState('');

  // Create the map once (Leaflet needs the browser, so it is loaded here, not at build time).
  useEffect(() => {
    let off = false;
    void import('leaflet').then((mod) => {
      if (off || !box.current || map.current) return;
      L.current = mod;
      const m = mod.map(box.current, { zoomControl: true, doubleClickZoom: false }).setView([28.4595, 77.0266], 12); // Gurugram
      tiles.current = mod.tileLayer(STREET, { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(m);
      m.on('click', (e) => {
        const cur = drawingRef.current;
        if (!cur) return;
        setDrawing([...cur, [round(e.latlng.lat), round(e.latlng.lng)]]);
      });
      map.current = m;
      if (area && area.length >= 3) m.fitBounds(area, { padding: [30, 30] });
      setReady(true);
    });
    return () => {
      off = true;
      map.current?.remove();
      map.current = null;
      shape.current = null;
      line.current = null;
      dots.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Street / satellite.
  useEffect(() => {
    const m = map.current;
    if (!m || !L.current) return;
    tiles.current?.remove();
    tiles.current = L.current
      .tileLayer(satellite ? SATELLITE : STREET, { maxZoom: 19, attribution: satellite ? 'Imagery &copy; Esri' : '&copy; OpenStreetMap' })
      .addTo(m);
    tiles.current.bringToBack();
  }, [satellite, ready]);

  // Draw what we have: the saved area (corners draggable) or the outline being drawn.
  useEffect(() => {
    const m = map.current;
    const Lf = L.current;
    if (!m || !Lf) return;
    shape.current?.remove();
    line.current?.remove();
    dots.current.forEach((d) => d.remove());
    shape.current = null;
    line.current = null;
    dots.current = [];

    if (drawing) {
      if (drawing.length) {
        line.current = Lf.polyline(drawing as LatLngExpression[], { color: ORANGE, weight: 3, dashArray: '8 6' }).addTo(m);
      }
      drawing.forEach((p, i) => {
        const first = i === 0;
        const dot = Lf.circleMarker(p, {
          radius: first ? 9 : 6, color: ORANGE, weight: 3, fillColor: '#fff', fillOpacity: 1, bubblingMouseEvents: false,
        }).addTo(m);
        if (first) {
          dot.bindTooltip(drawing.length >= 3 ? 'Click to close the area' : 'First corner', { direction: 'top', offset: [0, -8] });
          dot.on('click', () => finish());
        }
        dots.current.push(dot);
      });
      return;
    }
    if (area && area.length >= 3) {
      shape.current = Lf.polygon(area as LatLngExpression[], { color: ORANGE, weight: 3, fillColor: ORANGE, fillOpacity: 0.12 }).addTo(m);
      if (!disabled) {
        // Drag a corner to fix it (a marker per corner; the polygon follows).
        area.forEach((p, i) => {
          const handle = Lf.marker(p, {
            draggable: true,
            icon: Lf.divIcon({ className: '', html: '<div class="area-handle"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
          }).addTo(m);
          handle.on('drag', () => {
            const ll = handle.getLatLng();
            const next = area.map((q, j) => (j === i ? [ll.lat, ll.lng] : q)) as Area;
            shape.current?.setLatLngs(next as LatLngExpression[]);
          });
          handle.on('dragend', () => {
            const ll = handle.getLatLng();
            change.current(area.map((q, j) => (j === i ? [round(ll.lat), round(ll.lng)] : q)) as Area);
          });
          dots.current.push(handle as unknown as CircleMarker);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, drawing, ready, disabled]);

  function startDrawing() {
    setDrawing([]);
  }
  function finish() {
    const cur = drawingRef.current;
    if (!cur || cur.length < 3) return;
    setDrawing(null);
    change.current(cur);
  }
  function undo() {
    setDrawing((d) => (d && d.length ? d.slice(0, -1) : d));
  }
  function cancelDrawing() {
    setDrawing(null);
  }

  function goTo() {
    const p = parseCoords(paste);
    if (!p) return setPasteErr('Paste numbers like 28.4241, 77.0415, or a Google Maps link that has them.');
    setPasteErr('');
    setPaste('');
    map.current?.setView(p, 17);
  }

  return (
    <div className="area-picker">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="field" style={{ flex: '1 1 260px' }} value={paste} placeholder="Go to: paste 28.4241, 77.0415 or a Google Maps link"
          onChange={(e) => setPaste(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), goTo())} />
        <button type="button" className="btn sec sm" onClick={goTo} disabled={!paste.trim()}>Go</button>
        <div className="area-toggle" role="group" aria-label="Map style">
          <button type="button" className={satellite ? '' : 'on'} onClick={() => setSatellite(false)}>Map</button>
          <button type="button" className={satellite ? 'on' : ''} onClick={() => setSatellite(true)}>Satellite</button>
        </div>
      </div>
      {pasteErr && <div className="err" style={{ marginTop: 6 }}>{pasteErr}</div>}

      <div className="area-map-wrap">
        <div ref={box} className={`area-map${drawing ? ' drawing' : ''}`} />
        {drawing && (
          <div className="area-hint">
            {drawing.length < 3
              ? `Click around the campus to add corners (${drawing.length} so far, at least 3)`
              : 'Keep adding corners, or click the first corner to close the area'}
          </div>
        )}
      </div>

      <div className="area-actions">
        {drawing ? (
          <>
            <button type="button" className="btn sec sm" onClick={undo} disabled={!drawing.length}>Undo corner</button>
            <button type="button" className="btn sec sm" onClick={cancelDrawing}>Cancel</button>
            <button type="button" className="btn sm" onClick={finish} disabled={drawing.length < 3}>Finish area</button>
          </>
        ) : area && area.length >= 3 ? (
          <>
            <span className="area-ok">Area drawn · {area.length} corners · about {areaSize(area)}</span>
            {!disabled && <button type="button" className="btn sec sm" onClick={startDrawing}>Redraw</button>}
            {!disabled && (
              <button type="button" className="btn sec sm" onClick={() => map.current?.fitBounds(area, { padding: [30, 30] })}>
                Zoom to area
              </button>
            )}
          </>
        ) : (
          <>
            <span className="small">No area yet. Zoom in on the campus, then draw around it.</span>
            {!disabled && <button type="button" className="btn sm" onClick={startDrawing}>Draw area</button>}
          </>
        )}
      </div>
      {!drawing && area && area.length >= 3 && !disabled && (
        <div className="small" style={{ marginTop: 6 }}>Drag a corner to fix it. Draw a little outside the walls: phone GPS drifts inside buildings.</div>
      )}
    </div>
  );
}

/** A small picture of the area's shape (locations list). */
export function AreaThumb({ area, size = 120 }: { area: Area | null; size?: number }) {
  if (!area || area.length < 3) {
    return <div className="area-thumb empty" style={{ width: size, height: size * 0.7 }}>No area yet</div>;
  }
  const lats = area.map((p) => p[0]);
  const lngs = area.map((p) => p[1]);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const w = size;
  const h = size * 0.7;
  const pad = 10;
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLng - minLng) * kx, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const k = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const ox = (w - spanX * k) / 2;
  const oy = (h - spanY * k) / 2;
  const pts = area.map(([la, ln]) => `${(ox + (ln - minLng) * kx * k).toFixed(1)},${(oy + (maxLat - la) * k).toFixed(1)}`).join(' ');
  return (
    <svg className="area-thumb" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Shape of the drawn area">
      <polygon points={pts} fill="rgba(232,89,12,.16)" stroke={ORANGE} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

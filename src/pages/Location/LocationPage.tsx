import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../app/providers/AuthProvider';
import { useLocationSharing } from '../../hooks/useLocationSharing';
import { useToast } from '../../app/providers/ToastProvider';
import { api } from '../../services/api';
import { Icon } from '../../components/icons/Icon';

// Fix Leaflet default icon paths for bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    "><div style="width:8px;height:8px;border-radius:50%;background:#fff"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const iconPerson = createIcon('#0077b6');
const iconMe = createIcon('#34d399');
const iconPharmacy = createIcon('#059669');
const iconHospital = createIcon('#dc2626');
const iconClinic = createIcon('#7c3aed');

function iconForPlace(type: string) {
  if (type === 'pharmacy') return iconPharmacy;
  if (type === 'hospital') return iconHospital;
  return iconClinic;
}

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
}

interface ConnectedPerson {
  id: string;
  name: string;
}

interface Place {
  name: string;
  lat: number;
  lng: number;
  type: 'pharmacy' | 'hospital' | 'clinic';
  distance?: number;
  address?: string;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function FitBounds({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? 15, { animate: true });
  }, [map, center, zoom]);
  return null;
}

type Tab = 'track' | 'pharmacies';

export function LocationPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const isCaregiver = user && !('age' in user);

  const [tab, setTab] = useState<Tab>(isCaregiver ? 'track' : 'pharmacies');
  const [persons, setPersons] = useState<ConnectedPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [trackedLocation, setTrackedLocation] = useState<LocationData | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  const [myLocation, setMyLocation] = useState<GeolocationPosition | null>(null);
  const [, setMyLocationError] = useState<string | null>(null);

  const { sharing, startSharing, stopSharing } = useLocationSharing(30000);

  const [places, setPlaces] = useState<Place[]>([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [radius, setRadius] = useState(3);
  const [filter, setFilter] = useState<'all' | 'pharmacy' | 'hospital'>('all');

  // Manual location setting (for testing / same-device testing)
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showManual, setShowManual] = useState(false);

  const sendManualLocation = async (lat: number, lng: number) => {
    try {
      await api.post('/locations/share', { lat, lng, accuracy: 10 });
      push({ tone: 'success', title: `Location set to ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      // Refresh tracked location if caregiver is viewing
      if (isCaregiver) fetchTrackedLocation();
    } catch {
      push({ tone: 'error', title: 'Failed to set location' });
    }
  };

  const PRESETS = [
    { name: 'Mumbai, India', lat: 19.076, lng: 72.8777 },
    { name: 'Delhi, India', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore, India', lat: 12.9716, lng: 77.5946 },
    { name: 'New York, USA', lat: 40.7128, lng: -74.006 },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  ];

  useEffect(() => {
    if (!navigator.geolocation) { setMyLocationError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation(pos),
      (err) => setMyLocationError(err.message),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (!user || !isCaregiver) return;
    api.get<{ id: string; name: string }[]>('/caregiver/connected')
      .then((res) => { setPersons(res || []); if (res?.length > 0) setSelectedPerson(res[0].id); })
      .catch(() => {});
  }, [user, isCaregiver]);

  const fetchTrackedLocation = useCallback(async () => {
    if (!selectedPerson) return;
    setTrackLoading(true);
    setTrackError(null);
    try {
      const res = await api.get<{ location: LocationData | null; reason?: string }>(`/locations/${selectedPerson}`);
      if (res.location) setTrackedLocation(res.location);
      else { setTrackedLocation(null); setTrackError(res.reason === 'expired' ? 'Location expired (2h ago)' : 'No location available yet'); }
    } catch { setTrackError('Failed to fetch location'); }
    finally { setTrackLoading(false); }
  }, [selectedPerson]);

  useEffect(() => { fetchTrackedLocation(); }, [fetchTrackedLocation]);
  useEffect(() => {
    if (!selectedPerson) return;
    const id = setInterval(fetchTrackedLocation, 15000);
    return () => clearInterval(id);
  }, [selectedPerson, fetchTrackedLocation]);

  const searchPharmacies = useCallback(async () => {
    if (!navigator.geolocation) { setPharmacyError('Geolocation not supported'); return; }
    setPharmacyLoading(true); setPharmacyError(null); setPlaces([]);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const r = radius * 1000;
        const query = `[out:json][timeout:15];(node["amenity"="pharmacy"](around:${r},${lat},${lng});node["amenity"="hospital"](around:${r},${lat},${lng});node["healthcare"="clinic"](around:${r},${lat},${lng}););out body;`;
        try {
          const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          const data = await res.json();
          const results: Place[] = (data.elements || [])
            .map((el: Record<string, unknown>) => {
              const tags = (el.tags || {}) as Record<string, string>;
              const name = tags.name || tags['name:en'] || tags.brand || '';
              const typ = tags.amenity === 'pharmacy' ? 'pharmacy' : tags.amenity === 'hospital' ? 'hospital' : 'clinic';
              const addr = [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ');
              return { name: name || typ.charAt(0).toUpperCase() + typ.slice(1), lat: el.lat as number, lng: el.lon as number, type: typ as Place['type'], distance: haversine(lat, lng, el.lat as number, el.lon as number), address: addr || undefined };
            })
            .sort((a: Place, b: Place) => (a.distance || 0) - (b.distance || 0));
          setPlaces(results);
          if (results.length === 0) setPharmacyError('No results found. Try a larger radius.');
        } catch { setPharmacyError('Search failed. Check your internet connection.'); }
        finally { setPharmacyLoading(false); }
      },
      () => { setPharmacyError('Location access denied.'); setPharmacyLoading(false); },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [radius]);

  const toggleSharing = () => {
    if (sharing) { stopSharing(); push({ tone: 'success', title: 'Location sharing stopped' }); }
    else { startSharing(); push({ tone: 'success', title: 'Sharing your location with your caregiver' }); }
  };

  const myLat = myLocation?.coords.latitude;
  const myLng = myLocation?.coords.longitude;
  const trackedLat = trackedLocation?.lat;
  const trackedLng = trackedLocation?.lng;
  const filteredPlaces = places.filter((p) => filter === 'all' || p.type === filter);

  const mapCenter: [number, number] = useMemo(() => {
    if (isCaregiver && trackedLat != null && trackedLng != null) return [trackedLat, trackedLng];
    if (myLat != null && myLng != null) return [myLat, myLng];
    return [20, 0];
  }, [isCaregiver, trackedLat, trackedLng, myLat, myLng]);

  return (
    <div className="location-page">
      {/* ── Real map ── */}
      <div className="loc-map-container">
        <MapContainer center={mapCenter} zoom={15} className="loc-map" zoomControl={false}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FitBounds center={mapCenter} zoom={trackedLat != null || myLat != null ? 15 : 3} />

          {/* Caregiver's own location */}
          {!isCaregiver && myLat != null && myLng != null && (
            <Marker position={[myLat, myLng]} icon={iconMe}>
              <Popup><strong>You are here</strong></Popup>
            </Marker>
          )}

          {/* Tracked person (caregiver view) */}
          {isCaregiver && trackedLat != null && trackedLng != null && (
            <>
              <Marker position={[trackedLat, trackedLng]} icon={iconPerson}>
                <Popup><strong>{persons.find((p) => p.id === selectedPerson)?.name ?? 'Cared Person'}</strong><br />{timeAgo(trackedLocation!.timestamp)}</Popup>
              </Marker>
              {trackedLocation?.accuracy && (
                <Circle center={[trackedLat, trackedLng]} radius={trackedLocation.accuracy} pathOptions={{ color: '#0077b6', fillOpacity: 0.08 }} />
              )}
            </>
          )}

          {/* Pharmacy/hospital markers */}
          {filteredPlaces.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]} icon={iconForPlace(p.type)}>
              <Popup>
                <div style={{ fontFamily: 'inherit', minWidth: 160 }}>
                  <strong>{p.name}</strong><br />
                  <span style={{ textTransform: 'capitalize', color: '#64748b', fontSize: '0.85em' }}>{p.type}</span>
                  {p.distance != null && <><br /><span style={{ color: '#64748b', fontSize: '0.85em' }}>{p.distance.toFixed(1)} km away</span></>}
                  {p.address && <><br /><span style={{ color: '#64748b', fontSize: '0.85em' }}>{p.address}</span></>}
                  <br />
                  <a
                    href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block', marginTop: 6, padding: '4px 10px',
                      background: '#0077b6', color: '#fff', borderRadius: 6,
                      textDecoration: 'none', fontSize: '0.8em', fontWeight: 600,
                    }}
                  >
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map legend overlay */}
        <div className="loc-legend">
          {!isCaregiver && <span className="loc-legend__item"><span className="loc-legend__dot" style={{ background: '#34d399' }} /> You</span>}
          {isCaregiver && <span className="loc-legend__item"><span className="loc-legend__dot" style={{ background: '#0077b6' }} /> Tracked</span>}
          <span className="loc-legend__item"><span className="loc-legend__dot" style={{ background: '#059669' }} /> Pharmacy</span>
          <span className="loc-legend__item"><span className="loc-legend__dot" style={{ background: '#dc2626' }} /> Hospital</span>
        </div>
      </div>

      {/* ── Info bar ── */}
      <div className="loc-info-bar">
        <div className="loc-info-left">
          <h2 className="loc-info-title">
            {isCaregiver ? (persons.find((p) => p.id === selectedPerson)?.name ?? 'Cared Person') : 'My Location'}
          </h2>
          {isCaregiver && trackedLocation && (
            <span className="loc-badge loc-badge--live"><span className="loc-badge__dot" /> {timeAgo(trackedLocation.timestamp)}</span>
          )}
          {!isCaregiver && sharing && (
            <span className="loc-badge loc-badge--live"><span className="loc-badge__dot" /> Sharing</span>
          )}
        </div>
        <div className="loc-info-actions">
          {isCaregiver && (
            <button className="loc-action-btn" onClick={fetchTrackedLocation} disabled={trackLoading}>
              <Icon name="refresh" size={14} /> {trackLoading ? 'Updating...' : 'Refresh'}
            </button>
          )}
          {!isCaregiver && (
            <button className={`loc-action-btn ${sharing ? 'loc-action-btn--stop' : 'loc-action-btn--start'}`} onClick={toggleSharing}>
              <Icon name={sharing ? 'eye-off' : 'eye'} size={14} />
              {sharing ? 'Stop Sharing' : 'Share Location'}
            </button>
          )}
          {!isCaregiver && (
            <button className="loc-action-btn" onClick={() => setShowManual(!showManual)}>
              <Icon name="map-pin" size={14} /> {showManual ? 'Close' : 'Set Location'}
            </button>
          )}
          <button className="loc-action-btn" onClick={() => window.open(`https://www.google.com/maps?q=${mapCenter[0]},${mapCenter[1]}`, '_blank')}>
            <Icon name="external-link" size={14} /> Maps
          </button>
        </div>
      </div>

      {/* ── Manual location panel (cared person) ── */}
      {!isCaregiver && showManual && (
        <div className="loc-manual">
          <div className="loc-manual-title">
            <Icon name="map-pin" size={16} /> Set your location manually
          </div>
          <div className="loc-manual-row">
            <input className="loc-manual-input" type="number" step="any" placeholder="Latitude" value={manualLat}
              onChange={(e) => setManualLat(e.target.value)} />
            <input className="loc-manual-input" type="number" step="any" placeholder="Longitude" value={manualLng}
              onChange={(e) => setManualLng(e.target.value)} />
            <button className="loc-search-btn" onClick={() => {
              const lat = parseFloat(manualLat); const lng = parseFloat(manualLng);
              if (!isNaN(lat) && !isNaN(lng)) sendManualLocation(lat, lng);
              else push({ tone: 'error', title: 'Enter valid coordinates' });
            }}>
              <Icon name="check" size={14} /> Set
            </button>
          </div>
          <div className="loc-manual-presets">
            <span className="loc-manual-presets-label">Quick set:</span>
            {PRESETS.map((p) => (
              <button key={p.name} className="loc-preset-btn" onClick={() => {
                setManualLat(String(p.lat)); setManualLng(String(p.lng));
                sendManualLocation(p.lat, p.lng);
              }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="loc-tabs">
        {isCaregiver && (
          <button className={`loc-tab ${tab === 'track' ? 'loc-tab--active' : ''}`} onClick={() => setTab('track')}>
            <Icon name="users" size={16} /> Track Person
          </button>
        )}
        <button className={`loc-tab ${tab === 'pharmacies' ? 'loc-tab--active' : ''}`} onClick={() => setTab('pharmacies')}>
          <Icon name="activity" size={16} /> Nearby
        </button>
      </div>

      {/* ── Tab panels ── */}
      <div className="loc-content">
        {tab === 'track' && isCaregiver && (
          <div className="loc-panel">
            {persons.length > 0 ? (
              <>
                <div className="loc-person-row">
                  {persons.map((p) => (
                    <button key={p.id} className={`loc-person-chip ${selectedPerson === p.id ? 'loc-person-chip--active' : ''}`}
                      onClick={() => setSelectedPerson(p.id)}>
                      {p.name}
                    </button>
                  ))}
                </div>
                {trackError && <div className="loc-error">{trackError}</div>}
                {trackedLocation && (
                  <div className="loc-detail-card">
                    <div className="loc-detail-row"><span className="loc-detail-label">Latitude</span><span className="loc-detail-value">{trackedLocation.lat.toFixed(5)}</span></div>
                    <div className="loc-detail-row"><span className="loc-detail-label">Longitude</span><span className="loc-detail-value">{trackedLocation.lng.toFixed(5)}</span></div>
                    {trackedLocation.accuracy && <div className="loc-detail-row"><span className="loc-detail-label">Accuracy</span><span className="loc-detail-value">~{Math.round(trackedLocation.accuracy)}m</span></div>}
                    <div className="loc-detail-row"><span className="loc-detail-label">Updated</span><span className="loc-detail-value">{new Date(trackedLocation.timestamp).toLocaleTimeString()}</span></div>
                  </div>
                )}
                {!trackedLocation && !trackLoading && (
                  <div className="loc-empty"><Icon name="map-pin" size={32} /><p>{trackError || 'Waiting for the person to share their location...'}</p></div>
                )}
              </>
            ) : (
              <div className="loc-empty"><Icon name="user" size={32} /><p>No connected persons. Use "Connect Family" to pair first.</p></div>
            )}
          </div>
        )}

        {tab === 'pharmacies' && (
          <div className="loc-panel">
            <div className="loc-pharmacy-controls">
              <div className="loc-pharmacy-row">
                <label className="loc-pharmacy-radius">
                  Radius:
                  <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                    <option value={1}>1 km</option><option value={3}>3 km</option><option value={5}>5 km</option><option value={10}>10 km</option>
                  </select>
                </label>
                <div className="loc-pharmacy-filters">
                  {(['all', 'pharmacy', 'hospital'] as const).map((f) => (
                    <button key={f} className={`pf-filter-btn ${filter === f ? 'pf-filter-btn--active' : ''}`} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'All' : f === 'pharmacy' ? 'Pharmacies' : 'Hospitals'}
                    </button>
                  ))}
                </div>
                <button className="loc-search-btn" onClick={searchPharmacies} disabled={pharmacyLoading}>
                  <Icon name="search" size={16} />{pharmacyLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            {pharmacyError && <div className="loc-error">{pharmacyError}</div>}
            {filteredPlaces.length > 0 && (
              <div className="loc-results">
                {filteredPlaces.map((p, i) => (
                  <div key={i} className="loc-result" onClick={() => { const map = document.querySelector('.loc-map'); if (map) { /* fly to marker */ } }}>
                    <div className={`pf-type pf-type--${p.type}`}><Icon name={p.type === 'pharmacy' ? 'activity' : 'heart'} size={14} />{p.type}</div>
                    <div className="pf-info">
                      <div className="pf-name">{p.name}</div>
                      {p.address && <div className="pf-addr">{p.address}</div>}
                      {p.distance != null && <div className="pf-dist">{p.distance.toFixed(1)} km away</div>}
                    </div>
                    <Icon name="chevron-right" size={14} />
                  </div>
                ))}
              </div>
            )}
            {!pharmacyLoading && filteredPlaces.length === 0 && !pharmacyError && (
              <div className="loc-empty"><Icon name="search" size={32} /><p>Click "Search" to find pharmacies and hospitals near you.</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

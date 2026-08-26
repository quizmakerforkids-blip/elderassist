import { useCallback, useState } from 'react';
import { Icon } from '../icons/Icon';

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

export function PharmacyFinder() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(3);
  const [filter, setFilter] = useState<'all' | 'pharmacy' | 'hospital'>('all');

  const search = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setLoading(true);
    setError(null);
    setPlaces([]);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const r = radius * 1000;
        const query = `
          [out:json][timeout:15];
          (
            node["amenity"="pharmacy"](around:${r},${lat},${lng});
            node["amenity"="hospital"](around:${r},${lat},${lng});
            node["healthcare"="clinic"](around:${r},${lat},${lng});
          );
          out body;
        `;
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
              return {
                name: name || `${typ.charAt(0).toUpperCase() + typ.slice(1)}`,
                lat: el.lat as number,
                lng: el.lon as number,
                type: typ as 'pharmacy' | 'hospital' | 'clinic',
                distance: haversine(lat, lng, el.lat as number, el.lon as number),
                address: addr || undefined,
              };
            })
            .sort((a: Place, b: Place) => (a.distance || 0) - (b.distance || 0));
          setPlaces(results);
          if (results.length === 0) setError('No results found. Try increasing the radius.');
        } catch {
          setError('Search failed. Check your internet connection.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access denied. Please enable location permissions.');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [radius]);

  const openInMaps = (p: Place) => {
    window.open(`https://www.google.com/maps?q=${p.lat},${p.lng}`, '_blank');
  };

  const filtered = places.filter((p) => filter === 'all' || p.type === filter);

  return (
    <div className="pharmacy-finder">
      <div className="pf-header">
        <Icon name="map-pin" size={20} />
        <h3>Find Pharmacies & Hospitals</h3>
      </div>
      <div className="pf-controls">
        <label className="pf-radius">
          Radius:
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={1}>1 km</option>
            <option value={3}>3 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
          </select>
        </label>
        <div className="pf-filters">
          {(['all', 'pharmacy', 'hospital'] as const).map((f) => (
            <button key={f} className={`pf-filter-btn ${filter === f ? 'pf-filter-btn--active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'pharmacy' ? 'Pharmacies' : 'Hospitals'}
            </button>
          ))}
        </div>
        <button className="pf-search-btn" onClick={search} disabled={loading}>
          <Icon name="search" size={16} />
          {loading ? 'Searching...' : 'Find Nearby'}
        </button>
      </div>
      {error && <div className="pf-error">{error}</div>}
      {filtered.length > 0 && (
        <div className="pf-results">
          {filtered.map((p, i) => (
            <div key={i} className="pf-result" onClick={() => openInMaps(p)}>
              <div className={`pf-type pf-type--${p.type}`}>
                <Icon name={p.type === 'pharmacy' ? 'activity' : 'heart'} size={14} />
                {p.type}
              </div>
              <div className="pf-info">
                <div className="pf-name">{p.name}</div>
                {p.address && <div className="pf-addr">{p.address}</div>}
                {p.distance !== undefined && <div className="pf-dist">{p.distance.toFixed(1)} km away</div>}
              </div>
              <Icon name="chevron-right" size={14} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

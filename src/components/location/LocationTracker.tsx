import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { api } from '../../services/api';
import { Icon } from '../icons/Icon';

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

export function LocationTracker() {
  const { user } = useAuth();
  const [persons, setPersons] = useState<ConnectedPerson[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<{ id: string; name: string }[]>('/caregiver/connected').then((res) => {
      setPersons(res || []);
      if (res?.length > 0) setSelected(res[0].id);
    }).catch(() => {});
  }, [user]);

  const fetchLocation = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ location: LocationData | null; reason?: string }>(`/locations/${selected}`);
      if (res.location) {
        setLocation(res.location);
      } else {
        setLocation(null);
        setError(res.reason === 'expired' ? 'Location expired (no update in 2 hours)' : 'No location available');
      }
    } catch {
      setError('Failed to fetch location');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!selected) return;
    const id = setInterval(fetchLocation, 15000);
    return () => clearInterval(id);
  }, [selected, fetchLocation]);

  const openInMaps = () => {
    if (!location) return;
    window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, '_blank');
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  return (
    <div className="location-tracker">
      <div className="lt-header">
        <Icon name="map-pin" size={20} />
        <h3>Cared Person Location</h3>
      </div>
      {persons.length > 0 ? (
        <>
          <div className="lt-person-select">
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {persons.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="lt-refresh" onClick={fetchLocation} disabled={loading} title="Refresh">
              <Icon name="refresh" size={16} />
            </button>
          </div>
          {error && <div className="lt-error">{error}</div>}
          {location && (
            <div className="lt-location">
              <div className="lt-coords">
                <span>Lat: {location.lat.toFixed(5)}</span>
                <span>Lng: {location.lng.toFixed(5)}</span>
              </div>
              {location.accuracy && <div className="lt-accuracy">Accuracy: ~{Math.round(location.accuracy)}m</div>}
              <div className="lt-time">Updated: {timeAgo(location.timestamp)}</div>
              <button className="lt-map-btn" onClick={openInMaps}>
                <Icon name="external-link" size={14} /> Open in Google Maps
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="lt-empty">
          <Icon name="user" size={24} />
          <p>No connected persons yet. Use "Connect Family" to pair with a cared person first.</p>
        </div>
      )}
    </div>
  );
}

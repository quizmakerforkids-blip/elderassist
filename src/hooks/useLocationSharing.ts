import { useEffect, useRef, useCallback, useState } from 'react';
import { api } from '../services/api';

export function useLocationSharing(intervalMs = 30000) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocation = useCallback(async (pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    try {
      await api.post('/locations/share', { lat, lng, accuracy });
      setLastSent(Date.now());
      setError(null);
    } catch (err) {
      console.error('Failed to send location:', err);
      setError('Failed to share location');
    }
  }, []);

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setSharing(true);
    setError(null);

    // Get initial position immediately
    navigator.geolocation.getCurrentPosition(sendLocation, (err) => {
      setError(err.message || 'Location access denied');
      setSharing(false);
    }, { enableHighAccuracy: true, timeout: 10000 });

    // Watch position continuously
    watchId.current = navigator.geolocation.watchPosition(sendLocation, () => {}, {
      enableHighAccuracy: true,
      maximumAge: intervalMs,
      timeout: 15000,
    });

    // Also send on interval as backup
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, () => {}, {
        enableHighAccuracy: false,
        timeout: 10000,
      });
    }, intervalMs);
  }, [sendLocation, intervalMs]);

  const stopSharing = useCallback(() => {
    setSharing(false);
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopSharing(), [stopSharing]);

  return { sharing, error, lastSent, startSharing, stopSharing };
}

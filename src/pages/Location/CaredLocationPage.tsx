import { useLocationSharing } from '../../hooks/useLocationSharing';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { PageHeader } from '../../components/navigation/PageHeader';
import { SectionCard } from '../../components/cards/Card';
import { Icon } from '../../components/icons/Icon';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)} hours ago`;
}

export function CaredLocationPage() {
  useAuth();
  const { push } = useToast();
  const { sharing, error, lastSent, startSharing, stopSharing } = useLocationSharing(30000);

  const toggle = () => {
    if (sharing) {
      stopSharing();
      push({ tone: 'success', title: 'Location sharing stopped' });
    } else {
      startSharing();
      push({ tone: 'success', title: 'Your caregiver can now see your location' });
    }
  };

  const openInMaps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.open(`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`, '_blank');
      },
      () => {},
      { enableHighAccuracy: false, timeout: 5000 },
    );
  };

  return (
    <div className="page page--wide">
      <PageHeader
        title="My Location"
        subtitle="Share your location with your caregiver so they can find you if needed."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start' }}>
        <SectionCard title="Location Sharing">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text, #1e293b)' }}>
                  {sharing ? 'Sharing active' : 'Sharing paused'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', marginTop: 2 }}>
                  {sharing
                    ? 'Your caregiver can see your location in real-time'
                    : 'Enable sharing so your caregiver knows where you are'}
                </div>
              </div>
              <button
                onClick={toggle}
                style={{
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: sharing ? '#dc2626' : 'linear-gradient(135deg, #00b4d8, #0077b6)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'opacity 0.15s',
                }}
              >
                {sharing ? 'Stop Sharing' : 'Start Sharing'}
              </button>
            </div>

            {sharing && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#ecfdf5',
                borderRadius: 10,
                fontSize: '0.85rem',
                color: '#059669',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                Actively sharing — updates every 30 seconds
              </div>
            )}

            {error && (
              <div style={{
                padding: '10px 14px',
                background: '#fef2f2',
                borderRadius: 10,
                fontSize: '0.85rem',
                color: '#dc2626',
              }}>
                {error}
              </div>
            )}

            {lastSent && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                Last location sent: {formatTime(lastSent)} ({timeAgo(lastSent)})
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="About Location Sharing">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="shield-check" size={18} />
              <span>Your location data is only shared with your connected caregiver and is never stored long-term.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="clock" size={18} />
              <span>Location data expires after 2 hours if no update is sent.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="battery" size={18} />
              <span>Sharing uses your device GPS. It may increase battery usage slightly.</span>
            </div>

            <button
              onClick={openInMaps}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                marginTop: 4,
              }}
            >
              <Icon name="external-link" size={14} />
              View my current location on Google Maps
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

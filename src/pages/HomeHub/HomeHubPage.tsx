import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiData } from '../../hooks/useApiData';
import { getHomeHubs, sendHomeHubEvent } from '../../services/homehub';
import { getEmergencies } from '../../services/emergencies';
import { IS_DEMO_MODE } from '../../services/config';
import { describeError } from '../../services/api';
import { getDemoHubLog } from '../../demo/demoStore';
import { useToast } from '../../app/providers/ToastProvider';
import type { HubEventType } from '../../types';
import { formatRelativeTime, formatTimestamp, cls } from '../../utils/format';
import { PageHeader } from '../../components/navigation/PageHeader';
import { Card, SectionCard } from '../../components/cards/Card';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { HomeHubDevice } from '../../components/homehub/HomeHubDevice';
import type { HubLedState } from '../../components/homehub/HomeHubDevice';
import { VoicePanel } from '../../components/homehub/VoicePanel';
import { Badge } from '../../components/status/Badge';
import { Button } from '../../components/buttons/Button';
import { Icon } from '../../components/icons/Icon';

export function HomeHubPage() {
  const hubs = useApiData(getHomeHubs);
  const emergencies = useApiData(getEmergencies);
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyButton, setBusyButton] = useState<HubEventType | null>(null);
  const [lastResult, setLastResult] = useState<{ tone: 'success' | 'error'; message: string; emergencyId?: string } | null>(null);

  const devices = hubs.data ?? [];
  const active = useMemo(() => {
    return devices.find((d) => d.deviceId === selectedId) ?? devices.find((d) => d.online) ?? devices[0];
  }, [devices, selectedId]);

  const openForDevice = (emergencies.data ?? []).find(
    (e) => e.deviceId === active?.deviceId && e.status === 'OPEN',
  );

  const led: HubLedState = !active
    ? 'off'
    : !active.online
      ? 'ready'
      : busyButton === 'HELP_PRESSED'
        ? 'busy'
        : openForDevice
          ? 'alert'
          : 'ready';

  const stateLabel = !active
    ? ''
    : busyButton != null
      ? 'SENDING REQUEST…'
      : openForDevice
        ? 'HELP ALERT ACTIVE'
        : 'SYSTEM READY';

  const handleButton = async (type: HubEventType) => {
    if (!active) return;
    setBusyButton(type);
    setLastResult(null);
    try {
      const result = await sendHomeHubEvent(active.deviceId, { type });
      setLastResult({ tone: 'success', message: result.message, emergencyId: result.emergencyId });
      push({
        tone: 'success',
        title:
          type === 'HELP_PRESSED'
            ? 'Help alert sent.'
            : type === 'FAMILY_PRESSED'
              ? 'Family contact request sent.'
              : 'Alert cancelled.',
        message: IS_DEMO_MODE ? `${result.message} (simulated locally in demo mode)` : result.message,
      });
    } catch (err) {
      setLastResult({ tone: 'error', message: describeError(err) });
      push({
        tone: 'error',
        title: 'Unable to contact ElderAssist.',
        message: err instanceof Error && err.message ? err.message : undefined,
      });
    } finally {
      setBusyButton(null);
    }
  };

  const log = active && IS_DEMO_MODE ? getDemoHubLog(active.deviceId) : [];

  return (
    <div className="page">
      <PageHeader
        title="HomeHub"
        subtitle="The physical heart of ElderAssist — one touch reaches the whole care network."
      />

      {hubs.loading && <LoadingState label="Locating HomeHub devices…" minHeight={320} />}

      {!hubs.loading && hubs.error && <ErrorState message={hubs.error} onRetry={hubs.refetch} />}

      {!hubs.loading && !hubs.error && devices.length > 0 && active && (
        <>
          <div className="chip-row" role="group" aria-label="Select a HomeHub" style={{ marginBottom: 20 }}>
            {devices.map((device) => (
              <button
                key={device.deviceId}
                type="button"
                className={`chip ${device.deviceId === active.deviceId ? 'is-active' : ''}`}
                aria-pressed={device.deviceId === active.deviceId}
                onClick={() => setSelectedId(device.deviceId)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon name={device.online ? 'wifi' : 'wifi-off'} size={14} />
                  {device.name}
                  <span className="visually-hidden">{device.online ? 'online' : 'offline'}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="hub-layout">
            <div className="stack stack--tight">
              <Card className="hub-stage" aria-label={`${active.name} device preview`}>
                <HomeHubDevice
                  online={active.online}
                  led={led}
                  stateLabel={stateLabel}
                  busyButton={busyButton}
                  onButton={handleButton}
                />
              </Card>

              {!active.online && (
                <p className="field__error" role="alert">
                  This HomeHub is offline. Buttons are disabled until it reconnects — last seen{' '}
                  {formatRelativeTime(active.lastSeenAt)}.
                </p>
              )}

              {lastResult && (
                <div
                  className={`login-note ${lastResult.tone === 'success' ? 'login-note--demo' : 'login-note--warn'}`}
                  role={lastResult.tone === 'error' ? 'alert' : 'status'}
                >
                  <Icon name={lastResult.tone === 'success' ? 'check' : 'warning'} size={17} />
                  <span>
                    {lastResult.message}
                    {lastResult.emergencyId && (
                      <>
                        {' '}
                        <Link to="/emergencies">
                          View it in the Emergency Center
                        </Link>
                      </>
                    )}
                    {IS_DEMO_MODE && lastResult.tone === 'success' && (
                      <span className="field__hint"> Simulated locally — no backend call was made.</span>
                    )}
                  </span>
                </div>
              )}

              {openForDevice && (
                <div className="card emergency-panel emergency-panel--open" role="alert">
                  <span className="emergency-panel__icon">
                    <Icon name="siren" size={20} />
                  </span>
                  <div>
                    <div className="emergency-panel__title">Open emergency for {openForDevice.elderName}</div>
                    <p className="emergency-panel__meta num">Raised {formatTimestamp(openForDevice.createdAt)}</p>
                  </div>
                  <div className="emergency-panel__actions">
                    <Link to="/emergencies">
                      <Button variant="danger" size="sm">Open Emergency Center</Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="stack">
              <SectionCard title="Device details">
                <dl className="detail-grid">
                  <div className="detail-row">
                    <dt>Device name</dt>
                    <dd>{active.name}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Device ID</dt>
                    <dd>{active.deviceId}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Connected elder</dt>
                    <dd>
                      {active.linkedElderId ? (
                        <Link to={`/elders/${active.linkedElderId}`}>{active.linkedElderName}</Link>
                      ) : (
                        'None'
                      )}
                    </dd>
                  </div>
                  <div className="detail-row">
                    <dt>Connection</dt>
                    <dd>
                      <Badge tone={active.online ? 'safe' : 'offline'}>
                        {active.online ? 'ONLINE' : 'OFFLINE'}
                      </Badge>
                    </dd>
                  </div>
                  <div className="detail-row">
                    <dt>Battery</dt>
                    <dd>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ color: active.batteryLevel != null && active.batteryLevel <= 20 ? 'var(--danger)' : 'inherit', display: 'inline-flex' }}>
                          <Icon name="battery" size={18} />
                        </span>
                        <span className="num">
                          {active.batteryLevel != null ? `${active.batteryLevel}% backup remaining` : 'Mains powered'}
                        </span>
                      </span>
                    </dd>
                  </div>
                  <div className="detail-row">
                    <dt>Last seen</dt>
                    <dd className="num">{formatTimestamp(active.lastSeenAt)}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Model</dt>
                    <dd>{active.model}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Firmware</dt>
                    <dd className="num">{active.firmwareVersion}</dd>
                  </div>
                </dl>
                <p className="field__hint" style={{ marginTop: 10 }}>
                  The HELP button raises an instant alert. FAMILY asks the household's care circle
                  to call. CANCEL stands down an accidental press.
                </p>
              </SectionCard>

              <SectionCard title="Voice interface">
                <VoicePanel />
              </SectionCard>

              <SectionCard title="Recent events" bodyClassName="card__body">
                {log.length === 0 ? (
                  <EmptyState compact icon="activity" title="No events recorded yet." />
                ) : (
                  <ul className="log-list num">
                    {log.map((entry) => (
                      <li className="log-item" key={entry.id}>
                        <span className="log-item__time">{formatTimestamp(entry.createdAt)}</span>
                        <span className={cls('log-item__type')}>{entry.type}</span>
                        <span className="log-item__detail">{entry.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}

      {!hubs.loading && !hubs.error && devices.length === 0 && (
        <EmptyState
          icon="radio"
          title="No HomeHubs registered yet."
          description="Devices will appear here once they have been paired and checked in."
        />
      )}
    </div>
  );
}

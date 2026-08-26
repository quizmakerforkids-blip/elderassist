import { useState } from 'react';
import { Link } from 'react-router-dom';
import { greeting, formatTimestamp } from '../../utils/format';
import { useAuth } from '../../app/providers/AuthProvider';
import { useApiData } from '../../hooks/useApiData';
import { getDashboardSummary, getRecentActivity } from '../../services/dashboard';
import { getElders } from '../../services/elders';
import { getEmergencies } from '../../services/emergencies';
import type { Emergency } from '../../types';
import { PageHeader } from '../../components/navigation/PageHeader';
import { Card, SectionCard } from '../../components/cards/Card';
import { LoadingState, ErrorState } from '../../components/feedback/States';
import { ElderCard } from '../../components/elder/ElderCard';
import { Button } from '../../components/buttons/Button';
import { Icon } from '../../components/icons/Icon';
import { ConnectFamilyModal } from '../../components/connect/ConnectFamilyModal';

function StatCard({
  label,
  value,
  icon,
  to,
  tone,
}: {
  label: string;
  value: string | number;
  icon: 'users' | 'siren' | 'clipboard' | 'radio';
  to: string;
  tone?: 'danger' | 'warning';
}) {
  const alert = tone === 'danger' && Number(value) > 0;
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <Card className={`stat-card ${alert ? 'stat-card--danger' : tone === 'warning' ? 'stat-card--warning' : ''}`}>
        <span className="stat-card__icon">
          <Icon name={icon} size={22} />
        </span>
        <span>
          <span className="stat-card__label" style={{ display: 'block' }}>
            {label}
          </span>
          <span
            className={`stat-card__value num${alert ? ' stat-card__value--alert' : ''}`}
            style={{ display: 'block' }}
          >
            {value}
          </span>
        </span>
      </Card>
    </Link>
  );
}

function EmergencyStatusPanel({ emergencies }: { emergencies: Emergency[] }) {
  const open = emergencies.find((e) => e.status === 'OPEN');
  const active = open ?? emergencies.find((e) => e.status === 'ACKNOWLEDGED' || e.status === 'ESCALATED');

  if (!active) {
    return (
      <SectionCard title="Emergency status">
        <div className="state-block" style={{ padding: '26px 16px' }}>
          <span className="state-block__icon state-block__icon--empty" aria-hidden="true">
            <Icon name="shield-check" size={24} />
          </span>
          <span className="state-block__title">No active emergencies.</span>
          <span className="state-block__desc">Everyone on your care list is settled for now.</span>
          <Link to="/emergencies">
            <Button variant="ghost" size="sm">
              View emergency history
              <Icon name="chevron-right" size={14} />
            </Button>
          </Link>
        </div>
      </SectionCard>
    );
  }

  const isOpen = active.status === 'OPEN';

  return (
    <div
      className={`card emergency-panel emergency-panel--${isOpen ? 'open' : 'handled'}`}
      role={isOpen ? 'alert' : undefined}
    >
      <span className="emergency-panel__icon">
        <Icon name="siren" size={22} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="emergency-panel__title">{active.elderName}</div>
        <p className="emergency-panel__meta num">
          “{active.description}” · {formatTimestamp(active.createdAt)}
        </p>
        <p className="emergency-panel__meta">
          {isOpen ? 'Waiting for acknowledgement.' : `Being handled by ${active.acknowledgedBy ?? 'your care team'}.`}
        </p>
      </div>
      <div className="emergency-panel__actions">
        <Link to="/emergencies">
          <Button variant={isOpen ? 'danger' : 'secondary'}>Open Emergency Center</Button>
        </Link>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useApiData(getDashboardSummary);
  const activity = useApiData(() => getRecentActivity(8));
  const elders = useApiData(getElders);
  const emergencies = useApiData(getEmergencies);
  const [showConnect, setShowConnect] = useState(false);

  const loading = summary.loading || elders.loading || emergencies.loading || activity.loading;
  const error = summary.error ?? elders.error ?? emergencies.error ?? activity.error;

  return (
    <div className="page page--wide">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? 'caregiver'}.`}
        subtitle="Here's what needs your attention today."
        actions={
          <Button onClick={() => setShowConnect(true)}>
            <Icon name="link" size={16} />
            Connect Family
          </Button>
        }
      />

      {loading && <LoadingState label="Loading your care overview…" minHeight={320} />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => {
          summary.refetch();
          elders.refetch();
          emergencies.refetch();
          activity.refetch();
        }} />
      )}

      {!loading && !error && summary.data && elders.data && emergencies.data && activity.data && (
        <div className="stack">
          <div className="stats-grid">
            <StatCard label="People you care for" value={summary.data.eldersCount} icon="users" to="/elders" />
            <StatCard
              label="Open emergencies"
              value={summary.data.openEmergencies}
              icon="siren"
              to="/emergencies"
              tone="danger"
            />
            <StatCard
              label="Pending requests"
              value={summary.data.pendingRequests}
              icon="clipboard"
              to="/requests"
              tone="warning"
            />
            <StatCard
              label="HomeHubs online"
              value={`${summary.data.hubsOnline} / ${summary.data.hubsTotal}`}
              icon="radio"
              to="/homehub"
            />
          </div>

          <section aria-label="Elder overview">
            <div className="chip-row" style={{ marginBottom: 14 }}>
              <h2 className="section-label">Elder overview</h2>
              <Link to="/elders" style={{ marginLeft: 'auto', fontSize: '0.88rem', fontWeight: 600 }}>
                View all elders
              </Link>
            </div>
            <div className="elders-grid">
              {elders.data.map((elder) => (
                <ElderCard key={elder.id} elder={elder} />
              ))}
            </div>
          </section>

          <EmergencyStatusPanel emergencies={emergencies.data} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 20,
              alignItems: 'start',
            }}
          >
            <SectionCard
              title="Recent activity"
              bodyClassName="card__body card__body--tight"
            >
              <ul className="activity-list">
                {activity.data.length === 0 && (
                  <li className="activity-item">
                    <span />
                    <span />
                    <span className="activity-item__message" style={{ color: 'var(--text-muted)' }}>
                      Nothing has happened yet today.
                    </span>
                  </li>
                )}
                {activity.data.map((event) => (
                  <li className="activity-item" key={event.id}>
                    <span className="activity-item__time">{formatTimestamp(event.time)}</span>
                    <span className="activity-item__marker activity-item__marker--info" aria-hidden="true" />
                    <span className="activity-item__message">{event.message}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Care network">
              <div className="meta-list" style={{ gap: 14 }}>
                <span className="meta-item">
                  <Icon name="radio" size={18} />
                  <span>
                    {summary.data.hubsOnline} of {summary.data.hubsTotal} HomeHubs online
                  </span>
                </span>
                <span className="meta-item">
                  <Icon name="phone" size={18} />
                  <span>Basic-phone line active for every elder</span>
                </span>
                <span className="meta-item">
                  <Icon name="mic" size={18} />
                  <span>Voice assistant ready in preferred languages</span>
                </span>
              </div>
              <p
                className="field__hint"
                style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--divider)' }}
              >
                ElderAssist combines the in-home HomeHub, a caregiver network and an emergency
                response system — so help is never more than one button away.
              </p>
              <div style={{ marginTop: 12 }}>
                <Link to="/homehub">
                  <Button variant="secondary" size="sm">
                    View HomeHub devices
                    <Icon name="chevron-right" size={14} />
                  </Button>
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      <div style={{ marginTop: 40, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <span className="num">Updated {formatTimestamp(new Date())}</span>
        {' · '}You are signed in as {user?.name}.
      </div>

      {showConnect && <ConnectFamilyModal onClose={() => setShowConnect(false)} />}
    </div>
  );
}

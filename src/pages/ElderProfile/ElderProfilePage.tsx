import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useApiData } from '../../hooks/useApiData';
import { getElder } from '../../services/elders';
import { getEmergencies } from '../../services/emergencies';
import { getRequests } from '../../services/requests';
import { getAppointments } from '../../services/appointments';
import { getReminders } from '../../services/reminders';
import { formatTimestamp, formatDateLong } from '../../utils/format';
import type {
  Appointment,
  AssistanceRequest,
  Elder,
  Emergency,
  Reminder,
} from '../../types';
import { Card, SectionCard } from '../../components/cards/Card';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { Avatar } from '../../components/elder/Avatar';
import { StatusIndicator } from '../../components/status/StatusIndicator';
import { Badge, toneForStatus } from '../../components/status/Badge';
import { Button } from '../../components/buttons/Button';
import { Icon } from '../../components/icons/Icon';

interface ProfileData {
  elder: Elder;
  emergencies: Emergency[];
  requests: AssistanceRequest[];
  appointments: Appointment[];
  reminders: Reminder[];
}

const SOURCE_LABEL = {
  HOMEHUB: 'HomeHub',
  BASIC_PHONE: 'Basic phone',
  VOICE_ASSISTANT: 'Voice assistant',
  DASHBOARD: 'Dashboard',
} as const;

function RequestRow({ request }: { request: AssistanceRequest }) {
  return (
    <div className="row-card card">
      <div className="row-card__main">
        <div className="row-card__top">
          <span className="row-card__title">“{request.message}”</span>
        </div>
        <div className="row-card__meta num">
          <span>{formatTimestamp(request.createdAt)}</span>
          <span>·</span>
          <span>via {SOURCE_LABEL[request.source]}</span>
        </div>
      </div>
      <div className="row-card__side">
        <Badge tone="neutral">{request.category.replaceAll('_', ' ')}</Badge>
        <Badge tone={toneForStatus(request.status)}>{request.status}</Badge>
      </div>
    </div>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const date = new Date(appointment.date);
  return (
    <div className="row-card card">
      <div className="date-block" aria-hidden="true">
        <div className="date-block__month">
          {date.toLocaleDateString(undefined, { month: 'short' })}
        </div>
        <div className="date-block__day">{date.getDate()}</div>
      </div>
      <div className="row-card__main">
        <div className="row-card__top">
          <span className="row-card__title">{appointment.title}</span>
          <Badge tone={toneForStatus(appointment.status)}>{appointment.status}</Badge>
        </div>
        <div className="row-card__meta num">
          <span>{formatDateLong(appointment.date)}</span>
          <span>·</span>
          <span>{appointment.provider}</span>
          {appointment.location && (
            <>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="map-pin" size={13} />
                {appointment.location}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  return (
    <div className="row-card card">
      <span className="tile-icon tile-icon--accent" aria-hidden="true">
        <Icon name="clock" size={19} />
      </span>
      <div className="row-card__main">
        <div className="row-card__top">
          <span className="row-card__title">{reminder.title}</span>
          <Badge tone={toneForStatus(reminder.status)}>{reminder.status}</Badge>
        </div>
        <div className="row-card__meta num">
          <span>{reminder.timeOfDay}</span>
          <span>·</span>
          <span>{reminder.frequency === 'ONCE' ? 'One time' : reminder.frequency[0] + reminder.frequency.slice(1).toLowerCase()}</span>
          <span>·</span>
          <span>Next: {formatDateLong(reminder.nextTriggerAt)}, {reminder.timeOfDay}</span>
        </div>
      </div>
    </div>
  );
}

export function ElderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useApiData<ProfileData>(async () => {
    if (!id) throw new Error('Missing elder id.');
    const [elder, allEmergencies, allRequests, allAppointments, allReminders] =
      await Promise.all([
        getElder(id),
        getEmergencies(),
        getRequests(),
        getAppointments(),
        getReminders(),
      ]);
    return {
      elder,
      emergencies: allEmergencies.filter((e) => e.elderId === id),
      requests: allRequests.filter((r) => r.elderId === id),
      appointments: allAppointments.filter((a) => a.elderId === id),
      reminders: allReminders.filter((r) => r.elderId === id),
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page page--wide">
        <LoadingState label="Loading elder profile…" minHeight={360} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page page--wide">
        <ErrorState
          message={error ?? 'This elder could not be found.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const { elder, emergencies, requests, appointments, reminders } = data;
  const hub = elder.homeHub;

  return (
    <div className="page page--wide">
      <Link to="/elders" className="back-link">
        <Icon name="arrow-left" size={15} />
        Back to elders
      </Link>

      <Card className="elder-card" >
        <div className="elder-card__head">
          <Avatar name={elder.name} size="xl" />
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>{elder.name}</h1>
            <p className="elder-card__sub">
              {elder.age} years · {elder.city}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <StatusIndicator status={elder.status} pulsing={elder.status === 'EMERGENCY'} size="lg" />
            {hub && (
              <Link to="/homehub">
                <Button variant="ghost" size="sm">
                  <Icon name="radio" size={15} />
                  {hub.deviceId}
                </Button>
              </Link>
            )}
          </div>
        </div>

        <dl className="detail-grid" style={{ marginTop: 6 }}>
          <div className="detail-row">
            <dt>Status</dt>
            <dd>
              <StatusIndicator status={elder.status} pulsing={elder.status === 'EMERGENCY'} />
            </dd>
          </div>
          <div className="detail-row">
            <dt>Preferred language</dt>
            <dd>{elder.preferredLanguage}</dd>
          </div>
          <div className="detail-row">
            <dt>Phone</dt>
            <dd className="num">{elder.phone}</dd>
          </div>
          <div className="detail-row">
            <dt>HomeHub</dt>
            <dd>
              {hub ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Icon name={hub.online ? 'wifi' : 'wifi-off'} size={16} />
                  {hub.name} — {hub.online ? 'Online' : `Offline since ${formatTimestamp(hub.lastSeenAt)}`}
                </span>
              ) : (
                'No HomeHub — uses basic phone'
              )}
            </dd>
          </div>
          <div className="detail-row">
            <dt>Last activity</dt>
            <dd className="num">{formatTimestamp(elder.lastActivityAt)}</dd>
          </div>
        </dl>
      </Card>

      <div className="stack stack--tight" style={{ height: 12 }} />

      <div className="stack">
        {emergencies.length > 0 && (
          <SectionCard title="Emergency history" bodyClassName="card__body card__body--tight">
            <ul className="activity-list">
              {emergencies.map((emergency) => (
                <li className="activity-item" key={emergency.id}>
                  <span className="activity-item__time num">{formatTimestamp(emergency.createdAt)}</span>
                  <span
                    className={`activity-item__marker activity-item__marker--${
                      emergency.status === 'OPEN' ? 'danger' : emergency.status === 'RESOLVED' || emergency.status === 'CANCELLED' ? 'success' : 'warning'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="activity-item__message">
                    “{emergency.description}” — <strong>{emergency.status}</strong>
                    {emergency.resolvedAt && (
                      <span className="field__hint"> closed {formatTimestamp(emergency.resolvedAt)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <SectionCard
          title={`Requests (${requests.length})`}
          bodyClassName="card__body card__body--tight"
        >
          {requests.length === 0 ? (
            <EmptyState compact icon="clipboard" title="No requests from this elder yet." />
          ) : (
            <div className="list-rows">
              {requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`Appointments (${appointments.length})`}
          bodyClassName="card__body card__body--tight"
        >
          {appointments.length === 0 ? (
            <EmptyState compact icon="calendar" title="No appointments on record." />
          ) : (
            <div className="list-rows">
              {appointments.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`Reminders (${reminders.length})`}
          bodyClassName="card__body card__body--tight"
        >
          {reminders.length === 0 ? (
            <EmptyState compact icon="clock" title="No reminders configured." />
          ) : (
            <div className="list-rows">
              {reminders.map((reminder) => (
                <ReminderRow key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Caregiver access">
          <p className="field__hint" style={{ marginBottom: 14 }}>
            Only the assigned care team can view this profile and receive alerts.
          </p>
          <ul className="meta-list" style={{ gap: 12 }}>
            {elder.careTeam.map((member) => (
              <li className="meta-item" key={member.name}>
                <Avatar name={member.name} size="sm" />
                <span>
                  <strong>{member.name}</strong>
                  <span className="field__hint" style={{ display: 'block' }}>
                    {member.role}
                  </span>
                </span>
                {member.isPrimary && <Badge tone="accent">Primary</Badge>}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

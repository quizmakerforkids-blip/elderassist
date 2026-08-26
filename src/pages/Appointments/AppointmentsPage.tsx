import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { getAppointments } from '../../services/appointments';
import type { Appointment } from '../../types';
import { formatTime, formatDateLong, dayLabel } from '../../utils/format';
import { PageHeader } from '../../components/navigation/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { Avatar } from '../../components/elder/Avatar';
import { Badge, toneForStatus } from '../../components/status/Badge';
import { SegmentedControl } from '../../components/buttons/Controls';
import { Icon } from '../../components/icons/Icon';

type Tab = 'upcoming' | 'past';

function sortAndSplit(items: Appointment[]): { upcoming: Appointment[]; past: Appointment[] } {
  const upcoming = items
    .filter((a) => a.status === 'REQUESTED' || a.status === 'CONFIRMED')
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past = items
    .filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'FAILED')
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return { upcoming, past };
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const date = new Date(appointment.date);
  return (
    <article className="row-card card">
      <div className="date-block" aria-hidden="true">
        <div className="date-block__month">
          {date.toLocaleDateString(undefined, { month: 'short' })}
        </div>
        <div className="date-block__day num">{date.getDate()}</div>
      </div>
      <div className="row-card__main">
        <div className="row-card__top">
          <span className="row-card__title">{appointment.title}</span>
          <Badge tone={toneForStatus(appointment.status)}>{appointment.status}</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar name={appointment.elderName} size="sm" />
          <strong style={{ fontSize: '0.92rem' }}>{appointment.elderName}</strong>
        </div>
        <div className="row-card__meta num">
          <span>{dayLabel(date)}, {formatTime(appointment.date)}</span>
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
        {appointment.status === 'REQUESTED' && (
          <p className="field__hint" style={{ color: 'var(--attention)', fontWeight: 600 }}>
            Awaiting confirmation — this appointment is not booked yet.
          </p>
        )}
      </div>
    </article>
  );
}

export function AppointmentsPage() {
  const { data, loading, error, refetch } = useApiData(getAppointments);
  const [tab, setTab] = useState<Tab>('upcoming');

  const { upcoming, past } = sortAndSplit(data ?? []);
  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="page">
      <PageHeader
        title="Appointments"
        subtitle="Visits and consultations coordinated through ElderAssist."
      />

      <div style={{ marginBottom: 20 }}>
        <SegmentedControl
          ariaLabel="Show upcoming or past appointments"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { value: 'past', label: `Past (${past.length})` },
          ]}
        />
      </div>

      {loading && <LoadingState label="Loading appointments…" minHeight={260} />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon="calendar"
          title={tab === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments.'}
          description={
            tab === 'upcoming'
              ? 'Newly requested visits will appear here once the clinic confirms.'
              : 'Completed and cancelled visits will be listed here.'
          }
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="list-rows">
          {visible.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}

      {!loading && !error && data && data.length > 0 && tab === 'upcoming' && (
        <p className="field__hint" style={{ marginTop: 18 }}>
          Dates shown as requested by the elder or their provider · last updated{' '}
          {formatDateLong(new Date())}.
        </p>
      )}
    </div>
  );
}

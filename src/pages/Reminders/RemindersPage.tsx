import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { getReminders } from '../../services/reminders';
import { formatTimestamp, formatDateLong } from '../../utils/format';
import type { Reminder } from '../../types';
import { PageHeader } from '../../components/navigation/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { Avatar } from '../../components/elder/Avatar';
import { Badge, toneForStatus } from '../../components/status/Badge';
import { Chip } from '../../components/buttons/Controls';
import { Icon } from '../../components/icons/Icon';

const FREQUENCY_LABEL: Record<Reminder['frequency'], string> = {
  ONCE: 'One time',
  DAILY: 'Every day',
  WEEKLY: 'Weekly',
  CUSTOM: 'Custom schedule',
};

type Filter = 'ALL' | Reminder['status'];
const FILTERS: Filter[] = ['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED'];

function ReminderCard({ reminder }: { reminder: Reminder }) {
  return (
    <article className="row-card card">
      <span
        className={`tile-icon ${reminder.status === 'ACTIVE' ? 'tile-icon--accent' : 'tile-icon--neutral'}`}
        aria-hidden="true"
      >
        <Icon name="clock" size={19} />
      </span>
      <div className="row-card__main">
        <div className="row-card__top">
          <span className="row-card__title">{reminder.title}</span>
          <Badge tone={toneForStatus(reminder.status)}>{reminder.status}</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar name={reminder.elderName} size="sm" />
          <strong style={{ fontSize: '0.92rem' }}>{reminder.elderName}</strong>
        </div>
        <div className="row-card__meta num">
          <span>{reminder.timeOfDay}</span>
          <span>·</span>
          <span>{FREQUENCY_LABEL[reminder.frequency]}</span>
        </div>
      </div>
      <div className="row-card__side">
        <span className="row-card__time">
          Next · {formatDateLong(reminder.nextTriggerAt)}, {reminder.timeOfDay}
        </span>
      </div>
    </article>
  );
}

export function RemindersPage() {
  const { data, loading, error, refetch } = useApiData(getReminders);
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = (data ?? []).filter((r) => filter === 'ALL' || r.status === filter);

  return (
    <div className="page">
      <PageHeader
        title="Reminders"
        subtitle="Gentle daily prompts delivered through the HomeHub — spoken in the elder's own language."
      />

      <div className="chip-row" role="group" aria-label="Filter reminders by status" style={{ marginBottom: 20 }}>
        {FILTERS.map((value) => (
          <Chip
            key={value}
            label={value === 'ALL' ? 'All' : value}
            active={filter === value}
            onSelect={() => setFilter(value)}
          />
        ))}
      </div>

      {loading && <LoadingState label="Loading reminders…" minHeight={260} />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="clock"
          title="No reminders to show."
          description="Reminders can be created here once the service is connected."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="list-rows">
          {filtered.map((reminder) => (
            <ReminderCard key={reminder.id} reminder={reminder} />
          ))}
        </div>
      )}

      {!loading && !error && data && data.length > 0 && (
        <p className="field__hint num" style={{ marginTop: 18 }}>
          Showing {filtered.length} of {data.length} reminders · page loaded{' '}
          {formatTimestamp(new Date())}.
        </p>
      )}
    </div>
  );
}

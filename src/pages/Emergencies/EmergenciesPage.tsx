import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { acknowledgeEmergency, getEmergencies } from '../../services/emergencies';
import { useToast } from '../../app/providers/ToastProvider';
import type { Emergency } from '../../types';
import { PageHeader } from '../../components/navigation/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { EmergencyCard } from '../../components/emergency/EmergencyCard';

const COLUMNS: {
  key: string;
  title: string;
  match: (e: Emergency) => boolean;
  tone: string;
}[] = [
  { key: 'OPEN', title: 'Active', tone: 'var(--danger)', match: (e) => e.status === 'OPEN' },
  { key: 'ACKNOWLEDGED', title: 'Acknowledged', tone: 'var(--attention)', match: (e) => e.status === 'ACKNOWLEDGED' },
  { key: 'ESCALATED', title: 'Escalated', tone: 'var(--danger)', match: (e) => e.status === 'ESCALATED' },
  { key: 'RESOLVED', title: 'Resolved', tone: 'var(--offline)', match: (e) => e.status === 'RESOLVED' || e.status === 'CANCELLED' },
];

export function EmergenciesPage() {
  const { data: emergencies, loading, error, refetch } = useApiData(getEmergencies);
  const { push } = useToast();
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await acknowledgeEmergency(id);
      push({ tone: 'success', title: 'Emergency acknowledged.', message: 'The care team has been notified that you are responding.' });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : undefined;
      push({ tone: 'error', title: 'Unable to contact ElderAssist.', message });
    } finally {
      setAcknowledgingId(null);
    }
  };

  const grouped = COLUMNS.map((column) => ({
    ...column,
    items: (emergencies ?? []).filter(column.match),
  }));
  const total = emergencies?.length ?? 0;

  return (
    <div className="page page--wide">
      <PageHeader
        title="Emergency Center"
        subtitle="Every alert, in one place. Acknowledge quickly — the elder and their family can see you are on it."
        actions={
          <button type="button" className="chip" onClick={refetch}>
            Refresh
          </button>
        }
      />

      {loading && <LoadingState label="Loading emergencies…" minHeight={300} />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && total === 0 && (
        <EmptyState
          icon="shield-check"
          title="No active emergencies."
          description="When an elder presses HELP or calls for assistance, it will appear here immediately."
        />
      )}

      {!loading && !error && total > 0 && (
        <div className="emg-board">
          {grouped.map((column) => (
            <section
              key={column.key}
              className="emg-col"
              aria-label={`${column.title} emergencies (${column.items.length})`}
            >
              <div className="emg-col__header">
                <h2 style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: column.tone }}>
                  {column.title}
                </h2>
                <span className="emg-col__count num">{column.items.length}</span>
              </div>

              {column.items.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '8px 4px' }}>
                  Nothing here right now.
                </p>
              ) : (
                column.items.map((emergency) => (
                  <EmergencyCard
                    key={emergency.id}
                    emergency={emergency}
                    onAcknowledge={handleAcknowledge}
                    acknowledging={acknowledgingId === emergency.id}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

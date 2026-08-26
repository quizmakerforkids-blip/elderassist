import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { getRequests } from '../../services/requests';
import type { RequestCategory, RequestStatus } from '../../types';
import { formatTimestamp } from '../../utils/format';
import { PageHeader } from '../../components/navigation/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { Avatar } from '../../components/elder/Avatar';
import { Badge, toneForStatus } from '../../components/status/Badge';
import { Chip } from '../../components/buttons/Controls';
import { Icon } from '../../components/icons/Icon';

const STATUS_FILTERS: ('ALL' | RequestStatus)[] = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'];

const CATEGORIES: ('ALL' | RequestCategory)[] = [
  'ALL',
  'GENERAL_HELP',
  'APPOINTMENT',
  'REMINDER',
  'FAMILY_CONTACT',
  'GOVERNMENT_SERVICE',
  'EMERGENCY',
  'INFORMATION',
];

const SOURCE_ICON = {
  HOMEHUB: 'radio',
  BASIC_PHONE: 'phone',
  VOICE_ASSISTANT: 'mic',
  DASHBOARD: 'user',
} as const;

export function RequestsPage() {
  const { data: requests, loading, error, refetch } = useApiData(getRequests);
  const [statusFilter, setStatusFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | RequestCategory>('ALL');

  const filtered = (requests ?? []).filter((request) => {
    return (
      (statusFilter === 'ALL' || request.status === statusFilter) &&
      (categoryFilter === 'ALL' || request.category === categoryFilter)
    );
  });

  return (
    <div className="page">
      <PageHeader
        title="Requests"
        subtitle="What your elders have asked for — through the HomeHub, their phone or their voice."
      />

      <div className="stack stack--tight" style={{ marginBottom: 20 }}>
        <div className="chip-row" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((status) => (
            <Chip
              key={status}
              label={status === 'ALL' ? 'All' : status.replaceAll('_', ' ')}
              active={statusFilter === status}
              onSelect={() => setStatusFilter(status)}
            />
          ))}
        </div>
        <div className="chip-row" role="group" aria-label="Filter by category">
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={category === 'ALL' ? 'All categories' : category.replaceAll('_', ' ')}
              active={categoryFilter === category}
              onSelect={() => setCategoryFilter(category)}
            />
          ))}
        </div>
      </div>

      {loading && <LoadingState label="Loading requests…" minHeight={260} />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="clipboard"
          title="No requests here."
          description="Requests from elders will appear as soon as they ask for something."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="list-rows">
          {filtered.map((request) => (
            <article className="row-card card" key={request.id}>
              <Avatar name={request.elderName} size="md" />
              <div className="row-card__main">
                <div className="row-card__top">
                  <strong>{request.elderName}</strong>
                  <Badge tone={toneForStatus(request.status)}>{request.status.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="row-card__quote">“{request.message}”</p>
                <div className="row-card__meta num">
                  <span>{formatTimestamp(request.createdAt)}</span>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name={SOURCE_ICON[request.source]} size={14} />
                    via {request.source.replaceAll('_', ' ').toLowerCase()}
                  </span>
                </div>
              </div>
              <div className="row-card__side">
                <Badge tone="neutral">{request.category.replaceAll('_', ' ')}</Badge>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

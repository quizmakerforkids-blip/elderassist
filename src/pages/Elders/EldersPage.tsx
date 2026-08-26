import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { getElders } from '../../services/elders';
import type { ElderStatus } from '../../types';
import { PageHeader } from '../../components/navigation/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { ElderCard } from '../../components/elder/ElderCard';
import { Chip } from '../../components/buttons/Controls';

const STATUS_FILTERS: ('ALL' | ElderStatus)[] = ['ALL', 'SAFE', 'ATTENTION', 'OFFLINE', 'EMERGENCY'];

export function EldersPage() {
  const { data: elders, loading, error, refetch } = useApiData(getElders);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ElderStatus>('ALL');

  const filtered = (elders ?? []).filter((elder) => {
    const matchesStatus = statusFilter === 'ALL' || elder.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === '' ||
      elder.name.toLowerCase().includes(q) ||
      elder.preferredLanguage.toLowerCase().includes(q) ||
      elder.city.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="page page--wide">
      <PageHeader
        title="Elders"
        subtitle="Everyone on your care list, with their live safety status."
      />

      <div className="stack stack--tight" style={{ marginBottom: 22 }}>
        <div className="chip-row">
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="input"
              type="search"
              placeholder="Search by name, language or city…"
              aria-label="Search elders"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="chip-row" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((status) => (
            <Chip
              key={status}
              label={status === 'ALL' ? 'All statuses' : status}
              active={statusFilter === status}
              onSelect={() => setStatusFilter(status)}
            />
          ))}
        </div>
      </div>

      {loading && <LoadingState label="Loading elder information…" minHeight={280} />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && elders && filtered.length === 0 && (
        <EmptyState
          icon="users"
          title="No elders match your filters."
          description="Try clearing the search box or choosing a different status."
          action={
            <button
              type="button"
              className="chip"
              onClick={() => {
                setQuery('');
                setStatusFilter('ALL');
              }}
            >
              Clear filters
            </button>
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="elders-grid">
          {filtered.map((elder) => (
            <ElderCard key={elder.id} elder={elder} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiData } from '../../hooks/useApiData';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/notifications';
import { IS_DEMO_MODE } from '../../services/config';
import { describeError } from '../../services/api';
import { useToast } from '../../app/providers/ToastProvider';
import type { NotificationItem, NotificationType } from '../../types';
import { formatTimestamp } from '../../utils/format';
import { PageHeader } from '../../components/navigation/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/feedback/States';
import { Button } from '../../components/buttons/Button';
import { Chip } from '../../components/buttons/Controls';
import { Icon } from '../../components/icons/Icon';
import type { IconName } from '../../components/icons/Icon';
import { Badge } from '../../components/status/Badge';

const TYPE_META: Record<NotificationType, { icon: IconName; tile: string }> = {
  EMERGENCY: { icon: 'siren', tile: 'tile-icon--danger' },
  APPOINTMENT: { icon: 'calendar', tile: 'tile-icon--accent' },
  HOMEHUB: { icon: 'radio', tile: 'tile-icon--info' },
  REQUEST: { icon: 'clipboard', tile: 'tile-icon--attention' },
  SYSTEM: { icon: 'info', tile: 'tile-icon--neutral' },
};

const FILTERS: ('ALL' | 'UNREAD' | NotificationType)[] = [
  'ALL',
  'UNREAD',
  'EMERGENCY',
  'APPOINTMENT',
  'HOMEHUB',
  'REQUEST',
  'SYSTEM',
];

const RELATED_TARGET = {
  EMERGENCY: '/emergencies',
  REQUEST: '/requests',
  APPOINTMENT: '/appointments',
  HOMEHUB: '/homehub',
  ELDER: '/elders',
} as const;

export function NotificationsPage() {
  const { data, loading, error, refetch } = useApiData(getNotifications);
  const { push } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | NotificationType>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  const filtered = (data ?? []).filter((n) => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !n.read;
    return n.type === filter;
  });
  const unreadIds = (data ?? []).filter((n) => !n.read).map((n) => n.id);

  const handleMarkRead = async (notification: NotificationItem) => {
    try {
      await markNotificationRead(notification.id);
    } catch (err) {
      push({ tone: 'error', title: 'Unable to contact ElderAssist.', message: err instanceof Error ? err.message : describeError(err) });
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(unreadIds);
    } catch (err) {
      push({ tone: 'error', title: 'Unable to contact ElderAssist.', message: describeError(err) });
    } finally {
      setMarkingAll(false);
    }
  };

  const openRelated = async (notification: NotificationItem) => {
    if (!notification.read && notification.related == null) {
      try {
        await markNotificationRead(notification.id);
      } catch {
      }
    }
    if (notification.related) {
      navigate(RELATED_TARGET[notification.related.kind]);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle="Emergencies, appointments and HomeHub events — everything that happened while you were away."
        actions={
          unreadIds.length > 0 && (
            <Button variant="secondary" size="sm" loading={markingAll} onClick={handleMarkAll}>
              Mark all as read
            </Button>
          )
        }
      />

      <div className="chip-row" role="group" aria-label="Filter notifications" style={{ marginBottom: 20 }}>
        {FILTERS.map((value) => (
          <Chip
            key={value}
            label={
              value === 'ALL'
                ? `All (${data?.length ?? 0})`
                : value === 'UNREAD'
                  ? `Unread (${unreadIds.length})`
                  : value
              }
            active={filter === value}
            onSelect={() => setFilter(value)}
          />
        ))}
      </div>

      {loading && <LoadingState label="Loading notifications…" minHeight={260} />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="bell"
          title="You're all caught up."
          description="No notifications match this filter."
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="list-rows">
          {filtered.map((notification) => {
            const meta = TYPE_META[notification.type];
            return (
              <article key={notification.id} className={`card notif-row ${!notification.read ? 'notif-row--unread' : ''}`}>
                <span className={`notif-row__dot ${notification.read ? 'notif-row__dot--read' : ''}`} aria-hidden="true" />
                <span className={`tile-icon ${meta.tile}`} aria-hidden="true">
                  <Icon name={meta.icon} size={19} />
                </span>
                <div className="row-card__main">
                  <div className="row-card__top">
                    <strong>{notification.title}</strong>
                    <Badge tone="neutral">{notification.type}</Badge>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{notification.body}</p>
                  <div className="row-card__meta num">
                    <span>{formatTimestamp(notification.createdAt)}</span>
                  </div>
                  <div className="chip-row" style={{ marginTop: 6 }}>
                    {!notification.read && (
                      <Button variant="secondary" size="sm" onClick={() => handleMarkRead(notification)}>
                        Mark as read
                      </Button>
                    )}
                    {notification.related && (
                      <Button variant="ghost" size="sm" onClick={() => openRelated(notification)}>
                        View related item
                        <Icon name="chevron-right" size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!IS_DEMO_MODE && !loading && !error && data && (
        <p className="field__hint" style={{ marginTop: 18 }}>
          Read receipts are confirmed by the ElderAssist backend for every notification.
        </p>
      )}
    </div>
  );
}

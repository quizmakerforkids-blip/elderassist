import { Link } from 'react-router-dom';
import type { Elder } from '../../types';
import { formatRelativeTime } from '../../utils/format';
import { Card } from '../cards/Card';
import { Avatar } from './Avatar';
import { StatusIndicator } from '../status/StatusIndicator';
import { Badge } from '../status/Badge';
import { Button } from '../buttons/Button';
import { Icon } from '../icons/Icon';

interface ElderCardProps {
  elder: Elder;
}

export function ElderCard({ elder }: ElderCardProps) {
  return (
    <Card className="elder-card">
      <div className="elder-card__head">
        <Avatar name={elder.name} size="lg" />
        <div style={{ minWidth: 0 }}>
          <div className="elder-card__name">{elder.name}</div>
          <div className="elder-card__sub">
            {elder.age} years · {elder.preferredLanguage} · {elder.city}
          </div>
        </div>
      </div>

      <StatusIndicator status={elder.status} pulsing={elder.status === 'EMERGENCY'} />

      <div className="meta-list">
        <span className="meta-item">
          <Icon name={elder.homeHub?.online ? 'wifi' : 'wifi-off'} size={16} />
          {elder.homeHub
            ? `HomeHub ${elder.homeHub.online ? 'Online' : 'Offline — last seen ' + formatRelativeTime(elder.homeHub.lastSeenAt)}`
            : 'Connected via basic phone'}
        </span>
        <span className="meta-item">
          <Icon name="clock" size={16} />
          Last activity: {formatRelativeTime(elder.lastActivityAt)}
        </span>
        {elder.alertsCount > 0 && (
          <span className="meta-item">
            <Icon name="warning" size={16} />
            <Badge tone="attention">{elder.alertsCount} active alert{elder.alertsCount > 1 ? 's' : ''}</Badge>
          </span>
        )}
      </div>

      <div className="elder-card__footer">
        <Link to={`/elders/${elder.id}`} style={{ flex: 1 }}>
          <Button variant="secondary" fullWidth>
            View profile
            <Icon name="chevron-right" size={15} />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

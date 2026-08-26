import { Link } from 'react-router-dom';
import type { Emergency } from '../../types';
import { formatRelativeTime, formatTimestamp } from '../../utils/format';
import { Avatar } from '../elder/Avatar';
import { Badge, toneForStatus } from '../status/Badge';
import { Button } from '../buttons/Button';
import { Icon } from '../icons/Icon';

const SOURCE_LABEL: Record<Emergency['source'], string> = {
  HOMEHUB: 'HomeHub',
  BASIC_PHONE: 'Basic phone',
  VOICE_ASSISTANT: 'Voice assistant',
  DASHBOARD: 'Dashboard',
};

interface EmergencyCardProps {
  emergency: Emergency;
  onAcknowledge?: (id: string) => void;
  acknowledging?: boolean;
}

export function EmergencyCard({ emergency, onAcknowledge, acknowledging }: EmergencyCardProps) {
  const isOpen = emergency.status === 'OPEN';

  return (
    <article className={`emergency-card emergency-card--${emergency.status}`}>
      <div className="emergency-card__eyebrow">
        <Icon name="siren" size={14} strokeWidth={2.2} />
        EMERGENCY
        <span style={{ marginLeft: 'auto' }}>
          <Badge tone={toneForStatus(emergency.status)}>{emergency.status}</Badge>
        </span>
      </div>

      <div className="emergency-card__elder">
        <Avatar name={emergency.elderName} size="sm" />
        {emergency.elderName}
      </div>

      <p className="emergency-card__quote">{'\u201c'}{emergency.description}{'\u201d'}</p>

      {emergency.voiceAudio && (
        <div style={{ margin: '6px 0', padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>
            Voice message
          </div>
          <audio controls src={emergency.voiceAudio} style={{ width: '100%', height: 32 }} />
        </div>
      )}

      <div className="emergency-card__meta num">
        <span>
          {formatTimestamp(emergency.createdAt)} · via {SOURCE_LABEL[emergency.source]}
        </span>
        {isOpen && (
          <span className="waiting-note">
            <span className="waiting-note__dot pulse-ring" aria-hidden="true" />
            Waiting for acknowledgement
          </span>
        )}
        {!isOpen && emergency.status === 'ACKNOWLEDGED' && (
          <span style={{ color: 'var(--attention)', fontWeight: 600 }}>
            Acknowledged by {emergency.acknowledgedBy} ·{' '}
            {emergency.acknowledgedAt ? formatRelativeTime(emergency.acknowledgedAt) : ''}
          </span>
        )}
        {(emergency.status === 'RESOLVED' || emergency.status === 'CANCELLED') && (
          <span>Closed {emergency.resolvedAt ? formatTimestamp(emergency.resolvedAt) : ''}</span>
        )}
        {emergency.status === 'ESCALATED' && (
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
            Escalated to the response team
          </span>
        )}
      </div>

      <div className="emergency-card__actions">
          {isOpen && onAcknowledge && (
            <Button
              variant="danger"
              size="sm"
              loading={acknowledging}
              onClick={() => onAcknowledge(emergency.id)}
            >
              Acknowledge
            </Button>
          )}
          <Link to={`/elders/${emergency.elderId}`}>
            <Button variant="secondary" size="sm">
              View elder
            </Button>
          </Link>
      </div>
    </article>
  );
}

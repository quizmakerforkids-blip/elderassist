import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/Icon';
import type { ElderStatus, EmergencyStatus } from '../../types';

type AnyStatus = ElderStatus | EmergencyStatus;

const CONFIG: Record<AnyStatus, { label: string; icon: IconName }> = {
  SAFE: { label: 'SAFE', icon: 'shield-check' },
  ATTENTION: { label: 'ATTENTION', icon: 'warning' },
  OFFLINE: { label: 'OFFLINE', icon: 'wifi-off' },
  EMERGENCY: { label: 'EMERGENCY', icon: 'siren' },
  OPEN: { label: 'OPEN', icon: 'siren' },
  ACKNOWLEDGED: { label: 'ACKNOWLEDGED', icon: 'check' },
  ESCALATED: { label: 'ESCALATED', icon: 'warning' },
  RESOLVED: { label: 'RESOLVED', icon: 'check' },
  CANCELLED: { label: 'CANCELLED', icon: 'close' },
};

function toneClass(status: AnyStatus): string {
  switch (status) {
    case 'SAFE':
      return 'safe';
    case 'ATTENTION':
    case 'ACKNOWLEDGED':
    case 'ESCALATED':
      return 'attention';
    case 'OFFLINE':
    case 'CANCELLED':
    case 'RESOLVED':
      return status === 'RESOLVED' ? 'safe' : 'offline';
    default:
      return 'danger';
  }
}

interface StatusIndicatorProps {
  status: AnyStatus;
  pulsing?: boolean;
  size?: 'md' | 'lg';
}

export function StatusIndicator({ status, pulsing = false, size = 'md' }: StatusIndicatorProps) {
  const config = CONFIG[status];
  return (
    <span className={`status status--${toneClass(status)} ${size === 'lg' ? 'status--lg' : ''}`}>
      <span
        className={`status__dot ${pulsing ? 'pulse-ring' : ''}`}
        style={{ position: 'relative' }}
        aria-hidden="true"
      />
      <Icon name={config.icon} size={15} strokeWidth={2.2} />
      <span>{config.label}</span>
    </span>
  );
}

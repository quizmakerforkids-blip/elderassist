import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'safe' | 'attention' | 'danger' | 'offline' | 'info';

const TONES: Record<string, string> = {
  SAFE: 'safe',
  ONLINE: 'safe',
  CONFIRMED: 'safe',
  COMPLETED: 'safe',
  ACTIVE: 'safe',
  ATTENTION: 'attention',
  ACKNOWLEDGED: 'attention',
  REQUESTED: 'attention',
  IN_PROGRESS: 'info',
  PAUSED: 'offline',
  OFFLINE: 'offline',
  CANCELLED: 'offline',
  DECLINED: 'offline',
  FAILED: 'danger',
  OPEN: 'danger',
  EMERGENCY: 'danger',
  ESCALATED: 'danger',
};

export function toneForStatus(status: string): BadgeTone {
  return (TONES[status] as BadgeTone) ?? 'neutral';
}

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

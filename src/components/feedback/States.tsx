import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/Icon';
import { Button } from '../buttons/Button';

interface LoadingStateProps {
  label?: string;
  minHeight?: number;
}

export function LoadingState({ label = 'Loading…', minHeight = 220 }: LoadingStateProps) {
  return (
    <div className="state-block" style={{ minHeight }} role="status" aria-live="polite">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <span className="state-block__desc">{label}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon = 'inbox', title, description, action, compact }: EmptyStateProps) {
  return (
    <div className="state-block" style={compact ? { padding: '28px 18px' } : undefined}>
      <span className="state-block__icon state-block__icon--empty" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <span className="state-block__title">{title}</span>
      {description && <span className="state-block__desc">{description}</span>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to connect to ElderAssist.',
  message = 'We could not reach the ElderAssist service. Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-block" role="alert">
      <span className="state-block__icon state-block__icon--error" aria-hidden="true">
        <Icon name="cloud-off" size={24} />
      </span>
      <span className="state-block__title">{title}</span>
      <span className="state-block__desc">{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <>
            <Icon name="refresh" size={16} />
            Try again
          </>
        </Button>
      )}
    </div>
  );
}

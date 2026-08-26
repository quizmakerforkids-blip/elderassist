import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={['card', className].filter(Boolean).join(' ')}>{children}</div>;
}

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  ariaLabel?: string;
}

export function SectionCard({
  title,
  action,
  children,
  bodyClassName,
  ariaLabel,
}: SectionCardProps) {
  return (
    <section className="card" aria-label={ariaLabel ?? title}>
      <div className="card__header">
        <h2 className="card__title">{title}</h2>
        {action}
      </div>
      <div className={bodyClassName ?? 'card__body'}>{children}</div>
    </section>
  );
}

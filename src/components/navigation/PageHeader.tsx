import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../icons/Icon';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function PageHeader({ title, subtitle, actions, backTo, backLabel }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {backTo && (
          <Link to={backTo} className="back-link">
            <Icon name="arrow-left" size={15} />
            {backLabel ?? 'Back'}
          </Link>
        )}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

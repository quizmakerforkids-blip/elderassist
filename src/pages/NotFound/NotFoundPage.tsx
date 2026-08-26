import { Link } from 'react-router-dom';
import { Button } from '../../components/buttons/Button';
import { Icon } from '../../components/icons/Icon';

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="state-block" style={{ minHeight: '60vh' }}>
        <span className="state-block__icon" aria-hidden="true">
          <Icon name="search" size={24} />
        </span>
        <h1 className="page-header__title">Page not found</h1>
        <p className="state-block__desc">
          This page does not exist in the ElderAssist console. The link may be outdated.
        </p>
        <div className="chip-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <Link to="/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
          <Link to="/emergencies">
            <Button variant="secondary">Emergency Center</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

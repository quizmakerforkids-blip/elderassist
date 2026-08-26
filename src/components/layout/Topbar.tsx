import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../icons/Icon';
import { Avatar } from '../elder/Avatar';
import { ConnectionPill } from './Sidebar';
import { useAuth } from '../../app/providers/AuthProvider';
import { useEventCounts } from '../../app/providers/EventCountsProvider';

interface TopbarProps {
  title: string;
  onOpenMenu: () => void;
}

export function Topbar({ title, onOpenMenu }: TopbarProps) {
  const { user } = useAuth();
  const { unreadNotifications } = useEventCounts();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn hamburger"
        aria-label="Open navigation menu"
        onClick={onOpenMenu}
      >
        <Icon name="menu" size={22} />
      </button>

      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__right">
        <ConnectionPill compact />
        <button
          type="button"
          className="icon-btn"
          aria-label={
            unreadNotifications > 0
              ? `Notifications — ${unreadNotifications} unread`
              : 'Notifications'
          }
          onClick={() => navigate('/notifications')}
        >
          <Icon name="bell" size={20} />
          {unreadNotifications > 0 && (
            <span className="icon-btn__badge" aria-hidden="true">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>
        <Link to="/settings" className="topbar__user" aria-label="Account settings">
          <span className="topbar__user-name">{user?.name ?? 'Account'}</span>
          <Avatar name={user?.name ?? 'Caregiver'} size="sm" />
        </Link>
      </div>
    </header>
  );
}

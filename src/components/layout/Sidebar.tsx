import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BrandMark, Icon } from '../icons/Icon';
import type { IconName } from '../icons/Icon';
import type { NavItem } from './navItems';
import { PRIMARY_NAV, SECONDARY_NAV } from './navItems';
import { Avatar } from '../elder/Avatar';
import { useAuth } from '../../app/providers/AuthProvider';
import { useConnection } from '../../app/providers/ConnectionProvider';
import { useEventCounts } from '../../app/providers/EventCountsProvider';
import { IS_CAREGIVER } from '../../services/config';
import { ConnectFamilyModal } from '../connect/ConnectFamilyModal';

function NavLinkItem({ item, badge }: { item: NavItem; badge?: number }) {
  return (
    <NavLink to={item.to} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} end={item.end}>
      <Icon name={item.icon as IconName} size={20} />
      <span className="nav-label">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="nav-label nav-link__badge" aria-label={`${badge} ${item.label.toLowerCase()}`}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export function ConnectionPill({ compact = false }: { compact?: boolean }) {
  const { state, recheck } = useConnection();

  if (state === 'demo') {
    return (
      <span className="conn-pill conn-pill--demo" title="Demo mode uses local sample data">
        <span className="conn-pill__dot" aria-hidden="true" />
        <span className="conn-pill__label">Demo data</span>
      </span>
    );
  }

  if (state === 'connected') {
    return (
      <button
        type="button"
        className="conn-pill conn-pill--ok"
        onClick={recheck}
        title="ElderAssist backend is reachable. Click to re-check."
      >
        <span className="conn-pill__dot" aria-hidden="true" />
        <span className="conn-pill__label">Connected</span>
      </button>
    );
  }

  if (state === 'checking') {
    return (
      <span className="conn-pill">
        <span className="spinner" aria-hidden="true" style={{ width: 10, height: 10 }} />
        {!compact && <span className="conn-pill__label">Checking…</span>}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="conn-pill conn-pill--err"
      onClick={recheck}
      title="Cannot reach the ElderAssist backend. Click to retry."
    >
      <span className="conn-pill__dot" aria-hidden="true" />
      <span className="conn-pill__label">Backend unavailable</span>
    </button>
  );
}

interface SidebarProps {
  onSignOut: () => void;
}

export function Sidebar({ onSignOut }: SidebarProps) {
  const { user } = useAuth();
  const { openEmergencies, unreadNotifications } = useEventCounts();
  const [showConnect, setShowConnect] = useState(false);

  const badgeFor = (label: string): number | undefined => {
    if (label === 'Emergencies') return openEmergencies;
    if (label === 'Notifications') return unreadNotifications;
    return undefined;
  };

  const brandTag = IS_CAREGIVER ? 'Caregiver Console' : 'Cared Person Portal';
  const displayName = user?.name ?? 'Account';
  const roleText = IS_CAREGIVER ? 'Primary caregiver' : 'Getting care';

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar__brand">
        <BrandMark size={36} />
        <div className="brand__text">
          <div className="brand__name">ElderAssist</div>
          <div className="brand__tag">{brandTag}</div>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {PRIMARY_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} badge={badgeFor(item.label)} />
        ))}
        <div className="sidebar__divider" role="presentation" />
        {SECONDARY_NAV.map((item) => (
          <NavLinkItem key={item.to} item={item} />
        ))}
      </nav>

      {IS_CAREGIVER && (
        <div style={{ padding: '0 12px' }}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setShowConnect(true)}
          >
            <Icon name="link" size={16} />
            <span className="nav-label">Connect Family</span>
          </button>
        </div>
      )}

      <div className="sidebar__footer">
        <div className="account-card">
          <Avatar name={displayName} size="sm" />
          <div className="account-text">
            <div className="account-card__name">{displayName}</div>
            <div className="account-card__role">{roleText}</div>
          </div>
          <button
            type="button"
            className="icon-btn account-card__signout"
            aria-label="Sign out"
            title="Sign out"
            onClick={onSignOut}
          >
            <Icon name="log-out" size={17} />
          </button>
        </div>
        <ConnectionPill compact />
      </div>

      {showConnect && <ConnectFamilyModal onClose={() => setShowConnect(false)} />}
    </aside>
  );
}

import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { BrandMark, Icon } from '../icons/Icon';
import type { NavItem } from './navItems';
import { PRIMARY_NAV, SECONDARY_NAV } from './navItems';
import { ConnectionPill } from './Sidebar';
import { IS_CAREGIVER } from '../../services/config';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const brandTag = IS_CAREGIVER ? 'Caregiver Console' : 'Cared Person Portal';

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <nav className="drawer" aria-label="Mobile navigation">
        <div className="sidebar__brand" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandMark size={34} />
            <span className="brand__text">
              <span className="brand__name" style={{ display: 'block' }}>
                ElderAssist
              </span>
              <span className="brand__tag">{brandTag}</span>
            </span>
          </span>
          <button
            type="button"
            className="icon-btn"
            style={{ color: '#aebfc6' }}
            aria-label="Close navigation menu"
            onClick={onClose}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="sidebar__nav">
          {PRIMARY_NAV.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              onClick={onClose}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
          <div className="sidebar__divider" role="presentation" />
          {SECONDARY_NAV.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              onClick={onClose}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar__footer">
          <ConnectionPill />
        </div>
      </nav>
    </>
  );
}

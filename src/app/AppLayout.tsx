import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { MobileNav } from '../components/layout/MobileNav';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { pageTitleFor } from '../components/layout/navItems';
import { useAuth } from './providers/AuthProvider';

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const doSignOut = () => {
    setConfirmSignOut(false);
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar onSignOut={() => setConfirmSignOut(true)} />

      <div className="main-area">
        <Topbar title={pageTitleFor(location.pathname)} onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content">
          <Outlet />
        </main>
      </div>

      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        message="You will need to sign in again to view the dashboard."
        confirmLabel="Sign out"
        danger
        onConfirm={doSignOut}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
}

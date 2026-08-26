import type { IconName } from '../icons/Icon';
import { IS_CAREGIVER } from '../../services/config';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

export const CAREGIVER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/elders', label: 'Elders', icon: 'users' },
  { to: '/emergencies', label: 'Emergencies', icon: 'siren' },
  { to: '/requests', label: 'Requests', icon: 'clipboard' },
  { to: '/appointments', label: 'Appointments', icon: 'calendar' },
  { to: '/reminders', label: 'Reminders', icon: 'clock' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/homehub', label: 'HomeHub', icon: 'radio' },
  { to: '/location', label: 'Location', icon: 'map-pin' },
];

export const CARED_NAV: NavItem[] = [
  { to: '/dashboard', label: 'My Dashboard', icon: 'dashboard' },
  { to: '/reminders', label: 'Reminders', icon: 'clock' },
  { to: '/appointments', label: 'Appointments', icon: 'calendar' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
  { to: '/emergencies', label: 'Emergencies', icon: 'siren' },
  { to: '/location', label: 'Location', icon: 'map-pin' },
];

export const PRIMARY_NAV: NavItem[] = IS_CAREGIVER ? CAREGIVER_NAV : CARED_NAV;

export const SECONDARY_NAV: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const CAREGIVER_TITLES: [string, string][] = [
  ['/dashboard', 'Dashboard'],
  ['elders/', 'Elder profile'],
  ['/elders', 'Elders'],
  ['/emergencies', 'Emergency Center'],
  ['/requests', 'Requests'],
  ['/appointments', 'Appointments'],
  ['/reminders', 'Reminders'],
  ['/notifications', 'Notifications'],
  ['/homehub', 'HomeHub'],
  ['/location', 'Location'],
  ['/settings', 'Settings'],
];

const CARED_TITLES: [string, string][] = [
  ['/dashboard', 'My Dashboard'],
  ['/reminders', 'My Reminders'],
  ['/appointments', 'My Appointments'],
  ['/notifications', 'Notifications'],
  ['/emergencies', 'Emergencies'],
  ['/location', 'Location'],
  ['/settings', 'Settings'],
];

const TITLES = IS_CAREGIVER ? CAREGIVER_TITLES : CARED_TITLES;

export function pageTitleFor(pathname: string): string {
  const match = TITLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
  return match ? match[1] : 'ElderAssist';
}

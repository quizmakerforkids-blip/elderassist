import type { Elder } from '../types';
import { ago, daysAgo } from './time';
import { DEMO_HOMEHUBS } from './homehubs';

export const DEMO_ELDERS: Elder[] = [
  {
    id: 'eld-01',
    name: 'Lakshmi Rao',
    age: 74,
    status: 'SAFE',
    preferredLanguage: 'Telugu',
    phone: '+91 98550 •••32',
    city: 'Hyderabad',
    lastActivityAt: ago(28),
    alertsCount: 0,
    careTeam: [
      { name: 'Ananya Sharma', role: 'Primary caregiver (daughter)', isPrimary: true },
      { name: 'Dr. Meera Kulkarni', role: 'Physician', isPrimary: false },
    ],
    homeHub: DEMO_HOMEHUBS[0] ?? null,
  },
  {
    id: 'eld-02',
    name: 'Raman Kumar',
    age: 79,
    status: 'ATTENTION',
    preferredLanguage: 'Hindi',
    phone: '+91 98217 •••84',
    city: 'Pune',
    lastActivityAt: ago(46),
    alertsCount: 1,
    careTeam: [
      { name: 'Ananya Sharma', role: 'Primary caregiver', isPrimary: true },
      { name: 'Sunita Kumar', role: 'Family contact', isPrimary: false },
    ],
    homeHub: DEMO_HOMEHUBS[1] ?? null,
  },
  {
    id: 'eld-03',
    name: 'Devika Menon',
    age: 81,
    status: 'OFFLINE',
    preferredLanguage: 'Malayalam',
    phone: '+91 99460 •••17',
    city: 'Kochi',
    lastActivityAt: daysAgo(1, 20, 5),
    alertsCount: 0,
    careTeam: [{ name: 'Ananya Sharma', role: 'Primary caregiver', isPrimary: true }],
    homeHub: null,
  },
];

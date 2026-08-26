import type { CaredPerson, PairingRequest } from '../types';

export const DEMO_CARED_PERSONS: CaredPerson[] = [
  {
    id: 'eld-01',
    name: 'Lakshmi Rao',
    age: 74,
    email: 'lakshmi@example.com',
    phone: '+91 98550 •••32',
    city: 'Hyderabad',
    preferredLanguage: 'Telugu',
    status: 'SAFE',
    linkedCaregiverId: 'crg-01',
    linkedCaregiverName: 'Ananya Sharma',
    pairingCode: null,
  },
  {
    id: 'eld-02',
    name: 'Raman Kumar',
    age: 79,
    email: 'raman@example.com',
    phone: '+91 98217 •••84',
    city: 'Pune',
    preferredLanguage: 'Hindi',
    status: 'ATTENTION',
    linkedCaregiverId: 'crg-01',
    linkedCaregiverName: 'Ananya Sharma',
    pairingCode: null,
  },
  {
    id: 'eld-03',
    name: 'Devika Menon',
    age: 81,
    email: 'devika@example.com',
    phone: '+91 99460 •••17',
    city: 'Kochi',
    preferredLanguage: 'Malayalam',
    status: 'OFFLINE',
    linkedCaregiverId: null,
    linkedCaregiverName: null,
    pairingCode: 'DEV-4821',
  },
];

export const DEMO_PAIRING_REQUESTS: PairingRequest[] = [
  {
    code: 'ANA-7291',
    caregiverId: 'crg-01',
    caregiverName: 'Ananya Sharma',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    used: true,
    usedBy: 'eld-01',
  },
  {
    code: 'ANA-3384',
    caregiverId: 'crg-01',
    caregiverName: 'Ananya Sharma',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    used: false,
    usedBy: null,
  },
];

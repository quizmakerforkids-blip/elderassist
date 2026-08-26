import type { Appointment } from '../types';
import { daysAhead, daysAgo } from './time';

export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-51',
    elderId: 'eld-01',
    elderName: 'Lakshmi Rao',
    title: 'General check-up',
    provider: 'Dr. Meera Kulkarni · Sunrise Clinic',
    location: 'Banjara Hills, Hyderabad',
    date: daysAhead(1, 10, 30),
    status: 'CONFIRMED',
    notes: 'Lakshmi requested a morning reminder for this visit.',
  },
  {
    id: 'APT-52',
    elderId: 'eld-02',
    elderName: 'Raman Kumar',
    title: 'Physiotherapy consultation',
    provider: 'Apex Physio Care',
    location: 'Kothrud, Pune',
    date: daysAhead(3, 12, 0),
    status: 'REQUESTED',
    notes: null,
  },
  {
    id: 'APT-48',
    elderId: 'eld-03',
    elderName: 'Devika Menon',
    title: 'Eye examination',
    provider: 'Dr. Nair Eye Institute',
    location: 'Ernakulam, Kochi',
    date: daysAgo(5, 9, 0),
    status: 'COMPLETED',
    notes: 'Prescription updated. Report shared with the family.',
  },
];

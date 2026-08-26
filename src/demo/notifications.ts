import type { NotificationItem } from '../types';
import { ago, daysAgo } from './time';

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NTF-901',
    type: 'EMERGENCY',
    title: 'Emergency acknowledged — Raman Kumar',
    body: 'Raman requested help from his basic phone. Ananya acknowledged the alert.',
    createdAt: ago(309),
    read: false,
    related: { kind: 'EMERGENCY', id: 'EMG-1041' },
  },
  {
    id: 'NTF-900',
    type: 'REQUEST',
    title: 'New request from Lakshmi Rao',
    body: '"Can you remind me about my appointment tomorrow?"',
    createdAt: ago(71),
    read: false,
    related: { kind: 'REQUEST', id: 'REQ-301' },
  },
  {
    id: 'NTF-899',
    type: 'HOMEHUB',
    title: "Raman's HomeHub went offline",
    body: 'The device has not checked in since this morning. Battery may be low.',
    createdAt: ago(372),
    read: false,
    related: { kind: 'HOMEHUB', id: 'EA-HUB-1873' },
  },
  {
    id: 'NTF-898',
    type: 'APPOINTMENT',
    title: 'Appointment confirmed — Lakshmi Rao',
    body: 'General check-up with Dr. Kulkarni at Sunrise Clinic is confirmed for tomorrow at 10:30 AM.',
    createdAt: daysAgo(1, 12, 30),
    read: true,
    related: { kind: 'APPOINTMENT', id: 'APT-51' },
  },
  {
    id: 'NTF-897',
    type: 'SYSTEM',
    title: 'Weekly care summary is ready',
    body: 'Your care summary for the past week is available in Settings.',
    createdAt: daysAgo(2, 8, 0),
    read: true,
    related: null,
  },
  {
    id: 'NTF-896',
    type: 'EMERGENCY',
    title: 'Emergency resolved — Lakshmi Rao',
    body: 'The HomeHub help alert was a false alarm. Lakshmi cancelled it herself.',
    createdAt: daysAgo(2, 16, 26),
    read: true,
    related: { kind: 'EMERGENCY', id: 'EMG-1035' },
  },
];

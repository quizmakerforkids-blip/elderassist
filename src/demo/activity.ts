import type { ActivityEvent } from '../types';
import { ago, daysAgo } from './time';

export const DEMO_ACTIVITY: ActivityEvent[] = [
  { id: 'act-a1', time: ago(28), message: 'Lakshmi requested a reminder.', kind: 'INFO' },
  { id: 'act-a2', time: ago(71), message: 'New request from Lakshmi Rao.', kind: 'INFO' },
  { id: 'act-a3', time: ago(309), message: 'Emergency acknowledged — Raman Kumar.', kind: 'SUCCESS' },
  { id: 'act-a4', time: ago(318), message: 'Raman requested help from his basic phone.', kind: 'DANGER' },
  { id: 'act-a5', time: ago(372), message: "Raman's HomeHub went offline.", kind: 'WARNING' },
  { id: 'act-a6', time: ago(420), message: 'Appointment reminder completed for Lakshmi.', kind: 'SUCCESS' },
  { id: 'act-a7', time: ago(1330), message: "Lakshmi's HomeHub came back online.", kind: 'SUCCESS' },
  { id: 'act-a8', time: daysAgo(1, 20, 5), message: 'Devika placed a family contact request.', kind: 'INFO' },
];

import type { Reminder } from '../types';
import { IS_DEMO_MODE } from './config';
import { api } from './api';
import { getDemoReminders } from '../demo/demoStore';

export function getReminders(): Promise<Reminder[]> {
  if (IS_DEMO_MODE) return Promise.resolve(getDemoReminders());
  return api.get<Reminder[]>('/reminders');
}

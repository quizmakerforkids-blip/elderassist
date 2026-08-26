import type { DashboardSummary } from '../types';
import { IS_DEMO_MODE } from './config';
import { api } from './api';
import { getDemoDashboardSummary, getDemoActivity } from '../demo/demoStore';

export function getDashboardSummary(): Promise<DashboardSummary> {
  if (IS_DEMO_MODE) return Promise.resolve(getDemoDashboardSummary());
  return api.get<DashboardSummary>('/dashboard/summary');
}

export interface ActivityEntry {
  id: string;
  time: string;
  message: string;
}

interface NotificationLite {
  id: string;
  title: string;
  createdAt: string;
}

export async function getRecentActivity(limit = 8): Promise<ActivityEntry[]> {
  if (IS_DEMO_MODE) {
    return getDemoActivity(limit).map((event) => ({
      id: event.id,
      time: event.time,
      message: event.message,
    }));
  }

  const notifications = await api.get<NotificationLite[]>('/notifications');
  return notifications
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit)
    .map((n) => ({ id: n.id, time: n.createdAt, message: n.title }));
}

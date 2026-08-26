import type { NotificationItem } from '../types';
import { IS_DEMO_MODE } from './config';
import { api } from './api';
import {
  getDemoNotifications,
  markAllDemoNotificationsRead,
  markDemoNotificationRead,
} from '../demo/demoStore';

export function getNotifications(): Promise<NotificationItem[]> {
  if (IS_DEMO_MODE) return Promise.resolve(getDemoNotifications());
  return api.get<NotificationItem[]>('/notifications');
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  if (IS_DEMO_MODE) return markDemoNotificationRead(id);
  const updated = await api.post<Partial<NotificationItem>>(
    `/notifications/${encodeURIComponent(id)}/read`,
  );
  return { id, read: true, ...updated } as NotificationItem;
}

export async function markAllNotificationsRead(
  ids: string[],
): Promise<void> {
  if (IS_DEMO_MODE) {
    markAllDemoNotificationsRead();
    return;
  }
  for (const id of ids) {
    await markNotificationRead(id);
  }
}

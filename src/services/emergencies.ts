import type { Emergency } from '../types';
import { IS_DEMO_MODE } from './config';
import { api, ApiError } from './api';
import {
  acknowledgeDemoEmergency,
  getDemoEmergencies,
} from '../demo/demoStore';

export async function getEmergencies(): Promise<Emergency[]> {
  if (IS_DEMO_MODE) return getDemoEmergencies();
  return api.get<Emergency[]>('/emergencies');
}

export async function getEmergency(id: string): Promise<Emergency> {
  if (IS_DEMO_MODE) {
    const emergency = getDemoEmergencies().find((e) => e.id === id);
    if (!emergency) throw new ApiError('Emergency not found.', { status: 404 });
    return emergency;
  }
  return api.get<Emergency>(`/emergencies/${encodeURIComponent(id)}`);
}

export async function acknowledgeEmergency(id: string): Promise<Emergency> {
  if (IS_DEMO_MODE) return acknowledgeDemoEmergency(id);
  return api.post<Emergency>(`/emergencies/${encodeURIComponent(id)}/acknowledge`);
}

import type { HomeHub, HubEventType, SendHubEventResult } from '../types';
import { IS_DEMO_MODE } from './config';
import { api, ApiError } from './api';
import { getDemoHub, getDemoHubs, sendDemoHubEvent } from '../demo/demoStore';

export async function getHomeHubs(): Promise<HomeHub[]> {
  if (IS_DEMO_MODE) return getDemoHubs();
  return api.get<HomeHub[]>('/homehub');
}

export async function getHomeHub(deviceId: string): Promise<HomeHub> {
  if (IS_DEMO_MODE) {
    const hub = getDemoHub(deviceId);
    if (!hub) throw new ApiError('HomeHub not found.', { status: 404 });
    return hub;
  }
  return api.get<HomeHub>(`/homehub/${encodeURIComponent(deviceId)}`);
}

export async function sendHomeHubEvent(
  deviceId: string,
  event: { type: HubEventType },
): Promise<SendHubEventResult> {
  if (IS_DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return sendDemoHubEvent(deviceId, event);
  }
  return api.post<SendHubEventResult>(
    `/homehub/${encodeURIComponent(deviceId)}/events`,
    event,
  );
}

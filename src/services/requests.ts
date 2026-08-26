import type { AssistanceRequest } from '../types';
import { IS_DEMO_MODE } from './config';
import { api } from './api';
import { getDemoRequests } from '../demo/demoStore';

export function getRequests(): Promise<AssistanceRequest[]> {
  if (IS_DEMO_MODE) return Promise.resolve(getDemoRequests());
  return api.get<AssistanceRequest[]>('/requests');
}

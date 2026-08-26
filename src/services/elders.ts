import type { Elder } from '../types';
import { IS_DEMO_MODE } from './config';
import { api, ApiError } from './api';
import { getDemoElder, getDemoElders } from '../demo/demoStore';

export async function getElders(): Promise<Elder[]> {
  if (IS_DEMO_MODE) return getDemoElders();
  return api.get<Elder[]>('/elders');
}

export async function getElder(id: string): Promise<Elder> {
  if (IS_DEMO_MODE) {
    const elder = getDemoElder(id);
    if (!elder) throw new ApiError('Elder not found.', { status: 404 });
    return elder;
  }
  return api.get<Elder>(`/elders/${encodeURIComponent(id)}`);
}

import { api, ApiError } from './api';

export async function pingBackend(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.kind === 'http') {
      return true;
    }
    return false;
  }
}

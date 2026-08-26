import type { AppRole } from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export const API_PREFIX = '/api/v1';

export const REQUEST_TIMEOUT_MS = 10_000;

export const IS_DEMO_MODE =
  String(import.meta.env.VITE_DEMO_MODE ?? '').trim().toLowerCase() === 'true';

export const APP_ROLE: AppRole =
  (import.meta.env.VITE_APP_ROLE ?? 'caregiver').toLowerCase() === 'cared'
    ? 'cared'
    : 'caregiver';

export const IS_CAREGIVER = APP_ROLE === 'caregiver';
export const IS_CARED = APP_ROLE === 'cared';

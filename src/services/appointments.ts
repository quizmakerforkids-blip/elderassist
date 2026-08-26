import type { Appointment } from '../types';
import { IS_DEMO_MODE } from './config';
import { api } from './api';
import { getDemoAppointments } from '../demo/demoStore';

export function getAppointments(): Promise<Appointment[]> {
  if (IS_DEMO_MODE) return Promise.resolve(getDemoAppointments());
  return api.get<Appointment[]>('/appointments');
}

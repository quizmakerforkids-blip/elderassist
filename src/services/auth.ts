import type { Caregiver, CaredPerson } from '../types';
import { IS_DEMO_MODE } from './config';
import { api, ApiError, setApiUser } from './api';
import { DEMO_CAREGIVER } from '../demo/caregiver';
import { DEMO_CARED_PERSONS } from '../demo/caredPersons';
import { delay } from '../demo/time';

export const AUTH_UNAVAILABLE_MESSAGE = 'Authentication service is not connected.';

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  linkedCaregiverId: string | null;
  linkedCaregiverName: string | null;
}

function toCaregiver(u: ApiUser): Caregiver {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function toCaredPerson(u: ApiUser): CaredPerson {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    age: 0,
    phone: '',
    city: '',
    preferredLanguage: 'en',
    status: 'SAFE',
    linkedCaregiverId: u.linkedCaregiverId,
    linkedCaregiverName: u.linkedCaregiverName,
    pairingCode: null,
  };
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: 'caregiver' | 'cared',
): Promise<Caregiver | CaredPerson> {
  if (IS_DEMO_MODE) {
    await delay(400);
    if (role === 'caregiver') {
      return { ...DEMO_CAREGIVER, name, email };
    }
    return { ...DEMO_CARED_PERSONS[0], name, email };
  }

  const result = await api.post<ApiUser>('/auth/register', {
    name,
    email,
    password,
    role,
  });
  setApiUser(result.id);
  return role === 'caregiver' ? toCaregiver(result) : toCaredPerson(result);
}

export async function signInCaregiver(email: string, password: string): Promise<Caregiver> {
  if (email.trim() === '' || password === '') {
    throw new ApiError('Please enter your email and password.', { status: 400 });
  }

  if (IS_DEMO_MODE) {
    await delay(600);
    return { ...DEMO_CAREGIVER, email: email.trim() };
  }

  const result = await api.post<ApiUser>('/auth/login', { email, password });
  setApiUser(result.id);
  return toCaregiver(result);
}

export async function signInCared(email: string, password: string): Promise<CaredPerson> {
  if (email.trim() === '' || password === '') {
    throw new ApiError('Please enter your email and password.', { status: 400 });
  }

  if (IS_DEMO_MODE) {
    await delay(600);
    const match = DEMO_CARED_PERSONS.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (match) return { ...match };
    return { ...DEMO_CARED_PERSONS[0], email: email.trim() };
  }

  const result = await api.post<ApiUser>('/auth/login', { email, password });
  setApiUser(result.id);
  return toCaredPerson(result);
}

export async function signIn(email: string, password: string): Promise<Caregiver | CaredPerson> {
  if (IS_DEMO_MODE) {
    await delay(400);
    const isCared = email.toLowerCase().includes('elder') || email.toLowerCase().includes('lakshmi');
    if (isCared) {
      return { ...DEMO_CARED_PERSONS[0], email: email.trim() };
    }
    return { ...DEMO_CAREGIVER, email: email.trim() };
  }

  const result = await api.post<ApiUser>('/auth/login', { email, password });
  setApiUser(result.id);
  return result.role === 'caregiver' ? toCaregiver(result) : toCaredPerson(result);
}

export async function pairWithCaregiver(
  pairingCode: string,
  _caredPersonId: string,
): Promise<{ caregiverName: string }> {
  if (IS_DEMO_MODE) {
    await delay(600);
    const validCode = pairingCode.trim().toUpperCase();
    if (validCode.length < 4) {
      throw new ApiError('Please enter a valid pairing code.', { status: 400 });
    }
    return { caregiverName: DEMO_CAREGIVER.name };
  }

  return api.post<{ caregiverName: string }>('/pairing/connect', { code: pairingCode });
}

export async function generatePairingCode(): Promise<{ code: string; caregiverName: string }> {
  if (IS_DEMO_MODE) {
    await delay(300);
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const d = () => Math.floor(Math.random() * 10);
    return { code: `${l1}${l2}-${d()}${d()}${d()}${d()}`, caregiverName: DEMO_CAREGIVER.name };
  }

  return api.post<{ code: string; caregiverName: string }>('/pairing/generate');
}

export async function getPairingCodes(): Promise<{ code: string; caregiverId: string; caregiverName: string; used: boolean; usedBy: string | null; createdAt: string }[]> {
  if (IS_DEMO_MODE) return [];
  return api.get('/pairing/codes');
}

export async function getConnectedPersons(): Promise<ApiUser[]> {
  if (IS_DEMO_MODE) return [];
  return api.get('/caregiver/connected');
}

export async function sendOtp(email: string): Promise<void> {
  await api.post<{ ok: boolean }>('/auth/send-otp', { email });
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  await api.post<{ ok: boolean }>('/auth/verify-otp', { email, code });
}

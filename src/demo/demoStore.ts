import { useSyncExternalStore } from 'react';
import type {
  ActivityEvent,
  AssistanceRequest,
  DashboardSummary,
  Elder,
  Emergency,
  HomeHub,
  HubEventLogEntry,
  HubEventType,
  NotificationItem,
  Reminder,
  Appointment,
} from '../types';
import { ApiError } from '../services/api';
import { DEMO_CAREGIVER } from './caregiver';
import { DEMO_ELDERS } from './elders';
import { DEMO_HOMEHUBS } from './homehubs';
import { DEMO_EMERGENCIES } from './emergencies';
import { DEMO_REQUESTS } from './requests';
import { DEMO_APPOINTMENTS } from './appointments';
import { DEMO_REMINDERS } from './reminders';
import { DEMO_NOTIFICATIONS } from './notifications';
import { DEMO_ACTIVITY } from './activity';

interface DemoState {
  elders: Elder[];
  hubs: HomeHub[];
  emergencies: Emergency[];
  requests: AssistanceRequest[];
  appointments: Appointment[];
  reminders: Reminder[];
  notifications: NotificationItem[];
  activity: ActivityEvent[];
  hubLog: HubEventLogEntry[];
}

const STORAGE_KEY = 'ea_demo_state_v1';
const STATE_VERSION = 1;

function freshState(): DemoState {
  return {
    elders: structuredClone(DEMO_ELDERS),
    hubs: structuredClone(DEMO_HOMEHUBS),
    emergencies: structuredClone(DEMO_EMERGENCIES),
    requests: structuredClone(DEMO_REQUESTS),
    appointments: structuredClone(DEMO_APPOINTMENTS),
    reminders: structuredClone(DEMO_REMINDERS),
    notifications: structuredClone(DEMO_NOTIFICATIONS),
    activity: structuredClone(DEMO_ACTIVITY),
    hubLog: [
      {
        id: 'log-0',
        deviceId: 'EA-HUB-2411',
        type: 'SYSTEM',
        detail: 'HomeHub checked in. System ready.',
        createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
      },
      {
        id: 'log-1',
        deviceId: 'EA-HUB-1873',
        type: 'SYSTEM',
        detail: 'HomeHub missed scheduled check-in.',
        createdAt: new Date(Date.now() - 372 * 60_000).toISOString(),
      },
    ],
  };
}

function hydrate(): DemoState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as { version: number; state: DemoState };
    if (parsed.version !== STATE_VERSION || !parsed.state?.elders) return freshState();
    return parsed.state;
  } catch {
    return freshState();
  }
}

let state: DemoState = hydrate();
let version = 0;
const listeners = new Set<() => void>();

function persist(): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STATE_VERSION, state }),
    );
  } catch {}
}

function emit(): void {
  version += 1;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion(): number {
  return version;
}

export function useDemoVersion(): number {
  return useSyncExternalStore(subscribe, getVersion);
}

function nextId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function pushActivity(
  draft: DemoState,
  message: string,
  kind: ActivityEvent['kind'],
): void {
  draft.activity = [
    { id: nextId('act'), time: new Date().toISOString(), message, kind },
    ...draft.activity,
  ].slice(0, 40);
}

function pushNotification(
  draft: DemoState,
  item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>,
): void {
  draft.notifications = [
    {
      ...item,
      id: nextId('ntf'),
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...draft.notifications,
  ];
}

export function getDemoElders(): Elder[] {
  return [...state.elders];
}

export function getDemoElder(id: string): Elder | undefined {
  return state.elders.find((e) => e.id === id);
}

export function getDemoEmergencies(): Emergency[] {
  return [...state.emergencies].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getDemoRequests(): AssistanceRequest[] {
  return [...state.requests].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getDemoAppointments(): Appointment[] {
  return [...state.appointments].sort(
    (a, b) => +new Date(a.date) - +new Date(b.date),
  );
}

export function getDemoReminders(): Reminder[] {
  return [...state.reminders].sort(
    (a, b) => +new Date(a.nextTriggerAt) - +new Date(b.nextTriggerAt),
  );
}

export function getDemoNotifications(): NotificationItem[] {
  return [...state.notifications].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function getDemoHubs(): HomeHub[] {
  return [...state.hubs];
}

export function getDemoHub(deviceId: string): HomeHub | undefined {
  return state.hubs.find((h) => h.deviceId === deviceId);
}

export function getDemoActivity(limit = 10): ActivityEvent[] {
  return state.activity.slice(0, limit);
}

export function getDemoHubLog(deviceId?: string): HubEventLogEntry[] {
  const log =
    deviceId == null
      ? state.hubLog
      : state.hubLog.filter((entry) => entry.deviceId === deviceId);
  return [...log]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 8);
}

export function getDemoDashboardSummary(): DashboardSummary {
  return {
    eldersCount: state.elders.length,
    openEmergencies: state.emergencies.filter((e) => e.status === 'OPEN').length,
    pendingRequests: state.requests.filter((r) => r.status === 'PENDING').length,
    hubsOnline: state.hubs.filter((h) => h.online).length,
    hubsTotal: state.hubs.length,
    unreadNotifications: state.notifications.filter((n) => !n.read).length,
    generatedAt: new Date().toISOString(),
  };
}

export function acknowledgeDemoEmergency(id: string): Emergency {
  const emergency = state.emergencies.find((e) => e.id === id);
  if (!emergency) throw new ApiError('Emergency not found.', { status: 404 });
  if (emergency.status !== 'OPEN') {
    throw new ApiError(
      `This emergency was already ${emergency.status.toLowerCase()} by ${
        emergency.acknowledgedBy ?? 'someone on your care team'
      }.`,
      { status: 409 },
    );
  }
  const updated: Emergency = {
    ...emergency,
    status: 'ACKNOWLEDGED',
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: DEMO_CAREGIVER.name,
  };
  state = {
    ...state,
    emergencies: state.emergencies.map((e) => (e.id === id ? updated : e)),
  };
  pushActivity(state, `Emergency acknowledged — ${updated.elderName}.`, 'SUCCESS');
  emit();
  return updated;
}

export function markDemoNotificationRead(id: string): NotificationItem {
  const target = state.notifications.find((n) => n.id === id);
  if (!target) throw new ApiError('Notification not found.', { status: 404 });
  if (target.read) return target;
  const updated = { ...target, read: true };
  state = {
    ...state,
    notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
  };
  emit();
  return updated;
}

export function markAllDemoNotificationsRead(): void {
  state = {
    ...state,
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  };
  emit();
}

function logEvent(
  draft: DemoState,
  deviceId: string,
  type: HubEventType | 'SYSTEM',
  detail: string,
): void {
  draft.hubLog = [
    {
      id: nextId('log'),
      deviceId,
      type,
      detail,
      createdAt: new Date().toISOString(),
    },
    ...draft.hubLog,
  ].slice(0, 30);
}

export function sendDemoHubEvent(
  deviceId: string,
  event: { type: HubEventType },
): { message: string; emergencyId?: string } {
  const hub = state.hubs.find((h) => h.deviceId === deviceId);
  if (!hub) throw new ApiError('HomeHub not found.', { status: 404 });
  if (!hub.online) {
    throw new ApiError(
      `${hub.name} is offline, so this button press cannot be delivered.`,
      { status: 409 },
    );
  }

  const elder =
    hub.linkedElderId != null
      ? state.elders.find((e) => e.id === hub.linkedElderId)
      : undefined;

  if (event.type === 'HELP_PRESSED') {
    if (!elder) throw new ApiError('This HomeHub has no linked elder.', { status: 409 });
    const emergency: Emergency = {
      id: nextId('EMG'),
      elderId: elder.id,
      elderName: elder.name,
      deviceId: hub.deviceId,
      description: 'Help requested from HomeHub',
      voiceText: null,
      voiceAudio: null,
      source: 'HOMEHUB',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
    };
    const draft: DemoState = {
      ...state,
      elders: state.elders.map((e) =>
        e.id === elder.id
          ? { ...e, status: 'EMERGENCY', lastActivityAt: emergency.createdAt }
          : e,
      ),
      emergencies: [emergency, ...state.emergencies],
    };
    pushActivity(draft, `${elder.name} pressed HELP on the HomeHub.`, 'DANGER');
    pushNotification(draft, {
      type: 'EMERGENCY',
      title: 'Emergency — help requested',
      body: `${elder.name} pressed the HELP button on ${hub.name}.`,
      related: { kind: 'EMERGENCY', id: emergency.id },
    });
    logEvent(draft, hub.deviceId, 'HELP_PRESSED', `Help alert raised for ${elder.name}.`);
    state = draft;
    emit();
    return { message: 'Help alert sent to your care team.', emergencyId: emergency.id };
  }

  if (event.type === 'FAMILY_PRESSED') {
    if (!elder) throw new ApiError('This HomeHub has no linked elder.', { status: 409 });
    const request: AssistanceRequest = {
      id: nextId('REQ'),
      elderId: elder.id,
      elderName: elder.name,
      message: `${elder.name} asked the family to call.`,
      category: 'FAMILY_CONTACT',
      status: 'PENDING',
      source: 'HOMEHUB',
      createdAt: new Date().toISOString(),
    };
    const draft: DemoState = { ...state, requests: [request, ...state.requests] };
    pushActivity(draft, `${elder.name} pressed FAMILY on the HomeHub.`, 'INFO');
    pushNotification(draft, {
      type: 'REQUEST',
      title: 'Family contact request',
      body: `${elder.name} would like a call from the family.`,
      related: { kind: 'REQUEST', id: request.id },
    });
    logEvent(draft, hub.deviceId, 'FAMILY_PRESSED', `Family contact requested by ${elder.name}.`);
    state = draft;
    emit();
    return { message: 'Family contact request created.' };
  }

  const openForDevice = state.emergencies
    .filter((e) => e.deviceId === deviceId && e.status === 'OPEN')
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];

  if (!openForDevice) {
    logEvent(state, hub.deviceId, 'CANCEL_PRESSED', 'Cancel pressed with no active alert.');
    emit();
    throw new ApiError('There is no active help alert to cancel for this HomeHub.', {
      status: 409,
    });
  }

  const cancelled: Emergency = {
    ...openForDevice,
    status: 'CANCELLED',
    resolvedAt: new Date().toISOString(),
  };
  const draft: DemoState = {
    ...state,
    emergencies: state.emergencies.map((e) =>
      e.id === openForDevice.id ? cancelled : e,
    ),
    elders:
      openForDevice.elderId != null
        ? recomputeElderStatus(state, openForDevice.elderId)
        : state.elders,
  };
  pushActivity(draft, `Help alert cancelled at the HomeHub — ${cancelled.elderName}.`, 'WARNING');
  logEvent(draft, hub.deviceId, 'CANCEL_PRESSED', `Help alert cancelled for ${cancelled.elderName}.`);
  state = draft;
  emit();
  return { message: 'Help alert cancelled.' };
}

function recomputeElderStatus(current: DemoState, elderId: string): Elder[] {
  const elder = current.elders.find((e) => e.id === elderId);
  if (!elder) return current.elders;
  const others = current.emergencies.filter((e) => e.elderId === elderId);
  let nextStatus: Elder['status'];
  if (others.some((e) => e.status === 'OPEN')) {
    nextStatus = 'EMERGENCY';
  } else if (
    others.some((e) => e.status === 'ACKNOWLEDGED' || e.status === 'ESCALATED')
  ) {
    nextStatus = 'ATTENTION';
  } else if (elder.homeHub?.online) {
    nextStatus = 'SAFE';
  } else {
    nextStatus = 'OFFLINE';
  }
  return current.elders.map((e) =>
    e.id === elderId
      ? { ...e, status: nextStatus, lastActivityAt: new Date().toISOString() }
      : e,
  );
}

export function resetDemoState(): void {
  state = freshState();
  emit();
}

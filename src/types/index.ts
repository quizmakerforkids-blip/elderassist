export type AppRole = 'caregiver' | 'cared';

export type ElderStatus = 'SAFE' | 'ATTENTION' | 'OFFLINE' | 'EMERGENCY';

export type DeviceStatus = 'ONLINE' | 'OFFLINE';

export type EmergencyStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CANCELLED';

export type EmergencySource = 'HOMEHUB' | 'BASIC_PHONE' | 'VOICE_ASSISTANT' | 'DASHBOARD';

export type RequestCategory =
  | 'GENERAL_HELP'
  | 'APPOINTMENT'
  | 'REMINDER'
  | 'FAMILY_CONTACT'
  | 'GOVERNMENT_SERVICE'
  | 'EMERGENCY'
  | 'INFORMATION';

export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';

export type RequestSource =
  | 'HOMEHUB'
  | 'BASIC_PHONE'
  | 'VOICE_ASSISTANT'
  | 'DASHBOARD';

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED';

export type ReminderFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM';

export type ReminderStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type NotificationType =
  | 'EMERGENCY'
  | 'APPOINTMENT'
  | 'HOMEHUB'
  | 'REQUEST'
  | 'SYSTEM';

export type HubEventType = 'HELP_PRESSED' | 'FAMILY_PRESSED' | 'CANCEL_PRESSED';

export interface CareTeamMember {
  name: string;
  role: string;
  isPrimary: boolean;
}

export interface HomeHub {
  deviceId: string;
  name: string;
  model: string;
  firmwareVersion: string;
  online: boolean;
  batteryLevel: number | null;
  lastSeenAt: string;
  signalStrength: number | null;
  linkedElderId: string | null;
  linkedElderName: string | null;
}

export interface Elder {
  id: string;
  name: string;
  age: number;
  status: ElderStatus;
  preferredLanguage: string;
  phone: string;
  city: string;
  lastActivityAt: string;
  alertsCount: number;
  careTeam: CareTeamMember[];
  homeHub: HomeHub | null;
}

export interface Emergency {
  id: string;
  elderId: string;
  elderName: string;
  deviceId: string | null;
  description: string;
  voiceText: string | null;
  voiceAudio: string | null;
  source: EmergencySource;
  status: EmergencyStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
}

export interface AssistanceRequest {
  id: string;
  elderId: string;
  elderName: string;
  message: string;
  category: RequestCategory;
  status: RequestStatus;
  source: RequestSource;
  createdAt: string;
}

export interface Appointment {
  id: string;
  elderId: string;
  elderName: string;
  title: string;
  provider: string;
  location: string | null;
  date: string;
  status: AppointmentStatus;
  notes: string | null;
}

export interface Reminder {
  id: string;
  elderId: string;
  elderName: string;
  title: string;
  timeOfDay: string;
  nextTriggerAt: string;
  frequency: ReminderFrequency;
  status: ReminderStatus;
}

export interface RelatedRef {
  kind: 'EMERGENCY' | 'REQUEST' | 'APPOINTMENT' | 'HOMEHUB' | 'ELDER';
  id: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  related: RelatedRef | null;
}

export interface DashboardSummary {
  eldersCount: number;
  openEmergencies: number;
  pendingRequests: number;
  hubsOnline: number;
  hubsTotal: number;
  unreadNotifications: number;
  generatedAt: string;
}

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CaredPerson {
  id: string;
  name: string;
  age: number;
  email: string;
  phone: string;
  city: string;
  preferredLanguage: string;
  status: ElderStatus;
  linkedCaregiverId: string | null;
  linkedCaregiverName: string | null;
  pairingCode: string | null;
}

export interface PairingRequest {
  code: string;
  caregiverId: string;
  caregiverName: string;
  createdAt: string;
  used: boolean;
  usedBy: string | null;
}

export type AppUser = Caregiver | CaredPerson;

export type ActivityKind = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

export interface ActivityEvent {
  id: string;
  time: string;
  message: string;
  kind: ActivityKind;
}

export interface HubEventLogEntry {
  id: string;
  deviceId: string;
  type: HubEventType | 'SYSTEM';
  detail: string;
  createdAt: string;
}

export interface SendHubEventResult {
  message: string;
  emergencyId?: string;
}

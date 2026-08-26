import type { HomeHub } from '../types';
import { ago } from './time';

export const DEMO_HOMEHUBS: HomeHub[] = [
  {
    deviceId: 'EA-HUB-2411',
    name: "Lakshmi's HomeHub",
    model: 'ElderAssist Hub · Gen 2',
    firmwareVersion: '2.4.1',
    online: true,
    batteryLevel: 82,
    lastSeenAt: ago(2),
    signalStrength: 78,
    linkedElderId: 'eld-01',
    linkedElderName: 'Lakshmi Rao',
  },
  {
    deviceId: 'EA-HUB-1873',
    name: "Raman's HomeHub",
    model: 'ElderAssist Hub · Gen 2',
    firmwareVersion: '2.3.9',
    online: false,
    batteryLevel: 17,
    lastSeenAt: ago(372),
    signalStrength: null,
    linkedElderId: 'eld-02',
    linkedElderName: 'Raman Kumar',
  },
];

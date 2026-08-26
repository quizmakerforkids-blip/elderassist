import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createTransport } from 'nodemailer';
import { chat, chatAsync, reloadKnowledge, getStats, setDb } from './ai/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_FILE = join(__dirname, 'data.json');
const API_PROXY = process.env.API_PROXY || '';

// --------------- email (Gmail OTP) ---------------

const SMTP_HOST     = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT     = Number(process.env.SMTP_PORT || 465);
const SMTP_USER     = process.env.SMTP_USER || '';
const SMTP_PASS     = process.env.SMTP_PASS || '';
const SMTP_FROM     = process.env.SMTP_FROM || SMTP_USER || 'ElderAssist <noreply@elderassist.app>';
const HAS_SMTP      = Boolean(SMTP_USER && SMTP_PASS);

let transporter = null;
if (HAS_SMTP) {
  transporter = createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

// OTP store: { email: { code, expiresAt } }
const otpStore = new Map();
function generateOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }
function otpExpiry() { return Date.now() + 10 * 60 * 1000; } // 10 minutes

async function sendOTPEmail(email, code) {
  if (HAS_SMTP && transporter) {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'ElderAssist — Your Verification Code',
      text: `Your ElderAssist verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#f8f7f4;border-radius:12px;">
        <h2 style="color:#0077b6;margin:0 0 16px;">ElderAssist</h2>
        <p style="font-size:15px;color:#334155;">Your verification code is:</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#0077b6;text-align:center;padding:16px 0;">${code}</div>
        <p style="font-size:13px;color:#94a3b8;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>`,
    });
  } else {
    console.log(`\n====== VERIFICATION CODE for ${email}: ${code} ======\n`);
  }
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

// --------------- API proxy (cared service → caregiver service) ---------------
if (API_PROXY) {
  const proxyBase = API_PROXY.replace(/\/+$/, '');
  app.all('/api/{*splat}', async (req, res) => {
    try {
      const targetUrl = `${proxyBase}${req.originalUrl}`;
      const fetchOpts = { method: req.method, headers: { ...req.headers, host: new URL(proxyBase).host }, signal: AbortSignal.timeout(30000) };
      if (!['GET', 'HEAD'].includes(req.method)) fetchOpts.body = JSON.stringify(req.body);
      const proxyRes = await fetch(targetUrl, fetchOpts);
      const contentType = proxyRes.headers.get('content-type') || 'application/json';
      res.status(proxyRes.status).set('content-type', contentType);
      if (contentType.includes('json')) { res.json(await proxyRes.json()); }
      else { res.send(await proxyRes.text()); }
    } catch (err) {
      console.error('Proxy error:', err);
      res.status(502).json({ error: 'API proxy unavailable.' });
    }
  });
  console.log(`API proxy active → ${API_PROXY}`);
}

// --------------- data store ---------------

function loadData() {
  if (!existsSync(DATA_FILE)) {
    return { users: [], pairingCodes: [], emergencies: [], hubs: [], hubEvents: [], locations: {} };
  }
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    if (!raw.hubs) raw.hubs = [];
    if (!raw.hubEvents) raw.hubEvents = [];
    if (!raw.locations) raw.locations = {};
    return raw;
  } catch {
    return { users: [], pairingCodes: [], emergencies: [], hubs: [], hubEvents: [], locations: {} };
  }
}

function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

function nextId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function generatePairingCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const d = () => Math.floor(Math.random() * 10);
  return `${l1}${l2}-${d()}${d()}${d()}${d()}`;
}

function getUser(req) {
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  return db.users.find(u => u.id === userId) || null;
}

// --------------- health ---------------

app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true });
});

// --------------- auth ---------------

app.post('/api/v1/auth/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required.' });
    }
    if (role !== 'caregiver' && role !== 'cared') {
      return res.status(400).json({ error: 'Role must be "caregiver" or "cared".' });
    }
    const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const user = {
      id: nextId(role === 'caregiver' ? 'crg' : 'eld'),
      name,
      email: email.toLowerCase(),
      password,
      role,
      emailVerified: false,
      linkedCaregiverId: null,
      linkedCaregiverName: null,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);

    // Auto-create a virtual HomeHub for the cared person
    if (role === 'cared') {
      const hubId = `EA-HUB-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      db.hubs.push({
        deviceId: hubId,
        name: `${name}'s HomeHub`,
        model: 'EA-VirtualHub-1',
        firmwareVersion: '1.0.0',
        online: true,
        batteryLevel: null,
        lastSeenAt: new Date().toISOString(),
        signalStrength: 85,
        linkedElderId: user.id,
        linkedElderName: name,
      });
    }

    saveData(db);
    const { password: _, ...safe } = user;
    return res.status(201).json(safe);
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = db.users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.emailVerified === false) {
      return res.status(403).json({ error: 'Please verify your email before signing in.', needsVerification: true });
    }
    const { password: _, ...safe } = user;
    return res.json(safe);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- OTP email verification ---------------

app.post('/api/v1/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const code = generateOTP();
    otpStore.set(email.toLowerCase(), { code, expiresAt: otpExpiry() });
    await sendOTPEmail(email, code);
    return res.json({ ok: true, message: 'Verification code sent.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Failed to send verification code.' });
  }
});

app.post('/api/v1/auth/verify-otp', (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });
    const entry = otpStore.get(email.toLowerCase());
    if (!entry) return res.status(400).json({ error: 'No verification code requested for this email.' });
    if (Date.now() > entry.expiresAt) { otpStore.delete(email.toLowerCase()); return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' }); }
    if (entry.code !== code) return res.status(400).json({ error: 'Incorrect verification code.' });
    otpStore.delete(email.toLowerCase());
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) { user.emailVerified = true; saveData(db); }
    return res.json({ ok: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

// --------------- profile ---------------

app.get('/api/v1/profile', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const { password: _, ...safe } = user;
    return res.json(safe);
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- pairing ---------------

app.post('/api/v1/pairing/generate', (req, res) => {
  try {
    const user = getUser(req);
    if (!user || user.role !== 'caregiver') {
      return res.status(403).json({ error: 'Only caregivers can generate pairing codes.' });
    }
    const code = generatePairingCode();
    db.pairingCodes.push({
      code,
      caregiverId: user.id,
      caregiverName: user.name,
      used: false,
      usedBy: null,
      createdAt: new Date().toISOString(),
    });
    saveData(db);
    return res.json({ code, caregiverName: user.name });
  } catch (err) {
    console.error('Pairing generate error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/v1/pairing/codes', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const codes = db.pairingCodes.filter(c => c.caregiverId === user.id);
    return res.json(codes);
  } catch (err) {
    console.error('Pairing codes error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/pairing/connect', (req, res) => {
  try {
    const user = getUser(req);
    if (!user || user.role !== 'cared') {
      return res.status(403).json({ error: 'Only cared persons can use a pairing code.' });
    }
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Pairing code is required.' });
    const pairing = db.pairingCodes.find(
      c => c.code.toUpperCase() === code.toUpperCase() && !c.used,
    );
    if (!pairing) {
      return res.status(404).json({ error: 'Invalid or already used pairing code.' });
    }
    pairing.used = true;
    pairing.usedBy = user.id;
    user.linkedCaregiverId = pairing.caregiverId;
    user.linkedCaregiverName = pairing.caregiverName;
    saveData(db);
    return res.json({ caregiverName: pairing.caregiverName });
  } catch (err) {
    console.error('Pairing connect error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- connected people ---------------

app.get('/api/v1/caregiver/connected', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const connected = db.users.filter(u => u.linkedCaregiverId === user.id);
    return res.json(connected.map(u => {
      const { password: _, ...safe } = u;
      return safe;
    }));
  } catch (err) {
    console.error('Connected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- emergencies ---------------

app.get('/api/v1/emergencies', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    let emergencies;
    if (user.role === 'caregiver') {
      const connectedIds = db.users
        .filter(u => u.linkedCaregiverId === user.id)
        .map(u => u.id);
      emergencies = db.emergencies.filter(
        e => connectedIds.includes(e.elderId) || e.createdBy === user.id,
      );
    } else {
      emergencies = db.emergencies.filter(
        e => e.elderId === user.id || e.createdBy === user.id,
      );
    }
    const sorted = emergencies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(sorted.map(e => {
      const { voiceAudio, ...rest } = e;
      return voiceAudio ? { ...rest, voiceAudio } : rest;
    }));
  } catch (err) {
    console.error('Get emergencies error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/v1/emergencies/:id', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const emg = db.emergencies.find(e => e.id === req.params.id);
    if (!emg) return res.status(404).json({ error: 'Emergency not found.' });
    return res.json(emg);
  } catch (err) {
    console.error('Get emergency error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/emergencies', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    const { description, voiceText, voiceAudio } = req.body || {};
    const finalDesc = description || voiceText || 'Help requested';

    const emergency = {
      id: nextId('EMG'),
      elderId: user.id,
      elderName: user.name,
      description: finalDesc,
      voiceText: voiceText || null,
      voiceAudio: voiceAudio || null,
      source: 'DASHBOARD',
      status: 'OPEN',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
    };
    db.emergencies.push(emergency);
    saveData(db);
    const { voiceAudio: _, ...safe } = emergency;
    return res.status(201).json({ ...safe, voiceAudio: emergency.voiceAudio });
  } catch (err) {
    console.error('Create emergency error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/emergencies/:id/acknowledge', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    const emg = db.emergencies.find(e => e.id === req.params.id);
    if (!emg) return res.status(404).json({ error: 'Emergency not found.' });
    if (emg.status !== 'OPEN') {
      return res.status(409).json({ error: `Already ${emg.status.toLowerCase()}.` });
    }
    emg.status = 'ACKNOWLEDGED';
    emg.acknowledgedAt = new Date().toISOString();
    emg.acknowledgedBy = user.name;
    saveData(db);
    return res.json(emg);
  } catch (err) {
    console.error('Acknowledge emergency error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/emergencies/:id/resolve', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const emg = db.emergencies.find(e => e.id === req.params.id);
    if (!emg) return res.status(404).json({ error: 'Emergency not found.' });
    emg.status = 'RESOLVED';
    emg.resolvedAt = new Date().toISOString();
    saveData(db);
    return res.json(emg);
  } catch (err) {
    console.error('Resolve emergency error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- notifications ---------------

app.get('/api/v1/notifications', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    let emergencies;
    if (user.role === 'caregiver') {
      const connectedIds = db.users
        .filter(u => u.linkedCaregiverId === user.id)
        .map(u => u.id);
      emergencies = db.emergencies.filter(e => connectedIds.includes(e.elderId));
    } else {
      emergencies = db.emergencies.filter(e => e.elderId === user.id);
    }

    const notifications = emergencies.map(e => ({
      id: `ntf-${e.id}`,
      type: 'EMERGENCY',
      title: e.status === 'OPEN' ? 'Emergency — help needed' : `Emergency ${e.status.toLowerCase()}`,
      body: `${e.elderName}: ${e.description}`,
      createdAt: e.createdAt,
      read: e.status !== 'OPEN',
    }));
    return res.json(notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    console.error('Notifications error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- requests, appointments, reminders ---------------

app.get('/api/v1/requests', (_req, res) => res.json([]));
app.get('/api/v1/appointments', (_req, res) => res.json([]));
app.get('/api/v1/reminders', (_req, res) => res.json([]));

// --------------- elders (caregiver) ---------------

app.get('/api/v1/elders', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const connected = db.users.filter(u => u.linkedCaregiverId === user.id && u.role === 'cared');
    return res.json(connected.map(u => {
      const hub = db.hubs.find(h => h.linkedElderId === u.id);
      return {
        id: u.id,
        name: u.name,
        age: 72,
        status: db.emergencies.some(e => e.elderId === u.id && e.status === 'OPEN') ? 'EMERGENCY' : 'SAFE',
        preferredLanguage: 'en',
        phone: '',
        city: '',
        lastActivityAt: u.createdAt,
        alertsCount: db.emergencies.filter(e => e.elderId === u.id && e.status === 'OPEN').length,
        careTeam: [{ name: u.linkedCaregiverName, role: 'Primary caregiver', isPrimary: true }],
        homeHub: hub || null,
      };
    }));
  } catch (err) {
    console.error('Elders error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/v1/elders/:id', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const elder = db.users.find(u => u.id === req.params.id);
    if (!elder || elder.role !== 'cared') {
      return res.status(404).json({ error: 'Elder not found.' });
    }
    if (user.role === 'caregiver' && elder.linkedCaregiverId !== user.id) {
      return res.status(403).json({ error: 'You are not linked to this person.' });
    }
    if (user.role === 'cared' && elder.id !== user.id) {
      return res.status(403).json({ error: 'You can only view your own profile.' });
    }
    const hub = db.hubs.find(h => h.linkedElderId === elder.id);
    return res.json({
      id: elder.id,
      name: elder.name,
      age: 72,
      status: db.emergencies.some(e => e.elderId === elder.id && e.status === 'OPEN') ? 'EMERGENCY' : 'SAFE',
      preferredLanguage: 'en',
      phone: '',
      city: '',
      lastActivityAt: elder.createdAt,
      alertsCount: db.emergencies.filter(e => e.elderId === elder.id && e.status === 'OPEN').length,
      careTeam: [{ name: elder.linkedCaregiverName, role: 'Primary caregiver', isPrimary: true }],
      homeHub: hub || null,
    });
  } catch (err) {
    console.error('Get elder error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- homehub (virtual) ---------------

app.get('/api/v1/homehub', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    let hubs;
    if (user.role === 'caregiver') {
      const connectedIds = db.users
        .filter(u => u.linkedCaregiverId === user.id)
        .map(u => u.id);
      hubs = db.hubs.filter(h => connectedIds.includes(h.linkedElderId));
    } else {
      hubs = db.hubs.filter(h => h.linkedElderId === user.id);
    }
    return res.json(hubs.map(h => ({ ...h, lastSeenAt: new Date().toISOString() })));
  } catch (err) {
    console.error('Get hubs error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/v1/homehub/:deviceId', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const hub = db.hubs.find(h => h.deviceId === req.params.deviceId);
    if (!hub) return res.status(404).json({ error: 'HomeHub not found.' });
    return res.json({ ...hub, lastSeenAt: new Date().toISOString() });
  } catch (err) {
    console.error('Get hub error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/homehub/:deviceId/events', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    const hub = db.hubs.find(h => h.deviceId === req.params.deviceId);
    if (!hub) return res.status(404).json({ error: 'HomeHub not found.' });

    const { type } = req.body || {};
    if (!type) return res.status(400).json({ error: 'Event type is required.' });

    const elder = db.users.find(u => u.id === hub.linkedElderId);

    const event = {
      id: nextId('HEV'),
      deviceId: hub.deviceId,
      type,
      detail: type === 'HELP_PRESSED'
        ? 'HELP button pressed on HomeHub'
        : type === 'FAMILY_PRESSED'
        ? 'FAMILY button pressed on HomeHub'
        : 'CANCEL button pressed on HomeHub',
      createdAt: new Date().toISOString(),
    };
    db.hubEvents.push(event);

    let emergencyId = undefined;
    if (type === 'HELP_PRESSED' && elder) {
      const emergency = {
        id: nextId('EMG'),
        elderId: elder.id,
        elderName: elder.name,
        description: 'Help requested from HomeHub',
        voiceText: null,
        voiceAudio: null,
        source: 'HOMEHUB',
        status: 'OPEN',
        createdBy: elder.id,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
      };
      db.emergencies.push(emergency);
      emergencyId = emergency.id;
    }

    saveData(db);
    return res.json({
      message: type === 'HELP_PRESSED'
        ? 'Emergency created. Your caregiver has been alerted.'
        : type === 'FAMILY_PRESSED'
        ? 'Family call request sent.'
        : 'Event cancelled.',
      emergencyId,
    });
  } catch (err) {
    console.error('Hub event error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/api/v1/homehub/:deviceId/events', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });
    const events = db.hubEvents
      .filter(e => e.deviceId === req.params.deviceId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(events);
  } catch (err) {
    console.error('Hub events error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- dashboard summary ---------------

app.get('/api/v1/dashboard/summary', (req, res) => {
  try {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    if (user.role === 'caregiver') {
      const connectedIds = db.users
        .filter(u => u.linkedCaregiverId === user.id)
        .map(u => u.id);
      const openEmergencies = db.emergencies.filter(
        e => connectedIds.includes(e.elderId) && e.status === 'OPEN',
      ).length;
      const hubs = db.hubs.filter(h => connectedIds.includes(h.linkedElderId));
      const hubsOnline = hubs.filter(h => h.online).length;
      return res.json({
        eldersCount: connectedIds.length,
        openEmergencies,
        pendingRequests: 0,
        hubsOnline,
        hubsTotal: hubs.length,
        unreadNotifications: openEmergencies,
        generatedAt: new Date().toISOString(),
      });
    }

    const myEmergencies = db.emergencies.filter(e => e.elderId === user.id && e.status === 'OPEN').length;
    const myHubs = db.hubs.filter(h => h.linkedElderId === user.id);
    return res.json({
      eldersCount: 1,
      openEmergencies: myEmergencies,
      pendingRequests: 0,
      hubsOnline: myHubs.filter(h => h.online).length,
      hubsTotal: myHubs.length,
      unreadNotifications: myEmergencies,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// --------------- ai assistant ---------------

app.post('/api/v1/ai/chat', async (req, res) => {
  try {
    const user = getUser(req);
    const { message, context } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    setDb(db);
    const role = user?.role || 'cared';
    const chatContext = {
      ...context,
      userName: user?.name,
    };

    const result = await chatAsync(message, role, chatContext, user?.id);
    return res.json(result);
  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: 'AI service unavailable.', response: "Something went wrong. Please try again." });
  }
});

app.get('/api/v1/ai/stats', (_req, res) => {
  try {
    const stats = getStats();
    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: 'Could not get stats.' });
  }
});

app.post('/api/v1/ai/train', (_req, res) => {
  try {
    const count = reloadKnowledge();
    return res.json({ ok: true, intentsLoaded: count });
  } catch (err) {
    console.error('AI train error:', err);
    return res.status(500).json({ error: 'Training failed.' });
  }
});

// --------------- locations ---------------

app.post('/api/v1/locations/share', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    const { lat, lng, accuracy } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Invalid coordinates.' });
    }
    db.locations[userId] = { lat, lng, accuracy: accuracy || null, timestamp: Date.now() };
    saveData(db);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Location share error:', err);
    return res.status(500).json({ error: 'Failed to share location.' });
  }
});

app.get('/api/v1/locations/:userId', (req, res) => {
  try {
    const viewerId = req.headers['x-user-id'];
    if (!viewerId) return res.status(401).json({ error: 'Not authenticated.' });
    const targetId = req.params.userId;
    const viewer = db.users.find((u) => u.id === viewerId);
    if (!viewer) return res.status(404).json({ error: 'User not found.' });
    // caregiver can see cared person's location, or person can see their own
    if (viewer.role !== 'caregiver' && viewerId !== targetId) {
      return res.status(403).json({ error: 'Not authorized to view this location.' });
    }
    // if caregiver, verify they are connected to this person
    if (viewer.role === 'caregiver' && viewerId !== targetId) {
      const target = db.users.find((u) => u.id === targetId);
      const connected = (viewer.connectedPersons || []).includes(targetId)
        || (target && target.linkedCaregiverId === viewerId);
      if (!connected) return res.status(403).json({ error: 'Not connected to this person.' });
    }
    const loc = db.locations[targetId];
    if (!loc) return res.json({ location: null });
    // location expires after 2 hours
    if (Date.now() - loc.timestamp > 2 * 60 * 60 * 1000) {
      return res.json({ location: null, reason: 'expired' });
    }
    return res.json({ location: loc });
  } catch (err) {
    console.error('Location fetch error:', err);
    return res.status(500).json({ error: 'Failed to get location.' });
  }
});

// --------------- start ---------------

// --- Serve static frontends (production / Render) ---
const caregiverDist = join(ROOT, 'dist', 'caregiver');
const caredDist     = join(ROOT, 'dist', 'cared');
const APP_ROLE      = (process.env.APP_ROLE || '').toLowerCase();

if (APP_ROLE === 'caregiver' && existsSync(caregiverDist)) {
  app.use(express.static(caregiverDist));
  app.get('/{*splat}', (_, res) => res.sendFile(join(caregiverDist, 'index.html')));
} else if (APP_ROLE === 'cared' && existsSync(caredDist)) {
  app.use(express.static(caredDist));
  app.get('/{*splat}', (_, res) => res.sendFile(join(caredDist, 'index.html')));
} else {
  // Local dev / combined: both frontends under prefixes
  if (existsSync(caregiverDist)) {
    app.use('/caregiver', express.static(caregiverDist));
    app.get('/caregiver/{*splat}', (_, res) => res.sendFile(join(caregiverDist, 'index.html')));
  }
  if (existsSync(caredDist)) {
    app.use('/cared', express.static(caredDist));
    app.get('/cared/{*splat}', (_, res) => res.sendFile(join(caredDist, 'index.html')));
  }
  app.get('/', (_, res) => res.redirect('/caregiver'));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ElderAssist backend running on http://localhost:${PORT} (role=${APP_ROLE || 'combined'})`);
});

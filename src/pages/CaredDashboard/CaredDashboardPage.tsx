import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTimestamp, greeting } from '../../utils/format';
import { useAuth } from '../../app/providers/AuthProvider';
import { useApiData } from '../../hooks/useApiData';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { getEmergencies } from '../../services/emergencies';
import { getRequests } from '../../services/requests';
import { api } from '../../services/api';
import type { CaredPerson, Emergency } from '../../types';
import { PageHeader } from '../../components/navigation/PageHeader';
import { Card, SectionCard } from '../../components/cards/Card';
import { Button } from '../../components/buttons/Button';
import { Icon } from '../../components/icons/Icon';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';
import { Modal } from '../../components/modals/Modal';
import { Field } from '../../components/buttons/Controls';
import { PairingModal } from '../../components/connect/PairingModal';
import { useToast } from '../../app/providers/ToastProvider';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CaregiverInfo({ cared }: { cared: CaredPerson }) {
  if (!cared.linkedCaregiverName) {
    return (
      <SectionCard title="Your caregiver">
        <div className="state-block" style={{ padding: '26px 16px' }}>
          <span className="state-block__icon state-block__icon--empty" aria-hidden="true">
            <Icon name="users" size={24} />
          </span>
          <span className="state-block__title">No caregiver linked yet</span>
          <span className="state-block__desc">
            Enter a pairing code from your caregiver to connect.
          </span>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Your caregiver">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div className="tile-icon tile-icon--accent">
          <Icon name="users" size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{cared.linkedCaregiverName}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Primary caregiver</div>
        </div>
      </div>
      <div className="meta-list" style={{ marginTop: 14 }}>
        <span className="meta-item">
          <Icon name="shield-check" size={18} />
          <span>Your caregiver can see your status and alerts</span>
        </span>
        <span className="meta-item">
          <Icon name="bell" size={18} />
          <span>You will be notified of any actions taken</span>
        </span>
      </div>
    </SectionCard>
  );
}

const QUICK_REASONS = [
  'Fell down',
  'Chest pain',
  "Can't breathe",
  'Feeling dizzy',
  'Medication issue',
  'Need a doctor',
];

function ReportEmergencyModal({
  open,
  onClose,
  onReported,
}: {
  open: boolean;
  onClose: () => void;
  onReported: () => void;
}) {
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { push } = useToast();
  const voice = useVoiceRecorder();

  const hasAudio = voice.state === 'done' && voice.audioBase64;
  const activeText = description.trim();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeText && !hasAudio) return;
    setConfirm(true);
  };

  const doSend = async () => {
    setSending(true);
    try {
      await api.post('/emergencies', {
        description: activeText || 'Voice message from emergency report',
        voiceAudio: voice.audioBase64 || null,
      });
      push({
        tone: 'success',
        title: 'Help alert sent',
        message: 'Your caregiver has been notified. Help is on the way.',
      });
      setConfirm(false);
      setDescription('');
      voice.reset();
      onReported();
      onClose();
    } catch {
      push({
        tone: 'error',
        title: 'Failed to send alert',
        message: 'Please try again or contact your caregiver directly.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Report an emergency"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleSubmit} disabled={!activeText && !hasAudio}>
              <Icon name="siren" size={16} />
              Send Help Alert
            </Button>
          </>
        }
      >
        <p style={{ marginBottom: 14 }}>
          Describe what is happening or record a voice message so your caregiver can help you better.
        </p>

        <Field label="What's wrong?" htmlFor="emergency-desc">
          <textarea
            id="emergency-desc"
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type your emergency message..."
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </Field>

        <div style={{ marginTop: 14 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Or record a voice message</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {voice.state === 'idle' && (
              <Button variant="secondary" onClick={voice.startRecording}>
                <Icon name="siren" size={16} />
                Start recording
              </Button>
            )}
            {voice.state === 'recording' && (
              <>
                <Button variant="danger" onClick={voice.stopRecording}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#fff',
                      display: 'inline-block',
                      animation: 'pulse 1s ease-in-out infinite',
                    }}
                  />
                  Stop ({formatDuration(voice.duration)})
                </Button>
                <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Recording...
                </span>
              </>
            )}
            {voice.state === 'done' && hasAudio && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <audio controls src={voice.audioUrl!} style={{ flex: 1, height: 36 }} />
                <Button variant="ghost" size="sm" onClick={voice.reset}>
                  <Icon name="close" size={14} />
                  Remove
                </Button>
              </div>
            )}
          </div>
          {voice.error && (
            <div
              style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
              }}
            >
              {voice.error}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Quick select</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className={`chip${description === reason ? ' is-active' : ''}`}
                onClick={() => setDescription(reason)}
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        title="Send emergency alert?"
        message={
          hasAudio
            ? `Send voice message${activeText ? ` with note: "${activeText}"` : ''}?`
            : `Your caregiver will be notified: "${activeText}". Send now?`
        }
        confirmLabel="Send Alert"
        danger
        onConfirm={doSend}
        onCancel={() => setConfirm(false)}
        loading={sending}
      />
    </>
  );
}

function StatusCard({ cared }: { cared: CaredPerson }) {
  const statusMap = {
    SAFE: { label: 'All good', icon: 'shield-check' as const, tone: 'stat-card' },
    ATTENTION: { label: 'Needs attention', icon: 'warning' as const, tone: 'stat-card--warning' },
    OFFLINE: { label: 'Offline', icon: 'radio' as const, tone: '' },
    EMERGENCY: { label: 'Emergency', icon: 'siren' as const, tone: 'stat-card--danger' },
  };
  const info = statusMap[cared.status];

  return (
    <Card className={`stat-card ${info.tone}`}>
      <span className="stat-card__icon">
        <Icon name={info.icon} size={22} />
      </span>
      <span>
        <span className="stat-card__label" style={{ display: 'block' }}>
          Your status
        </span>
        <span className="stat-card__value" style={{ display: 'block' }}>
          {info.label}
        </span>
      </span>
    </Card>
  );
}

function EmergencyRow({ emg }: { emg: Emergency }) {
  const statusStyles: Record<string, string> = {
    OPEN: 'badge--danger',
    ACKNOWLEDGED: 'badge--attention',
    RESOLVED: 'badge--safe',
    CANCELLED: 'badge--neutral',
  };

  const statusLabels: Record<string, string> = {
    OPEN: 'Active',
    ACKNOWLEDGED: 'Being handled',
    RESOLVED: 'Resolved',
    CANCELLED: 'Cancelled',
  };

  return (
    <div className="row-card card">
      <div className="tile-icon tile-icon--danger">
        <Icon name="siren" size={20} />
      </div>
      <div className="row-card__main">
        <div className="row-card__top">
          <span className={`badge ${statusStyles[emg.status] ?? 'badge--neutral'}`}>
            {statusLabels[emg.status] ?? emg.status}
          </span>
          <span className="row-card__time num">{formatTimestamp(emg.createdAt)}</span>
        </div>
        <div style={{ fontWeight: 600 }}>{emg.description}</div>
        {emg.voiceAudio && (
          <div
            style={{
              marginTop: 6,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Voice message
            </div>
            <audio controls src={emg.voiceAudio} style={{ width: '100%', height: 32 }} />
          </div>
        )}
        {emg.acknowledgedBy && (
          <div className="row-card__meta">
            <Icon name="users" size={14} />
            Acknowledged by {emg.acknowledgedBy}
            {emg.acknowledgedAt && ` · ${formatTimestamp(emg.acknowledgedAt)}`}
          </div>
        )}
        {emg.resolvedAt && (
          <div className="row-card__meta">
            <Icon name="shield-check" size={14} />
            Resolved {formatTimestamp(emg.resolvedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

export function CaredDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const emergencies = useApiData(getEmergencies);
  const requests = useApiData(getRequests);
  const [showPairing, setShowPairing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const cared = user && 'age' in user ? (user as CaredPerson) : null;
  const openCount = emergencies.data?.filter((e) => e.status === 'OPEN').length ?? 0;
  const totalEmergencies = emergencies.data?.length ?? 0;

  return (
    <div className="page page--wide">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? 'there'}.`}
        subtitle="Here's how you're doing today."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {!cared?.linkedCaregiverId && (
              <Button variant="secondary" onClick={() => setShowPairing(true)}>
                <Icon name="link" size={16} />
                Connect Caregiver
              </Button>
            )}
            <Button variant="danger" onClick={() => setShowReport(true)}>
              <Icon name="siren" size={16} />
              Report Emergency
            </Button>
          </div>
        }
      />

      <div className="stack">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {cared && <StatusCard cared={cared} />}
          <Card className={`stat-card${openCount > 0 ? ' stat-card--danger' : ''}`}>
            <span className="stat-card__icon">
              <Icon name="siren" size={22} />
            </span>
            <span>
              <span className="stat-card__label" style={{ display: 'block' }}>
                Active emergencies
              </span>
              <span
                className={`stat-card__value num${openCount > 0 ? ' stat-card__value--alert' : ''}`}
                style={{ display: 'block' }}
              >
                {openCount}
              </span>
            </span>
          </Card>
          <Card className="stat-card">
            <span className="stat-card__icon">
              <Icon name="clipboard" size={22} />
            </span>
            <span>
              <span className="stat-card__label" style={{ display: 'block' }}>
                Pending requests
              </span>
              <span className="stat-card__value num" style={{ display: 'block' }}>
                {requests.data?.filter((r) => r.status === 'PENDING').length ?? 0}
              </span>
            </span>
          </Card>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {cared && <CaregiverInfo cared={cared} />}

          <SectionCard title="Quick actions">
            <div className="stack stack--tight">
              <Button variant="danger" fullWidth onClick={() => setShowReport(true)}>
                <Icon name="siren" size={18} />
                Report an emergency
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate('/reminders')}>
                <Icon name="clock" size={18} />
                View my reminders
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate('/appointments')}>
                <Icon name="calendar" size={18} />
                View my appointments
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate('/notifications')}>
                <Icon name="bell" size={18} />
                Check notifications
              </Button>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="My emergencies"
          action={
            totalEmergencies > 0 ? (
              <span className="section-label">{totalEmergencies} total</span>
            ) : undefined
          }
        >
          {emergencies.loading && (
            <div className="state-block" style={{ padding: '30px 16px' }}>
              <span className="spinner spinner--lg" />
            </div>
          )}

          {!emergencies.loading && emergencies.error && (
            <div className="state-block" style={{ padding: '30px 16px' }}>
              <span className="state-block__title">Could not load emergencies</span>
              <span className="state-block__desc">{emergencies.error}</span>
              <Button variant="ghost" size="sm" onClick={emergencies.refetch}>
                Try again
              </Button>
            </div>
          )}

          {!emergencies.loading && !emergencies.error && totalEmergencies === 0 && (
            <div className="state-block" style={{ padding: '30px 16px' }}>
              <span className="state-block__icon state-block__icon--empty" aria-hidden="true">
                <Icon name="shield-check" size={24} />
              </span>
              <span className="state-block__title">No emergencies reported</span>
              <span className="state-block__desc">
                You haven't reported any emergencies yet. If you need help, press the button above.
              </span>
            </div>
          )}

          {!emergencies.loading && !emergencies.error && totalEmergencies > 0 && (
            <div className="list-rows">
              {emergencies.data!.map((emg) => (
                <EmergencyRow key={emg.id} emg={emg} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div style={{ marginTop: 40, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <span className="num">Updated {formatTimestamp(new Date())}</span>
        {' · '}Signed in as {user?.name}.
      </div>

      {showReport && (
        <ReportEmergencyModal
          open={showReport}
          onClose={() => setShowReport(false)}
          onReported={() => emergencies.refetch()}
        />
      )}
      {showPairing && <PairingModal onClose={() => setShowPairing(false)} />}
    </div>
  );
}

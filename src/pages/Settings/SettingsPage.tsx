import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useSettings, LANGUAGE_OPTIONS } from '../../app/providers/SettingsProvider';
import type { AssistantLanguage } from '../../app/providers/SettingsProvider';
import { IS_DEMO_MODE } from '../../services/config';
import { resetDemoState } from '../../demo/demoStore';
import { useToast } from '../../app/providers/ToastProvider';
import { PageHeader } from '../../components/navigation/PageHeader';
import { SectionCard } from '../../components/cards/Card';
import { Switch, Field } from '../../components/buttons/Controls';
import { Button } from '../../components/buttons/Button';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';
import { Avatar } from '../../components/elder/Avatar';
import { Icon } from '../../components/icons/Icon';

export function SettingsPage() {
  const settings = useSettings();
  const { user, signOut } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifyAppointments, setNotifyAppointments] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="Preferences apply immediately to this console and are saved on this device."
      />

      <div className="settings-stack">
        <SectionCard title="Profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Avatar name={user?.name ?? 'Caregiver'} size="lg" />
            <div>
              <strong style={{ fontSize: '1.05rem' }}>{user?.name}</strong>
              <p className="field__hint">{user?.email}</p>
            </div>
          </div>
          <dl className="detail-grid">
            <div className="detail-row">
              <dt>Role</dt>
              <dd>{('role' in (user ?? {})) ? (user as { role: string }).role : 'Cared person'}</dd>
            </div>
            <div className="detail-row">
              <dt>Organisation</dt>
              <dd>ElderAssist Family Plan</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Language">
          <Field
            label="Assistant language preference"
            htmlFor="language-select"
            hint="Elders hear the HomeHub assistant in their own language. This console follows your choice where translations are available."
          >
            <select
              id="language-select"
              className="select"
              value={settings.language}
              onChange={(e) => settings.update({ language: e.target.value as AssistantLanguage })}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </SectionCard>

        <SectionCard title="Notifications">
          <div className="setting-row">
            <div className="setting-row__main">
              <div className="setting-row__title">Emergency alerts</div>
              <p className="setting-row__desc">Always on. Emergencies interrupt everything — this cannot be disabled.</p>
            </div>
            <Switch checked disabled onChange={() => {}} label="Emergency alerts (always on)" />
          </div>
          <div className="setting-row">
            <div className="setting-row__main">
              <div className="setting-row__title">Appointment updates</div>
              <p className="setting-row__desc">Confirmations, changes and reminders about upcoming visits.</p>
            </div>
            <Switch
              checked={notifyAppointments}
              onChange={setNotifyAppointments}
              label="Appointment updates"
            />
          </div>
          <div className="setting-row">
            <div className="setting-row__main">
              <div className="setting-row__title">Weekly summary</div>
              <p className="setting-row__desc">A quiet overview of activity across everyone you care for.</p>
            </div>
            <Switch checked={notifyWeekly} onChange={setNotifyWeekly} label="Weekly summary" />
          </div>
        </SectionCard>

        <SectionCard title="Accessibility">
          <div className="setting-row">
            <span className="tile-icon tile-icon--accent" aria-hidden="true">
              <Icon name="accessibility" size={20} />
            </span>
            <div className="setting-row__main">
              <div className="setting-row__title">Larger text</div>
              <p className="setting-row__desc">Increases the base text size across the entire console.</p>
            </div>
            <Switch
              checked={settings.largerText}
              onChange={(checked) => settings.update({ largerText: checked })}
              label="Larger text"
            />
          </div>
          <div className="setting-row">
            <span className="tile-icon tile-icon--attention" aria-hidden="true">
              <Icon name="activity" size={20} />
            </span>
            <div className="setting-row__main">
              <div className="setting-row__title">High contrast</div>
              <p className="setting-row__desc">Stronger borders and darker text for maximum legibility.</p>
            </div>
            <Switch
              checked={settings.highContrast}
              onChange={(checked) => settings.update({ highContrast: checked })}
              label="High contrast"
            />
          </div>
          <div className="setting-row">
            <span className="tile-icon tile-icon--info" aria-hidden="true">
              <Icon name="refresh" size={19} />
            </span>
            <div className="setting-row__main">
              <div className="setting-row__title">Reduced motion</div>
              <p className="setting-row__desc">Removes pulsing indicators and animated transitions.</p>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onChange={(checked) => settings.update({ reducedMotion: checked })}
              label="Reduced motion"
            />
          </div>
        </SectionCard>

        <SectionCard title="HomeHub">
          <dl className="detail-grid">
            <div className="detail-row">
              <dt>Paired devices</dt>
              <dd>Managed from the HomeHub page</dd>
            </div>
            <div className="detail-row">
              <dt>Firmware updates</dt>
              <dd>Installed automatically overnight</dd>
            </div>
          </dl>
          <p className="field__hint" style={{ marginTop: 8 }}>
            Device pairing is performed on the physical unit. Press and hold FAMILY + CANCEL for
            five seconds to show a pairing code.
          </p>
        </SectionCard>

        <SectionCard title="Security">
          <div className="setting-row">
            <div className="setting-row__main">
              <div className="setting-row__title">Password</div>
              <p className="setting-row__desc">
                Password changes are handled by the ElderAssist account service.
              </p>
            </div>
            <Button variant="secondary" onClick={() => push({ tone: 'info', title: 'Account service not connected.', message: 'Password management requires the ElderAssist backend.' })}>
              Change password
            </Button>
          </div>
          <div className="setting-row">
            <div className="setting-row__main">
              <div className="setting-row__title">Sign out</div>
              <p className="setting-row__desc">Ends this session on the current device.</p>
            </div>
            <Button
              variant="danger-secondary"
              onClick={() => {
                signOut();
                navigate('/login', { replace: true });
              }}
            >
              Sign out
            </Button>
          </div>
          {IS_DEMO_MODE && (
            <div className="setting-row">
              <div className="setting-row__main">
                <div className="setting-row__title">Reset demo data</div>
                <p className="setting-row__desc">
                  Restores the original sample elders, emergencies and requests. Only visible in demo mode.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                Reset demo data
              </Button>
            </div>
          )}
        </SectionCard>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        message="All local changes made during this demo will be replaced with the original sample data."
        confirmLabel="Reset data"
        danger
        onConfirm={() => {
          resetDemoState();
          setConfirmReset(false);
          push({ tone: 'success', title: 'Demo data restored.' });
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { IS_DEMO_MODE, IS_CAREGIVER } from '../../services/config';
import { describeError } from '../../services/api';
import { useAuth } from '../../app/providers/AuthProvider';
import { sendOtp, verifyOtp } from '../../services/auth';
import { Button } from '../../components/buttons/Button';
import { Field } from '../../components/buttons/Controls';
import { Icon } from '../../components/icons/Icon';
import { BrandMark } from '../../components/icons/Icon';
import type { IconName } from '../../components/icons/Icon';

const CAREGIVER_FEATURES: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: 'radio',
    title: 'One-touch HomeHub',
    desc: 'A single HELP button in the living room reaches the whole care network.',
  },
  {
    icon: 'mic',
    title: 'Multilingual voice layer',
    desc: 'Elders simply speak — the assistant understands their language.',
  },
  {
    icon: 'phone',
    title: 'Works with a basic phone',
    desc: 'No smartphone needed. Every elder is reachable, every time.',
  },
  {
    icon: 'siren',
    title: 'Coordinated emergency response',
    desc: 'Alerts are acknowledged, escalated and resolved — nothing is missed.',
  },
];

const CARED_FEATURES: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: 'siren',
    title: 'One-touch emergency',
    desc: 'Press the HELP button anytime and your family is alerted instantly.',
  },
  {
    icon: 'users',
    title: 'Stay connected',
    desc: 'Your caregivers can see how you are doing and reach you quickly.',
  },
  {
    icon: 'clock',
    title: 'Smart reminders',
    desc: 'Never miss medications or appointments with gentle voice reminders.',
  },
  {
    icon: 'shield-check',
    title: 'Always looked after',
    desc: 'Your care team is always just one button away.',
  },
];

const FEATURES = IS_CAREGIVER ? CAREGIVER_FEATURES : CARED_FEATURES;

type AuthStep = 'login' | 'register' | 'verify-otp';

export function LoginPage() {
  const { user, signIn, register, signingIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  if (user) return <Navigate to="/dashboard" replace />;

  const startOtpFlow = async () => {
    setOtpSending(true);
    setError(null);
    try {
      await sendOtp(email);
      setStep('verify-otp');
      setOtpResendTimer(60);
      const iv = setInterval(() => setOtpResendTimer((t) => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }), 1000);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (step === 'register') {
        if (!name.trim()) { setError('Please enter your name.'); return; }
        await register(name.trim(), email, password);
        await startOtpFlow();
        return;
      }
      if (step === 'verify-otp') {
        setOtpVerifying(true);
        await verifyOtp(email, otpCode);
        await signIn(email, password);
        navigate('/dashboard', { replace: true });
        return;
      }
      await signIn(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : describeError(err);
      if (typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 403) {
        await startOtpFlow();
        return;
      }
      setError(msg);
    } finally {
      setOtpVerifying(false);
    }
  };

  const isRegister = step === 'register';
  const isVerify = step === 'verify-otp';
  const roleLabel = IS_CAREGIVER ? 'Caregiver Console' : 'Cared Person Portal';

  return (
    <div className="login-page">
      <div className="login-brand">
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BrandMark size={44} />
          <span>
            <span style={{ display: 'block', fontWeight: 800, fontSize: '1.25rem' }}>
              ElderAssist
            </span>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.7 }}>
              {roleLabel}
            </span>
          </span>
        </span>

        <h1 className="login-brand__headline">
          {IS_CAREGIVER
            ? 'Care that is always within reach.'
            : 'Help is always close by.'}
        </h1>

        <div className="login-brand__features">
          {FEATURES.map((feature) => (
            <div className="feature-item" key={feature.title}>
              <span className="feature-item__icon">
                <Icon name={feature.icon} size={22} />
              </span>
              <div>
                <div className="feature-item__title">{feature.title}</div>
                <p className="feature-item__desc">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="login-main">
        <form className="card login-card" onSubmit={handleSubmit} noValidate>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandMark size={30} />
            <span style={{ fontWeight: 700 }}>ElderAssist</span>
          </span>

          <div>
            <h1>
              {isVerify ? 'Verify your email' : isRegister ? 'Create account' : 'Sign in'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              {isVerify
                ? `We sent a 6-digit code to ${email}`
                : isRegister
                  ? `Set up your ${IS_CAREGIVER ? 'caregiver' : 'cared person'} account.`
                  : IS_CAREGIVER
                    ? 'For family members and caregivers.'
                    : 'For the person receiving care.'}
            </p>
          </div>

          {IS_DEMO_MODE && (
            <div className="login-note login-note--demo">
              <Icon name="info" size={17} />
              <span>
                <strong>Demo mode.</strong> Use any credentials to explore.
              </span>
            </div>
          )}

          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}

          {isVerify ? (
            <>
              <Field label="Verification code" htmlFor="login-otp">
                <input
                  id="login-otp"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{ letterSpacing: '0.3em', fontSize: '1.25rem', textAlign: 'center', fontFamily: 'monospace' }}
                  autoFocus
                />
              </Field>

              <Button type="submit" size="lg" fullWidth loading={otpVerifying}>
                Verify & Sign in
              </Button>

              <p className="login-footer">
                {otpResendTimer > 0 ? (
                  <>Resend code in {otpResendTimer}s</>
                ) : (
                  <button
                    type="button"
                    style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                    onClick={startOtpFlow}
                    disabled={otpSending}
                  >
                    {otpSending ? 'Sending...' : 'Resend code'}
                  </button>
                )}
              </p>
            </>
          ) : (
            <>
              {isRegister && (
                <Field label="Full name" htmlFor="login-name">
                  <input
                    id="login-name"
                    className="input"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </Field>
              )}

              <Field label="Email" htmlFor="login-email">
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>

              <Field label="Password" htmlFor="login-password">
                <div className="password-wrap">
                  <input
                    id="login-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </div>
              </Field>

              <Button type="submit" size="lg" fullWidth loading={signingIn || otpSending}>
                {isRegister ? 'Create account & verify email' : 'Sign in'}
              </Button>

              <p className="login-footer">
                {isRegister ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                      onClick={() => { setStep('login'); setError(null); }}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                      onClick={() => { setStep('register'); setError(null); }}
                    >
                      Create one
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

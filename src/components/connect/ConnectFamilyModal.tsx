import { useState, useEffect } from 'react';
import { Modal } from '../modals/Modal';
import { Button } from '../buttons/Button';
import { Icon } from '../icons/Icon';
import { useToast } from '../../app/providers/ToastProvider';
import { generatePairingCode, getConnectedPersons } from '../../services/auth';

interface ConnectFamilyModalProps {
  onClose: () => void;
}

interface LinkedPerson {
  id: string;
  name: string;
}

export function ConnectFamilyModal({ onClose }: ConnectFamilyModalProps) {
  const { push } = useToast();
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState<LinkedPerson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getConnectedPersons()
      .then((persons) => setConnected(persons.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generatePairingCode();
      setNewCode(result.code);
      setCopied(false);
    } catch {
      push({ tone: 'error', title: 'Failed to generate code' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
      push({ tone: 'success', title: 'Code copied', message: 'Share this code with the person you care for.' });
    } catch {
      push({ tone: 'info', title: 'Copy this code', message: newCode });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Connect Family"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <p style={{ marginBottom: 16 }}>
        Generate a pairing code and share it with the person you care for. They can enter this code in their ElderAssist app to link accounts.
      </p>

      {connected.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Connected people</div>
          <div className="list-rows" style={{ gap: 8 }}>
            {connected.map((person) => (
              <div
                key={person.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--surface-sunken)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="avatar avatar--sm" style={{ background: 'var(--accent)' }}>
                    {person.name[0]}
                  </span>
                  <span style={{ fontWeight: 600 }}>{person.name}</span>
                </span>
                <span className="badge badge--safe">
                  <Icon name="shield-check" size={12} />
                  Connected
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {connected.length === 0 && (
        <div style={{ marginBottom: 16, padding: '12px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No one connected yet. Generate a code below.
        </div>
      )}

      {newCode ? (
        <div
          style={{
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            textAlign: 'center',
          }}
        >
          <div className="section-label" style={{ marginBottom: 8 }}>Share this code</div>
          <div
            className="num"
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'var(--accent-strong)',
              marginBottom: 12,
            }}
          >
            {newCode}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              <Icon name={copied ? 'shield-check' : 'clipboard'} size={14} />
              {copied ? 'Copied!' : 'Copy code'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleGenerate} loading={loading}>
              <Icon name="refresh" size={14} />
              New code
            </Button>
          </div>
        </div>
      ) : (
        <Button fullWidth onClick={handleGenerate} loading={loading}>
          <Icon name="link" size={16} />
          Generate pairing code
        </Button>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../modals/Modal';
import { Button } from '../buttons/Button';
import { Field } from '../buttons/Controls';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { pairWithCaregiver } from '../../services/auth';

interface PairingModalProps {
  onClose: () => void;
}

export function PairingModal({ onClose }: PairingModalProps) {
  const { user, updateCaredProfile } = useAuth();
  const { push } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError('Please enter a valid pairing code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await pairWithCaregiver(code, user?.id ?? '');
      updateCaredProfile({
        linkedCaregiverId: 'linked',
        linkedCaregiverName: result.caregiverName,
        pairingCode: null,
      });
      push({
        tone: 'success',
        title: 'Connected!',
        message: `You are now connected to ${result.caregiverName}.`,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid pairing code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Connect to your caregiver"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Connect
          </Button>
        </>
      }
    >
      <p style={{ marginBottom: 14 }}>
        Ask your caregiver for their pairing code, then enter it below to link your account.
      </p>

      {error && (
        <p className="field__error" role="alert" style={{ marginBottom: 10 }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <Field label="Pairing code" htmlFor="pairing-code">
          <input
            id="pairing-code"
            className="input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ANA-7291"
            autoComplete="off"
            autoFocus
          />
        </Field>
      </form>
    </Modal>
  );
}

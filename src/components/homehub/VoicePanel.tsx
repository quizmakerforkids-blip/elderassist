import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { Icon } from '../icons/Icon';
import { Badge } from '../status/Badge';

const STATE_LABEL: Record<string, string> = {
  READY: 'READY',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  RESPONSE: 'RESPONSE',
  ERROR: 'ERROR',
};

export function VoicePanel() {
  const voice = useVoiceAgent();
  const listening = voice.state === 'LISTENING';

  return (
    <div className="voice-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="section-label">Voice assistant</span>
        <Badge tone="neutral">{STATE_LABEL[voice.state]}</Badge>
      </div>

      <button
        type="button"
        className={`voice-mic ${listening ? 'voice-mic--listening' : ''}`}
        onClick={listening ? voice.stopListening : voice.startListening}
        disabled={voice.state === 'PROCESSING'}
        aria-label={listening ? 'Stop listening' : 'Start listening'}
      >
        {listening && (
          <>
            <span
              className="pulse-ring"
              style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid currentColor' }}
              aria-hidden="true"
            />
            <Icon name="stop" size={26} />
          </>
        )}
        {!listening && <Icon name="mic" size={28} />}
      </button>

      <div aria-hidden="true" style={{ minHeight: 30 }}>
        {listening ? (
          <div className="voice-wave">
            <span /><span /><span /><span /><span />
          </div>
        ) : null}
      </div>

      <p className="field__hint" style={{ textAlign: 'center' }}>
        {voice.state === 'READY' &&
          'Press the microphone to simulate a spoken request from the elder.'}
        {voice.state === 'LISTENING' && 'Listening…'}
        {voice.state === 'PROCESSING' && 'Understanding the request…'}
      </p>

      {voice.state === 'RESPONSE' && voice.response && (
        <div className="voice-bubble voice-bubble--response" role="status">
          {voice.response}
        </div>
      )}

      {voice.state === 'ERROR' && voice.error && (
        <div className="voice-bubble" role="alert" style={{ borderColor: 'var(--danger-border)' }}>
          {voice.error}
        </div>
      )}
    </div>
  );
}

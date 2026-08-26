import { useEffect, useRef, useState } from 'react';
import { IS_DEMO_MODE } from '../services/config';

export type VoiceState = 'READY' | 'LISTENING' | 'PROCESSING' | 'RESPONSE' | 'ERROR';

const DEMO_RESPONSES = [
  'You can say “call family”, “remind me about my medicines”, or press HELP if you need someone right away.',
  'Sure — I have noted that. Your caregiver will see this request shortly.',
  'I can help with reminders, appointments, or calling a family member. What would you like?',
];

export interface VoiceAgent {
  state: VoiceState;
  response: string | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

export function useVoiceAgent(): VoiceAgent {
  const [state, setState] = useState<VoiceState>('READY');
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const responseIndex = useRef(0);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const startListening = () => {
    clearTimers();
    setResponse(null);
    setError(null);
    setState('LISTENING');

    if (!IS_DEMO_MODE) {
      timers.current.push(
        window.setTimeout(() => {
          setState('ERROR');
          setError(
            'The voice service is not connected in this build. Voice understanding runs on the ElderAssist backend.',
          );
        }, 900),
      );
      return;
    }

    timers.current.push(window.setTimeout(() => setState('PROCESSING'), 1700));
    timers.current.push(
      window.setTimeout(() => {
        setResponse(DEMO_RESPONSES[responseIndex.current % DEMO_RESPONSES.length]);
        responseIndex.current += 1;
        setState('RESPONSE');
      }, 3100),
    );
    timers.current.push(window.setTimeout(() => setState('READY'), 9600));
  };

  const stopListening = () => {
    clearTimers();
    setState('READY');
  };

  const reset = () => {
    clearTimers();
    setState('READY');
    setResponse(null);
    setError(null);
  };

  return { state, response, error, startListening, stopListening, reset };
}

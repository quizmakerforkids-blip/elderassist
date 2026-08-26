import type { HubEventType } from '../../types';
import { cls } from '../../utils/format';

export type HubLedState = 'ready' | 'busy' | 'alert' | 'off';

interface HomeHubDeviceProps {
  online: boolean;
  led: HubLedState;
  stateLabel: string;
  disabled?: boolean;
  busyButton?: HubEventType | null;
  onButton: (type: HubEventType) => void;
}

export function HomeHubDevice({
  online,
  led,
  stateLabel,
  disabled = false,
  busyButton = null,
  onButton,
}: HomeHubDeviceProps) {
  const controlsDisabled = !online || disabled;

  return (
    <div className={cls('hub-device', !online && 'hub-device--offline')}>
      <div className="hub-brandline">
        <div className="hub-brandline__name">ELDERASSIST</div>
        <div className="hub-brandline__product">HOMEHUB</div>
      </div>

      <div className="hub-led-zone">
        <div className={`hub-led hub-led--${online ? led : 'ready'}`}>
          <span className="hub-led__core" />
        </div>
        <div className="hub-state-label">{online ? stateLabel : 'OFFLINE'}</div>
      </div>

      <div className="hub-buttons" aria-busy={busyButton != null}>
        <button
          type="button"
          className="hub-btn hub-btn--help"
          disabled={controlsDisabled || busyButton != null}
          onClick={() => onButton('HELP_PRESSED')}
          aria-label="HELP — request urgent assistance"
        >
          {busyButton === 'HELP_PRESSED' ? (
            <span className="spinner" style={{ margin: '0 auto' }} aria-hidden="true" />
          ) : (
            'HELP'
          )}
        </button>

        <div className="hub-btn-row">
          <button
            type="button"
            className="hub-btn hub-btn--family"
            disabled={controlsDisabled || busyButton != null}
            onClick={() => onButton('FAMILY_PRESSED')}
            aria-label="FAMILY — request a family call"
          >
            {busyButton === 'FAMILY_PRESSED' ? (
              <span className="spinner" style={{ margin: '0 auto' }} aria-hidden="true" />
            ) : (
              'FAMILY'
            )}
          </button>
          <button
            type="button"
            className="hub-btn hub-btn--cancel"
            disabled={controlsDisabled || busyButton != null}
            onClick={() => onButton('CANCEL_PRESSED')}
            aria-label="CANCEL — cancel the active help alert"
          >
            {busyButton === 'CANCEL_PRESSED' ? (
              <span className="spinner" style={{ margin: '0 auto' }} aria-hidden="true" />
            ) : (
              'CANCEL'
            )}
          </button>
        </div>
      </div>

      <div className="hub-grille" aria-hidden="true" />

      {!online && <div className="hub-offline-ribbon">OFFLINE</div>}
    </div>
  );
}

import { useToast } from '../../app/providers/ToastProvider';
import { Icon } from '../icons/Icon';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="toaster">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.tone}`}
          role="status"
          aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
        >
          <div>
            <div className="toast__title">{toast.title}</div>
            {toast.message && <div className="toast__message">{toast.message}</div>}
          </div>
          <button
            type="button"
            className="icon-btn toast__close"
            aria-label="Dismiss notification"
            onClick={() => dismiss(toast.id)}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

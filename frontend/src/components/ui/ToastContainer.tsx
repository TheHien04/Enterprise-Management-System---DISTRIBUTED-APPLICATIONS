import { useToast } from '@/context/ToastContext'
import { Icons } from '@/components/ui/icons'

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
          <div className="toast-icon">
            {toast.type === 'success' && Icons.checkCircle}
            {toast.type === 'error' && Icons.alertCircle}
            {toast.type === 'info' && Icons.infoCircle}
          </div>
          <div className="toast-body">
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
          <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

import type { WorkflowHistoryLog } from '@/types/domain'
import { Icons } from '@/components/ui/icons'
import { useLocale } from '@/context/LocaleContext'
import { formatDate } from '@/i18n/helpers'
import type { MessageKey } from '@/i18n/messages'

const ACTION_KEYS: Record<string, MessageKey> = {
  SUBMIT: 'workflow.action.SUBMIT',
  APPROVE: 'workflow.action.APPROVE',
  REJECT: 'workflow.action.REJECT',
  REQUEST_REVISION: 'workflow.action.REQUEST_REVISION',
}

export default function WorkflowTimeline({ logs }: { logs: WorkflowHistoryLog[] }) {
  const { locale, t } = useLocale()

  if (logs.length === 0) {
    return (
      <div className="timeline-empty">
        <p>{t('workflow.empty')}</p>
      </div>
    )
  }

  return (
    <div className="workflow-timeline">
      {logs.map((log, index) => {
        const isLast = index === logs.length - 1
        const actionClass =
          log.action === 'APPROVE' ? 'success' : log.action === 'REJECT' ? 'danger' : 'info'

        return (
          <div key={`${log.step_num}-${log.created_at}-${index}`} className={`timeline-item ${isLast ? 'last' : ''}`}>
            <div className={`timeline-dot timeline-dot-${actionClass}`}>
              {log.action === 'APPROVE' ? Icons.checkCircle : log.action === 'REJECT' ? Icons.alertCircle : Icons.infoCircle}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <strong>{ACTION_KEYS[log.action] ? t(ACTION_KEYS[log.action]) : log.action}</strong>
                <span className="timeline-time">{formatDate(log.created_at, locale)}</span>
              </div>
              <p className="timeline-meta">
                {t('workflow.step')} {log.step_num} · {log.actor_role.replace(/_/g, ' ')} · {log.actor_id}
              </p>
              {log.comment && <p className="timeline-comment">{log.comment}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

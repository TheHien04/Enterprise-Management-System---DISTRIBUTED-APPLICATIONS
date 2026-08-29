import { useEffect, useState } from 'react'
import { auditApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { formatDate } from '@/i18n/helpers'
import { Icons } from '@/components/ui/icons'
import { DetailSkeleton } from '@/components/ui'

type Props = {
  entityType: string
  entityId: string
  /** Start collapsed (default true for dense detail pages) */
  defaultOpen?: boolean
  /** Bump after mutations so an open panel refetches */
  refreshToken?: number
}

export default function ActivityTimeline({
  entityType,
  entityId,
  defaultOpen = false,
  refreshToken = 0,
}: Props) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (refreshToken > 0) setOpen(true)
  }, [refreshToken])

  const logs = useAsync(async () => {
    if (!open) return []
    try {
      return (await auditApi.list(entityType, entityId)).data ?? []
    } catch {
      throw new Error(t('activity.loadFailed'))
    }
  }, [entityType, entityId, open, t, refreshToken])

  return (
    <div className="card activity-panel">
      <button
        type="button"
        className="activity-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>
            {t('activity.title')}
          </h3>
          <p className="card-subtitle" style={{ margin: '4px 0 0' }}>
            {t('activity.subtitle')}
          </p>
        </div>
        <span className="activity-toggle-hint">
          {open ? t('common.hideDetails') : t('common.viewDetails')}
        </span>
      </button>

      {open && (
        <div className="activity-body">
          {logs.loading && <DetailSkeleton />}
          {logs.error && (
            <div className="alert alert-error" style={{ margin: '0 20px 20px' }}>
              {logs.error}
            </div>
          )}
          {!logs.loading && !logs.error && (logs.data?.length ?? 0) === 0 && (
            <div className="timeline-empty soft-empty">
              <div className="soft-empty-art" aria-hidden="true" />
              <p>{t('activity.empty')}</p>
              <p className="card-subtitle" style={{ marginTop: 8 }}>
                {t('activity.emptyHint')}
              </p>
            </div>
          )}
          {!logs.loading && !logs.error && (logs.data?.length ?? 0) > 0 && (
            <div className="workflow-timeline" style={{ padding: '0 20px 20px' }}>
              {(logs.data ?? []).map((log, index) => {
                const isLast = index === (logs.data?.length ?? 0) - 1
                return (
                  <div key={log.id} className={`timeline-item${isLast ? ' last' : ''}`}>
                    <div className="timeline-dot timeline-dot-info">{Icons.infoCircle}</div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <strong>{log.action}</strong>
                        <span className="timeline-time">{formatDate(log.created_at, locale)}</span>
                      </div>
                      <p className="timeline-meta">
                        {log.actor_id}
                        {log.note ? ` · ${log.note}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

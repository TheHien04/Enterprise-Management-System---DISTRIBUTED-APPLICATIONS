import { useAuth } from '@/context/AuthContext'
import { notificationsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { EmptyState, LoadingState, PageHeader } from '@/components/ui'
import { Icons } from '@/components/ui/icons'
import { interpolate } from '@/i18n/messages'
import type { NotificationItem } from '@/types/domain'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const userId = user?.username ?? 'sale01'
  const items = useAsync(async () => (await notificationsApi.list(userId)).data, [userId])

  async function markRead(item: NotificationItem) {
    try {
      await notificationsApi.markRead(item.id)
      showToast('info', t('toast.markedRead'), item.title)
      await items.reload()
    } catch (err) {
      showToast('error', t('toast.updateFailed'), err instanceof Error ? err.message : t('error.unknown'))
    }
  }

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.alerts')}
        title={t('page.notifications.title')}
        subtitle={t('page.notifications.subtitle')}
      />

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.notificationsInbox')}</h3>
            <p className="card-subtitle">
              {interpolate(t('card.notificationsCount'), { count: items.data?.length ?? 0 })}
            </p>
          </div>
        </div>

        {items.error && <div className="alert alert-error">{items.error}</div>}
        {items.loading && <LoadingState />}
        {!items.loading && !items.error && (items.data ?? []).length === 0 && (
          <EmptyState title={t('empty.noNotifications')} description={t('empty.noNotificationsDesc')} icon={Icons.bell} />
        )}

        {(items.data ?? []).map((item: NotificationItem) => (
          <div key={item.id} className="notification-item">
            <div className={`notification-dot${item.read ? ' read' : ''}`}>{Icons.bell}</div>
            <div>
              <p className="notification-title">{item.title}</p>
              <p className="notification-body">{item.body}</p>
              <p className="notification-meta">{item.event_type?.replace(/_/g, ' ')}</p>
            </div>
            <button className="btn btn-secondary btn-sm" disabled={item.read} onClick={() => markRead(item)}>
              {item.read ? t('common.read') : t('common.markRead')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

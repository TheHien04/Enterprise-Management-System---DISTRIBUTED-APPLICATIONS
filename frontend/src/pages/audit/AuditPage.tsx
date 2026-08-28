import { Link } from 'react-router-dom'
import { auditApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { entityPath, formatDate } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import type { AuditLog } from '@/types/domain'

export default function AuditPage() {
  const { t, locale } = useLocale()
  const logs = useAsync(async () => (await auditApi.list()).data, [])

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'entity',
      header: t('col.entity'),
      sortable: true,
      sortValue: (r) => r.entity_type,
      render: (r) => {
        const path = entityPath(r.entity_type, r.entity_id)
        const label = (
          <>
            <span className="cell-mono">{r.entity_type}</span>
            <span style={{ color: 'var(--text-muted)' }}> / {r.entity_id.slice(0, 8)}…</span>
          </>
        )
        return path ? (
          <Link to={path} className="link-primary">
            {label}
          </Link>
        ) : (
          label
        )
      },
    },
    { key: 'action', header: t('col.action'), sortable: true, sortValue: (r) => r.action, render: (r) => r.action },
    { key: 'actor', header: t('col.actor'), render: (r) => r.actor_id },
    {
      key: 'when',
      header: t('col.timestamp'),
      sortable: true,
      sortValue: (r) => r.created_at,
      render: (r) => formatDate(r.created_at, locale),
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.compliance')}
        title={t('page.audit.title')}
        subtitle={t('page.audit.subtitle')}
      />

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.activityLog')}</h3>
            <p className="card-subtitle">
              {interpolate(t('card.activityLogCount'), { count: logs.data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {logs.loading ? (
          <TableSkeleton rows={6} />
        ) : (
          <DataTable
            columns={columns}
            data={logs.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.entity_type} ${r.entity_id} ${r.action} ${r.actor_id}`}
            searchPlaceholder={t('search.audit')}
            emptyTitle={t('empty.noAudit')}
            emptyDescription={t('empty.noAuditDesc')}
          />
        )}
      </div>
    </div>
  )
}

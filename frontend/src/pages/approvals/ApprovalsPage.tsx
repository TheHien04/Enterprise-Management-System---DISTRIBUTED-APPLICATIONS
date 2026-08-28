import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { documentPath } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import type { WorkflowItem } from '@/types/domain'

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const role = user?.roles?.[0] ?? 'SALES_MANAGER'
  const inbox = useAsync(async () => (await workflowsApi.inbox(role)).data, [role])
  const [acting, setActing] = useState<string | null>(null)

  async function approve(item: WorkflowItem) {
    setActing(item.id)
    try {
      await workflowsApi.approve(item.id, 'Approved via web UI')
      showToast('success', t('toast.approved'), `${item.document_type} step ${item.current_step_num}`)
      await inbox.reload()
    } catch (err) {
      showToast('error', t('toast.approveFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setActing(null)
    }
  }

  async function reject(item: WorkflowItem) {
    setActing(item.id)
    try {
      await workflowsApi.reject(item.id, 'Rejected via web UI — requires revision')
      showToast('info', t('toast.rejected'), t('toast.rejectedDesc'))
      await inbox.reload()
    } catch (err) {
      showToast('error', t('toast.rejectFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setActing(null)
    }
  }

  const columns: DataTableColumn<WorkflowItem>[] = [
    {
      key: 'doc',
      header: t('col.document'),
      render: (r) => {
        const path = documentPath(r.document_type, r.document_id)
        const label = <span className="cell-mono">{r.document_id.slice(0, 8)}…</span>
        return path ? (
          <Link to={path} className="link-primary">
            {label} {t('workflow.viewDocument')}
          </Link>
        ) : (
          label
        )
      },
    },
    {
      key: 'type',
      header: t('col.type'),
      sortable: true,
      sortValue: (r) => r.document_type,
      render: (r) => r.document_type.replace(/_/g, ' '),
    },
    {
      key: 'step',
      header: t('col.step'),
      sortable: true,
      sortValue: (r) => r.current_step_num,
      render: (r) => `${t('workflow.step')} ${r.current_step_num}`,
    },
    {
      key: 'status',
      header: t('col.status'),
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (r) => (
        <div className="cell-actions">
          <button className="btn btn-sm" disabled={acting === r.id} onClick={() => approve(r)}>
            {t('common.approve')}
          </button>
          <button className="btn btn-danger btn-sm" disabled={acting === r.id} onClick={() => reject(r)}>
            {t('common.reject')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.workflowEngine')}
        title={t('page.approvals.title')}
        subtitle={interpolate(t('workflow.inboxForRole'), { role: role.replace(/_/g, ' ') })}
      />

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('workflow.pendingItems')}</h3>
            <p className="card-subtitle">
              {interpolate(t('workflow.pendingCount'), { count: inbox.data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {inbox.error && <div className="alert alert-error">{inbox.error}</div>}
        {inbox.loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <DataTable
            columns={columns}
            data={inbox.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.document_type} ${r.document_id} ${r.status}`}
            searchPlaceholder={t('search.inbox')}
            emptyTitle={t('workflow.inboxClear')}
            emptyDescription={t('workflow.inboxEmpty')}
          />
        )}
      </div>
    </div>
  )
}

import { FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import ActivityTimeline from '@/components/ui/ActivityTimeline'
import { documentPath } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import {
  SLA_SOFT_HOURS,
  formatWaitingAge,
  hoursUntilSlaBreach,
  waitingHours,
} from '@/lib/exceptions'
import type { WorkflowItem } from '@/types/domain'

type WorkflowAction = 'approve' | 'reject' | 'revision'
type QueueFilter = 'all' | 'urgent' | 'mine'

function waitingAge(item: WorkflowItem): { hours: number; label: string } | null {
  const hours = waitingHours(item)
  if (hours == null) return null
  return { hours, label: formatWaitingAge(hours) }
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { t } = useLocale()
  const role = user?.roles?.[0] ?? 'SALES_MANAGER'
  const username = user?.username ?? ''
  const inbox = useAsync(async () => (await workflowsApi.inbox(role)).data, [role])
  const [acting, setActing] = useState<string | null>(null)
  const [modalAction, setModalAction] = useState<WorkflowAction | null>(null)
  const [selectedItem, setSelectedItem] = useState<WorkflowItem | null>(null)
  const [comment, setComment] = useState('')
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [drawerItem, setDrawerItem] = useState<WorkflowItem | null>(null)

  const filtered = useMemo(() => {
    const rows = inbox.data ?? []
    if (filter === 'urgent') {
      return rows.filter((item) => {
        const age = waitingAge(item)
        return age != null && age.hours >= SLA_SOFT_HOURS
      })
    }
    if (filter === 'mine') {
      const mine = rows.filter(
        (item) =>
          item.current_assignee_user_id === username ||
          item.current_assignee_role === role ||
          item.submitted_by === username,
      )
      return mine.length > 0 ? mine : rows
    }
    return rows
  }, [filter, inbox.data, role, username])

  const urgentCount = useMemo(
    () =>
      (inbox.data ?? []).filter((item) => {
        const age = waitingAge(item)
        return age != null && age.hours >= SLA_SOFT_HOURS
      }).length,
    [inbox.data],
  )

  function openModal(item: WorkflowItem, action: WorkflowAction) {
    setSelectedItem(item)
    setModalAction(action)
    setComment('')
  }

  function closeModal() {
    setModalAction(null)
    setSelectedItem(null)
    setComment('')
  }

  async function submitAction(event: FormEvent) {
    event.preventDefault()
    if (!selectedItem || !modalAction) return

    const requiresComment = modalAction === 'reject' || modalAction === 'revision'
    if (requiresComment && !comment.trim()) {
      showToast('error', t('toast.error'), t('workflow.commentRequired'))
      return
    }

    setActing(selectedItem.id)
    try {
      const version = selectedItem.version
      const trimmed = comment.trim() || undefined
      if (modalAction === 'approve') {
        await workflowsApi.approve(selectedItem.id, trimmed, version)
        showToast('success', t('toast.approved'), `${selectedItem.document_type} step ${selectedItem.current_step_num}`)
      } else if (modalAction === 'reject') {
        await workflowsApi.reject(selectedItem.id, trimmed, version)
        showToast('info', t('toast.rejected'), t('toast.rejectedDesc'))
      } else {
        await workflowsApi.requestRevision(selectedItem.id, trimmed, version)
        showToast('info', t('toast.revisionRequested'), t('toast.rejectedDesc'))
      }
      closeModal()
      setDrawerItem(null)
      await inbox.reload()
    } catch (err) {
      const failKey =
        modalAction === 'approve'
          ? 'toast.approveFailed'
          : modalAction === 'reject'
            ? 'toast.rejectFailed'
            : 'toast.revisionFailed'
      showToast('error', t(failKey), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setActing(null)
    }
  }

  const modalTitle =
    modalAction === 'approve'
      ? t('workflow.approveTitle')
      : modalAction === 'reject'
        ? t('workflow.rejectTitle')
        : t('workflow.revisionTitle')

  const isDestructive = modalAction === 'reject' || modalAction === 'revision'

  const columns: DataTableColumn<WorkflowItem>[] = [
    {
      key: 'doc',
      header: t('col.document'),
      render: (r) => {
        const path = documentPath(r.document_type, r.document_id)
        const label = <span className="cell-mono">{r.document_id.slice(0, 8)}…</span>
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {path ? (
              <Link to={path} className="link-primary">
                {label} {t('workflow.viewDocument')}
              </Link>
            ) : (
              label
            )}
            <button type="button" className="link-button" onClick={() => setDrawerItem(r)}>
              {t('activity.title')}
            </button>
          </div>
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
      key: 'waiting',
      header: t('col.waiting'),
      sortable: true,
      sortValue: (r) => waitingAge(r)?.hours ?? -1,
      render: (r) => {
        const age = waitingAge(r)
        if (!age) return t('common.none')
        const urgent = age.hours >= SLA_SOFT_HOURS
        const remaining = Math.ceil(hoursUntilSlaBreach(age.hours))
        return (
          <span className={urgent ? 'sla-urgent' : 'sla-ok'}>
            {interpolate(t('workflow.waitingAge'), { age: age.label })}
            {urgent
              ? ` · ${t('workflow.slaBreached')}`
              : ` · ${interpolate(t('workflow.slaCountdown'), { hours: remaining })}`}
          </span>
        )
      },
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
          <button className="btn btn-sm" disabled={acting === r.id} onClick={() => openModal(r, 'approve')}>
            {t('common.approve')}
          </button>
          <button className="btn btn-secondary btn-sm" disabled={acting === r.id} onClick={() => openModal(r, 'revision')}>
            {t('common.requestRevision')}
          </button>
          <button className="btn btn-danger btn-sm" disabled={acting === r.id} onClick={() => openModal(r, 'reject')}>
            {t('common.reject')}
          </button>
        </div>
      ),
    },
  ]

  const filterChips: { id: QueueFilter; label: string; count: number }[] = [
    { id: 'all', label: t('workflow.filterAll'), count: inbox.data?.length ?? 0 },
    { id: 'urgent', label: t('workflow.filterUrgent'), count: urgentCount },
    { id: 'mine', label: t('workflow.filterMine'), count: inbox.data?.length ?? 0 },
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
              {urgentCount > 0 && (
                <span className="sla-urgent" style={{ marginLeft: 10 }}>
                  · {interpolate(t('workflow.urgentCount'), { count: urgentCount })}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="filter-chips" style={{ padding: '0 20px 12px' }}>
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`filter-chip${filter === chip.id ? ' active' : ''}${
                chip.id === 'urgent' && urgentCount > 0 ? ' filter-chip-critical' : ''
              }`}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label}
              <span className="filter-chip-count">{chip.count}</span>
            </button>
          ))}
        </div>

        {inbox.error && <div className="alert alert-error">{inbox.error}</div>}
        {inbox.loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.document_type} ${r.document_id} ${r.status}`}
            searchPlaceholder={t('search.inbox')}
            emptyTitle={t('workflow.inboxClear')}
            emptyDescription={t('workflow.inboxEmptyCta')}
            emptyAction={
              <Link to="/contracts" className="btn btn-sm">
                {t('workflow.inboxEmptyAction')}
              </Link>
            }
            rowClassName={(r) => {
              const age = waitingAge(r)
              return age && age.hours >= SLA_SOFT_HOURS ? 'row-urgent' : undefined
            }}
          />
        )}
      </div>

      {drawerItem && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setDrawerItem(null)}>
          <div className="card modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <h3 className="card-title">{t('activity.title')}</h3>
                <p className="card-subtitle">
                  {drawerItem.document_type.replace(/_/g, ' ')} · {drawerItem.document_id.slice(0, 8)}…
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDrawerItem(null)}>
                {t('common.cancel')}
              </button>
            </div>
            <div style={{ padding: '0 0 8px' }}>
              <ActivityTimeline
                entityType={drawerItem.document_type}
                entityId={drawerItem.document_id}
                defaultOpen
              />
            </div>
          </div>
        </div>
      )}

      {modalAction && selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-modal-title"
          className="modal-backdrop"
          onClick={closeModal}
        >
          <div
            className={`card modal-card${isDestructive ? ' modal-card-danger' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <h3 id="approval-modal-title" className="card-title">
                  {modalTitle}
                </h3>
                <p className="card-subtitle">
                  {selectedItem.document_type.replace(/_/g, ' ')} · {t('workflow.step')}{' '}
                  {selectedItem.current_step_num}
                </p>
              </div>
            </div>
            <form onSubmit={submitAction} style={{ padding: '0 20px 20px' }}>
              {isDestructive && (
                <div className="alert alert-error" style={{ marginBottom: 14 }}>
                  {modalAction === 'reject' ? t('workflow.rejectWarning') : t('workflow.revisionWarning')}
                </div>
              )}
              <div className="form-field">
                <label htmlFor="approval-comment">
                  {t('form.comment')}{' '}
                  {modalAction === 'approve' ? (
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({t('common.optional')})</span>
                  ) : (
                    <span style={{ fontWeight: 400, color: 'var(--danger)' }}>({t('common.required')})</span>
                  )}
                </label>
                {modalAction === 'approve' && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                    {t('workflow.commentOptionalHint')}
                  </p>
                )}
                <textarea
                  id="approval-comment"
                  className="input"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required={modalAction !== 'approve'}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={acting === selectedItem.id}>
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={
                    modalAction === 'reject'
                      ? 'btn btn-danger'
                      : modalAction === 'revision'
                        ? 'btn btn-warning'
                        : 'btn'
                  }
                  disabled={acting === selectedItem.id}
                >
                  {acting === selectedItem.id
                    ? t('common.processing')
                    : modalAction === 'approve'
                      ? t('common.approve')
                      : modalAction === 'reject'
                        ? t('common.reject')
                        : t('common.requestRevision')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

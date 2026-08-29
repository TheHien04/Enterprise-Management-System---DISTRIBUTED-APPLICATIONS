import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { contractsApi, customersApi, workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { DetailSkeleton, PageHeader, StatusBadge } from '@/components/ui'
import ActivityTimeline from '@/components/ui/ActivityTimeline'
import WorkflowTimeline from '@/components/ui/WorkflowTimeline'
import { Icons } from '@/components/ui/icons'
import { formatNumber, tStatus } from '@/i18n/helpers'
import { interpolate, type MessageKey } from '@/i18n/messages'
import { trackRecentEntity } from '@/lib/recentEntities'
import type { Customer } from '@/types/domain'

/** Happy-path lifecycle ribbon (state_machines.json → contract). */
const LIFECYCLE_STEPS = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE'] as const

function lifecycleIndex(status: string): number {
  switch (status) {
    case 'DRAFT':
    case 'REVISION_REQUESTED':
      return 0
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 1
    case 'APPROVED':
      return 2
    case 'ACTIVE':
      return 3
    case 'REJECTED':
    case 'EXPIRED':
    case 'CANCELLED':
      return -1
    default:
      return 0
  }
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const [submitting, setSubmitting] = useState(false)
  const [activityRefresh, setActivityRefresh] = useState(0)

  const contract = useAsync(async () => {
    try {
      return (await contractsApi.get(id!)).data
    } catch {
      const list = (await contractsApi.list()).data
      const found = list.find((c) => c.id === id)
      if (!found) throw new Error(t('error.contractNotFound'))
      return found
    }
  }, [id, t])

  useEffect(() => {
    if (!contract.data) return
    trackRecentEntity({
      id: contract.data.id,
      type: 'contract',
      label: contract.data.code,
      hint: contract.data.status,
      to: `/contracts/${contract.data.id}`,
    })
  }, [contract.data])

  const customers = useAsync(async () => (await customersApi.list()).data, [])
  const history = useAsync(
    async () => (await workflowsApi.documentHistory('CONTRACT', id!)).data,
    [id],
  )

  const customer = (customers.data ?? []).find((c: Customer) => c.id === contract.data?.customer_id)

  async function handleSubmit() {
    if (!contract.data) return
    setSubmitting(true)
    try {
      await contractsApi.addAttachment(contract.data.id)
      await contractsApi.submit(contract.data.id)
      showToast('success', t('toast.contractSubmitted'), interpolate(t('toast.contractSubmittedDesc'), { code: contract.data.code }))
      await contract.reload()
      await history.reload()
      setActivityRefresh((n) => n + 1)
    } catch (err) {
      showToast('error', t('toast.submitFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSubmitting(false)
    }
  }

  if (contract.loading) return <DetailSkeleton />
  if (contract.error || !contract.data) {
    return (
      <div>
        <PageHeader title={t('error.contractNotFound')} subtitle={contract.error ?? t('error.invalidId')} />
        <button className="btn btn-secondary" onClick={() => navigate('/contracts')}>
          {Icons.arrowLeft} {t('detail.backToContracts')}
        </button>
      </div>
    )
  }

  const c = contract.data
  const stepIndex = lifecycleIndex(c.status)
  const terminal =
    c.status === 'REJECTED' || c.status === 'EXPIRED' || c.status === 'CANCELLED'
      ? c.status
      : null

  return (
    <div className="page-enter">
      <Link to="/contracts" className="back-link">
        {Icons.arrowLeft} {t('detail.backToContracts')}
      </Link>

      <PageHeader
        eyebrow={t('detail.contractDetail')}
        title={c.code}
        subtitle={c.title || t('page.contracts.subtitle')}
        actions={
          c.status === 'DRAFT' ? (
            <button className="btn" disabled={submitting} onClick={handleSubmit}>
              {submitting ? t('common.submitting') : t('common.submit')}
            </button>
          ) : undefined
        }
      />

      <div className="status-ribbon" aria-label={t('contract.lifecycleTitle')}>
        <div className="status-ribbon-head">
          <h3 className="status-ribbon-title">{t('contract.lifecycleTitle')}</h3>
          <p className="status-ribbon-sub">{t('contract.lifecycleSubtitle')}</p>
        </div>
        <ol className="status-ribbon-track">
          {LIFECYCLE_STEPS.map((step, index) => {
            const done = stepIndex >= 0 && index < stepIndex
            const active = stepIndex >= 0 && index === stepIndex && !terminal
            const stepKey = `status.${step}` as MessageKey
            return (
              <li
                key={step}
                className={`status-ribbon-step${done ? ' done' : ''}${active ? ' active' : ''}${terminal ? ' muted' : ''}`}
              >
                <span className="status-ribbon-dot" aria-hidden="true">
                  {done ? '✓' : index + 1}
                </span>
                <span className="status-ribbon-label">{t(stepKey)}</span>
              </li>
            )
          })}
        </ol>
        {terminal && (
          <p className="status-ribbon-terminal">
            {t('contract.lifecycleTerminal')}: <StatusBadge status={terminal} />
          </p>
        )}
        {c.status === 'REVISION_REQUESTED' && (
          <p className="status-ribbon-terminal">
            {tStatus('REVISION_REQUESTED', t)} — {t('contract.lifecycleRevision')}
          </p>
        )}
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('card.contractInfo')}</h3>
          </div>
          <dl className="detail-list">
            <div><dt>{t('detail.status')}</dt><dd><StatusBadge status={c.status} /></dd></div>
            <div><dt>{t('detail.customer')}</dt><dd>{customer ? `${customer.code} — ${customer.name}` : c.customer_id}</dd></div>
            <div><dt>{t('detail.effectivePeriod')}</dt><dd>{c.effective_from} → {c.effective_to}</dd></div>
            <div><dt>{t('detail.totalValue')}</dt><dd>{formatNumber(c.total_value, locale)} {t('billing.currency')}</dd></div>
            <div><dt>{t('detail.currentAssignee')}</dt><dd>{c.current_assignee_role?.replace(/_/g, ' ') ?? t('common.none')}</dd></div>
            <div><dt>{t('detail.workflowId')}</dt><dd className="cell-mono">{c.workflow_id?.slice(0, 8) ?? t('common.none')}…</dd></div>
          </dl>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('workflow.timelineTitle')}</h3>
              <p className="card-subtitle">{t('workflow.timelineSubtitle')}</p>
            </div>
          </div>
          {history.loading ? <DetailSkeleton /> : <WorkflowTimeline logs={history.data ?? []} />}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <ActivityTimeline
          entityType="CONTRACT"
          entityId={c.id}
          defaultOpen={activityRefresh > 0}
          refreshToken={activityRefresh}
        />
      </div>
    </div>
  )
}

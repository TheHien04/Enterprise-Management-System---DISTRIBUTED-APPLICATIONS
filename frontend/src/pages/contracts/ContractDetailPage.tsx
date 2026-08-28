import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { contractsApi, customersApi, workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { DetailSkeleton, PageHeader, StatusBadge } from '@/components/ui'
import WorkflowTimeline from '@/components/ui/WorkflowTimeline'
import { Icons } from '@/components/ui/icons'
import { formatNumber } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import type { Customer } from '@/types/domain'

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const [submitting, setSubmitting] = useState(false)

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
    </div>
  )
}

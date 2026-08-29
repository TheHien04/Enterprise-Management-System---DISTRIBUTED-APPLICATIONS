import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { billingApi, workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { DetailSkeleton, EmptyState, PageHeader, StatusBadge } from '@/components/ui'
import ActivityTimeline from '@/components/ui/ActivityTimeline'
import WorkflowTimeline from '@/components/ui/WorkflowTimeline'
import { Icons } from '@/components/ui/icons'
import { formatNumber } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import { trackRecentEntity } from '@/lib/recentEntities'
import type { BillingSheet } from '@/types/domain'

const WIZARD_STEP_KEYS = [
  'billing.stepDraft',
  'billing.stepCalculate',
  'billing.stepReconcile',
  'billing.stepSubmit',
  'billing.stepEsign',
  'billing.stepIssued',
] as const

function billingWizardStepIndex(sheet: BillingSheet): number {
  if (sheet.issuance_status === 'ISSUED') return 5

  if (['PENDING_SEND', 'SIGNING', 'SIGNED', 'FAILED'].includes(sheet.signing_status)) {
    return sheet.signing_status === 'SIGNED' ? 5 : 4
  }

  const approvalIndex: Record<string, number> = {
    DRAFT: 0,
    CALCULATED: 1,
    RECONCILED: 2,
    SUBMITTED: 3,
    APPROVED: 4,
    REJECTED: 3,
    REVISION_REQUESTED: 2,
  }
  return approvalIndex[sheet.approval_status] ?? 0
}

function downloadCsv(detail: BillingSheet, locale: 'en' | 'vi') {
  const rows = [
    ['Contract', detail.contract_code],
    ['Period', detail.period],
    ['Tax rate', String(detail.tax_rate)],
    ['Subtotal', String(detail.subtotal)],
    ['Tax', String(detail.tax_amount)],
    ['Total', String(detail.total)],
    [],
    ['Service', 'Qty', 'Unit price', 'Snapshot price', 'Amount'],
    ...(detail.items ?? []).map((item) => [
      item.service_code,
      String(item.quantity),
      String(item.unit_price),
      String(item.snapshot_unit_price),
      String(item.amount),
    ]),
  ]
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `statement-${detail.contract_code}-${detail.period}-${locale}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BillingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, locale } = useLocale()

  const sheet = useAsync(async () => (await billingApi.get(id!)).data, [id])
  const adjustments = useAsync(async () => {
    try {
      return (await billingApi.listAdjustments(id!)).data
    } catch {
      return []
    }
  }, [id])
  const history = useAsync(
    async () => (await workflowsApi.documentHistory('BILLING_SHEET', id!)).data,
    [id],
  )

  useEffect(() => {
    if (!sheet.data) return
    trackRecentEntity({
      id: sheet.data.id,
      type: 'billing',
      label: `${sheet.data.contract_code} · ${sheet.data.period}`,
      hint: sheet.data.approval_status,
      to: `/billing/${sheet.data.id}`,
    })
  }, [sheet.data])

  if (sheet.loading) return <DetailSkeleton />
  if (sheet.error || !sheet.data) {
    return (
      <div>
        <PageHeader title={t('error.billingNotFound')} subtitle={sheet.error ?? t('error.invalidId')} />
        <button className="btn btn-secondary" onClick={() => navigate('/billing')}>
          {Icons.arrowLeft} {t('detail.backToBilling')}
        </button>
      </div>
    )
  }

  const detail = sheet.data
  const currentStep = billingWizardStepIndex(detail)
  const signingActive = ['PENDING_SEND', 'SIGNING'].includes(detail.signing_status)
  const issued = detail.issuance_status === 'ISSUED'

  return (
    <div className="page-enter billing-detail-page">
      <Link to="/billing" className="back-link no-print">
        {Icons.arrowLeft} {t('detail.backToBilling')}
      </Link>

      <PageHeader
        eyebrow={t('uc.paymentStatements')}
        title={`${detail.contract_code} · ${detail.period}`}
        subtitle={t('page.billingDetail.subtitle')}
        actions={
          <div className="page-actions-row no-print">
            <button type="button" className="btn btn-secondary" onClick={() => downloadCsv(detail, locale)}>
              {t('billing.exportCsv')}
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              {t('billing.printStatement')}
            </button>
            <Link to="/esign" className="btn btn-secondary">
              {t('detail.goToEsign')}
            </Link>
          </div>
        }
      />

      {signingActive && (
        <div className="alert alert-info no-print" style={{ marginBottom: 16 }}>
          {interpolate(t('billing.signingBanner'), { status: detail.signing_status.replace(/_/g, ' ') })}
        </div>
      )}
      {issued && (
        <div className="alert alert-success no-print" style={{ marginBottom: 16 }}>
          {t('billing.issuedBanner')}
        </div>
      )}

      <div className="statement-sheet">
        <div className="statement-header">
          <div>
            <p className="statement-brand">{t('brand.name')}</p>
            <h2 className="statement-title">{t('billing.statementTitle')}</h2>
            <p className="statement-company">{t('billing.companyName')}</p>
            <p className="statement-company-meta">{t('billing.companyAddress')}</p>
            <p className="statement-company-meta">{t('billing.companyTax')}</p>
            <p className="statement-meta">
              {detail.contract_code} · {detail.period}
            </p>
          </div>
          <div className="statement-badges">
            <StatusBadge status={detail.approval_status} />
            <StatusBadge status={detail.signing_status} />
            <StatusBadge status={detail.issuance_status} />
          </div>
        </div>

        <div className="grid-stats statement-totals" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <p className="stat-card-label">{t('col.subtotal')}</p>
            <p className="stat-card-value">{formatNumber(detail.subtotal, locale)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">{interpolate(t('billing.taxRate'), { rate: detail.tax_rate })}</p>
            <p className="stat-card-value">{formatNumber(detail.tax_amount, locale)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card-label">{t('col.total')}</p>
            <p className="stat-card-value">{formatNumber(detail.total, locale)} {t('billing.currency')}</p>
          </div>
        </div>

        {detail.items && detail.items.length > 0 && (
          <div className="table-wrap">
            <table className="data-table data-table-dense">
              <thead>
                <tr>
                  <th>{t('col.service')}</th>
                  <th>{t('col.qty')}</th>
                  <th>{t('col.unitPrice')}</th>
                  <th>{t('col.snapshotPrice')}</th>
                  <th>{t('col.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-mono">{item.service_code}</td>
                    <td>{item.quantity}</td>
                    <td>{formatNumber(item.unit_price, locale)}</td>
                    <td>{formatNumber(item.snapshot_unit_price, locale)}</td>
                    <td>{formatNumber(item.amount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card no-print" style={{ marginBottom: 20, marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('billing.wizardTitle')}</h3>
          </div>
        </div>
        <ol className="flow-steps" style={{ padding: '0 20px 20px' }}>
          {WIZARD_STEP_KEYS.map((key, index) => {
            const done = index < currentStep
            const active = index === currentStep
            return (
              <li
                key={key}
                className="flow-step"
                style={active ? { opacity: 1 } : done ? { opacity: 0.85 } : { opacity: 0.5 }}
              >
                <span
                  className="flow-step-num"
                  style={
                    active
                      ? { background: 'var(--teal-600)', color: '#fff' }
                      : done
                        ? { background: 'var(--success-bg)', color: '#065f46' }
                        : undefined
                  }
                >
                  {index + 1}
                </span>
                <div>
                  <p className="flow-step-title">{t(key)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="detail-grid no-print">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('card.sheetDetail')}</h3>
          </div>
          <dl className="detail-list">
            <div><dt>{t('col.contract')}</dt><dd className="cell-mono">{detail.contract_code}</dd></div>
            <div><dt>{t('col.period')}</dt><dd>{detail.period}</dd></div>
            <div><dt>{t('col.approval')}</dt><dd><StatusBadge status={detail.approval_status} /></dd></div>
            <div><dt>{t('col.signing')}</dt><dd><StatusBadge status={detail.signing_status} /></dd></div>
            <div><dt>{t('col.issuance')}</dt><dd><StatusBadge status={detail.issuance_status} /></dd></div>
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

      <div className="no-print" style={{ marginTop: 20 }}>
        <ActivityTimeline entityType="BILLING_SHEET" entityId={detail.id} />
      </div>

      <div className="card no-print" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title">{t('card.adjustments')}</h3>
        </div>
        {(adjustments.data ?? []).length === 0 ? (
          <EmptyState title={t('empty.noAdjustments')} description={t('empty.noAdjustmentsDesc')} />
        ) : (
          <div className="table-wrap">
            <table className="data-table data-table-dense">
              <thead>
                <tr>
                  <th>{t('col.type')}</th>
                  <th>{t('col.adjustment')}</th>
                  <th>{t('col.reason')}</th>
                </tr>
              </thead>
              <tbody>
                {(adjustments.data ?? []).map((adj) => (
                  <tr key={adj.id}>
                    <td className="cell-mono">{adj.adjustment_type}</td>
                    <td>{formatNumber(adj.amount_delta, locale)} {t('billing.currency')}</td>
                    <td>{adj.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

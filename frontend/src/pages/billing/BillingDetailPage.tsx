import { Link, useNavigate, useParams } from 'react-router-dom'
import { billingApi, workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { DetailSkeleton, EmptyState, PageHeader, StatusBadge } from '@/components/ui'
import WorkflowTimeline from '@/components/ui/WorkflowTimeline'
import { Icons } from '@/components/ui/icons'
import { formatNumber } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'

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

  return (
    <div className="page-enter">
      <Link to="/billing" className="back-link">
        {Icons.arrowLeft} {t('detail.backToBilling')}
      </Link>

      <PageHeader
        eyebrow={t('uc.paymentStatements')}
        title={`${detail.contract_code} · ${detail.period}`}
        subtitle={t('page.billingDetail.subtitle')}
        actions={
          <Link to="/esign" className="btn btn-secondary">
            {t('detail.goToEsign')}
          </Link>
        }
      />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
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
          <p className="stat-card-value">{formatNumber(detail.total, locale)}</p>
        </div>
      </div>

      <div className="detail-grid">
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

      {detail.items && detail.items.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">{t('card.lineItems')}</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('col.service')}</th>
                  <th>{t('col.qty')}</th>
                  <th>{t('col.unitPrice')}</th>
                  <th>{t('col.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-mono">{item.service_code}</td>
                    <td>{item.quantity}</td>
                    <td>{formatNumber(item.unit_price, locale)}</td>
                    <td>{formatNumber(item.amount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3 className="card-title">{t('card.adjustments')}</h3>
        </div>
        {(adjustments.data ?? []).length === 0 ? (
          <EmptyState title={t('empty.noAdjustments')} description={t('empty.noAdjustmentsDesc')} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
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

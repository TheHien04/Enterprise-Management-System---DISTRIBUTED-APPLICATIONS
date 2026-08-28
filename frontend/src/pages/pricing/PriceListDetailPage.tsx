import { Link, useNavigate, useParams } from 'react-router-dom'
import { pricingApi, workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { DetailSkeleton, PageHeader, StatusBadge } from '@/components/ui'
import WorkflowTimeline from '@/components/ui/WorkflowTimeline'
import { Icons } from '@/components/ui/icons'
import { formatNumber } from '@/i18n/helpers'

export default function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, locale } = useLocale()

  const priceList = useAsync(async () => {
    try {
      return (await pricingApi.getPriceList(id!)).data
    } catch {
      const list = (await pricingApi.listPriceLists()).data
      const found = list.find((p) => p.id === id)
      if (!found) throw new Error(t('error.priceListNotFound'))
      return found
    }
  }, [id, t])

  const history = useAsync(
    async () => (await workflowsApi.documentHistory('PRICE_LIST', id!)).data,
    [id],
  )

  if (priceList.loading) return <DetailSkeleton />
  if (priceList.error || !priceList.data) {
    return (
      <div>
        <PageHeader title={t('error.priceListNotFound')} subtitle={priceList.error ?? t('error.invalidId')} />
        <button className="btn btn-secondary" onClick={() => navigate('/pricing')}>
          {Icons.arrowLeft} {t('detail.backToPricing')}
        </button>
      </div>
    )
  }

  const pl = priceList.data

  return (
    <div className="page-enter">
      <Link to="/pricing" className="back-link">
        {Icons.arrowLeft} {t('detail.backToPricing')}
      </Link>

      <PageHeader
        eyebrow={t('uc.pricingCatalog')}
        title={`${pl.contract_code} v${pl.version}`}
        subtitle={t('page.pricingDetail.subtitle')}
      />

      <div className="detail-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('card.priceListInfo')}</h3>
          </div>
          <dl className="detail-list">
            <div><dt>{t('col.contract')}</dt><dd className="cell-mono">{pl.contract_code}</dd></div>
            <div><dt>{t('col.version')}</dt><dd>v{pl.version}</dd></div>
            <div><dt>{t('detail.effectivePeriod')}</dt><dd>{pl.effective_from} → {pl.effective_to}</dd></div>
            <div><dt>{t('detail.status')}</dt><dd><StatusBadge status={pl.status} /></dd></div>
            <div><dt>{t('col.items')}</dt><dd>{pl.items?.length ?? 0}</dd></div>
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

      {pl.items && pl.items.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">{t('pricing.lineItems')}</h3>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('col.service')}</th>
                  <th>{t('col.unitPrice')}</th>
                </tr>
              </thead>
              <tbody>
                {pl.items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-mono">{item.service_code}</td>
                    <td>{formatNumber(item.unit_price, locale)} {t('billing.currency')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

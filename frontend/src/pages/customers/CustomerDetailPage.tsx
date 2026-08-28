import { Link, useNavigate, useParams } from 'react-router-dom'
import { customersApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { DetailSkeleton, PageHeader, StatusBadge, StatCard } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { Icons } from '@/components/ui/icons'
import { formatNumber } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import type { Contract } from '@/types/domain'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, locale } = useLocale()

  const overview = useAsync(async () => (await customersApi.overview(id!)).data, [id])

  const contractColumns: DataTableColumn<Contract>[] = [
    {
      key: 'code',
      header: t('col.code'),
      sortable: true,
      sortValue: (r) => r.code,
      render: (r) => (
        <Link to={`/contracts/${r.id}`} className="link-primary cell-mono">
          {r.code} {Icons.external}
        </Link>
      ),
    },
    {
      key: 'status',
      header: t('col.status'),
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'from',
      header: t('col.from'),
      sortable: true,
      sortValue: (r) => r.effective_from,
      render: (r) => r.effective_from,
    },
    {
      key: 'to',
      header: t('col.to'),
      render: (r) => r.effective_to,
    },
    {
      key: 'value',
      header: t('col.value'),
      sortable: true,
      sortValue: (r) => r.total_value,
      render: (r) => formatNumber(r.total_value, locale),
    },
  ]

  if (overview.loading) return <DetailSkeleton />
  if (overview.error || !overview.data) {
    return (
      <div>
        <PageHeader title={t('error.customerNotFound')} subtitle={overview.error ?? t('error.invalidId')} />
        <button className="btn btn-secondary" onClick={() => navigate('/customers')}>
          {Icons.arrowLeft} {t('detail.backToCustomers')}
        </button>
      </div>
    )
  }

  const { customer, contracts, price_list_count, billing_sheet_count } = overview.data

  return (
    <div className="page-enter">
      <Link to="/customers" className="back-link">
        {Icons.arrowLeft} {t('detail.backToCustomers')}
      </Link>

      <PageHeader
        eyebrow={t('detail.customer360')}
        title={customer.name}
        subtitle={`${customer.code} · ${customer.tax_code ?? t('detail.noTaxCode')}`}
      />

      <div className="grid-stats">
        <StatCard label={t('nav.contracts')} value={contracts.length} icon={Icons.contracts} />
        <StatCard label={t('nav.pricing')} value={price_list_count} icon={Icons.pricing} />
        <StatCard label={t('nav.billing')} value={billing_sheet_count} icon={Icons.billing} />
        <StatCard label={t('detail.accountStatus')} value={customer.status} icon={Icons.customers} />
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="card-header"><h3 className="card-title">{t('card.accountDetails')}</h3></div>
          <dl className="detail-list">
            <div><dt>{t('col.code')}</dt><dd className="cell-mono">{customer.code}</dd></div>
            <div><dt>{t('detail.status')}</dt><dd><StatusBadge status={customer.status} /></dd></div>
            <div><dt>{t('detail.representative')}</dt><dd>{customer.representative ?? t('common.none')}</dd></div>
            <div><dt>{t('detail.email')}</dt><dd>{customer.contact_email ?? t('common.none')}</dd></div>
            <div><dt>{t('detail.phone')}</dt><dd>{customer.contact_phone ?? t('common.none')}</dd></div>
            <div><dt>{t('detail.address')}</dt><dd>{customer.address ?? t('common.none')}</dd></div>
          </dl>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('card.linkedContracts')}</h3>
              <p className="card-subtitle">
                {interpolate(t('card.linkedContractsCount'), { count: contracts.length })}
              </p>
            </div>
          </div>
          <DataTable
            columns={contractColumns}
            data={contracts}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.code} ${r.status} ${r.title}`}
            searchPlaceholder={t('search.contracts')}
            emptyTitle={t('empty.noLinkedContracts')}
            emptyDescription={t('empty.noLinkedContractsDesc')}
          />
        </div>
      </div>
    </div>
  )
}

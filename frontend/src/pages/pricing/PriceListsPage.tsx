import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { pricingApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { interpolate } from '@/i18n/messages'
import type { PriceList, ServiceCatalogItem } from '@/types/domain'

export default function PriceListsPage() {
  const { showToast } = useToast()
  const { t } = useLocale()
  const lists = useAsync(async () => (await pricingApi.listPriceLists()).data, [])
  const catalog = useAsync(async () => (await pricingApi.listCatalog()).data, [])
  const [form, setForm] = useState({
    contract_code: 'HD2026001',
    version: '1.0',
    effective_from: '2026-07-01',
    effective_to: '2026-12-31',
    service_code: '',
    unit_price: 100000,
  })
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (!form.service_code) {
      showToast('error', 'Missing service', 'Select a service from the catalog')
      return
    }
    setSaving(true)
    try {
      await pricingApi.createPriceList({
        contract_code: form.contract_code,
        version: form.version,
        effective_from: form.effective_from,
        effective_to: form.effective_to,
        items: [{ service_code: form.service_code, unit_price: form.unit_price }],
      })
      showToast('success', 'Price list created', `${form.contract_code} v${form.version}`)
      await lists.reload()
    } catch (err) {
      showToast('error', 'Create failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function submitList(row: PriceList) {
    setSubmitting(row.id)
    try {
      await pricingApi.submitPriceList(row.id)
      showToast('success', 'Submitted for approval', `${row.contract_code} v${row.version}`)
      await lists.reload()
    } catch (err) {
      showToast('error', 'Submit failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(null)
    }
  }

  const columns: DataTableColumn<PriceList>[] = [
    { key: 'contract', header: t('col.contract'), sortable: true, sortValue: (r) => r.contract_code, render: (r) => (
      <Link to={`/pricing/${r.id}`} className="link-primary cell-mono">{r.contract_code}</Link>
    ) },
    { key: 'version', header: t('col.version'), sortable: true, sortValue: (r) => r.version, render: (r) => `v${r.version}` },
    { key: 'from', header: t('col.from'), sortable: true, sortValue: (r) => r.effective_from, render: (r) => r.effective_from },
    { key: 'to', header: t('col.to'), render: (r) => r.effective_to },
    { key: 'items', header: t('col.items'), render: (r) => r.items?.length ?? t('common.none') },
    { key: 'status', header: t('col.status'), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (r) =>
        r.status === 'DRAFT' ? (
          <button className="btn btn-sm" disabled={submitting === r.id} onClick={() => submitList(r)}>
            {submitting === r.id ? '…' : t('common.submit')}
          </button>
        ) : null,
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.pricingCatalog')}
        title={t('page.pricing.title')}
        subtitle={t('page.pricing.subtitle')}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.newPriceList')}</h3>
            <p className="card-subtitle">{t('card.newPriceListDesc')}</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 640 }} onSubmit={onCreate}>
          <div className="form-field">
            <label htmlFor="pl-contract">{t('form.contractCode')}</label>
            <input id="pl-contract" className="input" value={form.contract_code} onChange={(e) => setForm({ ...form, contract_code: e.target.value })} required />
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="pl-version">{t('form.version')}</label>
              <input id="pl-version" className="input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} required />
            </div>
            <div className="form-field">
              <label htmlFor="pl-service">{t('col.service')}</label>
              <select id="pl-service" className="input" value={form.service_code} onChange={(e) => setForm({ ...form, service_code: e.target.value })} required>
                <option value="">{t('form.selectService')}</option>
                {(catalog.data ?? []).map((s: ServiceCatalogItem) => (
                  <option key={s.id} value={s.code}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="pl-from">{t('form.effectiveFrom')}</label>
              <input id="pl-from" className="input" type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="pl-to">{t('form.effectiveTo')}</label>
              <input id="pl-to" className="input" type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="pl-price">{t('form.unitPrice')}</label>
            <input id="pl-price" className="input" type="number" min={0} value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} />
          </div>
          <div>
            <button className="btn" type="submit" disabled={saving}>{saving ? t('common.creating') : t('common.create')}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.activePriceLists')}</h3>
            <p className="card-subtitle">{interpolate(t('card.activePriceListsCount'), { count: lists.data?.length ?? 0 })}</p>
          </div>
        </div>
        {lists.error && <div className="alert alert-error">{lists.error}</div>}
        {lists.loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <DataTable
            columns={columns}
            data={lists.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.contract_code} ${r.version} ${r.status}`}
            searchPlaceholder={t('search.priceLists')}
            emptyTitle={t('empty.noPriceLists')}
            emptyDescription={t('empty.noPriceListsDesc')}
          />
        )}
      </div>
    </div>
  )
}

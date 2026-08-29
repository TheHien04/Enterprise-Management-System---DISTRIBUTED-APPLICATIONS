import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { pricingApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { formatNumber } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import type { PriceList, PriceListCompareRow, ServiceCatalogItem } from '@/types/domain'

export default function PriceListsPage() {
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const lists = useAsync(async () => (await pricingApi.listPriceLists()).data, [])
  const catalog = useAsync(async () => (await pricingApi.listCatalog()).data, [])
  const [form, setForm] = useState({
    contract_code: 'HD2026001',
    version: `demo-${Date.now().toString().slice(-6)}`,
    effective_from: '2028-01-01',
    effective_to: '2028-06-30',
    service_code: '',
    unit_price: 100000,
  })
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState('')
  const [comparing, setComparing] = useState(false)
  const [compareRows, setCompareRows] = useState<PriceListCompareRow[] | null>(null)
  const [compareMeta, setCompareMeta] = useState<{ labelA: string; labelB: string } | null>(null)

  useEffect(() => {
    const items = lists.data ?? []
    if (items.length < 2 || compareA || compareB) return
    setCompareA(items[0].id)
    setCompareB(items[1].id)
  }, [lists.data, compareA, compareB])

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
      showToast('success', t('toast.priceListCreated'), `${form.contract_code} v${form.version}`)
      setForm((prev) => ({
        ...prev,
        version: `demo-${Date.now().toString().slice(-6)}`,
      }))
      await lists.reload()
    } catch (err) {
      showToast('error', t('toast.createFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSaving(false)
    }
  }

  async function submitList(row: PriceList) {
    setSubmitting(row.id)
    try {
      await pricingApi.submitPriceList(row.id)
      showToast('success', t('toast.submittedForApproval'), `${row.contract_code} v${row.version}`)
      await lists.reload()
    } catch (err) {
      showToast('error', t('toast.submitFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSubmitting(null)
    }
  }

  async function runCompare(event: FormEvent) {
    event.preventDefault()
    if (!compareA || !compareB) return
    if (compareA === compareB) {
      showToast('info', t('pricing.sameVersionTitle'), t('pricing.sameVersionDesc'))
      return
    }
    setComparing(true)
    try {
      const result = await pricingApi.comparePriceLists(compareA, compareB)
      setCompareRows(result.rows)
      setCompareMeta({
        labelA: `${result.listA.contract_code} v${result.listA.version}`,
        labelB: `${result.listB.contract_code} v${result.listB.version}`,
      })
    } catch (err) {
      showToast('error', t('toast.loadFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setComparing(false)
    }
  }

  function listLabel(pl: PriceList) {
    return `${pl.contract_code} v${pl.version} (${pl.effective_from} → ${pl.effective_to})`
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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('pricing.compareTitle')}</h3>
            <p className="card-subtitle">{t('pricing.compareSubtitle')}</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 720 }} onSubmit={runCompare}>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="compare-a">{t('pricing.selectListA')}</label>
              <select
                id="compare-a"
                className="input"
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                required
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {(lists.data ?? []).map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {listLabel(pl)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="compare-b">{t('pricing.selectListB')}</label>
              <select
                id="compare-b"
                className="input"
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                required
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {(lists.data ?? []).map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {listLabel(pl)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button className="btn" type="submit" disabled={comparing || lists.loading}>
              {comparing ? t('common.processing') : t('pricing.compare')}
            </button>
          </div>
        </form>

        {compareRows && compareMeta && (
          <div style={{ padding: '0 20px 20px' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 12px' }}>{t('pricing.compareResult')}</h4>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('col.service')}</th>
                    <th>{compareMeta.labelA}</th>
                    <th>{compareMeta.labelB}</th>
                    <th>{t('pricing.priceDelta')}</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.service_code}>
                      <td className="cell-mono">{row.service_code}</td>
                      <td>
                        {row.price_a != null ? formatNumber(row.price_a, locale) : t('pricing.onlyInB')}
                      </td>
                      <td>
                        {row.price_b != null ? formatNumber(row.price_b, locale) : t('pricing.onlyInA')}
                      </td>
                      <td>
                        {row.delta != null ? (
                          <span style={{ color: row.delta !== 0 ? 'var(--teal-700)' : 'inherit' }}>
                            {row.delta > 0 ? '+' : ''}
                            {formatNumber(row.delta, locale)}
                          </span>
                        ) : (
                          t('common.none')
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

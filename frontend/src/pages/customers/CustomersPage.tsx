import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { customersApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { Icons } from '@/components/ui/icons'
import { interpolate } from '@/i18n/messages'
import type { Customer } from '@/types/domain'

export default function CustomersPage() {
  const { showToast } = useToast()
  const { t } = useLocale()
  const { data, error, loading, reload } = useAsync(async () => (await customersApi.list()).data, [])
  const [form, setForm] = useState(() => ({
    code: `KH${Date.now().toString().slice(-6)}`,
    name: '',
    tax_code: '',
  }))
  const [saving, setSaving] = useState(false)

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const code = form.code
      await customersApi.create(form)
      setForm({ code: `KH${Date.now().toString().slice(-6)}`, name: '', tax_code: '' })
      showToast('success', t('toast.customerCreated'), interpolate(t('toast.customerCreatedDesc'), { code }))
      await reload()
    } catch (err) {
      showToast('error', t('toast.createFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSaving(false)
    }
  }

  async function onSuspend(item: Customer) {
    try {
      await customersApi.suspend(item.id)
      showToast('info', t('toast.customerSuspended'), item.code)
      await reload()
    } catch (err) {
      showToast('error', t('toast.suspendFailed'), err instanceof Error ? err.message : t('error.unknown'))
    }
  }

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'code',
      header: t('col.code'),
      sortable: true,
      sortValue: (r) => r.code,
      render: (r) => (
        <Link to={`/customers/${r.id}`} className="link-primary cell-mono">
          {r.code} {Icons.external}
        </Link>
      ),
    },
    {
      key: 'name',
      header: t('col.company'),
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => r.name,
    },
    {
      key: 'tax',
      header: t('col.taxCode'),
      render: (r) => r.tax_code ?? t('common.none'),
    },
    {
      key: 'status',
      header: t('col.status'),
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (r) =>
        r.status === 'ACTIVE' ? (
          <button className="btn btn-secondary btn-sm" onClick={() => onSuspend(r)}>{t('common.suspend')}</button>
        ) : null,
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.customerMaster')}
        title={t('page.customers.title')}
        subtitle={t('page.customers.subtitle')}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.newCustomer')}</h3>
            <p className="card-subtitle">{t('card.newCustomerDesc')}</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 520 }} onSubmit={onCreate}>
          <div className="form-field">
            <label htmlFor="code">{t('form.customerCode')}</label>
            <input id="code" className="input" placeholder="KH0006" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="form-field">
            <label htmlFor="name">{t('form.companyName')}</label>
            <input id="name" className="input" placeholder={t('form.companyName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-field">
            <label htmlFor="tax">{t('form.taxCode')}</label>
            <input id="tax" className="input" placeholder={t('common.optional')} value={form.tax_code} onChange={(e) => setForm({ ...form, tax_code: e.target.value })} />
          </div>
          <div>
            <button className="btn" type="submit" disabled={saving}>{saving ? t('common.creating') : t('common.create')}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.customerDirectory')}</h3>
            <p className="card-subtitle">
              {interpolate(t('card.customerDirectoryCount'), { count: data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : (
          <DataTable
            columns={columns}
            data={data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.code} ${r.name} ${r.tax_code ?? ''} ${r.status}`}
            searchPlaceholder={t('search.customers')}
            emptyTitle={t('empty.noCustomers')}
            emptyDescription={t('empty.noCustomersDesc')}
          />
        )}
      </div>
    </div>
  )
}

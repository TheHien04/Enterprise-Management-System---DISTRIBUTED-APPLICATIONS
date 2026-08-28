import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { contractsApi, customersApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { Icons } from '@/components/ui/icons'
import { interpolate } from '@/i18n/messages'
import type { Contract, Customer } from '@/types/domain'

export default function ContractsPage() {
  const { showToast } = useToast()
  const { t } = useLocale()
  const customers = useAsync(async () => (await customersApi.list()).data, [])
  const contracts = useAsync(async () => (await contractsApi.list()).data, [])
  const [form, setForm] = useState({
    code: '',
    customer_id: '',
    title: '',
    effective_from: '2026-07-01',
    effective_to: '2026-12-31',
    total_value: 1000000,
  })
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const customerMap = Object.fromEntries((customers.data ?? []).map((c: Customer) => [c.id, c.code]))

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await contractsApi.create(form)
      showToast('success', t('toast.contractCreated'), interpolate(t('toast.contractCreatedDesc'), { code: form.code }))
      await contracts.reload()
    } catch (err) {
      showToast('error', t('toast.createFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSaving(false)
    }
  }

  async function prepareAndSubmit(contract: Contract) {
    setSubmitting(contract.id)
    try {
      await contractsApi.addAttachment(contract.id)
      await contractsApi.submit(contract.id)
      showToast('success', t('toast.submittedForApproval'), contract.code)
      await contracts.reload()
    } catch (err) {
      showToast('error', t('toast.submitFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSubmitting(null)
    }
  }

  const columns: DataTableColumn<Contract>[] = [
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
      key: 'customer',
      header: t('col.customer'),
      sortable: true,
      sortValue: (r) => customerMap[r.customer_id] ?? '',
      render: (r) => customerMap[r.customer_id] ?? r.customer_id,
    },
    {
      key: 'status',
      header: t('col.status'),
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'assignee',
      header: t('col.assignee'),
      render: (r) => r.current_assignee_role?.replace(/_/g, ' ') ?? t('common.none'),
    },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (r) => (
        <div className="cell-actions">
          <Link to={`/contracts/${r.id}`} className="btn btn-secondary btn-sm">{t('common.details')}</Link>
          {r.status === 'DRAFT' && (
            <button className="btn btn-sm" disabled={submitting === r.id} onClick={() => prepareAndSubmit(r)}>
              {submitting === r.id ? '…' : t('common.submit')}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.contractLifecycle')}
        title={t('page.contracts.title')}
        subtitle={t('page.contracts.subtitle')}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.newContract')}</h3>
            <p className="card-subtitle">{t('card.newContractDesc')}</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 560 }} onSubmit={onCreate}>
          <div className="form-field">
            <label htmlFor="contract-code">{t('form.contractCode')}</label>
            <input id="contract-code" className="input" placeholder="HD2026004" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div className="form-field">
            <label htmlFor="customer">{t('col.customer')}</label>
            <select id="customer" className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
              <option value="">{t('form.selectCustomer')}</option>
              {(customers.data ?? []).map((c: Customer) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="title">{t('form.title')}</label>
            <input id="title" className="input" placeholder={t('form.title')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="from">{t('form.effectiveFrom')}</label>
              <input id="from" className="input" type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="to">{t('form.effectiveTo')}</label>
              <input id="to" className="input" type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} />
            </div>
          </div>
          <div>
            <button className="btn" type="submit" disabled={saving}>{saving ? t('common.creating') : t('common.create')}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.contractRegistry')}</h3>
            <p className="card-subtitle">
              {interpolate(t('card.contractRegistryCount'), { count: contracts.data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {contracts.loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <DataTable
            columns={columns}
            data={contracts.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.code} ${customerMap[r.customer_id] ?? ''} ${r.status}`}
            searchPlaceholder={t('search.contracts')}
            emptyTitle={t('empty.noContracts')}
            emptyDescription={t('empty.noContractsDesc')}
          />
        )}
      </div>
    </div>
  )
}

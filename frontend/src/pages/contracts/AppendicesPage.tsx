import { FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { contractsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import type { Appendix, Contract } from '@/types/domain'

export default function AppendicesPage() {
  const { showToast } = useToast()
  const { t } = useLocale()
  const contracts = useAsync(async () => (await contractsApi.list()).data, [])
  const [selectedContractId, setSelectedContractId] = useState('')
  const appendices = useAsync(
    async () => {
      if (!selectedContractId) return []
      return (await contractsApi.listAppendices(selectedContractId)).data
    },
    [selectedContractId],
  )
  const [form, setForm] = useState({
    code: '',
    contract_id: '',
    title: '',
    change_summary: '',
    effective_date: '2026-08-01',
  })
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  const contractMap = useMemo(
    () => Object.fromEntries((contracts.data ?? []).map((c: Contract) => [c.id, c])),
    [contracts.data],
  )

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    const contractId = form.contract_id || selectedContractId
    if (!contractId) {
      showToast('error', 'Select contract', 'Choose a contract for the appendix')
      return
    }
    setSaving(true)
    try {
      await contractsApi.createAppendix({ ...form, contract_id: contractId })
      showToast('success', 'Appendix created', form.code)
      setSelectedContractId(contractId)
      await appendices.reload()
    } catch (err) {
      showToast('error', 'Create failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function submitAppendix(row: Appendix) {
    setSubmitting(row.id)
    try {
      await contractsApi.submitAppendix(row.id)
      showToast('success', 'Submitted for approval', row.code)
      await appendices.reload()
    } catch (err) {
      showToast('error', 'Submit failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(null)
    }
  }

  const columns: DataTableColumn<Appendix>[] = [
    { key: 'code', header: t('col.code'), sortable: true, sortValue: (r) => r.code, render: (r) => (
      <Link to={`/appendices/${r.id}`} className="link-primary cell-mono">{r.code}</Link>
    ) },
    {
      key: 'contract',
      header: 'Contract',
      render: (r) => contractMap[r.contract_id]?.code ?? r.contract_id.slice(0, 8),
    },
    { key: 'title', header: 'Title', render: (r) => r.title },
    { key: 'effective', header: 'Effective', render: (r) => r.effective_date },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status === 'DRAFT' ? (
          <button className="btn btn-sm" disabled={submitting === r.id} onClick={() => submitAppendix(r)}>
            {submitting === r.id ? '…' : t('common.submit')}
          </button>
        ) : null,
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="UC-03 · Contract amendments"
        title={t('page.appendices.title')}
        subtitle={t('page.appendices.subtitle')}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">New appendix</h3>
            <p className="card-subtitle">Amend an active contract with a tracked change summary</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 560 }} onSubmit={onCreate}>
          <div className="form-field">
            <label htmlFor="ap-contract">Contract</label>
            <select
              id="ap-contract"
              className="input"
              value={form.contract_id || selectedContractId}
              onChange={(e) => {
                setForm({ ...form, contract_id: e.target.value })
                setSelectedContractId(e.target.value)
              }}
              required
            >
              <option value="">Select contract</option>
              {(contracts.data ?? []).map((c: Contract) => (
                <option key={c.id} value={c.id}>{c.code} — {c.title || 'Untitled'}</option>
              ))}
            </select>
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="ap-code">Appendix code</label>
              <input id="ap-code" className="input" placeholder="PL01" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="form-field">
              <label htmlFor="ap-date">Effective date</label>
              <input id="ap-date" className="input" type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="ap-title">Title</label>
            <input id="ap-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-field">
            <label htmlFor="ap-summary">Change summary</label>
            <textarea id="ap-summary" className="input" rows={2} value={form.change_summary} onChange={(e) => setForm({ ...form, change_summary: e.target.value })} />
          </div>
          <div>
            <button className="btn" type="submit" disabled={saving}>{saving ? 'Creating…' : t('common.create')}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Appendices</h3>
            <p className="card-subtitle">
              {selectedContractId
                ? `${contractMap[selectedContractId]?.code ?? 'Contract'} — ${appendices.data?.length ?? 0} appendices`
                : 'Select a contract to view appendices'}
            </p>
          </div>
        </div>
        {!selectedContractId ? (
          <p style={{ color: 'var(--text-muted)' }}>Choose a contract above to load appendices.</p>
        ) : appendices.loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <DataTable
            columns={columns}
            data={appendices.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.code} ${r.title} ${r.status}`}
            searchPlaceholder="Search appendices…"
            emptyTitle="No appendices"
            emptyDescription="Create an appendix to amend contract terms."
          />
        )}
      </div>
    </div>
  )
}

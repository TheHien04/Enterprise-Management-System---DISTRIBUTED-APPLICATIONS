import { FormEvent, useState } from 'react'
import { esignApi } from '@/api/modules'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import type { EsignSession } from '@/types/domain'

export default function EsignPage() {
  const { showToast } = useToast()
  const { t } = useLocale()
  const [sessions, setSessions] = useState<EsignSession[]>([])
  const [form, setForm] = useState({ document_type: 'BILLING_SHEET', document_id: '' })
  const [lookupId, setLookupId] = useState('')
  const [starting, setStarting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)

  async function onStart(event: FormEvent) {
    event.preventDefault()
    setStarting(true)
    try {
      const res = await esignApi.startSession(form)
      setSessions((prev) => [res.data, ...prev.filter((s) => s.id !== res.data.id)])
      showToast('success', 'Session started', res.data.id.slice(0, 8))
      setLookupId(res.data.id)
    } catch (err) {
      showToast('error', 'Start failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setStarting(false)
    }
  }

  async function refreshSession(id: string) {
    setLoading(true)
    try {
      const res = await esignApi.getSession(id)
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === id)
        return exists ? prev.map((s) => (s.id === id ? res.data : s)) : [res.data, ...prev]
      })
      showToast('info', 'Session refreshed', res.data.status)
    } catch (err) {
      showToast('error', 'Lookup failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function completeSession(id: string, success: boolean) {
    setCompleting(id)
    try {
      const res = await esignApi.completeSession(id, success)
      setSessions((prev) => prev.map((s) => (s.id === id ? res.data : s)))
      showToast('success', success ? 'Signing completed' : 'Signing failed', id.slice(0, 8))
    } catch (err) {
      showToast('error', 'Complete failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCompleting(null)
    }
  }

  const columns: DataTableColumn<EsignSession>[] = [
    { key: 'id', header: 'Session', render: (r) => <span className="cell-mono">{r.id.slice(0, 8)}…</span> },
    { key: 'doc', header: 'Document', render: (r) => `${r.document_type} / ${r.document_id.slice(0, 8)}…` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'ref', header: 'Provider ref', render: (r) => r.provider_ref ?? '—' },
    { key: 'updated', header: 'Updated', render: (r) => new Date(r.updated_at).toLocaleString('en-SG') },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="cell-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => refreshSession(r.id)}>Refresh</button>
          {r.status === 'IN_PROGRESS' && (
            <>
              <button className="btn btn-sm" disabled={completing === r.id} onClick={() => completeSession(r.id, true)}>
                {completing === r.id ? '…' : 'Complete'}
              </button>
              <button className="btn btn-secondary btn-sm" disabled={completing === r.id} onClick={() => completeSession(r.id, false)}>
                Fail
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="UC-07 · Electronic signing"
        title={t('page.esign.title')}
        subtitle={t('page.esign.subtitle')}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Start signing session</h3>
            <p className="card-subtitle">Link to a billing sheet or contract document</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 560 }} onSubmit={onStart}>
          <div className="form-field">
            <label htmlFor="doc-type">Document type</label>
            <select id="doc-type" className="input" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
              <option value="BILLING_SHEET">Billing sheet</option>
              <option value="CONTRACT">Contract</option>
              <option value="APPENDIX">Appendix</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="doc-id">Document ID (UUID)</label>
            <input id="doc-id" className="input" placeholder="00000000-0000-0000-0000-000000000000" value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })} required />
          </div>
          <div>
            <button className="btn" type="submit" disabled={starting}>{starting ? 'Starting…' : 'Start session'}</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Lookup session</h3>
            <p className="card-subtitle">Retrieve status by session ID</p>
          </div>
        </div>
        <div className="form-grid" style={{ maxWidth: 560 }}>
          <div className="form-field">
            <label htmlFor="lookup-id">Session ID</label>
            <input id="lookup-id" className="input" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="UUID" />
          </div>
          <div>
            <button className="btn btn-secondary" disabled={!lookupId || loading} onClick={() => refreshSession(lookupId)}>
              {loading ? 'Loading…' : 'Get session'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Signing sessions</h3>
            <p className="card-subtitle">{sessions.length} sessions in this session</p>
          </div>
        </div>
        {sessions.length === 0 ? (
          <TableSkeleton rows={2} />
        ) : (
          <DataTable
            columns={columns}
            data={sessions}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.document_type} ${r.document_id} ${r.status}`}
            searchPlaceholder="Search sessions…"
            emptyTitle="No sessions yet"
            emptyDescription="Start a signing session to see it listed here."
          />
        )}
      </div>
    </div>
  )
}

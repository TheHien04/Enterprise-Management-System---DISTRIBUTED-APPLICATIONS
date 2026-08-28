import { FormEvent, useState } from 'react'
import { operationsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import type { Period, Volume } from '@/types/domain'

export default function VolumesPage() {
  const { showToast } = useToast()
  const { t } = useLocale()
  const periods = useAsync(async () => (await operationsApi.listPeriods()).data, [])
  const volumes = useAsync(async () => (await operationsApi.listVolumes('HD2026001')).data, [])
  const [periodInput, setPeriodInput] = useState('2026-08')
  const [creatingPeriod, setCreatingPeriod] = useState(false)
  const [lockingPeriod, setLockingPeriod] = useState<string | null>(null)
  const [volumeForm, setVolumeForm] = useState({
    contract_code: 'HD2026001',
    service_code: 'SVC-001',
    quantity: 100,
    record_date: '2026-08-15',
    period: '2026-08',
  })
  const [savingVolume, setSavingVolume] = useState(false)

  async function onCreatePeriod(event: FormEvent) {
    event.preventDefault()
    setCreatingPeriod(true)
    try {
      await operationsApi.createPeriod(periodInput)
      showToast('success', 'Period created', periodInput)
      await periods.reload()
    } catch (err) {
      showToast('error', 'Create period failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreatingPeriod(false)
    }
  }

  async function lockPeriodRow(period: string) {
    setLockingPeriod(period)
    try {
      await operationsApi.lockPeriod(period)
      showToast('success', 'Period locked', period)
      await periods.reload()
    } catch (err) {
      showToast('error', 'Lock failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLockingPeriod(null)
    }
  }

  async function onCreateVolume(event: FormEvent) {
    event.preventDefault()
    setSavingVolume(true)
    try {
      await operationsApi.createVolume(volumeForm)
      showToast('success', 'Volume recorded', `${volumeForm.service_code} × ${volumeForm.quantity}`)
      await volumes.reload()
    } catch (err) {
      showToast('error', 'Create volume failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSavingVolume(false)
    }
  }

  const periodColumns: DataTableColumn<Period>[] = [
    { key: 'period', header: 'Period', sortable: true, sortValue: (r) => r.period, render: (r) => <span className="cell-mono">{r.period}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status !== 'LOCKED' ? (
          <button className="btn btn-secondary btn-sm" disabled={lockingPeriod === r.period} onClick={() => lockPeriodRow(r.period)}>
            {lockingPeriod === r.period ? '…' : t('common.lock')}
          </button>
        ) : null,
    },
  ]

  const volumeColumns: DataTableColumn<Volume>[] = [
    { key: 'contract', header: 'Contract', render: (r) => <span className="cell-mono">{r.contract_code}</span> },
    { key: 'service', header: 'Service', render: (r) => r.service_code },
    { key: 'qty', header: 'Quantity', sortable: true, sortValue: (r) => r.quantity, render: (r) => r.quantity.toLocaleString('en-SG') },
    { key: 'date', header: 'Date', render: (r) => r.record_date },
    { key: 'period', header: 'Period', sortable: true, sortValue: (r) => r.period, render: (r) => r.period },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="UC-05 · Volume tracking"
        title={t('page.operations.title')}
        subtitle={t('page.operations.subtitle')}
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Billing periods</h3>
            <p className="card-subtitle">Create and lock periods before billing reconciliation</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 400, marginBottom: 20 }} onSubmit={onCreatePeriod}>
          <div className="form-field">
            <label htmlFor="period">Period (YYYY-MM)</label>
            <input id="period" className="input" placeholder="2026-08" pattern="\d{4}-\d{2}" value={periodInput} onChange={(e) => setPeriodInput(e.target.value)} required />
          </div>
          <div>
            <button className="btn" type="submit" disabled={creatingPeriod}>{creatingPeriod ? 'Creating…' : t('common.create')}</button>
          </div>
        </form>
        {periods.loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <DataTable
            columns={periodColumns}
            data={periods.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.period} ${r.status}`}
            searchPlaceholder="Search periods…"
            emptyTitle="No periods"
            emptyDescription="Create a billing period to begin recording volumes."
          />
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Record volume</h3>
            <p className="card-subtitle">Add service quantities for an open period</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 560 }} onSubmit={onCreateVolume}>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="vol-contract">Contract</label>
              <input id="vol-contract" className="input" value={volumeForm.contract_code} onChange={(e) => setVolumeForm({ ...volumeForm, contract_code: e.target.value })} required />
            </div>
            <div className="form-field">
              <label htmlFor="vol-service">Service code</label>
              <input id="vol-service" className="input" value={volumeForm.service_code} onChange={(e) => setVolumeForm({ ...volumeForm, service_code: e.target.value })} required />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="vol-qty">Quantity</label>
              <input id="vol-qty" className="input" type="number" min={0.01} step="any" value={volumeForm.quantity} onChange={(e) => setVolumeForm({ ...volumeForm, quantity: Number(e.target.value) })} required />
            </div>
            <div className="form-field">
              <label htmlFor="vol-period">Period</label>
              <input id="vol-period" className="input" pattern="\d{4}-\d{2}" value={volumeForm.period} onChange={(e) => setVolumeForm({ ...volumeForm, period: e.target.value })} required />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="vol-date">Record date</label>
            <input id="vol-date" className="input" type="date" value={volumeForm.record_date} onChange={(e) => setVolumeForm({ ...volumeForm, record_date: e.target.value })} required />
          </div>
          <div>
            <button className="btn" type="submit" disabled={savingVolume}>{savingVolume ? 'Saving…' : t('common.save')}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Volume records</h3>
            <p className="card-subtitle">{volumes.data?.length ?? 0} entries recorded</p>
          </div>
        </div>
        {volumes.loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <DataTable
            columns={volumeColumns}
            data={volumes.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.contract_code} ${r.service_code} ${r.period}`}
            searchPlaceholder="Search volumes…"
            emptyTitle="No volume data"
            emptyDescription="Operational volumes will appear once recorded."
          />
        )}
      </div>
    </div>
  )
}

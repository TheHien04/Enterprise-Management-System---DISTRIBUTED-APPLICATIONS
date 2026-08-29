import { FormEvent, useMemo, useState } from 'react'
import { operationsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, StatCard, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { Icons } from '@/components/ui/icons'
import { formatNumber } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import type { Period, Volume } from '@/types/domain'

export default function VolumesPage() {
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const periods = useAsync(async () => (await operationsApi.listPeriods()).data, [])
  const volumes = useAsync(async () => (await operationsApi.listVolumes('HD2026001')).data, [])
  const [periodStatusFilter, setPeriodStatusFilter] = useState<'ALL' | 'OPEN' | 'LOCKED'>('ALL')
  const [periodInput, setPeriodInput] = useState('2026-10')
  const [creatingPeriod, setCreatingPeriod] = useState(false)
  const [lockingPeriod, setLockingPeriod] = useState<string | null>(null)
  const [volumeForm, setVolumeForm] = useState({
    contract_code: 'HD2026001',
    service_code: 'DV001',
    quantity: 100,
    record_date: '2026-10-15',
    period: '2026-10',
  })
  const [savingVolume, setSavingVolume] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState(0)
  const [savingEdit, setSavingEdit] = useState(false)

  const periodStatus = (period: string) =>
    periods.data?.find((p) => p.period === period)?.status ?? 'OPEN'

  const filteredPeriods = useMemo(() => {
    const rows = periods.data ?? []
    if (periodStatusFilter === 'ALL') return rows
    return rows.filter((p) => p.status === periodStatusFilter)
  }, [periods.data, periodStatusFilter])

  const totalQty = useMemo(
    () => (volumes.data ?? []).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0),
    [volumes.data],
  )

  const qtyByPeriod = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of volumes.data ?? []) {
      map[v.period] = (map[v.period] ?? 0) + (Number(v.quantity) || 0)
    }
    return map
  }, [volumes.data])

  async function onCreatePeriod(event: FormEvent) {
    event.preventDefault()
    setCreatingPeriod(true)
    try {
      await operationsApi.createPeriod(periodInput)
      showToast('success', t('toast.periodCreated'), periodInput)
      setVolumeForm((prev) => ({
        ...prev,
        period: periodInput,
        record_date: `${periodInput}-15`,
      }))
      await periods.reload()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.unknown')
      const alreadyExists =
        /already exists/i.test(message) || (periods.data ?? []).some((p) => p.period === periodInput)
      if (alreadyExists) {
        showToast('info', t('toast.periodExists'), interpolate(t('toast.periodExistsDesc'), { period: periodInput }))
        setVolumeForm((prev) => ({
          ...prev,
          period: periodInput,
          record_date: `${periodInput}-15`,
        }))
        await periods.reload()
      } else {
        showToast('error', t('toast.createFailed'), message)
      }
    } finally {
      setCreatingPeriod(false)
    }
  }

  async function lockPeriodRow(period: string) {
    setLockingPeriod(period)
    try {
      await operationsApi.lockPeriod(period)
      showToast('success', t('toast.periodLocked'), period)
      await periods.reload()
    } catch (err) {
      showToast('error', t('toast.lockFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setLockingPeriod(null)
    }
  }

  async function onCreateVolume(event: FormEvent) {
    event.preventDefault()
    setSavingVolume(true)
    try {
      await operationsApi.createVolume(volumeForm)
      showToast('success', t('toast.volumeRecorded'), `${volumeForm.service_code} × ${volumeForm.quantity}`)
      await volumes.reload()
    } catch (err) {
      showToast('error', t('toast.createFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSavingVolume(false)
    }
  }

  function startEdit(row: Volume) {
    if (periodStatus(row.period) === 'LOCKED') {
      showToast('error', t('toast.periodLocked'), t('ops.cannotEditLocked'))
      return
    }
    setEditingId(row.id)
    setEditQty(row.quantity)
  }

  async function saveEdit(row: Volume) {
    setSavingEdit(true)
    try {
      await operationsApi.updateVolume(row.id, editQty)
      showToast('success', t('toast.volumeUpdated'), `${row.service_code} → ${editQty}`)
      setEditingId(null)
      await volumes.reload()
    } catch (err) {
      showToast('error', t('toast.updateFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setSavingEdit(false)
    }
  }

  const periodColumns: DataTableColumn<Period>[] = [
    { key: 'period', header: t('col.period'), sortable: true, sortValue: (r) => r.period, render: (r) => <span className="cell-mono">{r.period}</span> },
    { key: 'status', header: t('col.status'), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'qty',
      header: t('ops.periodQty'),
      render: (r) => formatNumber(qtyByPeriod[r.period] ?? 0, locale),
    },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (r) =>
        r.status !== 'LOCKED' ? (
          <button className="btn btn-secondary btn-sm" disabled={lockingPeriod === r.period} onClick={() => lockPeriodRow(r.period)}>
            {lockingPeriod === r.period ? '…' : t('common.lock')}
          </button>
        ) : null,
    },
  ]

  const volumeColumns: DataTableColumn<Volume>[] = [
    { key: 'contract', header: t('col.contract'), render: (r) => <span className="cell-mono">{r.contract_code}</span> },
    { key: 'service', header: t('col.service'), render: (r) => r.service_code },
    {
      key: 'qty',
      header: t('col.quantity'),
      sortable: true,
      sortValue: (r) => r.quantity,
      render: (r) =>
        editingId === r.id ? (
          <input
            className="input"
            style={{ width: 100 }}
            type="number"
            min={0.01}
            step="any"
            value={editQty}
            onChange={(e) => setEditQty(Number(e.target.value))}
          />
        ) : (
          formatNumber(r.quantity, locale)
        ),
    },
    { key: 'date', header: t('col.date'), render: (r) => r.record_date },
    { key: 'period', header: t('col.period'), sortable: true, sortValue: (r) => r.period, render: (r) => r.period },
    {
      key: 'lock',
      header: t('col.status'),
      render: (r) => <StatusBadge status={periodStatus(r.period)} />,
    },
    {
      key: 'actions',
      header: t('col.actions'),
      render: (r) => {
        const locked = periodStatus(r.period) === 'LOCKED'
        if (editingId === r.id) {
          return (
            <div className="cell-actions">
              <button className="btn btn-sm" disabled={savingEdit} onClick={() => saveEdit(r)}>
                {savingEdit ? '…' : t('common.save')}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                {t('common.cancel')}
              </button>
            </div>
          )
        }
        return (
          <button className="btn btn-secondary btn-sm" disabled={locked} onClick={() => startEdit(r)}>
            {t('common.edit')}
          </button>
        )
      },
    },
  ]

  const openCount = (periods.data ?? []).filter((p) => p.status === 'OPEN').length
  const lockedCount = (periods.data ?? []).filter((p) => p.status === 'LOCKED').length

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.volumeTracking')}
        title={t('page.operations.title')}
        subtitle={t('page.operations.subtitle')}
      />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <StatCard
          label={t('ops.aggregateQty')}
          value={formatNumber(totalQty, locale)}
          trend={interpolate(t('ops.aggregateQtyTrend'), { count: volumes.data?.length ?? 0 })}
          icon={Icons.operations}
        />
        <StatCard
          label={t('status.OPEN')}
          value={openCount}
          trend={t('ops.openPeriodsTrend')}
          icon={Icons.operations}
        />
        <StatCard
          label={t('status.LOCKED')}
          value={lockedCount}
          trend={t('ops.lockedPeriodsTrend')}
          icon={Icons.operations}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('ops.periodsTitle')}</h3>
            <p className="card-subtitle">{t('ops.periodsSubtitle')}</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 400, marginBottom: 16 }} onSubmit={onCreatePeriod}>
          <div className="form-field">
            <label htmlFor="period">{t('col.period')} (YYYY-MM)</label>
            <input id="period" className="input" placeholder="2026-08" pattern="\d{4}-\d{2}" value={periodInput} onChange={(e) => setPeriodInput(e.target.value)} required />
          </div>
          <div>
            <button className="btn" type="submit" disabled={creatingPeriod}>{creatingPeriod ? '…' : t('common.create')}</button>
          </div>
        </form>

        <div className="pipeline-strip" role="group" aria-label={t('ops.periodFilter')}>
          {(['ALL', 'OPEN', 'LOCKED'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`pipeline-chip${periodStatusFilter === key ? ' active' : ''}`}
              onClick={() => setPeriodStatusFilter(key)}
            >
              {key === 'ALL' ? t('pipeline.all') : t(`status.${key}` as 'status.OPEN')}
              <span className="pipeline-count">
                {key === 'ALL'
                  ? periods.data?.length ?? 0
                  : key === 'OPEN'
                    ? openCount
                    : lockedCount}
              </span>
            </button>
          ))}
        </div>

        {periods.loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <DataTable
            columns={periodColumns}
            data={filteredPeriods}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.period} ${r.status}`}
            searchPlaceholder={t('search.periods')}
            emptyTitle={t('ops.noPeriods')}
            emptyDescription={t('ops.noPeriodsDesc')}
            rowClassName={(r) => (r.status === 'LOCKED' ? 'row-locked' : undefined)}
          />
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('ops.recordTitle')}</h3>
            <p className="card-subtitle">{t('ops.recordSubtitle')}</p>
          </div>
        </div>
        <form className="form-grid" style={{ maxWidth: 560 }} onSubmit={onCreateVolume}>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="vol-contract">{t('col.contract')}</label>
              <input id="vol-contract" className="input" value={volumeForm.contract_code} onChange={(e) => setVolumeForm({ ...volumeForm, contract_code: e.target.value })} required />
            </div>
            <div className="form-field">
              <label htmlFor="vol-service">{t('col.service')}</label>
              <input id="vol-service" className="input" value={volumeForm.service_code} onChange={(e) => setVolumeForm({ ...volumeForm, service_code: e.target.value })} required />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="vol-qty">{t('col.quantity')}</label>
              <input id="vol-qty" className="input" type="number" min={0.01} step="any" value={volumeForm.quantity} onChange={(e) => setVolumeForm({ ...volumeForm, quantity: Number(e.target.value) })} required />
            </div>
            <div className="form-field">
              <label htmlFor="vol-period">{t('col.period')}</label>
              <input id="vol-period" className="input" pattern="\d{4}-\d{2}" value={volumeForm.period} onChange={(e) => setVolumeForm({ ...volumeForm, period: e.target.value })} required />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="vol-date">{t('col.date')}</label>
            <input id="vol-date" className="input" type="date" value={volumeForm.record_date} onChange={(e) => setVolumeForm({ ...volumeForm, record_date: e.target.value })} required />
          </div>
          <div>
            <button className="btn" type="submit" disabled={savingVolume}>{savingVolume ? '…' : t('common.save')}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('ops.recordsTitle')}</h3>
            <p className="card-subtitle">
              {volumes.data?.length ?? 0} {t('ops.entries')} — {t('ops.editHint')}
            </p>
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
            searchPlaceholder={t('search.volumes')}
            emptyTitle={t('ops.noVolumes')}
            emptyDescription={t('ops.noVolumesDesc')}
            rowClassName={(r) => (periodStatus(r.period) === 'LOCKED' ? 'row-locked' : undefined)}
          />
        )}
      </div>
    </div>
  )
}

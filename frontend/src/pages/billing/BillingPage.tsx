import { useState } from 'react'
import { Link } from 'react-router-dom'
import { billingApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/context/ToastContext'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, StatusBadge, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { Icons } from '@/components/ui/icons'
import { formatNumber } from '@/i18n/helpers'
import { interpolate } from '@/i18n/messages'
import type { BillingSheet } from '@/types/domain'

export default function BillingPage() {
  const { showToast } = useToast()
  const { t, locale } = useLocale()
  const sheets = useAsync(async () => (await billingApi.list()).data, [])
  const [generating, setGenerating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function generateDemo() {
    setGenerating(true)
    try {
      await billingApi.generate('HD2026001', '2026-08')
      showToast('success', t('toast.billingGenerated'), 'HD2026001 / 2026-08')
      await sheets.reload()
    } catch (err) {
      showToast('error', t('toast.generateFailed'), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setGenerating(false)
    }
  }

  async function runAction(sheetId: string, action: 'reconcile' | 'submit' | 'sendEsign' | 'completeEsign' | 'publish') {
    const key = `${action}-${sheetId}`
    setActionLoading(key)
    try {
      const fn = {
        reconcile: billingApi.reconcile,
        submit: billingApi.submit,
        sendEsign: billingApi.sendEsign,
        completeEsign: billingApi.completeEsign,
        publish: billingApi.publish,
      }[action]
      await fn(sheetId)
      showToast('success', interpolate(t('toast.actionCompleted'), { action }), sheetId.slice(0, 8))
      await sheets.reload()
    } catch (err) {
      showToast('error', interpolate(t('toast.actionFailed'), { action }), err instanceof Error ? err.message : t('error.unknown'))
    } finally {
      setActionLoading(null)
    }
  }

  function renderActions(sheet: BillingSheet) {
    const busy = (a: string) => actionLoading === `${a}-${sheet.id}`
    return (
      <div className="cell-actions">
        <Link to={`/billing/${sheet.id}`} className="btn btn-secondary btn-sm">
          {t('common.viewDetails')} {Icons.external}
        </Link>
        <Link to="/esign" className="btn btn-secondary btn-sm">
          {t('common.esign')}
        </Link>
        <button className="btn btn-secondary btn-sm" disabled={busy('reconcile')} onClick={() => runAction(sheet.id, 'reconcile')}>
          {busy('reconcile') ? '…' : t('common.reconcile')}
        </button>
        <button className="btn btn-sm" disabled={busy('submit')} onClick={() => runAction(sheet.id, 'submit')}>
          {busy('submit') ? '…' : t('common.submit')}
        </button>
        <button className="btn btn-sm" disabled={busy('sendEsign')} onClick={() => runAction(sheet.id, 'sendEsign')}>
          {busy('sendEsign') ? '…' : t('common.esign')}
        </button>
        <button className="btn btn-sm" disabled={busy('completeEsign')} onClick={() => runAction(sheet.id, 'completeEsign')}>
          {busy('completeEsign') ? '…' : t('common.completeSign')}
        </button>
        <button className="btn btn-sm" disabled={busy('publish')} onClick={() => runAction(sheet.id, 'publish')}>
          {busy('publish') ? '…' : t('common.publish')}
        </button>
      </div>
    )
  }

  const columns: DataTableColumn<BillingSheet>[] = [
    {
      key: 'contract',
      header: t('col.contract'),
      sortable: true,
      sortValue: (r) => r.contract_code,
      render: (r) => (
        <Link to={`/billing/${r.id}`} className="link-primary cell-mono">
          {r.contract_code}
        </Link>
      ),
    },
    { key: 'period', header: t('col.period'), sortable: true, sortValue: (r) => r.period, render: (r) => r.period },
    {
      key: 'total',
      header: t('col.total'),
      sortable: true,
      sortValue: (r) => r.total,
      render: (r) => `${formatNumber(r.total, locale)} ${t('billing.currency')}`,
    },
    { key: 'approval', header: t('col.approval'), render: (r) => <StatusBadge status={r.approval_status} /> },
    { key: 'signing', header: t('col.signing'), render: (r) => <StatusBadge status={r.signing_status} /> },
    { key: 'issuance', header: t('col.issuance'), render: (r) => <StatusBadge status={r.issuance_status} /> },
    { key: 'actions', header: t('col.actions'), render: (r) => renderActions(r) },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('uc.paymentStatements')}
        title={t('page.billing.title')}
        subtitle={t('page.billing.subtitle')}
        actions={
          <button className="btn" onClick={generateDemo} disabled={generating}>
            {generating ? t('common.generating') : t('common.generate')}
          </button>
        }
      />

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('card.billingSheets')}</h3>
            <p className="card-subtitle">
              {interpolate(t('card.billingSheetsCount'), { count: sheets.data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {sheets.loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <DataTable
            columns={columns}
            data={sheets.data ?? []}
            rowKey={(r) => r.id}
            searchKeys={(r) => `${r.contract_code} ${r.period} ${r.approval_status}`}
            searchPlaceholder={t('search.billing')}
            emptyTitle={t('empty.noBilling')}
            emptyDescription={t('empty.noBillingDesc')}
          />
        )}
      </div>
    </div>
  )
}

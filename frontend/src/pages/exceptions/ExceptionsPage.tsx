import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  billingApi,
  contractsApi,
  pricingApi,
  workflowsApi,
} from '@/api/modules'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader, TableSkeleton } from '@/components/ui'
import {
  buildExceptions,
  countBySeverity,
  type ExceptionSeverity,
} from '@/lib/exceptions'
import { interpolate, type MessageKey } from '@/i18n/messages'
import type { UserRole } from '@/types/auth'

type FilterChip = 'all' | ExceptionSeverity

export default function ExceptionsPage() {
  const { user, hasRole } = useAuth()
  const { t } = useLocale()
  const role = (user?.roles[0] ?? 'SALES_STAFF') as UserRole
  const [filter, setFilter] = useState<FilterChip>('all')

  const showContracts = hasRole('SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN')
  const showPricing = hasRole('SALES_STAFF', 'SALES_MANAGER', 'DIRECTOR', 'ADMIN')
  const showBilling = hasRole('ACCOUNTING', 'DIRECTOR', 'ADMIN')
  const showApprovals = hasRole(
    'SALES_STAFF',
    'SALES_MANAGER',
    'LEGAL',
    'ACCOUNTING',
    'DIRECTOR',
    'ADMIN',
  )

  const inbox = useAsync(
    async () => (showApprovals ? (await workflowsApi.inbox(role)).data : []),
    [role, showApprovals],
  )
  const contracts = useAsync(
    async () => (showContracts ? (await contractsApi.list()).data : []),
    [showContracts],
  )
  const priceLists = useAsync(
    async () => (showPricing ? (await pricingApi.listPriceLists()).data : []),
    [showPricing],
  )
  const billing = useAsync(
    async () => (showBilling ? (await billingApi.list()).data : []),
    [showBilling],
  )

  const loading = inbox.loading || contracts.loading || priceLists.loading || billing.loading

  const exceptions = useMemo(
    () =>
      buildExceptions({
        inbox: inbox.data,
        contracts: contracts.data,
        priceLists: priceLists.data,
        billing: billing.data,
      }),
    [inbox.data, contracts.data, priceLists.data, billing.data],
  )

  const counts = countBySeverity(exceptions)
  const visible = filter === 'all' ? exceptions : exceptions.filter((e) => e.severity === filter)

  const chips: { id: FilterChip; label: string; count: number }[] = [
    { id: 'all', label: t('exc.filterAll'), count: counts.total },
    { id: 'critical', label: t('exc.severity.critical'), count: counts.critical },
    { id: 'warning', label: t('exc.severity.warning'), count: counts.warning },
    { id: 'info', label: t('exc.severity.info'), count: counts.info },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={t('exc.eyebrow')}
        title={t('page.exceptions.title')}
        subtitle={t('page.exceptions.subtitle')}
      />

      <div className="kpi-strip" style={{ marginBottom: 16 }}>
        <div className="kpi-chip kpi-chip-critical">
          <span className="kpi-chip-value">{counts.critical}</span>
          <span className="kpi-chip-label">{t('exc.severity.critical')}</span>
        </div>
        <div className="kpi-chip kpi-chip-warning">
          <span className="kpi-chip-value">{counts.warning}</span>
          <span className="kpi-chip-label">{t('exc.severity.warning')}</span>
        </div>
        <div className="kpi-chip kpi-chip-info">
          <span className="kpi-chip-value">{counts.info}</span>
          <span className="kpi-chip-label">{t('exc.severity.info')}</span>
        </div>
        <div className="kpi-chip">
          <span className="kpi-chip-value">{counts.total}</span>
          <span className="kpi-chip-label">{t('exc.total')}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('exc.consoleTitle')}</h3>
            <p className="card-subtitle">{t('exc.consoleSubtitle')}</p>
          </div>
        </div>

        <div className="filter-chips" style={{ padding: '0 20px 12px' }}>
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`filter-chip${filter === chip.id ? ' active' : ''}${
                chip.id === 'critical' ? ' filter-chip-critical' : ''
              }`}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label}
              <span className="filter-chip-count">{chip.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : visible.length === 0 ? (
          <div className="soft-empty">
            <div className="soft-empty-art" aria-hidden="true" />
            <p className="soft-empty-title">{t('exc.emptyTitle')}</p>
            <p className="soft-empty-desc">{t('exc.emptyDesc')}</p>
          </div>
        ) : (
          <ul className="exception-list">
            {visible.map((item) => {
              const title = item.titleVars
                ? interpolate(t(item.titleKey as MessageKey), item.titleVars)
                : t(item.titleKey as MessageKey)
              const detail =
                item.detailKey && item.detailVars
                  ? interpolate(t(item.detailKey as MessageKey), item.detailVars)
                  : null
              return (
                <li key={item.id} className="exception-row">
                  <span className={`severity-chip severity-${item.severity}`}>
                    {t(`exc.severity.${item.severity}` as MessageKey)}
                  </span>
                  <div className="exception-body">
                    <Link to={item.to} className="exception-title link-primary">
                      {title}
                    </Link>
                    <p className="exception-meta">
                      {t(item.categoryKey as MessageKey)}
                      {detail ? ` · ${detail}` : ''}
                    </p>
                  </div>
                  <Link to={item.to} className="btn btn-secondary btn-sm">
                    {t('exc.open')}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

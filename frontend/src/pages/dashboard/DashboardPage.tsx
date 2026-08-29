import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  billingApi,
  contractsApi,
  notificationsApi,
  operationsApi,
  pricingApi,
  workflowsApi,
} from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { roleDepartmentLabel } from '@/config/rbac'
import { PageHeader, StatCard, StatSkeletonGrid } from '@/components/ui'
import { Icons } from '@/components/ui/icons'
import { buildExceptions, daysUntil, countBySeverity } from '@/lib/exceptions'
import { interpolate } from '@/i18n/messages'
import type { UserRole } from '@/types/auth'
import type { Contract, PriceList } from '@/types/domain'

function isExpiringWithin30Days(dateStr: string): boolean {
  const days = daysUntil(dateStr)
  return days >= 0 && days <= 30
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const { t } = useLocale()
  const role = (user?.roles[0] ?? 'SALES_STAFF') as UserRole
  const userId = user?.username ?? ''

  const showSales = hasRole('SALES_STAFF', 'SALES_MANAGER', 'ADMIN')
  const showLegal = hasRole('LEGAL')
  const showAccounting = hasRole('ACCOUNTING', 'ADMIN')
  const showOperations = hasRole('OPERATIONS', 'ADMIN')
  const showDirector = hasRole('DIRECTOR')
  const showContracts = showSales || showLegal || showDirector || hasRole('SALES_MANAGER')
  const showPricing = showSales || showDirector || hasRole('SALES_MANAGER')
  const showBilling = showAccounting || showDirector
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
  const volumes = useAsync(
    async () => (showOperations || showDirector ? (await operationsApi.listVolumes()).data : []),
    [showOperations, showDirector],
  )
  const periods = useAsync(
    async () => (showOperations || showDirector ? (await operationsApi.listPeriods()).data : []),
    [showOperations, showDirector],
  )
  const notifications = useAsync(
    async () => (userId ? (await notificationsApi.list(userId)).data : []),
    [userId],
  )

  const loading =
    inbox.loading ||
    contracts.loading ||
    priceLists.loading ||
    billing.loading ||
    volumes.loading ||
    periods.loading ||
    notifications.loading

  const activeContracts = (contracts.data ?? []).filter((c) => c.status === 'ACTIVE').length
  const pendingReview = (contracts.data ?? []).filter((c) => c.status === 'UNDER_REVIEW').length
  const lockedPeriods = (periods.data ?? []).filter((p) => p.status === 'LOCKED' || p.status === 'RECONCILED').length
  const openPeriods = (periods.data ?? []).filter((p) => p.status === 'OPEN').length
  const draftContracts = (contracts.data ?? []).filter((c) => c.status === 'DRAFT').length
  const unreadCount = (notifications.data ?? []).filter((n) => !n.read).length

  const exceptions = buildExceptions({
    inbox: inbox.data,
    contracts: contracts.data,
    priceLists: priceLists.data,
    billing: billing.data,
  })
  const excCounts = countBySeverity(exceptions)

  const expiringContracts = (contracts.data ?? []).filter(
    (c: Contract) => c.status === 'ACTIVE' && isExpiringWithin30Days(c.effective_to),
  )
  const expiringPriceLists = (priceLists.data ?? []).filter(
    (pl: PriceList) => ['EFFECTIVE', 'APPROVED'].includes(pl.status) && isExpiringWithin30Days(pl.effective_to),
  )
  const showExpiryWarnings =
    showContracts && (expiringContracts.length > 0 || expiringPriceLists.length > 0)

  const quickLinks: { to: string; label: string; show: boolean }[] = [
    { to: '/exceptions', label: t('nav.exceptions'), show: true },
    { to: '/approvals', label: t('nav.approvals'), show: showApprovals },
    { to: '/operations', label: t('nav.operations'), show: hasRole('OPERATIONS', 'DIRECTOR', 'ADMIN') },
    { to: '/billing', label: t('nav.billing'), show: hasRole('ACCOUNTING', 'DIRECTOR', 'ADMIN') },
    { to: '/contracts', label: t('nav.contracts'), show: showContracts },
    { to: '/audit', label: t('nav.audit'), show: hasRole('DIRECTOR', 'ADMIN') },
  ].filter((link) => link.show)

  const flowSteps = showOperations && !showSales && !showAccounting
    ? [
        { title: t('dash.opsStep1Title'), desc: t('dash.opsStep1Desc') },
        { title: t('dash.opsStep2Title'), desc: t('dash.opsStep2Desc') },
        { title: t('dash.opsStep3Title'), desc: t('dash.opsStep3Desc') },
      ]
    : showAccounting && !showSales
      ? [
          { title: t('dash.accStep1Title'), desc: t('dash.accStep1Desc') },
          { title: t('dash.accStep2Title'), desc: t('dash.accStep2Desc') },
          { title: t('dash.accStep3Title'), desc: t('dash.accStep3Desc') },
        ]
      : showLegal && !showSales
        ? [
            { title: t('dash.legalStep1Title'), desc: t('dash.legalStep1Desc') },
            { title: t('dash.legalStep2Title'), desc: t('dash.legalStep2Desc') },
          ]
        : [
            { title: t('dash.flowStep1Title'), desc: t('dash.flowStep1Desc') },
            { title: t('dash.flowStep2Title'), desc: t('dash.flowStep2Desc') },
            { title: t('dash.flowStep3Title'), desc: t('dash.flowStep3Desc') },
            { title: t('dash.flowStep4Title'), desc: t('dash.flowStep4Desc') },
            { title: t('dash.flowStep5Title'), desc: t('dash.flowStep5Desc') },
          ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={roleDepartmentLabel(role, t)}
        title={interpolate(t('dash.roleWelcome'), { name: user?.fullName ?? '' })}
        subtitle={t('page.dashboard.subtitle')}
      />

      {loading ? (
        <StatSkeletonGrid count={4} />
      ) : (
        <>
          {(inbox.data?.length ?? 0) > 0 && (
            <div className="control-tower-cta">
              <div>
                <p className="control-tower-eyebrow">{t('dash.awaitingMe')}</p>
                <p className="control-tower-text">
                  {interpolate(t('dash.awaitingMeDesc'), { count: inbox.data?.length ?? 0 })}
                </p>
              </div>
              <Link to="/approvals" className="btn btn-sm">
                {t('dash.awaitingMeAction')}
              </Link>
            </div>
          )}

          <div className="kpi-strip" aria-label={t('dash.kpiStrip')}>
            <Link to="/exceptions" className={`kpi-chip${excCounts.critical > 0 ? ' kpi-chip-critical' : ''}`}>
              <span className="kpi-chip-value">{excCounts.total}</span>
              <span className="kpi-chip-label">{t('dash.kpiExceptions')}</span>
            </Link>
            <Link to="/notifications" className="kpi-chip">
              <span className="kpi-chip-value">{unreadCount}</span>
              <span className="kpi-chip-label">{t('dash.kpiUnread')}</span>
            </Link>
            {(showOperations || showDirector) && (
              <Link to="/operations" className="kpi-chip">
                <span className="kpi-chip-value">{openPeriods}</span>
                <span className="kpi-chip-label">{t('dash.kpiOpenPeriods')}</span>
              </Link>
            )}
            {showContracts && (
              <Link to="/contracts" className="kpi-chip">
                <span className="kpi-chip-value">{draftContracts}</span>
                <span className="kpi-chip-label">{t('dash.kpiDrafts')}</span>
              </Link>
            )}
            {excCounts.total > 0 && (
              <Link to="/exceptions" className="btn btn-secondary btn-sm kpi-strip-action">
                {t('dash.kpiViewExceptions')}
              </Link>
            )}
          </div>

          <div className="grid-stats">
            <StatCard
              label={t('dash.statInbox')}
              value={inbox.data?.length ?? 0}
              trend={t('dash.statInboxTrend')}
              icon={Icons.inbox}
            />
            {showContracts && (
              <StatCard
                label={t('dash.statContracts')}
                value={contracts.data?.length ?? 0}
                trend={interpolate(t('dash.statContractsTrend'), { active: activeContracts, review: pendingReview })}
                icon={Icons.document}
              />
            )}
            {showPricing && (
              <StatCard
                label={t('dash.statPriceLists')}
                value={priceLists.data?.length ?? 0}
                trend={t('dash.statPriceListsTrend')}
                icon={Icons.pricing}
              />
            )}
            {showBilling && (
              <StatCard
                label={t('dash.statBilling')}
                value={billing.data?.length ?? 0}
                trend={t('dash.statBillingTrend')}
                icon={Icons.billing}
              />
            )}
            {(showOperations || showDirector) && (
              <>
                <StatCard
                  label={t('dash.statVolumes')}
                  value={volumes.data?.length ?? 0}
                  trend={t('dash.statVolumesTrend')}
                  icon={Icons.operations}
                />
                <StatCard
                  label={t('dash.statPeriods')}
                  value={periods.data?.length ?? 0}
                  trend={interpolate(t('dash.statPeriodsTrend'), { locked: lockedPeriods })}
                  icon={Icons.operations}
                />
              </>
            )}
          </div>
        </>
      )}

      {showContracts && !loading && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('dash.expiryWarnings')}</h3>
              <p className="card-subtitle">{t('dash.expiryWarningsSubtitle')}</p>
            </div>
          </div>
          {!showExpiryWarnings ? (
            <p style={{ padding: '0 20px 20px', color: 'var(--text-muted)', margin: 0 }}>
              {t('dash.noExpiryWarnings')}
            </p>
          ) : (
            <div style={{ padding: '0 20px 20px', display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {expiringContracts.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 10px' }}>{t('dash.expiringContracts')}</h4>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {expiringContracts.map((c) => (
                      <li key={c.id}>
                        <Link to={`/contracts/${c.id}`} className="link-primary">
                          <span className="cell-mono">{c.code}</span>
                        </Link>
                        <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {interpolate(t('dash.expiresIn'), { days: daysUntil(c.effective_to) })} · {c.effective_to}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {expiringPriceLists.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 10px' }}>{t('dash.expiringPriceLists')}</h4>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {expiringPriceLists.map((pl) => (
                      <li key={pl.id}>
                        <Link to={`/pricing/${pl.id}`} className="link-primary">
                          <span className="cell-mono">{pl.contract_code}</span> v{pl.version}
                        </Link>
                        <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {interpolate(t('dash.expiresIn'), { days: daysUntil(pl.effective_to) })} · {pl.effective_to}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {quickLinks.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">{t('dash.quickLinks')}</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 20px 20px' }}>
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to} className="btn btn-secondary btn-sm">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('dash.flowTitle')}</h3>
            <p className="card-subtitle">{t('dash.flowSubtitle')}</p>
          </div>
        </div>
        <ol className="flow-steps">
          {flowSteps.map((step, index) => (
            <li key={step.title} className="flow-step">
              <span className="flow-step-num">{index + 1}</span>
              <div>
                <p className="flow-step-title">{step.title}</p>
                <p className="flow-step-desc">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

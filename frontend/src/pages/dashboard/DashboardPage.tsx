import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { billingApi, contractsApi, operationsApi, pricingApi, workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { roleDepartmentLabel } from '@/config/rbac'
import { PageHeader, StatCard, StatSkeletonGrid } from '@/components/ui'
import { Icons } from '@/components/ui/icons'
import { interpolate } from '@/i18n/messages'
import type { UserRole } from '@/types/auth'

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const { t } = useLocale()
  const role = (user?.roles[0] ?? 'SALES_STAFF') as UserRole

  const showSales = hasRole('SALES_STAFF', 'SALES_MANAGER', 'ADMIN')
  const showLegal = hasRole('LEGAL')
  const showAccounting = hasRole('ACCOUNTING', 'ADMIN')
  const showOperations = hasRole('OPERATIONS', 'ADMIN')
  const showDirector = hasRole('DIRECTOR')

  const inbox = useAsync(async () => (await workflowsApi.inbox(role)).data, [role])
  const contracts = useAsync(
    async () => (showSales || showLegal || showDirector ? (await contractsApi.list()).data : []),
    [showSales, showLegal, showDirector],
  )
  const priceLists = useAsync(
    async () => (showSales || showDirector ? (await pricingApi.listPriceLists()).data : []),
    [showSales, showDirector],
  )
  const billing = useAsync(
    async () => (showAccounting || showDirector ? (await billingApi.list()).data : []),
    [showAccounting, showDirector],
  )
  const volumes = useAsync(
    async () => (showOperations || showDirector ? (await operationsApi.listVolumes()).data : []),
    [showOperations, showDirector],
  )
  const periods = useAsync(
    async () => (showOperations || showDirector ? (await operationsApi.listPeriods()).data : []),
    [showOperations, showDirector],
  )

  const loading =
    inbox.loading ||
    contracts.loading ||
    priceLists.loading ||
    billing.loading ||
    volumes.loading ||
    periods.loading

  const activeContracts = (contracts.data ?? []).filter((c) => c.status === 'ACTIVE').length
  const pendingReview = (contracts.data ?? []).filter((c) => c.status === 'UNDER_REVIEW').length
  const lockedPeriods = (periods.data ?? []).filter((p) => p.status === 'LOCKED' || p.status === 'RECONCILED').length

  const quickLinks: { to: string; label: string; show: boolean }[] = [
    { to: '/approvals', label: t('nav.approvals'), show: hasRole('SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'ACCOUNTING', 'DIRECTOR', 'ADMIN') },
    { to: '/operations', label: t('nav.operations'), show: hasRole('OPERATIONS', 'DIRECTOR', 'ADMIN') },
    { to: '/billing', label: t('nav.billing'), show: hasRole('ACCOUNTING', 'DIRECTOR', 'ADMIN') },
    { to: '/contracts', label: t('nav.contracts'), show: hasRole('SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN') },
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
        <div className="grid-stats">
          <StatCard
            label={t('dash.statInbox')}
            value={inbox.data?.length ?? 0}
            trend={t('dash.statInboxTrend')}
            icon={Icons.inbox}
          />
          {(showSales || showLegal || showDirector) && (
            <StatCard
              label={t('dash.statContracts')}
              value={contracts.data?.length ?? 0}
              trend={interpolate(t('dash.statContractsTrend'), { active: activeContracts, review: pendingReview })}
              icon={Icons.document}
            />
          )}
          {(showSales || showDirector) && (
            <StatCard
              label={t('dash.statPriceLists')}
              value={priceLists.data?.length ?? 0}
              trend={t('dash.statPriceListsTrend')}
              icon={Icons.pricing}
            />
          )}
          {(showAccounting || showDirector) && (
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

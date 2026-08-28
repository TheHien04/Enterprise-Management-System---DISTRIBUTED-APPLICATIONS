import type { ReactNode } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { tStatus } from '@/i18n/helpers'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

const STATUS_MAP: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  PUBLISHED: 'success',
  SIGNED: 'success',
  COMPLETED: 'success',
  DRAFT: 'neutral',
  IN_PROGRESS: 'info',
  UNDER_REVIEW: 'info',
  PENDING: 'warning',
  REVISION_REQUESTED: 'warning',
  SUSPENDED: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'danger',
  EXPIRED: 'danger',
}

function resolveVariant(status: string): BadgeVariant {
  return STATUS_MAP[status.toUpperCase()] ?? 'neutral'
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale()
  const variant = resolveVariant(status)
  return <span className={`badge badge-${variant}`}>{tStatus(status, t)}</span>
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string
  value: string | number
  trend?: string
  icon?: ReactNode
}) {
  return (
    <div className="stat-card">
      {icon && <div className="stat-card-icon">{icon}</div>}
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {trend && <p className="stat-card-trend">{trend}</p>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-text">{description}</p>}
    </div>
  )
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useLocale()
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton skeleton-toolbar" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  )
}

export function StatSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-stat" />
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="detail-skeleton">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />
      <div className="detail-skeleton-grid">
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  )
}

import type { BillingSheet, Contract, PriceList, WorkflowItem } from '@/types/domain'

export type ExceptionSeverity = 'critical' | 'warning' | 'info'

export type ExceptionItem = {
  id: string
  severity: ExceptionSeverity
  categoryKey: 'exc.cat.approvals' | 'exc.cat.contracts' | 'exc.cat.pricing' | 'exc.cat.billing' | 'exc.cat.ops'
  titleKey:
    | 'exc.overdueApproval'
    | 'exc.contractExpiring'
    | 'exc.contractExpired'
    | 'exc.priceListExpiring'
    | 'exc.billingFailed'
    | 'exc.esignFailed'
    | 'exc.draftContract'
  titleVars?: Record<string, string | number>
  detailKey?: 'exc.detail.waiting' | 'exc.detail.expiresIn' | 'exc.detail.expired' | 'exc.detail.status'
  detailVars?: Record<string, string | number>
  to: string
  /** Lower = higher priority */
  rank: number
}

export const SLA_SOFT_HOURS = 24
export const EXPIRY_WARN_DAYS = 30

export function daysUntil(dateStr: string): number {
  const end = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function waitingHours(item: WorkflowItem): number | null {
  const raw = item.updated_at || item.created_at
  if (!raw) return null
  const then = new Date(raw).getTime()
  if (Number.isNaN(then)) return null
  return Math.max(0, (Date.now() - then) / (1000 * 60 * 60))
}

export function formatWaitingAge(hours: number): string {
  const totalMinutes = Math.floor(hours * 60)
  const d = Math.floor(totalMinutes / (60 * 24))
  const h = Math.floor((totalMinutes % (60 * 24)) / 60)
  const m = totalMinutes % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function hoursUntilSlaBreach(hoursWaiting: number): number {
  return Math.max(0, SLA_SOFT_HOURS - hoursWaiting)
}

type BuildInput = {
  inbox?: WorkflowItem[] | null
  contracts?: Contract[] | null
  priceLists?: PriceList[] | null
  billing?: BillingSheet[] | null
}

export function buildExceptions(input: BuildInput): ExceptionItem[] {
  const items: ExceptionItem[] = []

  for (const w of input.inbox ?? []) {
    const hours = waitingHours(w)
    if (hours == null || hours < SLA_SOFT_HOURS) continue
    items.push({
      id: `approval-${w.id}`,
      severity: 'critical',
      categoryKey: 'exc.cat.approvals',
      titleKey: 'exc.overdueApproval',
      titleVars: { type: w.document_type.replace(/_/g, ' ') },
      detailKey: 'exc.detail.waiting',
      detailVars: { age: formatWaitingAge(hours) },
      to: '/approvals',
      rank: 10 + Math.min(hours, 999),
    })
  }

  for (const c of input.contracts ?? []) {
    if (c.status === 'ACTIVE') {
      const days = daysUntil(c.effective_to)
      if (days < 0) {
        items.push({
          id: `contract-expired-${c.id}`,
          severity: 'critical',
          categoryKey: 'exc.cat.contracts',
          titleKey: 'exc.contractExpired',
          titleVars: { code: c.code },
          detailKey: 'exc.detail.expired',
          detailVars: { date: c.effective_to },
          to: `/contracts/${c.id}`,
          rank: 20,
        })
      } else if (days <= EXPIRY_WARN_DAYS) {
        items.push({
          id: `contract-expiring-${c.id}`,
          severity: days <= 7 ? 'critical' : 'warning',
          categoryKey: 'exc.cat.contracts',
          titleKey: 'exc.contractExpiring',
          titleVars: { code: c.code },
          detailKey: 'exc.detail.expiresIn',
          detailVars: { days },
          to: `/contracts/${c.id}`,
          rank: 30 + days,
        })
      }
    }
    if (c.status === 'DRAFT') {
      items.push({
        id: `contract-draft-${c.id}`,
        severity: 'info',
        categoryKey: 'exc.cat.contracts',
        titleKey: 'exc.draftContract',
        titleVars: { code: c.code },
        to: `/contracts/${c.id}`,
        rank: 80,
      })
    }
  }

  for (const pl of input.priceLists ?? []) {
    if (!['EFFECTIVE', 'APPROVED'].includes(pl.status)) continue
    const days = daysUntil(pl.effective_to)
    if (days >= 0 && days <= EXPIRY_WARN_DAYS) {
      items.push({
        id: `pricing-expiring-${pl.id}`,
        severity: days <= 7 ? 'critical' : 'warning',
        categoryKey: 'exc.cat.pricing',
        titleKey: 'exc.priceListExpiring',
        titleVars: { code: pl.contract_code, version: pl.version },
        detailKey: 'exc.detail.expiresIn',
        detailVars: { days },
        to: `/pricing/${pl.id}`,
        rank: 40 + days,
      })
    }
  }

  for (const b of input.billing ?? []) {
    if (b.signing_status === 'FAILED') {
      items.push({
        id: `billing-esign-${b.id}`,
        severity: 'critical',
        categoryKey: 'exc.cat.billing',
        titleKey: 'exc.esignFailed',
        titleVars: { code: b.contract_code, period: b.period },
        detailKey: 'exc.detail.status',
        detailVars: { status: b.signing_status },
        to: `/billing/${b.id}`,
        rank: 15,
      })
    }
    if (b.approval_status === 'FAILED' || b.issuance_status === 'FAILED') {
      items.push({
        id: `billing-failed-${b.id}`,
        severity: 'critical',
        categoryKey: 'exc.cat.billing',
        titleKey: 'exc.billingFailed',
        titleVars: { code: b.contract_code, period: b.period },
        detailKey: 'exc.detail.status',
        detailVars: {
          status: b.approval_status === 'FAILED' ? b.approval_status : b.issuance_status,
        },
        to: `/billing/${b.id}`,
        rank: 12,
      })
    }
  }

  const severityRank: Record<ExceptionSeverity, number> = {
    critical: 0,
    warning: 1000,
    info: 2000,
  }

  return items.sort((a, b) => severityRank[a.severity] + a.rank - (severityRank[b.severity] + b.rank))
}

export function countBySeverity(items: ExceptionItem[]) {
  return {
    critical: items.filter((i) => i.severity === 'critical').length,
    warning: items.filter((i) => i.severity === 'warning').length,
    info: items.filter((i) => i.severity === 'info').length,
    total: items.length,
  }
}

import type { Locale, MessageKey } from '@/i18n/messages'

type TranslateFn = (key: MessageKey) => string

const STATUS_KEYS = new Set<string>([
  'ACTIVE', 'APPROVED', 'PUBLISHED', 'SIGNED', 'COMPLETED', 'DRAFT', 'IN_PROGRESS',
  'UNDER_REVIEW', 'PENDING', 'REVISION_REQUESTED', 'SUSPENDED', 'REJECTED', 'CANCELLED',
  'EXPIRED', 'NONE', 'LOCKED', 'OPEN', 'RECONCILED', 'ISSUED', 'SENT', 'FAILED',
])

export function tStatus(status: string, t: TranslateFn): string {
  const normalized = status.toUpperCase()
  if (STATUS_KEYS.has(normalized)) {
    return t(`status.${normalized}` as MessageKey)
  }
  return status.replace(/_/g, ' ')
}

export function formatDate(date: string | Date, locale: Locale): string {
  const value = typeof date === 'string' ? new Date(date) : date
  return value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-SG')
}

export function documentPath(documentType: string, documentId: string): string | null {
  switch (documentType.toUpperCase()) {
    case 'CONTRACT':
      return `/contracts/${documentId}`
    case 'APPENDIX':
    case 'CONTRACT_APPENDIX':
      return `/appendices/${documentId}`
    case 'BILLING_SHEET':
    case 'BILLING':
      return `/billing/${documentId}`
    case 'PRICE_LIST':
    case 'PRICING':
      return `/pricing/${documentId}`
    default:
      return null
  }
}

export function entityPath(entityType: string, entityId: string): string | null {
  return documentPath(entityType, entityId)
}

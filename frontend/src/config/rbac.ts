import type { MessageKey } from '@/i18n/messages'
import type { UserRole } from '@/types/auth'

/** Empty roles = all authenticated users. */
export type RouteAccess = Partial<Record<UserRole, true>>

export const ROUTE_ROLES: Record<string, UserRole[] | null> = {
  '/dashboard': null,
  '/exceptions': null,
  '/customers': ['SALES_STAFF', 'SALES_MANAGER', 'ADMIN'],
  '/contracts': ['SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN'],
  '/appendices': ['SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN'],
  '/pricing': ['SALES_STAFF', 'SALES_MANAGER', 'DIRECTOR', 'ADMIN'],
  '/operations': ['OPERATIONS', 'DIRECTOR', 'ADMIN'],
  '/billing': ['ACCOUNTING', 'DIRECTOR', 'ADMIN'],
  '/esign': ['ACCOUNTING', 'DIRECTOR', 'ADMIN'],
  '/approvals': ['SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'ACCOUNTING', 'DIRECTOR', 'ADMIN'],
  '/notifications': null,
  '/audit': ['DIRECTOR', 'ADMIN'],
  '/admin': ['ADMIN'],
  '/forbidden': null,
}

export type NavItem = {
  to: string
  labelKey: MessageKey
  icon: 'dashboard' | 'exceptions' | 'customers' | 'contracts' | 'appendices' | 'pricing' | 'operations' | 'billing' | 'esign' | 'approvals' | 'notifications' | 'audit' | 'admin'
  roles: UserRole[] | null
}

export const NAV_SECTIONS: { labelKey: MessageKey; items: NavItem[] }[] = [
  {
    labelKey: 'section.overview',
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard', roles: null },
      { to: '/exceptions', labelKey: 'nav.exceptions', icon: 'exceptions', roles: null },
    ],
  },
  {
    labelKey: 'section.commercial',
    items: [
      { to: '/customers', labelKey: 'nav.customers', icon: 'customers', roles: ['SALES_STAFF', 'SALES_MANAGER', 'ADMIN'] },
      { to: '/contracts', labelKey: 'nav.contracts', icon: 'contracts', roles: ['SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN'] },
      { to: '/appendices', labelKey: 'nav.appendices', icon: 'appendices', roles: ['SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN'] },
      { to: '/pricing', labelKey: 'nav.pricing', icon: 'pricing', roles: ['SALES_STAFF', 'SALES_MANAGER', 'DIRECTOR', 'ADMIN'] },
    ],
  },
  {
    labelKey: 'section.operations',
    items: [
      { to: '/operations', labelKey: 'nav.operations', icon: 'operations', roles: ['OPERATIONS', 'DIRECTOR', 'ADMIN'] },
      { to: '/billing', labelKey: 'nav.billing', icon: 'billing', roles: ['ACCOUNTING', 'DIRECTOR', 'ADMIN'] },
    ],
  },
  {
    labelKey: 'section.governance',
    items: [
      { to: '/approvals', labelKey: 'nav.approvals', icon: 'approvals', roles: ['SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'ACCOUNTING', 'DIRECTOR', 'ADMIN'] },
      { to: '/esign', labelKey: 'nav.esign', icon: 'esign', roles: ['ACCOUNTING', 'DIRECTOR', 'ADMIN'] },
      { to: '/notifications', labelKey: 'nav.notifications', icon: 'notifications', roles: null },
      { to: '/audit', labelKey: 'nav.audit', icon: 'audit', roles: ['DIRECTOR', 'ADMIN'] },
      { to: '/admin', labelKey: 'nav.admin', icon: 'admin', roles: ['ADMIN'] },
    ],
  },
]

export function canAccessPath(pathname: string, hasRole: (...roles: UserRole[]) => boolean): boolean {
  const path = pathname.split('?')[0]
  const entries = Object.entries(ROUTE_ROLES).sort((a, b) => b[0].length - a[0].length)
  for (const [route, roles] of entries) {
    if (path === route || path.startsWith(`${route}/`)) {
      if (roles === null) return true
      return roles.some((role) => hasRole(role))
    }
  }
  return true
}

export function defaultHomePath(hasRole: (...roles: UserRole[]) => boolean): string {
  if (hasRole('OPERATIONS') && !hasRole('ADMIN', 'DIRECTOR')) return '/operations'
  if (hasRole('ACCOUNTING') && !hasRole('ADMIN', 'DIRECTOR')) return '/billing'
  if (hasRole('LEGAL') && !hasRole('ADMIN', 'DIRECTOR', 'SALES_STAFF', 'SALES_MANAGER')) return '/approvals'
  return '/dashboard'
}

export function roleDepartmentLabel(role: UserRole, t: (key: MessageKey) => string): string {
  const map: Partial<Record<UserRole, MessageKey>> = {
    SALES_STAFF: 'role.dept.sales',
    SALES_MANAGER: 'role.dept.sales',
    LEGAL: 'role.dept.legal',
    ACCOUNTING: 'role.dept.accounting',
    OPERATIONS: 'role.dept.operations',
    DIRECTOR: 'role.dept.director',
    ADMIN: 'role.dept.admin',
  }
  const key = map[role]
  return key ? t(key) : role.replace(/_/g, ' ')
}

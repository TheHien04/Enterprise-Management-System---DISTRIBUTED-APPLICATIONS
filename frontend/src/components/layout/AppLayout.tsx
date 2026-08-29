import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  billingApi,
  contractsApi,
  notificationsApi,
  pricingApi,
  workflowsApi,
} from '@/api/modules'
import { NAV_SECTIONS, roleDepartmentLabel } from '@/config/rbac'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import { Icons } from '@/components/ui/icons'
import { buildExceptions, countBySeverity } from '@/lib/exceptions'
import type { NotificationItem } from '@/types/domain'
import type { UserRole } from '@/types/auth'
import CommandPalette from './CommandPalette'
import './AppLayout.css'

function initials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

const POLL_MS = 30_000

export default function AppLayout() {
  const { user, logout, hasRole } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { locale, setLocale, t } = useLocale()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdHelp, setCmdHelp] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [exceptionCount, setExceptionCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  const canSeeApprovals = hasRole(
    'SALES_STAFF',
    'SALES_MANAGER',
    'LEGAL',
    'ACCOUNTING',
    'DIRECTOR',
    'ADMIN',
  )
  const showContracts = hasRole('SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN')
  const showPricing = hasRole('SALES_STAFF', 'SALES_MANAGER', 'DIRECTOR', 'ADMIN')
  const showBilling = hasRole('ACCOUNTING', 'DIRECTOR', 'ADMIN')
  const primaryRole = (user?.roles[0] ?? 'SALES_STAFF') as UserRole
  const userId = user?.username ?? ''

  const refreshChrome = useCallback(async () => {
    if (!userId) return
    try {
      const res = await notificationsApi.list(userId)
      setNotifications(res.data ?? [])
    } catch {
      setNotifications([])
    }

    let inbox: Awaited<ReturnType<typeof workflowsApi.inbox>>['data'] = []
    if (canSeeApprovals) {
      try {
        const res = await workflowsApi.inbox(primaryRole)
        inbox = res.data ?? []
        setPendingApprovals(inbox.length)
      } catch {
        setPendingApprovals(0)
        inbox = []
      }
    } else {
      setPendingApprovals(0)
    }

    try {
      const [contracts, priceLists, billing] = await Promise.all([
        showContracts
          ? contractsApi.list().then((r) => r.data ?? []).catch(() => [])
          : Promise.resolve([]),
        showPricing
          ? pricingApi.listPriceLists().then((r) => r.data ?? []).catch(() => [])
          : Promise.resolve([]),
        showBilling
          ? billingApi.list().then((r) => r.data ?? []).catch(() => [])
          : Promise.resolve([]),
      ])
      const counts = countBySeverity(
        buildExceptions({ inbox, contracts, priceLists, billing }),
      )
      // Badge emphasizes actionable exceptions (critical + warning), not draft info noise
      setExceptionCount(counts.critical + counts.warning)
    } catch {
      setExceptionCount(0)
    }
  }, [userId, canSeeApprovals, primaryRole, showContracts, showPricing, showBilling])

  useEffect(() => {
    void refreshChrome()
    const id = window.setInterval(() => void refreshChrome(), POLL_MS)
    return () => window.clearInterval(id)
  }, [refreshChrome])

  useEffect(() => {
    let chord: string | null = null
    let chordTimer: number | undefined

    function clearChord() {
      chord = null
      if (chordTimer) window.clearTimeout(chordTimer)
    }

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCmdHelp(false)
        setCmdOpen((open) => !open)
        setNotifOpen(false)
        clearChord()
        return
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === '?' && !cmdOpen) {
        event.preventDefault()
        setCmdHelp(true)
        setCmdOpen(true)
        return
      }

      const key = event.key.toLowerCase()
      if (key === 'g') {
        chord = 'g'
        if (chordTimer) window.clearTimeout(chordTimer)
        chordTimer = window.setTimeout(clearChord, 1200)
        return
      }
      if (chord === 'g') {
        clearChord()
        if (key === 'a' && canSeeApprovals) {
          event.preventDefault()
          navigate('/approvals')
        } else if (key === 'e') {
          event.preventDefault()
          navigate('/exceptions')
        } else if (key === 'd') {
          event.preventDefault()
          navigate('/dashboard')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearChord()
    }
  }, [canSeeApprovals, cmdOpen, navigate])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!notifRef.current?.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notifOpen])

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.roles === null || item.roles.some((role) => hasRole(role)),
    ),
  })).filter((section) => section.items.length > 0)

  const unread = notifications.filter((n) => !n.read)
  const unreadCount = unread.length
  const latestUnread = unread.slice(0, 5)

  return (
    <div className={`layout${sidebarOpen ? ' sidebar-open' : ''}`}>
      <div
        className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">{Icons.logo}</div>
          <div className="brand-text">
            <span className="brand-name">{t('brand.name')}</span>
            <span className="brand-tag">{t('brand.tag')}</span>
          </div>
        </div>

        {visibleSections.map((section) => (
          <div key={section.labelKey} className="nav-section">
            <div className="nav-section-label">{t(section.labelKey)}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={() => setSidebarOpen(false)}
              >
                {Icons[item.icon]}
                <span className="nav-link-label">{t(item.labelKey)}</span>
                {item.to === '/approvals' && pendingApprovals > 0 && (
                  <span className="nav-badge" aria-label={`${pendingApprovals} pending`}>
                    {pendingApprovals > 99 ? '99+' : pendingApprovals}
                  </span>
                )}
                {item.to === '/exceptions' && exceptionCount > 0 && (
                  <span className="nav-badge nav-badge-critical" aria-label={`${exceptionCount} exceptions`}>
                    {exceptionCount > 99 ? '99+' : exceptionCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <p className="sidebar-footer-text">
            {t('brand.footerLine1')}
            <br />
            {t('brand.footerLine2')}
          </p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-left-row">
              <button
                className="icon-btn mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label={t('brand.openMenu')}
              >
                {Icons.menu}
              </button>
              <div>
                <span className="topbar-greeting">{t('common.welcomeBack')}</span>
                <span className="topbar-title">{user?.fullName ?? t('brand.defaultUser')}</span>
              </div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="topbar-controls">
              <button
                type="button"
                className="cmd-trigger"
                onClick={() => setCmdOpen(true)}
                aria-label={t('cmd.open')}
              >
                {Icons.search}
                <span className="cmd-trigger-label">{t('cmd.open')}</span>
                <kbd className="cmd-trigger-kbd">⌘K</kbd>
              </button>
              <div className="locale-toggle">
                <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
                <button className={locale === 'vi' ? 'active' : ''} onClick={() => setLocale('vi')}>VI</button>
              </div>
              <button className="icon-btn" onClick={toggleTheme} aria-label={t('brand.toggleTheme')}>
                {theme === 'light' ? Icons.moon : Icons.sun}
              </button>
              <div className="notif-wrap" ref={notifRef}>
                <button
                  type="button"
                  className="icon-btn notif-btn"
                  aria-label={t('nav.notifications')}
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen((o) => !o)}
                >
                  {Icons.bell}
                  {unreadCount > 0 && (
                    <span className="topbar-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div className="notif-dropdown">
                    <div className="notif-dropdown-header">
                      <strong>{t('nav.notifications')}</strong>
                      <span className="notif-dropdown-count">
                        {unreadCount} {t('notif.unread')}
                      </span>
                    </div>
                    {latestUnread.length === 0 ? (
                      <p className="notif-dropdown-empty">{t('empty.noNotifications')}</p>
                    ) : (
                      <ul className="notif-dropdown-list">
                        {latestUnread.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="notif-dropdown-item"
                              onClick={() => {
                                setNotifOpen(false)
                                navigate('/notifications')
                              }}
                            >
                              <span className="notif-dropdown-title">{item.title}</span>
                              <span className="notif-dropdown-body">{item.body}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      to="/notifications"
                      className="notif-dropdown-footer"
                      onClick={() => setNotifOpen(false)}
                    >
                      {t('notif.viewAll')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="user-chip">
              <div className="user-avatar">{initials(user?.fullName)}</div>
              <div className="user-info">
                <div className="user-name">{user?.fullName}</div>
                <div className="user-meta">
                  {roleDepartmentLabel(primaryRole, t)} · {user?.roles.join(' · ')}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              {Icons.logout}
              {t('common.signOut')}
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        startWithHelp={cmdHelp}
        onClose={() => {
          setCmdOpen(false)
          setCmdHelp(false)
        }}
      />
    </div>
  )
}

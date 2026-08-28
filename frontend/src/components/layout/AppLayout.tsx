import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { NAV_SECTIONS, roleDepartmentLabel } from '@/config/rbac'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { useTheme } from '@/context/ThemeContext'
import { Icons } from '@/components/ui/icons'
import type { UserRole } from '@/types/auth'
import './AppLayout.css'

function initials(name?: string) {
  if (!name) return 'U'
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export default function AppLayout() {
  const { user, logout, hasRole } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { locale, setLocale, t } = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.roles === null || item.roles.some((role) => hasRole(role)),
    ),
  })).filter((section) => section.items.length > 0)

  const primaryRole = (user?.roles[0] ?? 'SALES_STAFF') as UserRole

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
                {t(item.labelKey)}
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
              <div className="locale-toggle">
                <button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
                <button className={locale === 'vi' ? 'active' : ''} onClick={() => setLocale('vi')}>VI</button>
              </div>
              <button className="icon-btn" onClick={toggleTheme} aria-label={t('brand.toggleTheme')}>
                {theme === 'light' ? Icons.moon : Icons.sun}
              </button>
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
    </div>
  )
}

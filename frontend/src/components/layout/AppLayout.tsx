import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import './AppLayout.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: [] as string[] },
  { to: '/customers', label: 'Customers', roles: ['SALES_STAFF', 'SALES_MANAGER', 'ADMIN'] },
  { to: '/contracts', label: 'Contracts', roles: ['SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN'] },
  { to: '/pricing', label: 'Price Lists', roles: ['SALES_STAFF', 'SALES_MANAGER', 'DIRECTOR', 'ADMIN'] },
  { to: '/operations', label: 'Volumes', roles: ['OPERATIONS', 'ADMIN'] },
  { to: '/billing', label: 'Billing', roles: ['ACCOUNTING', 'DIRECTOR', 'ADMIN'] },
  { to: '/approvals', label: 'Approvals', roles: ['SALES_MANAGER', 'LEGAL', 'ACCOUNTING', 'DIRECTOR', 'ADMIN'] },
  { to: '/notifications', label: 'Notifications', roles: [] as string[] },
  { to: '/audit', label: 'Audit Log', roles: ['ADMIN', 'DIRECTOR'] },
  { to: '/admin', label: 'Admin', roles: ['ADMIN'] },
]

export default function AppLayout() {
  const { user, logout, hasRole } = useAuth()

  const visibleNav = NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.some((role) => hasRole(role as never)),
  )

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <strong>UDPT</strong>
          <span>Logistics ABC</span>
        </div>
        <nav>
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <div className="user-name">{user?.fullName}</div>
            <div className="user-meta">{user?.roles.join(', ')}</div>
          </div>
          <button className="btn btn-secondary" onClick={logout}>Logout</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

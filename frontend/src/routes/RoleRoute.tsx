import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { canAccessPath } from '@/config/rbac'
import { useAuth } from '@/context/AuthContext'

export default function RoleRoute() {
  const { hasRole } = useAuth()
  const location = useLocation()

  if (!canAccessPath(location.pathname, hasRole)) {
    return <Navigate to="/forbidden" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

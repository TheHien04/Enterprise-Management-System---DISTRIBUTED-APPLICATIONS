import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import ContractsPage from '@/pages/contracts/ContractsPage'
import PriceListsPage from '@/pages/pricing/PriceListsPage'
import VolumesPage from '@/pages/operations/VolumesPage'
import BillingPage from '@/pages/billing/BillingPage'
import ApprovalsPage from '@/pages/approvals/ApprovalsPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import AuditPage from '@/pages/audit/AuditPage'
import AdminPage from '@/pages/admin/AdminPage'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/pricing" element={<PriceListsPage />} />
          <Route path="/operations" element={<VolumesPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

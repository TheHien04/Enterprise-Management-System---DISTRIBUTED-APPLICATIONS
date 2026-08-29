import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import ContractsPage from '@/pages/contracts/ContractsPage'
import ContractDetailPage from '@/pages/contracts/ContractDetailPage'
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage'
import PriceListsPage from '@/pages/pricing/PriceListsPage'
import VolumesPage from '@/pages/operations/VolumesPage'
import BillingPage from '@/pages/billing/BillingPage'
import BillingDetailPage from '@/pages/billing/BillingDetailPage'
import EsignPage from '@/pages/esign/EsignPage'
import AppendicesPage from '@/pages/contracts/AppendicesPage'
import AppendixDetailPage from '@/pages/contracts/AppendixDetailPage'
import ApprovalsPage from '@/pages/approvals/ApprovalsPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import AuditPage from '@/pages/audit/AuditPage'
import AdminPage from '@/pages/admin/AdminPage'
import PriceListDetailPage from '@/pages/pricing/PriceListDetailPage'
import ForbiddenPage from '@/pages/errors/ForbiddenPage'
import ExceptionsPage from '@/pages/exceptions/ExceptionsPage'
import ProtectedRoute from './ProtectedRoute'
import RoleRoute from './RoleRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/exceptions" element={<ExceptionsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />
            <Route path="/appendices" element={<AppendicesPage />} />
            <Route path="/appendices/:id" element={<AppendixDetailPage />} />
            <Route path="/pricing" element={<PriceListsPage />} />
            <Route path="/pricing/:id" element={<PriceListDetailPage />} />
            <Route path="/operations" element={<VolumesPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/:id" element={<BillingDetailPage />} />
            <Route path="/esign" element={<EsignPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="/forbidden" element={<ForbiddenPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

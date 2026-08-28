import { apiRequest } from './client'
import type {
  AdminUser,
  ApiListResponse,
  Appendix,
  AuditLog,
  BillingSheet,
  Contract,
  Customer,
  CustomerOverview,
  EsignSession,
  NotificationItem,
  Period,
  PriceList,
  ServiceCatalogItem,
  Volume,
  WorkflowHistoryLog,
  WorkflowItem,
  WorkflowProgress,
  BillingAdjustment,
} from '@/types/domain'

export const customersApi = {
  list: () => apiRequest<ApiListResponse<Customer[]>>('/api/v1/customers'),
  overview: (id: string) =>
    apiRequest<ApiListResponse<CustomerOverview>>(`/api/v1/customers/${id}/overview`),
  create: (payload: Partial<Customer> & { code: string; name: string }) =>
    apiRequest<ApiListResponse<Customer>>('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  suspend: (id: string) =>
    apiRequest<ApiListResponse<Customer>>(`/api/v1/customers/${id}/suspend`, { method: 'POST' }),
  patch: (id: string, payload: Partial<Customer>) =>
    apiRequest<ApiListResponse<Customer>>(`/api/v1/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
}

export const contractsApi = {
  list: (customerId?: string) =>
    apiRequest<ApiListResponse<Contract[]>>(
      customerId ? `/api/v1/contracts?customer_id=${customerId}` : '/api/v1/contracts',
    ),
  get: (id: string) => apiRequest<ApiListResponse<Contract>>(`/api/v1/contracts/${id}`),
  patch: (id: string, payload: Partial<Contract>) =>
    apiRequest<ApiListResponse<Contract>>(`/api/v1/contracts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  create: (payload: Record<string, unknown>) =>
    apiRequest<ApiListResponse<Contract>>('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submit: (id: string) =>
    apiRequest<ApiListResponse<Contract>>(`/api/v1/contracts/${id}/submit`, { method: 'POST' }),
  addAttachment: (id: string) =>
    apiRequest<ApiListResponse<{ id: string; file_name: string }>>(`/api/v1/contracts/${id}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ file_name: 'contract.pdf', file_url: 'minio://contracts/demo.pdf' }),
    }),
  listAppendices: (contractId: string) =>
    apiRequest<ApiListResponse<Appendix[]>>(`/api/v1/contracts/${contractId}/appendices`),
  createAppendix: (payload: {
    code: string
    contract_id: string
    title: string
    change_summary?: string
    effective_date: string
  }) =>
    apiRequest<ApiListResponse<Appendix>>('/api/v1/contracts/appendices', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitAppendix: (appendixId: string) =>
    apiRequest<ApiListResponse<Appendix>>(`/api/v1/contracts/appendices/${appendixId}/submit`, {
      method: 'POST',
    }),
  getAppendix: (appendixId: string) =>
    apiRequest<ApiListResponse<Appendix>>(`/api/v1/contracts/appendices/${appendixId}`),
}

export const workflowsApi = {
  inbox: (role: string) =>
    apiRequest<ApiListResponse<WorkflowItem[]>>(`/api/v1/workflows/inbox?role=${encodeURIComponent(role)}`),
  documentHistory: (documentType: string, documentId: string) =>
    apiRequest<ApiListResponse<WorkflowHistoryLog[]>>(
      `/api/v1/workflows/document/${documentType}/${documentId}/history`,
    ),
  approve: (id: string, comment?: string) =>
    apiRequest<ApiListResponse<WorkflowItem>>(`/api/v1/workflows/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  reject: (id: string, comment?: string) =>
    apiRequest<ApiListResponse<WorkflowItem>>(`/api/v1/workflows/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
  get: (id: string) =>
    apiRequest<ApiListResponse<WorkflowProgress>>(`/api/v1/workflows/${id}`),
  requestRevision: (id: string, comment?: string) =>
    apiRequest<ApiListResponse<WorkflowItem>>(`/api/v1/workflows/${id}/request-revision`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),
}

export const pricingApi = {
  listPriceLists: (contractCode?: string) => {
    const q = contractCode ? `?contract_code=${encodeURIComponent(contractCode)}` : ''
    return apiRequest<ApiListResponse<PriceList[]>>(`/api/v1/pricing/price-lists${q}`)
  },
  getPriceList: (id: string) =>
    apiRequest<ApiListResponse<PriceList>>(`/api/v1/pricing/price-lists/${id}`),
  createPriceList: (payload: {
    contract_code: string
    version: string
    effective_from: string
    effective_to: string
    items: { service_code: string; unit_price: number }[]
  }) =>
    apiRequest<ApiListResponse<PriceList>>('/api/v1/pricing/price-lists', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitPriceList: (id: string) =>
    apiRequest<ApiListResponse<PriceList>>(`/api/v1/pricing/price-lists/${id}/submit`, { method: 'POST' }),
  listCatalog: () => apiRequest<ApiListResponse<ServiceCatalogItem[]>>('/api/v1/pricing/catalog/services'),
}

export const operationsApi = {
  listPeriods: () => apiRequest<ApiListResponse<Period[]>>('/api/v1/operations/periods'),
  createPeriod: (period: string) =>
    apiRequest<ApiListResponse<Period>>('/api/v1/operations/periods', {
      method: 'POST',
      body: JSON.stringify({ period }),
    }),
  lockPeriod: (period: string) =>
    apiRequest<ApiListResponse<Period>>(`/api/v1/operations/periods/${period}/lock`, { method: 'POST' }),
  listVolumes: (contractCode?: string, period?: string) => {
    const params = new URLSearchParams()
    if (contractCode) params.set('contract_code', contractCode)
    if (period) params.set('period', period)
    const q = params.toString()
    return apiRequest<ApiListResponse<Volume[]>>(`/api/v1/operations/volumes${q ? `?${q}` : ''}`)
  },
  createVolume: (payload: {
    contract_code: string
    service_code: string
    quantity: number
    record_date: string
    period: string
  }) =>
    apiRequest<ApiListResponse<Volume>>('/api/v1/operations/volumes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

export const billingApi = {
  list: (contractCode?: string, period?: string) => {
    const params = new URLSearchParams()
    if (contractCode) params.set('contract_code', contractCode)
    if (period) params.set('period', period)
    const q = params.toString()
    return apiRequest<ApiListResponse<BillingSheet[]>>(`/api/v1/billing/billing-sheets${q ? `?${q}` : ''}`)
  },
  get: (id: string) => apiRequest<ApiListResponse<BillingSheet>>(`/api/v1/billing/billing-sheets/${id}`),
  generate: (contractCode: string, period: string, taxRate = 0) =>
    apiRequest<ApiListResponse<BillingSheet>>(
      `/api/v1/billing/billing-sheets/generate?contract_code=${encodeURIComponent(contractCode)}&period=${encodeURIComponent(period)}&tax_rate=${taxRate}`,
      { method: 'POST' },
    ),
  reconcile: (id: string) =>
    apiRequest<ApiListResponse<BillingSheet>>(`/api/v1/billing/billing-sheets/${id}/reconcile`, { method: 'POST' }),
  submit: (id: string) =>
    apiRequest<ApiListResponse<BillingSheet>>(`/api/v1/billing/billing-sheets/${id}/submit`, { method: 'POST' }),
  sendEsign: (id: string) =>
    apiRequest<ApiListResponse<BillingSheet>>(`/api/v1/billing/billing-sheets/${id}/send-esign`, { method: 'POST' }),
  completeEsign: (id: string, success = true) =>
    apiRequest<ApiListResponse<BillingSheet>>(
      `/api/v1/billing/billing-sheets/${id}/complete-esign?success=${success}`,
      { method: 'POST' },
    ),
  publish: (id: string) =>
    apiRequest<ApiListResponse<BillingSheet>>(`/api/v1/billing/billing-sheets/${id}/publish`, { method: 'POST' }),
  listAdjustments: (sheetId: string) =>
    apiRequest<ApiListResponse<BillingAdjustment[]>>(
      `/api/v1/billing/billing-sheets/${sheetId}/adjustments`,
    ),
  addAdjustment: (sheetId: string, payload: { amount: number; reason: string }) =>
    apiRequest<ApiListResponse<BillingAdjustment>>(
      `/api/v1/billing/billing-sheets/${sheetId}/adjustments`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  deleteAdjustment: (sheetId: string, adjustmentId: string) =>
    apiRequest<ApiListResponse<{ id: string }>>(
      `/api/v1/billing/billing-sheets/${sheetId}/adjustments/${adjustmentId}`,
      { method: 'DELETE' },
    ),
}

export const esignApi = {
  startSession: (payload: { document_type: string; document_id: string }) =>
    apiRequest<ApiListResponse<EsignSession>>('/api/v1/esign/signing-sessions/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSession: (id: string) =>
    apiRequest<ApiListResponse<EsignSession>>(`/api/v1/esign/signing-sessions/${id}`),
  completeSession: (id: string, success = true) =>
    apiRequest<ApiListResponse<EsignSession>>(`/api/v1/esign/signing-sessions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ success }),
    }),
}

export const adminApi = {
  listUsers: () => apiRequest<ApiListResponse<AdminUser[]>>('/api/v1/admin/users'),
}

export const notificationsApi = {
  list: (userId: string) =>
    apiRequest<ApiListResponse<NotificationItem[]>>(`/api/v1/notifications?user_id=${encodeURIComponent(userId)}`),
  markRead: (id: string) =>
    apiRequest<ApiListResponse<NotificationItem>>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
}

export const auditApi = {
  list: (entityType?: string, entityId?: string) => {
    const params = new URLSearchParams()
    if (entityType) params.set('entity_type', entityType)
    if (entityId) params.set('entity_id', entityId)
    const q = params.toString()
    return apiRequest<ApiListResponse<AuditLog[]>>(`/api/v1/audit${q ? `?${q}` : ''}`)
  },
}

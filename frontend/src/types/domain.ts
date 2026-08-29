export interface ApiListResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface Customer {
  id: string
  code: string
  name: string
  tax_code?: string | null
  address?: string | null
  representative?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  customer_type?: string | null
  status: string
}

export interface Contract {
  id: string
  code: string
  customer_id: string
  customer_code?: string | null
  customer_name?: string | null
  title: string
  effective_from: string
  effective_to: string
  total_value: number
  payment_terms?: string | null
  service_terms?: string | null
  status: string
  current_assignee_role?: string | null
  workflow_id?: string | null
}

export interface Appendix {
  id: string
  code: string
  contract_id: string
  title: string
  change_summary?: string | null
  effective_date: string
  status: string
  workflow_id?: string | null
}

export interface WorkflowItem {
  id: string
  document_type: string
  document_id: string
  definition_name: string
  status: string
  current_step_num: number
  current_assignee_role?: string | null
  current_assignee_user_id?: string | null
  submitted_by: string
  version?: number
  created_at?: string | null
  updated_at?: string | null
}

export interface PriceListItem {
  id: string
  service_code: string
  unit_price: number
}

export interface PriceList {
  id: string
  contract_code: string
  version: string
  effective_from: string
  effective_to: string
  status: string
  items?: PriceListItem[]
}

export interface ServiceCatalogItem {
  id: string
  code: string
  name: string
  unit: string
}

export interface Period {
  id: string
  period: string
  status: string
}

export interface Volume {
  id: string
  contract_code: string
  service_code: string
  quantity: number
  record_date: string
  period: string
}

export interface BillingSheetItem {
  id: string
  service_code: string
  quantity: number
  unit_price: number
  snapshot_unit_price: number
  amount: number
}

export interface BillingAdjustment {
  id: string
  billing_sheet_id: string
  adjustment_type: string
  service_code?: string | null
  quantity_delta: number
  amount_delta: number
  reason: string
  created_by: string
  created_at?: string
}

export interface BillingSheet {
  id: string
  contract_code: string
  period: string
  tax_rate: number
  subtotal: number
  tax_amount: number
  total: number
  approval_status: string
  signing_status: string
  issuance_status: string
  items?: BillingSheetItem[]
}

export interface EsignSession {
  id: string
  document_type: string
  document_id: string
  status: string
  provider_ref?: string | null
  created_at: string
  updated_at: string
}

export interface AdminUser {
  username: string
  full_name: string
  roles: string[]
}

export interface AdminWorkflowTemplateStep {
  step_num: number
  step_name: string
  assignee_role: string
  required: boolean
}

export interface AdminWorkflowTemplate {
  document_type: string
  name: string
  description?: string
  steps: AdminWorkflowTemplateStep[]
}

export interface PriceListCompareRow {
  service_code: string
  price_a: number | null
  price_b: number | null
  delta: number | null
}

export interface NotificationItem {
  id: string
  user_id: string
  title: string
  body: string
  read: boolean
  event_type: string
  reference_id?: string | null
}

export interface WorkflowHistoryLog {
  step_num: number
  action: string
  actor_id: string
  actor_role: string
  comment?: string | null
  created_at: string
}

export interface WorkflowProgress {
  workflow: WorkflowItem
  completed_steps: number[]
  remaining_steps: Record<string, unknown>[]
  current_step?: Record<string, unknown> | null
}

export interface CustomerOverview {
  customer: Customer
  contracts: Contract[]
  contract_codes: string[]
  price_list_count: number
  billing_sheet_count: number
}

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action: string
  actor_id: string
  before_state?: string | null
  after_state?: string | null
  note?: string | null
  created_at: string
}

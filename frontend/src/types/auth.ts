export type UserRole =
  | 'SALES_STAFF'
  | 'SALES_MANAGER'
  | 'LEGAL'
  | 'ACCOUNTING'
  | 'OPERATIONS'
  | 'DIRECTOR'
  | 'ADMIN'

export interface AuthUser {
  username: string
  roles: UserRole[]
  fullName: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  username: string
  roles: UserRole[]
  full_name: string
}

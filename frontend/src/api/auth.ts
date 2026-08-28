import { apiRequest } from './client'
import type { LoginResponse } from '@/types/auth'

export async function login(username: string, password: string) {
  return apiRequest<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function checkGatewayHealth() {
  return apiRequest<{ status: string; service: string }>('/health')
}

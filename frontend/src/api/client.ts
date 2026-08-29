const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function extractErrorMessage(body: unknown, fallback: string): { message: string; code?: string } {
  if (!body || typeof body !== 'object') return { message: fallback }
  const record = body as Record<string, unknown>
  const error = record.error
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    if (typeof err.message === 'string' && err.message.trim()) {
      return { message: err.message, code: typeof err.code === 'string' ? err.code : undefined }
    }
  }
  const detail = record.detail
  if (typeof detail === 'string' && detail.trim()) {
    return { message: detail }
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const parts = detail.map((item) => {
      if (!item || typeof item !== 'object') return String(item)
      const row = item as Record<string, unknown>
      const loc = Array.isArray(row.loc) ? row.loc.filter((p) => p !== 'body').join('.') : ''
      const msg = typeof row.msg === 'string' ? row.msg : 'Invalid value'
      return loc ? `${loc}: ${msg}` : msg
    })
    return { message: parts.join('; ') }
  }
  if (typeof record.message === 'string' && record.message.trim()) {
    return { message: record.message }
  }
  return { message: fallback }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('access_token')
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body != null) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      `Cannot reach API at ${API_BASE_URL}. Is the gateway running?`,
      0,
      'NETWORK_ERROR',
    )
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let code: string | undefined
    try {
      const body = await response.json()
      const parsed = extractErrorMessage(body, message)
      message = parsed.message
      code = parsed.code
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, response.status, code)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

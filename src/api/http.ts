import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { backendReady } from '@/api/backend'
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/api/config'
import { apiErrorBodySchema, type ErrorCode } from '@/api/contracts'
import { sessionStore } from '@/features/auth/session-store'
import { guestCart } from '@/features/cart/guest-cart'

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE'
  readonly fields: Record<string, string>

  constructor(params: { status: number; code: ApiError['code']; message: string; fields?: Record<string, string> }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.fields = params.fields ?? {}
  }

  get isTransient() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.status >= 500
  }
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use(async (config) => {
  await backendReady
  const token = sessionStore.getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const guestCartId = guestCart.getId()
  if (guestCartId) config.headers.set('X-Cart-Id', guestCartId)
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const apiError = toApiError(error)
    if (apiError.code === 'SESSION_EXPIRED' || (apiError.status === 401 && sessionStore.getToken())) {
      sessionStore.markExpired()
    }
    return Promise.reject(apiError)
  },
)

function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: 'O servidor demorou para responder.' })
    }
    if (!error.response) {
      return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor.' })
    }
    const body = apiErrorBodySchema.safeParse(error.response.data)
    if (body.success) {
      return new ApiError({ status: error.response.status, ...body.data.error })
    }
    return new ApiError({
      status: error.response.status,
      code: error.response.status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
      message: 'Não foi possível concluir a operação.',
    })
  }
  return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Erro inesperado de comunicação.' })
}

export async function apiRequest<S extends z.ZodType>(schema: S, config: AxiosRequestConfig): Promise<z.infer<S>> {
  const response = await http.request(config)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    console.error('Resposta fora do contrato', config.url, parsed.error.issues)
    throw new ApiError({ status: response.status, code: 'INVALID_RESPONSE', message: 'Resposta inesperada do servidor.' })
  }
  return parsed.data
}

export async function apiRequestVoid(config: AxiosRequestConfig): Promise<void> {
  await http.request(config)
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  return isApiError(error) ? error.message : fallback
}

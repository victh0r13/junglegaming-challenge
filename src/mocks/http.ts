import { HttpResponse, delay } from 'msw'
import type { ApiErrorBody, ErrorCode } from '@/api/contracts'
import { db, type DbUser } from './db'
import { createRandom, scenario } from './scenarios'

export const API = '*/api'

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  WALLET_REJECTED: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  USERNAME_TAKEN: 409,
  AVAILABILITY_CONFLICT: 409,
  EDITION_UNAVAILABLE: 409,
  QUANTITY_LIMIT: 409,
  QUOTE_OUTDATED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  WALLET_LIMIT: 409,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
}

export class MockHttpError extends Error {
  readonly code: ErrorCode
  readonly fields?: Record<string, string>

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message)
    this.code = code
    this.fields = fields
  }

  toResponse() {
    const body: ApiErrorBody = { error: { code: this.code, message: this.message, fields: this.fields } }
    return HttpResponse.json(body, { status: STATUS_BY_CODE[this.code] })
  }
}

export function fail(code: ErrorCode, message: string, fields?: Record<string, string>): never {
  throw new MockHttpError(code, message, fields)
}

export function validationError(fields: Record<string, string>): never {
  fail('VALIDATION_ERROR', 'Revise os campos destacados.', fields)
}

const random = createRandom(42)
let catalogRequestCount = 0
const failureCounters = new Map<string, number>()

type RouteKind = 'read' | 'write' | 'catalog'

async function simulateNetwork(kind: RouteKind, failureKey: string) {
  const current = scenario.get()

  if (current === 'offline') return HttpResponse.error()

  if (current === 'erro-servidor' && kind !== 'write' && /^(nfts|highlights)/.test(failureKey)) {
    const attempts = (failureCounters.get(failureKey) ?? 0) + 1
    failureCounters.set(failureKey, attempts)
    if (attempts <= 3) {
      await delay(300)
      return new MockHttpError('SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.').toResponse()
    }
  }

  switch (current) {
    case 'lento':
      await delay(2_500)
      break
    case 'latencia-variavel':
      await delay(100 + Math.round(random() * 1_700))
      break
    case 'fora-de-ordem':
      if (kind === 'catalog') {
        catalogRequestCount += 1
        await delay(catalogRequestCount % 2 === 1 ? 1_600 : 250)
      } else {
        await delay(150)
      }
      break
    default:
      await delay(kind === 'write' ? 250 : 180)
  }
  return null
}

type HandlerArgs = { request: Request; params: Record<string, string | readonly string[] | undefined> }

export function route(kind: RouteKind, handler: (args: HandlerArgs) => Promise<Response> | Response) {
  return async (args: HandlerArgs) => {
    const key = new URL(args.request.url).pathname.replace(/^.*\/api\//, '')
    const simulated = await simulateNetwork(kind, key)
    if (simulated) return simulated
    try {
      return await handler(args)
    } catch (error) {
      if (error instanceof MockHttpError) return error.toResponse()
      console.error('[mocks] erro inesperado', error)
      return new MockHttpError('INTERNAL_ERROR', 'Erro interno do servidor simulado.').toResponse()
    }
  }
}

export function sessionTtlMs() {
  return scenario.is('sessao-curta') ? 30_000 : 2 * 60 * 60 * 1000
}

function readToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

export function optionalUser(request: Request): DbUser | null {
  const token = readToken(request)
  if (!token) return null
  const session = db.data.sessions.find((s) => s.token === token)
  if (!session) fail('UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  if (session.expiresAt <= Date.now()) {
    db.data.sessions = db.data.sessions.filter((s) => s.token !== token)
    db.persist()
    fail('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  return db.data.users.find((user) => user.id === session.userId) ?? fail('UNAUTHENTICATED', 'Sessão inválida.')
}

export function requireUser(request: Request): DbUser {
  return optionalUser(request) ?? fail('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
}

export function userIdForToken(token: string | null | undefined) {
  if (!token) return null
  const session = db.data.sessions.find((s) => s.token === token && s.expiresAt > Date.now())
  return session?.userId ?? null
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Partial<T>) : {}
  } catch {
    return {}
  }
}

export function publicUser({ passwordHash: _hash, salt: _salt, ...user }: DbUser) {
  return user
}

export function nowIso() {
  return new Date().toISOString()
}

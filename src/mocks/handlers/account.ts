import { http, HttpResponse } from 'msw'
import type { AuthResponse, AvatarUpdateBody, LoginBody, PasswordChangeBody, ProfileUpdateBody, RegisterBody } from '@/api/contracts'
import { issuesToFields, passwordChangeSchema, profileInputSchema } from '@/api/schemas'
import { db, hashPassword, type DbUser } from '../db'
import {
  API,
  fail,
  nowIso,
  publicUser,
  readJson,
  requireUser,
  route,
  sessionTtlMs,
  validationError,
} from '../http'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/
const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_AVATAR_LENGTH = 1_400_000

export function passwordProblem(password: string) {
  if (password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.'
  return null
}

function profileProblems(input: Partial<RegisterBody>, currentUserId?: string) {
  const fields: Record<string, string> = {}
  if (input.displayName !== undefined) {
    const name = input.displayName.trim()
    if (name.length < 2 || name.length > 40) fields.displayName = 'Informe um nome entre 2 e 40 caracteres.'
  }
  if (input.username !== undefined && !USERNAME_PATTERN.test(input.username)) {
    fields.username = 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.'
  }
  if (input.email !== undefined && !EMAIL_PATTERN.test(input.email)) fields.email = 'Informe um e-mail válido.'
  if (Object.keys(fields).length > 0) validationError(fields)

  const others = db.data.users.filter((user) => user.id !== currentUserId)
  if (input.email && others.some((user) => user.email.toLowerCase() === input.email!.toLowerCase())) {
    fail('EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { email: 'Este e-mail já está em uso.' })
  }
  if (input.username && others.some((user) => user.username === input.username)) {
    fail('USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { username: 'Escolha outro nome de usuário.' })
  }
}

function startSession(user: DbUser): AuthResponse {
  const token = `tok_${crypto.randomUUID()}`
  const expiresAt = Date.now() + sessionTtlMs()
  db.data.sessions.push({ token, userId: user.id, expiresAt })
  db.persist()
  return { user: publicUser(user), session: { token, expiresAt: new Date(expiresAt).toISOString() } }
}

export const accountHandlers = [
  http.post(
    `${API}/auth/register`,
    route('write', async ({ request }) => {
      const body = await readJson<RegisterBody>(request)
      const username = body.username?.trim().toLowerCase() ?? ''
      const input = {
        displayName: body.displayName?.trim() || username,
        username,
        email: body.email?.trim().toLowerCase() ?? '',
        password: body.password ?? '',
      }
      const problem = passwordProblem(input.password)
      if (problem) validationError({ password: problem })
      profileProblems(input)

      const salt = crypto.randomUUID()
      const user: DbUser = {
        id: db.nextId('usr'),
        displayName: input.displayName,
        username: input.username,
        email: input.email,
        avatarUrl: null,
        bio: '',
        ensName: `${input.username.replace(/[^a-z0-9-]/g, '-').slice(0, 32).padEnd(3, '0')}.eth`,
        walletNickname: 'Minha carteira',
        salt,
        passwordHash: await hashPassword(input.password, salt),
      }
      db.data.users.push(user)
      db.data.favorites[user.id] = []
      return HttpResponse.json(startSession(user), { status: 201 })
    }),
  ),

  http.post(
    `${API}/auth/login`,
    route('write', async ({ request }) => {
      const body = await readJson<LoginBody>(request)
      const email = body.email?.trim().toLowerCase() ?? ''
      const user = db.data.users.find((candidate) => candidate.email === email)
      const valid = user && (await hashPassword(body.password ?? '', user.salt)) === user.passwordHash
      if (!user || !valid) fail('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
      return HttpResponse.json(startSession(user))
    }),
  ),

  http.get(
    `${API}/auth/session`,
    route('read', ({ request }) => HttpResponse.json({ user: publicUser(requireUser(request)) })),
  ),

  http.post(
    `${API}/auth/logout`,
    route('write', ({ request }) => {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '')
      db.data.sessions = db.data.sessions.filter((session) => session.token !== token)
      db.persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/profile`,
    route('read', ({ request }) => HttpResponse.json(publicUser(requireUser(request)))),
  ),

  http.patch(
    `${API}/profile`,
    route('write', async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<ProfileUpdateBody>(request)
      const parsed = profileInputSchema.partial().safeParse(body)
      if (!parsed.success) validationError(issuesToFields(parsed.error))
      if (body.bio !== undefined && body.bio.length > 280) validationError({ bio: 'A bio pode ter até 280 caracteres.' })
      profileProblems(parsed.data, user.id)
      Object.assign(user, parsed.data)
      if (body.bio !== undefined) user.bio = body.bio.trim()
      db.persist()
      return HttpResponse.json(publicUser(user))
    }),
  ),

  http.put(
    `${API}/profile/avatar`,
    route('write', async ({ request }) => {
      const user = requireUser(request)
      const { dataUrl } = await readJson<AvatarUpdateBody>(request)
      if (dataUrl !== null) {
        if (typeof dataUrl !== 'string' || !AVATAR_PATTERN.test(dataUrl)) {
          validationError({ avatar: 'Envie uma imagem PNG, JPEG ou WebP.' })
        }
        if (dataUrl.length > MAX_AVATAR_LENGTH) validationError({ avatar: 'A imagem deve ter no máximo 1 MB.' })
      }
      user.avatarUrl = dataUrl ?? null
      db.persist()
      return HttpResponse.json(publicUser(user))
    }),
  ),

  http.post(
    `${API}/profile/password`,
    route('write', async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<PasswordChangeBody>(request)
      if ((await hashPassword(body.currentPassword ?? '', user.salt)) !== user.passwordHash) {
        validationError({ currentPassword: 'Senha atual incorreta.' })
      }
      const parsed = passwordChangeSchema.safeParse(body)
      if (!parsed.success) validationError(issuesToFields(parsed.error))
      user.salt = crypto.randomUUID()
      user.passwordHash = await hashPassword(body.newPassword!, user.salt)
      const token = request.headers.get('Authorization')?.replace('Bearer ', '')
      db.data.sessions = db.data.sessions.filter((session) => session.userId !== user.id || session.token === token)
      db.persist()
      return new HttpResponse(null, { status: 204, headers: { 'X-Updated-At': nowIso() } })
    }),
  ),
]

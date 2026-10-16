import { authResponseSchema, userSchema, type LoginBody, type RegisterBody } from './contracts'
import { apiRequest, apiRequestVoid } from './http'
import { z } from 'zod'

export const authApi = {
  login: (body: LoginBody) => apiRequest(authResponseSchema, { url: '/auth/login', method: 'POST', data: body }),
  register: (body: RegisterBody) => apiRequest(authResponseSchema, { url: '/auth/register', method: 'POST', data: body }),
  session: (signal?: AbortSignal) => apiRequest(z.object({ user: userSchema }), { url: '/auth/session', signal }),
  logout: () => apiRequestVoid({ url: '/auth/logout', method: 'POST' }),
}

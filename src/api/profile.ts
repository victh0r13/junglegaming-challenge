import { userSchema, type AvatarUpdateBody, type PasswordChangeBody, type ProfileUpdateBody } from './contracts'
import { apiRequest, apiRequestVoid } from './http'

export const profileApi = {
  get: (signal?: AbortSignal) => apiRequest(userSchema, { url: '/profile', signal }),
  update: (body: ProfileUpdateBody) => apiRequest(userSchema, { url: '/profile', method: 'PATCH', data: body }),
  updateAvatar: (body: AvatarUpdateBody) => apiRequest(userSchema, { url: '/profile/avatar', method: 'PUT', data: body }),
  changePassword: (body: PasswordChangeBody) => apiRequestVoid({ url: '/profile/password', method: 'POST', data: body }),
}

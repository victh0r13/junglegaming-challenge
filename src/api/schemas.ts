import { z } from 'zod'
import { NETWORKS, WALLET_TYPES } from './contracts'

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const emailField = z.string().trim().toLowerCase().min(1, 'Informe o e-mail.').pipe(z.email('Informe um e-mail válido.'))
export const displayNameField = z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(40, 'Use no máximo 40 caracteres.')
export const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,20}$/, 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.')
export const ensNameField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,32}\.eth$/, 'Use de 3 a 32 letras, números ou hífen.')
export const nicknameField = z.string().trim().min(2, 'Use pelo menos 2 caracteres.').max(30, 'Use no máximo 30 caracteres.')
export const referralField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,12}$/, 'Use de 4 a 12 letras ou números.')
export const passwordField = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Use letras e números na senha.')

export function isValidAddress(network: string, address: string) {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

export const profileInputSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  email: emailField,
  ensName: ensNameField,
  walletNickname: nicknameField,
})
export type ProfileInput = z.infer<typeof profileInputSchema>

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordField,
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  })

export const walletInputSchema = z
  .object({
    role: z.enum(['primary', 'secondary']),
    label: nicknameField,
    type: z.enum(WALLET_TYPES, 'Selecione o tipo de carteira.'),
    network: z.enum(NETWORKS, 'Selecione uma rede.'),
    address: z.string().trim().min(1, 'Informe o endereço da carteira.'),
    secondaryRef: z.string().trim().max(64, 'Use no máximo 64 caracteres.').nullable().optional(),
    displayName: displayNameField,
    profileName: displayNameField,
    email: emailField,
    referralCode: referralField,
    ensName: ensNameField,
  })
  .superRefine((value, context) => {
    if (!isValidAddress(value.network, value.address)) {
      context.addIssue({
        code: 'custom',
        path: ['address'],
        message: value.network === 'solana' ? 'Endereço Solana inválido.' : 'Use um endereço 0x com 40 caracteres hexadecimais.',
      })
    }
  })
export type WalletInput = z.infer<typeof walletInputSchema>

export const collectorSchema = z.object({
  displayName: displayNameField,
  username: usernameField,
  profileName: displayNameField,
  email: emailField,
  ensName: ensNameField,
  referralCode: referralField,
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres.'),
})
export type CollectorInput = z.infer<typeof collectorSchema>

export function issuesToFields(error: z.ZodError) {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (key && !fields[key]) fields[key] = issue.message
  }
  return fields
}

import { realtimeHandler } from '../realtime'
import { accountHandlers } from './account'
import { catalogHandlers } from './catalog'
import { commerceHandlers } from './commerce'
import { walletHandlers } from './wallets'

export const handlers = [...catalogHandlers, ...accountHandlers, ...commerceHandlers, ...walletHandlers, realtimeHandler]

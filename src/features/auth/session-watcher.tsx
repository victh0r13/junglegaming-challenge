import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { clearPrivateData } from './use-auth'
import { sessionStore } from './session-store'

export function SessionWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    let previous = sessionStore.getState().status
    return sessionStore.subscribe(() => {
      const state = sessionStore.getState()
      if (state.status === 'expired' && previous !== 'expired') {
        clearPrivateData(queryClient)
        toast.error('Sua sessão expirou', { description: 'Entre novamente para continuar de onde parou.', id: 'sessao-expirada' })
        const location = router.state.location
        const isPrivate = router.state.matches.some((match) => match.routeId.startsWith('/_privado'))
        if (isPrivate) {
          router.navigate({ to: '/entrar', search: { redirect: location.href, motivo: 'expirada' } })
        }
      }
      previous = state.status
    })
  }, [queryClient, router])

  return null
}

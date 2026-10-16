import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartApi } from '@/api/cart'
import type { AddCartItemBody, Cart, Network } from '@/api/contracts'
import { queryKeys } from '@/api/query-keys'
import { useSessionState } from '@/features/auth/session-store'
import { guestCart, useGuestCartId } from './guest-cart'

export function useCartOwner() {
  const session = useSessionState()
  const guestId = useGuestCartId()
  if (session.status === 'authenticated') return session.session.userId
  return `visitante:${guestId ?? 'novo'}`
}

export function useCart() {
  const owner = useCartOwner()
  return useQuery({
    queryKey: queryKeys.cart.detail(owner),
    queryFn: ({ signal }) => cartApi.get(signal),
    staleTime: 15_000,
  })
}

export function useCartCount() {
  const { data } = useCart()
  return data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

export function useQuote(network: Network, enabled = true) {
  const owner = useCartOwner()
  const cart = useCart()
  return useQuery({
    queryKey: [...queryKeys.cart.quote(owner, network), cart.data?.version ?? 0],
    queryFn: ({ signal }) => cartApi.quote(network, signal),
    enabled: enabled && cart.isSuccess && cart.data.items.length > 0,
    staleTime: 0,
    placeholderData: (previous) => previous,
  })
}

function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const session = useSessionState()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      if (session.status !== 'authenticated' && cart.id && guestCart.getId() !== cart.id) guestCart.setId(cart.id)
      const owner = session.status === 'authenticated' ? session.session.userId : `visitante:${cart.id ?? 'novo'}`
      queryClient.setQueryData(queryKeys.cart.detail(owner), cart)
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all, predicate: (query) => query.queryKey[2] === 'quote' })
    },
  })
}

export function useAddToCart() {
  return useCartMutation((body: AddCartItemBody) => cartApi.addItem(body))
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.updateItem(itemId, { quantity }))
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: string) => cartApi.removeItem(itemId))
}

export function useApplyCoupon() {
  return useCartMutation((code: string) => cartApi.applyCoupon(code))
}

export function useRemoveCoupon() {
  return useCartMutation((_: void) => cartApi.removeCoupon())
}

export function useAcknowledgeCart() {
  return useCartMutation((_: void) => cartApi.acknowledge())
}

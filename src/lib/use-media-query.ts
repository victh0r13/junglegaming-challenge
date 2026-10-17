import { useSyncExternalStore } from 'react'

export const BREAKPOINTS = {
  md: '(min-width: 48rem)',
  lg: '(min-width: 64rem)',
} as const

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

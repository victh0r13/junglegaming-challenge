import { useEffect } from 'react'
import { prefersReducedMotion } from '@/lib/use-media-query'

export function useSameHashScroll() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href*="#"]') : null
      if (!anchor || anchor.target === '_blank') return
      const url = new URL(anchor.href, window.location.href)
      const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search
      if (!samePage || !url.hash || url.hash !== window.location.hash) return
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)))
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])
}

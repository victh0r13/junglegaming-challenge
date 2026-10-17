import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { prefersReducedMotion } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

const SHOW_AFTER = 900

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    document.getElementById('conteudo')?.focus({ preventScroll: true })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Voltar ao topo"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        'fixed right-6 bottom-6 z-40 hidden size-11 place-items-center rounded-full border border-primary/60 bg-surface-dark text-text-accent shadow-lg transition-[opacity,translate,background-color] duration-300 ease-out hover:bg-primary hover:text-primary-foreground md:grid',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  )
}

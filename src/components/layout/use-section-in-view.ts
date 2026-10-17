import { useEffect, useState } from 'react'

function isSectionAtCenter(sectionId: string) {
  const section = document.getElementById(sectionId)
  if (!section) return false
  const { top, bottom } = section.getBoundingClientRect()
  const center = window.innerHeight / 2
  return top <= center && bottom >= center
}

export function useSectionInView(sectionId: string, enabled: boolean) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let frame = 0
    const check = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setInView(isSectionAtCenter(sectionId)))
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [sectionId, enabled])

  return enabled && inView
}

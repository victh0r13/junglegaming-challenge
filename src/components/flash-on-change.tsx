import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FlashOnChangeProps = {
  value: string | number
  children: ReactNode
  className?: string
}

export function FlashOnChange({ value, children, className }: FlashOnChangeProps) {
  const [state, setState] = useState({ value, changes: 0 })
  if (state.value !== value) setState({ value, changes: state.changes + 1 })

  return (
    <span key={state.changes} className={cn('rounded-sm', state.changes > 0 && 'animate-price-flash', className)}>
      {children}
    </span>
  )
}

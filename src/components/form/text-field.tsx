import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string
  error?: string
  hint?: ReactNode
  hideLabel?: boolean
  required?: boolean
  inputClassName?: string
}

export const fieldInputClass =
  'h-10 w-full min-w-0 rounded-[5px] border border-border bg-transparent px-4 text-sm text-foreground placeholder:text-brand-secondary transition-colors outline-none focus-visible:border-text-accent focus-visible:outline-2 focus-visible:outline-offset-0 aria-invalid:border-destructive disabled:opacity-60'

export function TextField({
  label,
  error,
  hint,
  hideLabel = false,
  required = false,
  className,
  inputClassName,
  type = 'text',
  ...inputProps
}: TextFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [error ? `${id}-erro` : null, hint ? `${id}-dica` : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm leading-4 text-foreground', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-text-coral">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(fieldInputClass, isPassword && 'pr-11', inputClassName)}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-brand-secondary hover:text-text-accent"
          >
            {revealed ? <Eye className="size-[18px]" aria-hidden="true" /> : <EyeOff className="size-[18px]" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-dica`} className="text-xs leading-4 text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} className="text-xs leading-4 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function FormAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-[5px] border px-3 py-2 text-[13px] leading-5',
        tone === 'error' ? 'border-destructive/60 bg-destructive/10 text-destructive' : 'border-border-soft bg-surface-dark text-text-secondary',
      )}
    >
      {children}
    </div>
  )
}

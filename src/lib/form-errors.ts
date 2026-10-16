import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/api/http'

export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>> = {},
) {
  if (!isApiError(error)) return false
  let applied = false
  for (const [apiField, message] of Object.entries(error.fields)) {
    const field = fieldMap[apiField] ?? (apiField as Path<T>)
    setError(field, { type: 'server', message }, { shouldFocus: !applied })
    applied = true
  }
  return applied
}

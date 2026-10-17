const MAX_TRACKED_EVENTS = 500

export function createEventTracker() {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  return {
    shouldApply(eventId: string, resourceKey: string, version: number, knownVersion = 0) {
      if (seen.has(eventId)) return false
      seen.add(eventId)
      if (seen.size > MAX_TRACKED_EVENTS) seen.delete(seen.values().next().value as string)
      const current = Math.max(versions.get(resourceKey) ?? 0, knownVersion)
      if (version <= current) return false
      versions.set(resourceKey, version)
      return true
    },
    reset() {
      seen.clear()
      versions.clear()
    },
  }
}

export type EventTracker = ReturnType<typeof createEventTracker>

let markReady: () => void = () => undefined

export const backendReady = new Promise<void>((resolve) => {
  markReady = resolve
})

export function setBackendReady() {
  markReady()
}

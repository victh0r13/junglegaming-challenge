interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_REALTIME_URL?: string
  readonly VITE_ENABLE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { createRoot } from 'react-dom/client'
import './index.css'
import { setBackendReady } from '@/api/backend'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMockServer } = await import('@/mocks/browser')
  await startMockServer()
}

async function render() {
  const { App } = await import('@/app/app')
  createRoot(document.getElementById('root')!).render(<App />)
}

void enableMocking().finally(setBackendReady)
void render()

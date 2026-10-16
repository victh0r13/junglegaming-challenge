import { setupWorker } from 'msw/browser'
import { mockControl } from './control'
import { db } from './db'
import { resumePendingOrders } from './domain'
import { handlers } from './handlers'

export async function startMockServer() {
  await db.init()
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  resumePendingOrders()
  window.__kurioMocks = mockControl
}

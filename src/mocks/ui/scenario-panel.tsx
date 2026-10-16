import { useId, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { addEth } from '@/lib/eth'
import { mockControl } from '../control'
import { db } from '../db'
import { SCENARIOS, type ScenarioId } from '../scenarios'

const APP_STORAGE_KEYS = ['kurio:session', 'kurio:guest-cart-id', 'kurio:pending-checkout']

export default function ScenarioPanel() {
  const selectId = useId()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ScenarioId>(mockControl.getScenario())

  function applyScenario() {
    mockControl.setScenario(selected)
    toast.success(`Cenário ativo: ${SCENARIOS[selected].label}`)
  }

  async function resetAll() {
    await mockControl.reset()
    APP_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
    window.location.assign('/')
  }

  function cartTarget() {
    const cart = Object.values(db.data.carts).find((c) => c.items.length > 0)
    return cart?.items[0] ?? { nftId: 'emerald-ape-042', editionId: '1-50' }
  }

  function raisePrice() {
    const target = cartTarget()
    const edition = db.data.nfts.find((n) => n.id === target.nftId)?.editions.find((e) => e.id === target.editionId)
    if (!edition) return
    mockControl.updateEdition(target.nftId, target.editionId, { priceEth: addEth(edition.priceEth, '0.1') })
    toast.message('Evento nft.updated enviado pelo servidor simulado')
  }

  function soldOut() {
    const target = cartTarget()
    mockControl.updateEdition(target.nftId, target.editionId, { available: 0 })
    toast.message('Evento nft.updated enviado pelo servidor simulado')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="fixed bottom-[140px] left-4 z-50 h-10 gap-2 rounded-full border-border-soft bg-surface-dark text-text-accent shadow-lg md:bottom-4"
        >
          <FlaskConical aria-hidden="true" />
          Cenários
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cenários da API simulada</DialogTitle>
          <DialogDescription>
            As respostas vêm do MSW. Escolha um cenário para reproduzir falhas, latência e eventos em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor={selectId}>Cenário</Label>
          <select
            id={selectId}
            value={selected}
            onChange={(event) => setSelected(event.target.value as ScenarioId)}
            className="h-10 rounded-md border border-border bg-surface-dark px-3 text-sm"
          >
            {Object.entries(SCENARIOS).map(([id, item]) => (
              <option key={id} value={id}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-text-secondary">{SCENARIOS[selected].description}</p>
          <Button onClick={applyScenario} className="self-start">
            Aplicar cenário
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-bold">Eventos do servidor</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={raisePrice}>
              Subir preço (+0,1 ETH)
            </Button>
            <Button variant="outline" size="sm" onClick={soldOut}>
              Esgotar edição
            </Button>
            <Button variant="outline" size="sm" onClick={() => mockControl.dropRealtime()}>
              Derrubar conexão
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mockControl.pendingOrders().forEach((id) => mockControl.settleOrder(id))}
            >
              Liquidar pedidos pendentes
            </Button>
            <Button variant="outline" size="sm" onClick={() => mockControl.expireSessions()}>
              Expirar sessões
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <Button variant="destructive" onClick={resetAll}>
            Restaurar dados iniciais
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

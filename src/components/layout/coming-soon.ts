import { toast } from 'sonner'

export function announceComingSoon(label: string) {
  toast.info(`${label} estará disponível em breve`, {
    description: 'Esta seção não faz parte da demonstração.',
    id: `em-breve-${label}`,
  })
}

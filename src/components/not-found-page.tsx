import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

type NotFoundPageProps = {
  title?: string
  description?: string
}

export function NotFoundPage({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe ou foi removido.',
}: NotFoundPageProps) {
  return (
    <section className="page-container flex flex-col items-start gap-4 py-20" aria-labelledby="nao-encontrado">
      <p className="text-sm font-bold tracking-[0.1em] text-text-accent">ERRO 404</p>
      <h1 id="nao-encontrado" className="text-2xl font-bold md:text-[43px] md:leading-[70px]">
        {title}
      </h1>
      <p className="max-w-xl text-sm leading-6 text-text-secondary">{description}</p>
      <Button asChild className="h-10 rounded-[6px] px-6 font-bold">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}

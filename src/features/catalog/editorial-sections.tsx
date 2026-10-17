import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { CatalogSearch } from './search-params'

const PROMOS: { title: string; text: string; image: string; search: CatalogSearch; alt: string }[] = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/nfts/emerald-ape',
    search: { aba: 'novos' },
    alt: 'Macaco marrom com óculos escuros e jaqueta verde',
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: '/nfts/ivory-baron',
    search: { colecoes: ['arte-digital'] },
    alt: 'Gorila preto com gola alta verde e blazer bege',
  },
]

const POSTS = [
  { date: '12 de setembro', read: '6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.', image: '/nfts/ivory-baron' },
  { date: '13 de setembro', read: '2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.', image: '/nfts/emerald-ape' },
  { date: '15 de setembro', read: '3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.', image: '/nfts/sage-nomad' },
  { date: '15 de setembro', read: '2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.', image: '/nfts/golden-beat' },
]

export function PromoSection() {
  return (
    <section aria-label="Coleções em destaque" className="page-container mt-24 hidden gap-7 md:grid md:grid-cols-2">
      {PROMOS.map((promo) => (
        <article key={promo.title} className="group flex h-[250px] overflow-hidden bg-card">
          <img
            src={`${promo.image}-320.webp`}
            srcSet={`${promo.image}-320.webp 320w, ${promo.image}-640.webp 640w`}
            sizes="(min-width: 1024px) 290px, 25vw"
            alt={promo.alt}
            width={290}
            height={250}
            loading="lazy"
            className="h-full w-1/2 object-cover transition-[scale] duration-700 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
          <div className="flex w-1/2 flex-col items-end justify-center gap-3 px-6 text-right">
            <h3 className="text-[15px] leading-5 font-bold">{promo.title}</h3>
            <p className="text-xs leading-5 text-text-secondary">{promo.text}</p>
            <Link
              to="/"
              search={promo.search}
              hash="catalogo"
              className="group/link mt-1 inline-flex h-9 items-center gap-1 rounded-[6px] bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/85"
            >
              Explorar <ArrowRight className="size-4 transition-[translate] group-hover/link:translate-x-0.5" aria-hidden="true" />
              <span className="sr-only">{promo.title}</span>
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

export function BlogSection() {
  return (
    <section aria-labelledby="diario-titulo" className="page-container mt-24 hidden md:block">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 id="diario-titulo" className="text-2xl leading-8 font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-[13px] text-text-secondary">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <ul className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col bg-card">
              <img
                src={`${post.image}-320.webp`}
                alt=""
                width={270}
                height={190}
                loading="lazy"
                className="h-[190px] w-full object-cover object-top"
              />
              <div className="flex flex-1 flex-col gap-2 p-3 text-xs leading-4">
                <p className="text-text-secondary">
                  {post.date} | Leitura de {post.read}
                </p>
                <h3 className="text-sm leading-5 font-bold">{post.title}</h3>
                <p className="leading-4 text-text-secondary">{post.text}</p>
                <span aria-disabled="true" title="Disponível em breve" className="mt-auto cursor-not-allowed text-text-accent">
                  Ler mais → <span className="sr-only">(em breve)</span>
                </span>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}

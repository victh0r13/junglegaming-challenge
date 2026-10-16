import { useId, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from '@/components/icons'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const

type FooterLink = { label: string; to?: '/perfil'; collection?: string }

/** Links sem destino levam a páginas fora do escopo e são exibidos como indisponíveis. */
const LINK_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/perfil' },
      { label: 'Minha coleção' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança' },
      { label: 'Política do mercado' },
      { label: 'Denunciar item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', collection: 'arte-digital' },
      { label: 'Fotografia', collection: 'fotografia' },
      { label: 'Música', collection: 'musica' },
      { label: 'Arte 3D', collection: 'arte-3d' },
      { label: 'Utilidade', collection: 'utilidade' },
    ],
  },
]

const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: InstagramIcon },
  { label: 'Twitter', href: 'https://twitter.com', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: YoutubeIcon },
] as const

/** Rodapé desktop/tablet. Os frames mobile do Figma não exibem rodapé. */
export function SiteFooter() {
  return (
    <footer className="page-container mt-24 hidden md:block">
      <div className="grid grid-cols-3 gap-y-8 bg-card p-8 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_minmax(0,357px)]">
        {FEATURES.map((feature, index) => (
          <FeatureItem key={feature.letter} {...feature} withDivider={index > 0} />
        ))}
        <span aria-hidden="true" className="hidden w-px bg-primary lg:block" />
        <NewsletterForm />
      </div>

      <div className="grid grid-cols-2 items-center gap-6 bg-surface-dark px-8 py-6 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[92px]">
        <p className="text-sm font-bold tracking-[0.1em]">KURIO</p>
        <p className="text-sm leading-[22px] lg:whitespace-nowrap">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="text-sm leading-[22px] hover:text-text-accent">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="text-sm leading-[22px] hover:text-text-accent">
          +55 11 4002 8922
        </a>
      </div>

      <div className="grid grid-cols-2 gap-8 bg-card p-8 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[124px]">
        {LINK_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-lg leading-4 font-bold">{column.title}</h2>
            <ul className="mt-2 text-sm leading-[30px]">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link to={link.to} className="hover:text-text-accent">
                      {link.label}
                    </Link>
                  ) : link.collection ? (
                    <Link to="/" search={{ colecoes: [link.collection] }} hash="catalogo" className="hover:text-text-accent">
                      {link.label}
                    </Link>
                  ) : (
                    <span aria-disabled="true" title="Disponível em breve" className="cursor-not-allowed">
                      {link.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h2 className="text-lg leading-4 font-bold">Redes sociais</h2>
            <ul className="flex gap-2.5">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="block rounded-[5px] text-primary transition-colors hover:text-text-accent"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg leading-4 font-bold">Carteiras compatíveis</h2>
            <p className="flex h-[26px] items-center justify-center rounded-[6px] border border-border-soft bg-surface-dark px-2 text-[9px] font-bold tracking-[0.1px] whitespace-pre text-text-accent">
              {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
            </p>
          </div>
        </div>
      </div>

      <p className="py-1.5 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

type FeatureItemProps = (typeof FEATURES)[number] & { withDivider: boolean }

function FeatureItem({ letter, title, text, withDivider }: FeatureItemProps) {
  return (
    <>
      {withDivider && <span aria-hidden="true" className="hidden w-px bg-primary lg:block" />}
      <div className="flex flex-col gap-3 px-4">
        <span
          aria-hidden="true"
          className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
        >
          {letter}
        </span>
        <h2 className="text-[17px] leading-5 font-bold lg:leading-4">{title}</h2>
        <p className="max-w-[204px] text-sm leading-[22px] text-text-secondary">{text}</p>
      </div>
    </>
  )
}

type NewsletterStatus = { kind: 'idle' } | { kind: 'error' | 'info'; message: string }

/**
 * A newsletter não faz parte do escopo da API simulada: o formulário valida o
 * e-mail, mas informa que a inscrição está indisponível em vez de simular sucesso.
 */
function NewsletterForm() {
  const inputId = useId()
  const messageId = useId()
  const [status, setStatus] = useState<NewsletterStatus>({ kind: 'idle' })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = new FormData(event.currentTarget).get('email')?.toString().trim() ?? ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ kind: 'error', message: 'Informe um e-mail válido.' })
      return
    }
    setStatus({ kind: 'info', message: 'A inscrição na newsletter estará disponível em breve.' })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="col-span-3 flex flex-col gap-4 px-4 lg:col-span-1"
      aria-labelledby={`${inputId}-title`}
    >
      <h2 id={`${inputId}-title`} className="text-lg leading-4 font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <div className="flex h-10 rounded-[6px] bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]">
        <label htmlFor={inputId} className="sr-only">
          E-mail
        </label>
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={status.kind === 'error' || undefined}
          aria-describedby={messageId}
          className="min-w-0 flex-1 rounded-l-[6px] bg-transparent pl-3 text-sm placeholder:text-brand-secondary focus-visible:outline-offset-0"
        />
        <button
          type="submit"
          className="w-[85px] shrink-0 rounded-r-[6px] bg-primary pr-1 pl-4 text-lg font-bold text-primary-foreground transition-colors hover:bg-primary/85"
        >
          Enviar
        </button>
      </div>
      <p
        id={messageId}
        role="status"
        className={status.kind === 'error' ? 'text-[13px] leading-[22px] text-destructive' : 'text-[13px] leading-[22px] text-text-secondary'}
      >
        {status.kind === 'idle' ? 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.' : status.message}
      </p>
    </form>
  )
}

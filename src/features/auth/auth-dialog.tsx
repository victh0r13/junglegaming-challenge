import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { FacebookLogoIcon, GoogleIcon } from '@/components/icons'
import { FormAlert, TextField } from '@/components/form/text-field'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { isApiError } from '@/api/http'
import { applyApiFieldErrors } from '@/lib/form-errors'
import { cn } from '@/lib/utils'
import { safeRedirect, useLogin, useRegister } from './use-auth'

export type AuthMode = 'login' | 'register'

type AuthDialogProps = {
  mode: AuthMode
  redirect?: string
  reason?: 'expirada'
}

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.')),
  password: z.string().min(1, 'Informe sua senha.'),
})

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._]{3,20}$/, 'Use de 3 a 20 caracteres: letras, números, ponto ou sublinhado.'),
    email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.')),
    password: z
      .string()
      .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
      .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Use letras e números na senha.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem.',
  })

const desktopInput = 'md:h-10 md:rounded-[5px]'
const mobileInput = 'h-[50px] rounded-[10px]'

export function AuthDialog({ mode, redirect, reason }: AuthDialogProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const target = safeRedirect(redirect)

  function close() {
    navigate({ to: '/' })
  }

  function finish() {
    router.history.push(target)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        className={cn(
          'gap-0 overflow-y-auto border-0 bg-background p-0 ring-0',
          'max-md:inset-0 max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:px-7 max-md:pt-20 max-md:pb-6',
          'md:max-h-[92dvh] md:max-w-[500px] md:rounded-[8px] md:border-b-[10px] md:border-primary md:bg-card md:pt-12 md:pb-10',
        )}
      >
        <p className="flex h-[136px] items-center justify-center text-[32px] font-bold tracking-[0.1em] md:hidden" aria-hidden="true">
          KURIO
        </p>

        <div className="mt-10 flex flex-col items-center gap-10 md:mt-0 md:px-12">
          <nav aria-label="Acesso à conta" className="hidden items-stretch gap-2 text-xl leading-4 font-medium md:flex">
            <Link
              to="/entrar"
              search={{ redirect }}
              replace
              aria-current={mode === 'login' ? 'page' : undefined}
              className={mode === 'login' ? 'text-text-accent' : 'text-foreground hover:text-text-accent'}
            >
              Entrar
            </Link>
            <span aria-hidden="true" className="w-px bg-text-coral" />
            <Link
              to="/cadastro"
              search={{ redirect }}
              replace
              aria-current={mode === 'register' ? 'page' : undefined}
              className={mode === 'register' ? 'text-text-accent' : 'text-foreground hover:text-text-accent'}
            >
              Criar conta
            </Link>
          </nav>
          <DialogTitle className="text-center text-lg leading-4 font-bold md:sr-only">
            {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
          </DialogTitle>
          <DialogDescription className="hidden text-center text-[13px] leading-4 text-foreground md:block">
            {mode === 'login'
              ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
              : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
          </DialogDescription>
        </div>

        {reason === 'expirada' && (
          <div className="mt-6 md:px-20">
            <FormAlert tone="info">Sua sessão expirou. Entre novamente para continuar de onde parou.</FormAlert>
          </div>
        )}

        {mode === 'login' ? <LoginForm onSuccess={finish} /> : <RegisterForm onSuccess={finish} />}

        <SocialBlock />

        <p className="mt-10 text-center text-[15px] text-text-secondary md:hidden">
          {mode === 'login' ? (
            <Link to="/cadastro" search={{ redirect }} replace className="underline-offset-4 hover:underline">
              Novo na Kurio? Crie uma conta
            </Link>
          ) : (
            <Link to="/entrar" search={{ redirect }} replace className="underline-offset-4 hover:underline">
              Já tem uma conta? Entre
            </Link>
          )}
        </p>
      </DialogContent>
    </Dialog>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const login = useLogin()
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    login.mutateAsync(values).then(
      (result) => {
        if (result?.mergeFailed) toast.warning('Não foi possível juntar o carrinho do visitante. Seus itens continuam salvos.')
        toast.success('Bem-vindo de volta!')
        onSuccess()
      },
      (error: unknown) => applyApiFieldErrors(error, form.setError),
    ),
  )

  const apiError = login.error && isApiError(login.error) && Object.keys(login.error.fields).length === 0 ? login.error.message : null

  return (
    <form noValidate onSubmit={onSubmit} className="mt-10 flex flex-col gap-3 md:mt-6 md:px-20" aria-label="Entrar">
      {apiError && <FormAlert>{apiError}</FormAlert>}
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        error={errors.email?.message}
        inputClassName={cn(mobileInput, desktopInput)}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        type="password"
        autoComplete="current-password"
        placeholder="Senha"
        error={errors.password?.message}
        inputClassName={cn(mobileInput, desktopInput)}
        {...form.register('password')}
      />
      <button
        type="button"
        onClick={() => toast.info('A recuperação de senha não está disponível nesta demonstração.')}
        className="self-end text-[13px] leading-4 text-text-accent underline-offset-4 hover:underline"
      >
        Esqueceu a senha?
      </button>
      <SubmitButton pending={login.isPending}>Entrar</SubmitButton>
      {import.meta.env.VITE_ENABLE_MOCKS === 'true' && (
        <p className="text-center text-xs leading-5 text-text-secondary">Demonstração: ana@kurio.dev ou bruno@kurio.dev · senha Kurio@2026</p>
      )}
    </form>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const register = useRegister()
  const form = useForm<z.input<typeof registerSchema>, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ username, email, password }) =>
    register.mutateAsync({ username, email, password }).then(
      () => {
        toast.success('Conta criada! Bem-vindo à Kurio.')
        onSuccess()
      },
      (error: unknown) => applyApiFieldErrors(error, form.setError),
    ),
  )

  const apiError =
    register.error && isApiError(register.error) && Object.keys(register.error.fields).length === 0 ? register.error.message : null

  return (
    <form noValidate onSubmit={onSubmit} className="mt-10 flex flex-col gap-3 md:mt-6 md:px-20" aria-label="Criar conta">
      {apiError && <FormAlert>{apiError}</FormAlert>}
      <TextField
        label="Nome de usuário"
        hideLabel
        autoComplete="username"
        placeholder="Nome de usuário"
        error={errors.username?.message}
        inputClassName={cn(mobileInput, desktopInput)}
        {...form.register('username')}
      />
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        error={errors.email?.message}
        inputClassName={cn(mobileInput, desktopInput)}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Senha"
        error={errors.password?.message}
        inputClassName={cn(mobileInput, desktopInput)}
        {...form.register('password')}
      />
      <TextField
        label="Confirmar senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        error={errors.confirmPassword?.message}
        inputClassName={cn(mobileInput, desktopInput)}
        {...form.register('confirmPassword')}
      />
      <SubmitButton pending={register.isPending}>
        <span className="md:hidden">Criar perfil</span>
        <span className="max-md:hidden">Criar conta</span>
      </SubmitButton>
    </form>
  )
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-7 flex h-[60px] items-center justify-center rounded-[10px] bg-primary text-base leading-4 font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-70 md:mt-3 md:h-[45px] md:rounded-[5px]"
    >
      {pending ? 'Aguarde…' : children}
    </button>
  )
}

function SocialBlock() {
  const unavailable = () => toast.info('O acesso com redes sociais não está disponível nesta demonstração.')
  return (
    <div className="mt-10 flex flex-col gap-3 md:mt-6 md:gap-4">
      <div className="flex items-center gap-3 text-[13px] leading-4 text-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
        Ou continue com
        <span aria-hidden="true" className="h-px flex-1 bg-border-soft" />
      </div>
      <div className="flex flex-col gap-4 md:px-20">
        {[
          { label: 'Continuar com Google', Icon: GoogleIcon },
          { label: 'Continuar com Facebook', Icon: FacebookLogoIcon },
        ].map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            onClick={unavailable}
            aria-describedby="social-indisponivel"
            className="flex h-10 items-center justify-center gap-3 rounded-[5px] border border-border text-[13px] leading-4 font-medium text-text-secondary transition-colors hover:border-border-soft hover:text-foreground"
          >
            <Icon />
            {label}
          </button>
        ))}
        <span id="social-indisponivel" className="sr-only">
          Indisponível nesta demonstração
        </span>
      </div>
    </div>
  )
}

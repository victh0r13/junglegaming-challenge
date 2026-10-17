import { USERS, expect, test } from './support/fixtures'

test.describe('Autenticação', () => {
  test('cadastro valida campos, recusa e-mail em uso e cria a conta', async ({ app, page }) => {
    await app.open('/cadastro')
    const dialog = app.authDialog()
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    await expect(dialog.getByText('Use de 3 a 20 caracteres: letras, números, ponto ou sublinhado.')).toBeVisible()
    await expect(dialog.getByText('Informe seu e-mail.')).toBeVisible()

    await dialog.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('colecionador.teste')
    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.ana.email)
    await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill('Segura2026')
    await dialog.getByRole('textbox', { name: 'Confirmar senha', exact: true }).fill('Outra2026')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    await expect(dialog.getByText('As senhas não coincidem.')).toBeVisible()

    await dialog.getByRole('textbox', { name: 'Confirmar senha', exact: true }).fill('Segura2026')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    await expect(dialog.getByText('Este e-mail já está em uso.')).toBeVisible()

    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill('novo@kurio.dev')
    await dialog.getByRole('button', { name: /Criar (conta|perfil)/ }).filter({ visible: true }).click()
    await expect(dialog).toBeHidden()
    await expect(app.toast('Conta criada! Bem-vindo à Kurio.')).toBeVisible()

    await app.open('/perfil')
    await expect(page.getByRole('main').getByLabel('E-mail')).toHaveValue('novo@kurio.dev')
    await expect(page.getByRole('main').getByLabel('Nome de usuário')).toHaveValue('colecionador.teste')
  })

  test('login mostra erro de credenciais e redireciona para a rota protegida de origem', async ({ app, page }) => {
    await app.open('/carteiras')
    await expect(page).toHaveURL(/\/entrar\?redirect=(%2F|\/)carteiras/)

    const dialog = app.authDialog()
    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.ana.email)
    await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill('senha-errada')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByText('E-mail ou senha incorretos.')).toBeVisible()

    await app.submitLogin(USERS.ana)
    await expect(page).toHaveURL(/\/carteiras$/)
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })

  test('redirecionamento externo é ignorado após o login', async ({ app, page }) => {
    await app.open('/entrar?redirect=//site-malicioso.com')
    await app.submitLogin(USERS.ana)
    await expect(page).toHaveURL(/localhost:\d+\/$/)
  })

  test('sessão persiste após recarregar a página', async ({ app, page }) => {
    await app.login(USERS.ana, '/perfil')
    await app.reload()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('main').getByLabel('Nome de exibição')).toHaveValue(USERS.ana.name)
  })

  test('sessão expirada leva ao login com aviso e retoma a página após entrar', async ({ app, page }) => {
    await app.login(USERS.ana, '/perfil')
    await expect(page.getByRole('main').getByLabel('Nome de exibição')).toHaveValue(USERS.ana.name)

    await page.evaluate(() => window.__kurioMocks!.expireSessions())
    await app.reload()

    await expect(page).toHaveURL(/\/entrar\?.*motivo=expirada/)
    await expect(app.authDialog().getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible()
    await expect(app.toast('Sua sessão expirou')).toBeVisible()

    await app.submitLogin(USERS.ana)
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('main').getByLabel('Nome de exibição')).toHaveValue(USERS.ana.name)
  })

  test.describe('sessão curta', () => {
    test.use({ scenario: 'sessao-curta' })

    test('expira pelo relógio do servidor simulado', async ({ app, page }) => {
      await app.login(USERS.ana, '/perfil')
      await page.clock.install()
      await page.clock.fastForward('00:31')
      await app.open('/carteiras')
      await expect(page).toHaveURL(/\/entrar\?.*motivo=expirada/)
    })
  })

  test('logout limpa dados privados e bloqueia rotas protegidas', async ({ app, page }) => {
    await app.login(USERS.ana, '/perfil')
    await app.logout()
    await expect(app.toast('Você saiu da sua conta.')).toBeVisible()
    expect(await page.evaluate(() => window.localStorage.getItem('kurio:session'))).toBeNull()

    await app.open('/perfil')
    await expect(page).toHaveURL(/\/entrar\?redirect=(%2F|\/)perfil/)
  })

  test('troca de usuário não vaza favoritos nem carrinho da conta anterior', async ({ app, page }) => {
    await app.login(USERS.ana, '/perfil')
    const favorites = page.getByRole('region', { name: 'Meus favoritos' })
    await expect(favorites.getByRole('article')).toHaveCount(2)
    await app.addToCart('golden-signal-160')
    await expect(app.cartLines()).toHaveCount(1)

    await app.logout()
    await app.login(USERS.bruno, '/perfil')
    await expect(page.getByRole('main').getByLabel('Nome de exibição')).toHaveValue(USERS.bruno.name)
    await expect(page.getByRole('region', { name: 'Meus favoritos' }).getByText('Você ainda não favoritou nenhum NFT.')).toBeVisible()

    await app.open('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })
})

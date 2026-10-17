import { USERS, expect, test, type KurioApp } from './support/fixtures'

const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGO40OWFFTEMLQkAKK9pAYuqxTcAAAAASUVORK5CYII=',
  'base64',
)

function field(app: KurioApp, name: string, scope = app.page.getByRole('main')) {
  return scope.getByRole('textbox', { name, exact: true })
}

test.describe('Perfil', () => {
  test('valida campos, recusa nome de usuário em uso e salva alterações', async ({ app, page }) => {
    await app.login(USERS.ana, '/perfil')
    const form = page.getByRole('form', { name: 'Dados do perfil' })
    const save = form.getByRole('button', { name: 'Salvar' })
    await expect(field(app, 'Nome de exibição', form)).toHaveValue(USERS.ana.name)
    await expect(save).toBeDisabled()

    await field(app, 'Nome ENS', form).fill('ana')
    await save.click()
    await expect(form.getByText('Use o formato nome.eth (3 a 32 letras, números ou hífen).')).toBeVisible()

    await field(app, 'Nome ENS', form).fill('anasouza.eth')
    await field(app, 'Nome de usuário', form).fill('bruno.lima')
    await save.click()
    await expect(form.getByText('Escolha outro nome de usuário.')).toBeVisible()
    await expect(field(app, 'Nome de usuário', form)).toHaveAttribute('aria-invalid', 'true')

    await field(app, 'Nome de usuário', form).fill('ana.colecao')
    await field(app, 'Nome de exibição', form).fill('Ana S.')
    await save.click()
    await expect(app.toast('Perfil atualizado')).toBeVisible()

    await app.reload()
    await expect(field(app, 'Nome de exibição', form)).toHaveValue('Ana S.')
    await expect(field(app, 'Nome de usuário', form)).toHaveValue('ana.colecao')
  })

  test('avatar aceita imagem válida, recusa formato inválido e pode ser removido', async ({ app, page }) => {
    await app.login(USERS.ana, '/perfil')
    const avatar = page.getByRole('group', { name: 'Avatar' })
    const input = page.locator('input[type="file"]')

    await input.setInputFiles({ name: 'animacao.gif', mimeType: 'image/gif', buffer: PNG_PIXEL })
    await expect(avatar.locator('..').getByRole('alert')).toHaveText('Envie uma imagem PNG, JPEG ou WebP.')

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_PIXEL })
    await expect(app.toast('Avatar atualizado')).toBeVisible()
    await expect(avatar.getByRole('button', { name: 'Remover' })).toBeEnabled()

    await app.reload()
    await expect(avatar.locator('img')).toHaveAttribute('src', /^data:image\/webp;base64,/)
    await avatar.getByRole('button', { name: 'Remover' }).click()
    await expect(app.toast('Avatar removido')).toBeVisible()
    await expect(avatar.getByRole('button', { name: 'Remover' })).toBeDisabled()
  })

  test('troca de senha valida a senha atual e passa a valer no próximo login', async ({ app, page }) => {
    await app.login(USERS.bruno, '/perfil')
    const form = page.getByRole('form', { name: 'Alterar senha' })
    const submit = form.getByRole('button', { name: 'Alterar senha' })

    await field(app, 'Senha atual', form).fill('errada123')
    await field(app, 'Nova senha', form).fill('NovaSenha2026')
    await field(app, 'Confirmar nova senha', form).fill('NovaSenha2026')
    await submit.click()
    await expect(form.getByText('Senha atual incorreta.')).toBeVisible()

    await field(app, 'Senha atual', form).fill(USERS.bruno.password)
    await field(app, 'Confirmar nova senha', form).fill('OutraSenha2026')
    await submit.click()
    await expect(form.getByText('As senhas não coincidem.')).toBeVisible()

    await field(app, 'Nova senha', form).fill(USERS.bruno.password)
    await field(app, 'Confirmar nova senha', form).fill(USERS.bruno.password)
    await submit.click()
    await expect(form.getByText('A nova senha deve ser diferente da atual.')).toBeVisible()

    await field(app, 'Nova senha', form).fill('NovaSenha2026')
    await field(app, 'Confirmar nova senha', form).fill('NovaSenha2026')
    await submit.click()
    await expect(app.toast('Senha alterada com sucesso')).toBeVisible()
    await expect(field(app, 'Senha atual', form)).toHaveValue('')

    await app.logout()
    await app.open('/entrar')
    const dialog = app.authDialog()
    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.bruno.email)
    await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill(USERS.bruno.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog.getByText('E-mail ou senha incorretos.')).toBeVisible()

    await app.submitLogin({ email: USERS.bruno.email, password: 'NovaSenha2026' })
  })
})

test.describe('Carteiras', () => {
  test('edição da carteira principal valida endereço por rede', async ({ app, page }) => {
    await app.login(USERS.bruno, '/carteiras')
    const form = page.getByRole('form', { name: 'Editar Principal' })
    const save = form.getByRole('button', { name: 'Salvar carteira' })
    await expect(save).toBeDisabled()

    await field(app, 'Endereço da carteira', form).fill('0x123')
    await save.click()
    await expect(form.getByText('Use um endereço 0x com 40 caracteres hexadecimais.')).toBeVisible()

    await form.getByRole('combobox', { name: 'Rede' }).selectOption({ label: 'Solana' })
    await field(app, 'Endereço da carteira', form).fill('0x2546BcD3c84621e976D8185a91A922aE77ECEc30')
    await save.click()
    await expect(form.getByText('Endereço Solana inválido.')).toBeVisible()

    await field(app, 'Endereço da carteira', form).fill('7EYnhQoR9YM3N7UoaKRoA44Uy8JeaZV3qyouov87awMs')
    await field(app, 'Apelido da carteira', form).fill('Phantom do Bruno')
    await save.click()
    await expect(app.toast('Carteira atualizada')).toBeVisible()

    await app.reload()
    await expect(page.getByRole('form', { name: 'Editar Phantom do Bruno' }).getByRole('combobox', { name: 'Rede' })).toHaveValue('solana')
  })

  test('nova carteira secundária copia a principal e recusa endereço duplicado', async ({ app, page }) => {
    await app.login(USERS.bruno, '/carteiras')
    const section = page.getByRole('region', { name: 'Carteira secundária' })
    await expect(section.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()

    await section.getByRole('checkbox', { name: 'Igual à carteira principal' }).check()
    await section.getByRole('button', { name: 'Adicionar' }).click()
    const form = section.getByRole('form', { name: 'Nova carteira' })
    await expect(field(app, 'Apelido da carteira', form)).toHaveValue('Principal 2')
    await expect(field(app, 'Código de indicação', form)).toHaveValue('BRUNO26')

    await field(app, 'Endereço da carteira', form).fill('0x2546BcD3c84621e976D8185a91A922aE77ECEc30')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByText('Este endereço já está cadastrado.')).toBeVisible()

    await field(app, 'Endereço da carteira', form).fill('0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(app.toast('Carteira adicionada')).toBeVisible()
    await expect(section.getByRole('form', { name: 'Editar Principal 2' })).toBeVisible()
  })
})

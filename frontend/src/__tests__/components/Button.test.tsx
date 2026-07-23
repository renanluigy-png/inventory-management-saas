import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../components/ui/Button'

describe('Button', () => {
  it('deve renderizar o texto dos filhos', () => {
    render(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })

  it('deve chamar onClick ao ser clicado', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Clique</Button>)

    await userEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('deve estar desabilitado quando disabled=true', () => {
    render(<Button disabled>Desabilitado</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('deve estar desabilitado e mostrar spinner quando loading=true', () => {
    render(<Button loading>Carregando</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('não deve chamar onClick quando loading=true', async () => {
    const handleClick = vi.fn()
    render(
      <Button loading onClick={handleClick}>
        Carregando
      </Button>
    )

    await userEvent.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('não deve chamar onClick quando disabled=true', async () => {
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Desabilitado
      </Button>
    )

    await userEvent.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('deve aplicar classe de variante primary por padrão', () => {
    render(<Button>Primary</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-indigo-600')
  })

  it('deve aplicar classe de variante danger', () => {
    render(<Button variant="danger">Deletar</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-red-600')
  })

  it('deve aplicar classe de variante success', () => {
    render(<Button variant="success">Confirmar</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-emerald-600')
  })

  it('deve aceitar className adicional', () => {
    render(<Button className="minha-classe">Botão</Button>)
    expect(screen.getByRole('button').className).toContain('minha-classe')
  })

  it('deve renderizar com type=submit', () => {
    render(<Button type="submit">Enviar</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('deve ter displayName correto para debugging', () => {
    expect(Button.displayName).toBe('Button')
  })
})

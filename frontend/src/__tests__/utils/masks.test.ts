import { maskCPF, maskPhone, maskCNPJ, maskCurrency, unmaskNumber } from '../../utils/masks'

describe('maskCPF', () => {
  it('deve aplicar máscara completa em 11 dígitos', () => {
    expect(maskCPF('12345678909')).toBe('123.456.789-09')
  })

  it('deve ignorar caracteres não numéricos', () => {
    expect(maskCPF('123.456.789-09')).toBe('123.456.789-09')
  })

  it('deve limitar a 11 dígitos', () => {
    expect(maskCPF('123456789099999')).toBe('123.456.789-09')
  })

  it('deve formatar CPF parcial sem travar', () => {
    expect(maskCPF('12345')).toBe('123.45')
  })

  it('deve retornar vazio para input vazio', () => {
    expect(maskCPF('')).toBe('')
  })
})

describe('maskPhone', () => {
  it('deve formatar celular com 11 dígitos', () => {
    expect(maskPhone('11999990000')).toBe('(11) 99999-0000')
  })

  it('deve formatar telefone fixo com 10 dígitos', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('deve limitar a 11 dígitos', () => {
    expect(maskPhone('119999900001234')).toBe('(11) 99999-0000')
  })

  it('deve remover caracteres não numéricos', () => {
    expect(maskPhone('(11) 99999-0000')).toBe('(11) 99999-0000')
  })
})

describe('maskCNPJ', () => {
  it('deve aplicar máscara completa em 14 dígitos', () => {
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('deve limitar a 14 dígitos', () => {
    expect(maskCNPJ('112223330001819999')).toBe('11.222.333/0001-81')
  })

  it('deve formatar parcialmente', () => {
    expect(maskCNPJ('1122')).toBe('11.22')
  })
})

describe('maskCurrency', () => {
  it('deve formatar valor como moeda brasileira', () => {
    expect(maskCurrency('100000')).toBe('1.000,00')
  })

  it('deve formatar centavos corretamente', () => {
    expect(maskCurrency('150')).toBe('1,50')
  })

  it('deve retornar 0,00 para string vazia', () => {
    expect(maskCurrency('')).toBe('0,00')
  })
})

describe('unmaskNumber', () => {
  it('deve remover caracteres não numéricos e dividir por 100', () => {
    // '1.000,00' → remove não-dígitos → '100000' → /100 = 1000
    expect(unmaskNumber('1.000,00')).toBe(1000)
  })

  it('deve converter valor simples de centavos', () => {
    // '1000' → /100 = 10
    expect(unmaskNumber('1000')).toBe(10)
  })

  it('deve retornar 0 para string vazia', () => {
    expect(unmaskNumber('')).toBe(0)
  })
})

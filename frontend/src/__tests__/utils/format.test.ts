import {
  formatCurrency,
  formatDate,
  formatCPF,
  formatPhone,
  formatCNPJ,
  formatPercent,
  toNumber,
  getInitials,
} from '../../utils/format'

describe('formatCurrency', () => {
  it('deve formatar valor numérico em BRL', () => {
    expect(formatCurrency(1000)).toBe('R$ 1.000,00')
  })

  it('deve formatar valor string', () => {
    expect(formatCurrency('2500.5')).toBe('R$ 2.500,50')
  })

  it('deve formatar zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00')
  })
})

describe('formatDate', () => {
  it('deve formatar data em dd/MM/yyyy', () => {
    // Usa T12:00:00 para evitar off-by-one em qualquer fuso (UTC±12h ainda é o mesmo dia)
    const result = formatDate('2024-01-15T12:00:00')
    expect(result).toMatch(/15\/01\/2024/)
  })

  it('deve aceitar objeto Date', () => {
    // new Date(year, month, day) usa fuso horário local, sem ambiguidade de UTC
    const date = new Date(2024, 5, 1) // 1 Jun 2024 local
    const result = formatDate(date)
    expect(result).toMatch(/01\/06\/2024/)
  })
})

describe('formatCPF', () => {
  it('deve formatar CPF com máscara correta', () => {
    expect(formatCPF('12345678909')).toBe('123.456.789-09')
  })

  it('deve formatar CPF já com pontos e traço', () => {
    expect(formatCPF('123.456.789-09')).toBe('123.456.789-09')
  })

  it('deve lidar com CPF parcial', () => {
    expect(formatCPF('123456')).toBe('123.456')
  })
})

describe('formatPhone', () => {
  it('deve formatar celular com 11 dígitos', () => {
    expect(formatPhone('11999990000')).toBe('(11) 99999-0000')
  })

  it('deve formatar telefone fixo com 10 dígitos', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('deve remover caracteres não numéricos', () => {
    expect(formatPhone('(11) 99999-0000')).toBe('(11) 99999-0000')
  })
})

describe('formatCNPJ', () => {
  it('deve formatar CNPJ com máscara correta', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('deve remover caracteres não numéricos antes de formatar', () => {
    expect(formatCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })
})

describe('formatPercent', () => {
  it('deve formatar percentual com 2 casas decimais', () => {
    expect(formatPercent(15.5)).toBe('15,50%')
  })

  it('deve formatar zero', () => {
    expect(formatPercent(0)).toBe('0,00%')
  })

  it('deve aceitar string numérica', () => {
    expect(formatPercent('10')).toBe('10,00%')
  })
})

describe('toNumber', () => {
  it('deve converter string numérica para número', () => {
    expect(toNumber('42.5')).toBe(42.5)
  })

  it('deve retornar 0 para valores não numéricos', () => {
    expect(toNumber('abc')).toBe(0)
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
  })

  it('deve retornar o próprio número quando já é número', () => {
    expect(toNumber(100)).toBe(100)
  })
})

describe('getInitials', () => {
  it('deve retornar iniciais em maiúsculo', () => {
    expect(getInitials('João Silva')).toBe('JS')
  })

  it('deve retornar apenas a primeira inicial se nome único', () => {
    expect(getInitials('Admin')).toBe('A')
  })

  it('deve usar apenas as duas primeiras palavras', () => {
    expect(getInitials('Maria das Graças Silva')).toBe('MD')
  })
})

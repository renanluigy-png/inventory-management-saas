/**
 * Valida matematicamente um CPF.
 * Recebe o CPF já normalizado (somente dígitos, 11 caracteres).
 * Chamado após o transform do Zod que remove formatação.
 */
export function validarCPF(cpf: string): boolean {
  // Deve ter exatamente 11 dígitos
  if (cpf.length !== 11) return false;

  // CPFs com todos os dígitos iguais são inválidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Valida 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  // Valida 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;

  return resto === parseInt(cpf[10]);
}

/**
 * Remove tudo que não for dígito de uma string.
 * Usado para normalizar CPF ("123.456.789-09" → "12345678909") e telefone.
 */
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

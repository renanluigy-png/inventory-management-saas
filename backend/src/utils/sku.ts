const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function segmento(n: number): string {
  return Array.from({ length: n }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

// Gera SKU no formato SKU-XXXX-XXXX (suficientemente único para escala comercial)
export function gerarSKU(): string {
  return `SKU-${segmento(4)}-${segmento(4)}`;
}

# Política de Segurança

## Versões suportadas

| Versão | Suporte de segurança |
|--------|----------------------|
| 1.x    | ✅ Sim               |

## Reportando uma vulnerabilidade

**Não abra uma issue pública** para reportar vulnerabilidades de segurança.

Se você encontrou uma vulnerabilidade neste projeto, envie um e-mail para:

**renanluigy@gmail.com**

Inclua no e-mail:

- Descrição detalhada da vulnerabilidade
- Passos para reproduzir (incluindo versão afetada)
- Impacto potencial
- Sugestão de correção (opcional)

### O que esperar

- **Confirmação de recebimento**: até 48 horas úteis
- **Avaliação inicial**: até 5 dias úteis
- **Correção e release**: de acordo com a severidade (crítico: ≤ 7 dias; alto: ≤ 30 dias)

Ao reportar, você será mencionado nos créditos da release de correção, a menos que prefira anonimato.

## Boas práticas de deploy

Ao colocar este sistema em produção:

- Defina `MASTER_SENHA` com uma senha forte e única (mínimo 12 caracteres, com letras, números e símbolos)
- Gere um `JWT_SECRET` aleatório com `openssl rand -base64 64` — nunca reutilize entre ambientes
- Use HTTPS com certificado TLS válido (Let's Encrypt ou similar)
- Restrinja o acesso ao banco de dados por IP e use senhas fortes
- Configure rate limiting e brute-force protection (já incluído no backend)
- Revise o CORS_ORIGIN para aceitar apenas o domínio do seu frontend
- Nunca exponha a rota `/docs` (Swagger) em produção sem autenticação
- Ative auditoria de logs e monitore acessos incomuns

## Escopo

Esta política cobre o código neste repositório. Vulnerabilidades em dependências de terceiros devem ser reportadas diretamente aos mantenedores daquelas bibliotecas.

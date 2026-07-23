import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { WhatsAppService } from '../integrations/whatsapp/WhatsAppService';

const whatsAppService = new WhatsAppService();

export const WhatsAppController = {
  provider: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ status: 'success', data: { provider: whatsAppService.getProviderName() } });
  }),

  enviarTexto: asyncHandler(async (req: Request, res: Response) => {
    const { telefone, mensagem } = z.object({
      telefone: z.string().min(8),
      mensagem: z.string().min(1).max(4096),
    }).parse(req.body);

    const result = await whatsAppService.enviarTextoLivre(telefone, mensagem);
    res.json({ status: 'success', data: result });
  }),

  enviarOrcamento: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      telefone: z.string(),
      nomeCliente: z.string(),
      numeroVenda: z.string(),
      total: z.number().positive(),
      itens: z.array(z.object({
        nome: z.string(),
        quantidade: z.number().positive(),
        valor: z.number().positive(),
      })).min(1),
    });
    const { telefone, ...dados } = schema.parse(req.body);
    const result = await whatsAppService.enviarOrcamento(telefone, dados);
    res.json({ status: 'success', data: result });
  }),

  enviarComprovante: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      telefone: z.string(),
      nomeCliente: z.string(),
      numeroVenda: z.string(),
      total: z.number().positive(),
      formaPagamento: z.string(),
      pdfUrl: z.string().url().optional(),
    });
    const { telefone, ...dados } = schema.parse(req.body);
    const result = await whatsAppService.enviarComprovante(telefone, dados);
    res.json({ status: 'success', data: result });
  }),

  enviarNotaFiscal: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      telefone: z.string(),
      nomeCliente: z.string(),
      chaveAcesso: z.string(),
      xmlUrl: z.string().url().optional(),
      pdfUrl: z.string().url().optional(),
    });
    const { telefone, ...dados } = schema.parse(req.body);
    const result = await whatsAppService.enviarNotaFiscal(telefone, dados);
    res.json({ status: 'success', data: result });
  }),

  enviarPromocao: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      telefones: z.array(z.string()).min(1).max(500),
      nomePromocao: z.string(),
      descricao: z.string(),
      desconto: z.string(),
      validade: z.string(),
      imagemUrl: z.string().url().optional(),
    });
    const { telefones, ...dados } = schema.parse(req.body);
    const result = await whatsAppService.enviarPromocao(telefones, dados);
    res.json({ status: 'success', data: result });
  }),

  enviarAvisoEstoque: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      telefone: z.string(),
      nomeProduto: z.string(),
      estoqueAtual: z.number().int(),
      estoqueMinimo: z.number().int(),
    });
    const { telefone, ...dados } = schema.parse(req.body);
    const result = await whatsAppService.enviarAvisoEstoque(telefone, dados);
    res.json({ status: 'success', data: result });
  }),

  enviarCobranca: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      telefone: z.string(),
      nomeCliente: z.string(),
      valorDevido: z.number().positive(),
      vencimento: z.string(),
      pixQrCode: z.string().optional(),
    });
    const { telefone, ...dados } = schema.parse(req.body);
    const result = await whatsAppService.enviarCobranca(telefone, dados);
    res.json({ status: 'success', data: result });
  }),
};

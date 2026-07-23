import { Request, Response } from 'express';
import { z } from 'zod';
import { CustomerService } from '../services/CustomerService';
import { AppError } from '../utils/AppError';
import { validarCPF, apenasDigitos } from '../utils/validators';

// ----------------------------------------------------------------
// Sub-schemas reutilizáveis
// ----------------------------------------------------------------

// CPF para criação: sem nullable (cliente novo não envia null, apenas omite)
const cpfCreate = z
  .string()
  .transform((val) => apenasDigitos(val))
  .refine(validarCPF, { message: 'CPF inválido.' })
  .optional();

// CPF para atualização: nullable para permitir limpar o campo
const cpfUpdate = z
  .string()
  .transform((val) => apenasDigitos(val))
  .refine(validarCPF, { message: 'CPF inválido.' })
  .nullable()
  .optional();

// E-mail normalizado para minúsculas
const emailField = z.string().email('E-mail inválido.').max(255).toLowerCase();

// ----------------------------------------------------------------
// Schemas de validação
// ----------------------------------------------------------------

// POST — nome obrigatório, CPF não pode ser null (só omitido)
const createSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório.' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres.')
    .max(150, 'Nome deve ter no máximo 150 caracteres.')
    .trim(),
  cpf: cpfCreate,
  email: emailField.optional(),
  telefone: z.string().max(20).trim().optional(),
  endereco: z.string().max(500).trim().optional(),
});

// PUT — substituição completa: nome obrigatório
const putSchema = z.object({
  nome: z
    .string({ required_error: 'Nome é obrigatório no PUT.' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres.')
    .max(150)
    .trim(),
  cpf: cpfUpdate,
  email: emailField.nullable().optional(),
  telefone: z.string().max(20).trim().nullable().optional(),
  endereco: z.string().max(500).trim().nullable().optional(),
  ativo: z.boolean().optional(),
});

// PATCH — atualização parcial: todos os campos opcionais
const patchSchema = z.object({
  nome: z.string().min(2).max(150).trim().optional(),
  cpf: cpfUpdate,
  email: emailField.nullable().optional(),
  telefone: z.string().max(20).trim().nullable().optional(),
  endereco: z.string().max(500).trim().nullable().optional(),
  ativo: z.boolean().optional(),
});

// Query string da listagem: paginação, filtros e ordenação
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  ativo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  orderBy: z.enum(['nome', 'createdAt', 'updatedAt']).default('nome'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  // GET /api/v1/customers
  findAll = async (req: Request, res: Response): Promise<void> => {
    const params = querySchema.parse(req.query);
    const companyId = req.user!.companyId;
    const result = await this.customerService.findAll({ ...params, companyId });

    res.status(200).json({
      status: 'success',
      ...result,
    });
  };

  // GET /api/v1/customers/:id
  findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const customer = await this.customerService.findById(id);

    res.status(200).json({
      status: 'success',
      data: { customer },
    });
  };

  // POST /api/v1/customers
  create = async (req: Request, res: Response): Promise<void> => {
    const body = createSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const customer = await this.customerService.create({ ...body, companyId });

    res.status(201).json({
      status: 'success',
      message: 'Cliente cadastrado com sucesso.',
      data: { customer },
    });
  };

  // PUT /api/v1/customers/:id — substituição completa do recurso
  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = putSchema.parse(req.body);
    const customer = await this.customerService.update(id, body);

    res.status(200).json({
      status: 'success',
      message: 'Cliente atualizado com sucesso.',
      data: { customer },
    });
  };

  // PATCH /api/v1/customers/:id — atualização parcial
  partialUpdate = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const body = patchSchema.parse(req.body);

    // Garante que ao menos um campo foi enviado no PATCH
    if (Object.keys(body).length === 0) {
      throw new AppError('Nenhum campo para atualizar foi fornecido.', 400);
    }

    const customer = await this.customerService.update(id, body);

    res.status(200).json({
      status: 'success',
      message: 'Cliente atualizado parcialmente.',
      data: { customer },
    });
  };

  // DELETE /api/v1/customers/:id — soft delete (ativo = false)
  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    await this.customerService.delete(id);

    res.status(204).send();
  };
}

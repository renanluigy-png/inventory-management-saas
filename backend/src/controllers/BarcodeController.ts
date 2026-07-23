import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { BarcodeService } from '../integrations/barcode/BarcodeService';

const barcodeService = new BarcodeService();

const barcodeTypeEnum = z.enum(['ean13', 'code128', 'qrcode', 'ean8', 'upca', 'code39']);

const generateSchema = z.object({
  type:        barcodeTypeEnum.default('ean13'),
  value:       z.string().min(1).max(255),
  format:      z.enum(['png', 'svg', 'base64']).default('base64'),
  width:       z.coerce.number().positive().optional(),
  height:      z.coerce.number().positive().optional(),
  includeText: z.coerce.boolean().default(true),
  scale:       z.coerce.number().positive().optional(),
});

export const BarcodeController = {
  generate: asyncHandler(async (req: Request, res: Response) => {
    const options = generateSchema.parse({ ...req.query, ...req.body });
    const result = await barcodeService.generate(options);

    if (options.format === 'png') {
      const buffer = Buffer.from(result.data, 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${options.type}-${options.value}.png"`);
      res.send(buffer);
      return;
    }

    if (options.format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(result.data);
      return;
    }

    res.json({ status: 'success', data: result });
  }),

  batch: asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      codes: z.array(z.object({
        value: z.string().min(1),
        type:  barcodeTypeEnum.optional(),
      })).min(1).max(100),
    });
    const { codes } = schema.parse(req.body);
    const results = await barcodeService.generateBatch(codes);
    res.json({ status: 'success', data: results });
  }),

  validate: asyncHandler(async (req: Request, res: Response) => {
    const { value } = z.object({ value: z.string() }).parse(req.query);
    const valid = barcodeService.validateEAN13(value);
    res.json({ status: 'success', data: { value, valid, type: 'ean13' } });
  }),

  generateEAN13: asyncHandler(async (req: Request, res: Response) => {
    const { base } = z.object({ base: z.string().min(1).max(12) }).parse(req.body);
    const ean13 = barcodeService.generateEAN13WithDigit(base);
    const result = await barcodeService.generate({ type: 'ean13', value: ean13 });
    res.json({ status: 'success', data: { ean13, ...result } });
  }),
};

import { env } from '../../config/env';
import { IPaymentProvider } from './IPaymentProvider';
import { MockPixProvider } from './providers/MockPixProvider';
import { MercadoPagoProvider } from './providers/MercadoPagoProvider';
import { PagSeguroProvider } from './providers/PagSeguroProvider';
import { AsaasProvider } from './providers/AsaasProvider';
import { GerencianetProvider } from './providers/GerencianetProvider';
import { StripeProvider } from './providers/StripeProvider';
import { AppError } from '../../utils/AppError';

const providerCache = new Map<string, IPaymentProvider>();

/** Retorna o provider de pagamento configurado. Singleton por tipo. */
export function getPaymentProvider(providerName?: string): IPaymentProvider {
  const name = providerName ?? env.PIX_PROVIDER;

  if (providerCache.has(name)) {
    return providerCache.get(name)!;
  }

  let provider: IPaymentProvider;

  switch (name) {
    case 'mercadopago':  provider = new MercadoPagoProvider(); break;
    case 'pagseguro':   provider = new PagSeguroProvider();   break;
    case 'asaas':       provider = new AsaasProvider();       break;
    case 'gerencianet': provider = new GerencianetProvider(); break;
    case 'stripe':      provider = new StripeProvider();      break;
    case 'mock':
    default:
      provider = new MockPixProvider(); break;
  }

  if (!['mock', 'mercadopago', 'pagseguro', 'asaas', 'gerencianet', 'stripe'].includes(name)) {
    throw new AppError(`Provedor de pagamento desconhecido: "${name}". Valores aceitos: mock, mercadopago, pagseguro, asaas, gerencianet, stripe.`, 400);
  }

  providerCache.set(name, provider);
  return provider;
}

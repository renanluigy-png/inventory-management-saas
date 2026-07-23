import { JwtPayload } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      companyId?: string; // company UUID extraído do JWT pelo tenant middleware
    }
  }
}

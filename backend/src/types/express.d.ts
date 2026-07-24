import { QuotaCheckResult } from '../lib/ai/quota';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        jwt: string;
      };
      quota?: QuotaCheckResult;
    }
  }
}

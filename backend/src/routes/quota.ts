import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getUserQuota, getCreditBalance } from '../lib/ai/quota';
import { FEATURE_COSTS, Feature, FEATURE_PROVIDER_MAP, FREE_DAILY_ALLOWANCES } from '@unistudy/shared/constants/quota';

const router = Router();
router.use(authenticateUser);

router.get('/status', async (req: Request, res: Response) => {
  try {
    const quota = await getUserQuota(req.user!.id);
    const walletBalance = await getCreditBalance(req.user!.id);
    
    // Feature status map
    const featuresStatus: any = {};
    Object.keys(FEATURE_COSTS).forEach((key) => {
      const f = key as Feature;
      featuresStatus[f] = {
        provider: FEATURE_PROVIDER_MAP[f],
        cost: FEATURE_COSTS[f],
        locked: false,
        available: true
      };
    });

    const response: any = { features: featuresStatus, wallet_balance: walletBalance };
    
    const relevantProviders = ['gemini', 'groq_70b', 'groq_8b', 'cohere', 'youtube'];
    for (const p of relevantProviders) {
      let prefix = p.replace('_', '').replace('70b', '70').replace('8b', '8');
      if (p === 'gemini') prefix = 'gemini';
      
      const dailyLimit = FREE_DAILY_ALLOWANCES[prefix] || 0;
      
      response[p] = {
        daily_used: quota?.[`${prefix}_daily_used`] || 0,
        daily_limit: dailyLimit,
        daily_resets_at: quota?.[`${prefix}_daily_reset`],
        locked: false,
        platform_unavailable: false
      };
    }

    response.plan = 'credit_system';
    response.paid_expires_at = null;

    res.json(response);
  } catch (error) {
    console.error('Quota status error:', error);
    res.status(500).json({ error: 'Failed to fetch quota status' });
  }
});

export default router;

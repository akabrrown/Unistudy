import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabaseAsUser, supabaseAdmin } from '../lib/supabase';

const router = Router();

// 1. Role Guard Middleware
router.use(authenticateUser);
router.use(async (req: Request, res: Response, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user!.id)
      .single();

    if (error) console.error("Admin role check error:", error);
    
    if (error || !profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required', details: error });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error while verifying role' });
  }
});

// Helper: Log Admin Audit Action
async function logAuditAction(adminId: string, actionType: string, targetId: string, targetType: string, details: any = {}) {
  try {
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      target_type: targetType,
      details
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

// A01: Overview KPIs
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [
      { count: totalUsers },
      { count: newUsers },
      { count: activePaid },
      { count: activeRequests }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('ai_usage_logs').select('*', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
    ]);

    // Aggregate provider usage
    const { data: providers } = await supabaseAdmin.from('all_providers_quota').select('*');

    res.json({
      kpis: {
        totalUsers: totalUsers || 0,
        newUsersToday: newUsers || 0,
        activePaidSubscribers: activePaid || 0,
        totalAiRequestsToday: activeRequests || 0
      },
      providers: providers || []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A02: Users Management - List
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('*, subscriptions(status, plan_id, current_period_end)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A02: User Profile View - Details
router.get('/users/:userId/details', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    
    // Fetch courses, ai usage today/month
    const startOfToday = new Date(new Date().setHours(0,0,0,0)).toISOString();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    let activityData: any[] = [];
    try {
      const { data } = await supabaseAdmin.from('admin_audit_logs').select('*').eq('target_id', userId).order('created_at', { ascending: false }).limit(10);
      if (data) activityData = data;
    } catch (e) {
      console.warn("Audit logs fetch failed", e);
    }

    const [coursesRes, aiTodayRes, aiMonthRes] = await Promise.all([
      supabaseAdmin.from('courses').select('id, course_code, title').eq('user_id', userId),
      supabaseAdmin.from('ai_request_log').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfToday),
      supabaseAdmin.from('ai_request_log').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonth)
    ]);

    res.json({
      courses: coursesRes.data || [],
      aiUsage: {
        today: aiTodayRes.count || 0,
        month: aiMonthRes.count || 0
      },
      recentActivity: activityData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A02: Update User Role (student, admin, suspended)
router.patch('/users/:userId/role', async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const { role, suspendReason } = req.body;

  if (!['student', 'admin', 'suspended'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role, suspend_reason: role === 'suspended' ? (suspendReason || 'Suspended by admin') : null })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await logAuditAction(
      req.user!.id,
      role === 'suspended' ? 'USER_SUSPENDED' : (role === 'admin' ? 'USER_ROLE_CHANGED_ADMIN' : 'USER_ROLE_CHANGED_STUDENT'),
      userId,
      'user',
      { role, suspendReason }
    );

    res.json({ success: true, profile: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A02: Update User Plan (free, pro, ultra)
router.patch('/users/:userId/plan', async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const { plan } = req.body; // 'free', 'pro', 'ultra'

  try {
    // Upsert subscription
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_id: plan,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    await logAuditAction(req.user!.id, 'USER_PLAN_CHANGED', userId, 'user', { plan });

    res.json({ success: true, subscription: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A02: Reset Password (Generate Magic Recovery Link)
router.post('/users/:userId/reset-password', async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return res.status(404).json({ error: 'User email not found' });
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email
    });

    if (error) throw error;

    await logAuditAction(req.user!.id, 'USER_PASSWORD_RESET_LINK', userId, 'user', { email: profile.email });

    res.json({ success: true, recoveryLink: data.properties?.action_link });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A02: Delete User Account
router.delete('/users/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId as string;

    try {
      // Delete from auth.users (cascades or cleans up auth)
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authErr) {
        console.error('Auth user delete error:', authErr);
        // Proceed to delete profile anyway
      }

      // Delete from profiles
      const { error: profileErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
      if (profileErr) {
        console.error('Profile delete error:', profileErr);
        throw new Error(profileErr.message || 'Failed to delete profile');
      }

      await logAuditAction(req.user!.id, 'USER_DELETED', userId, 'user', {});

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
});

// A03: Content Moderation - Fetch all content (with flags)
router.get('/content', async (req: Request, res: Response) => {
  try {
    // Lectures belong to courses, not profiles directly.
    const { data: lectures, error } = await supabaseAdmin
      .from('lectures')
      .select('id, title, created_at, courses(course_code, title)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ content: lectures });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A03: Content Moderation - Delete content
router.delete('/content/:id', async (req: Request, res: Response) => {
  const contentId = req.params.id;

  try {
    const { error } = await supabaseAdmin
      .from('lectures')
      .delete()
      .eq('id', contentId);

    if (error) throw error;

    await logAuditAction(req.user!.id, 'CONTENT_DELETED', contentId as string, 'lecture', {});

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A04: AI Usage Monitoring - Dashboard Data
router.get('/ai-usage', async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const startOfToday = new Date(new Date().setHours(0,0,0,0)).toISOString();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // 1. Providers balance
    const { data: providers } = await supabaseAdmin.from('platform_ai_balance').select('*');

    const { count: totalRequests } = await supabaseAdmin.from('ai_request_log').select('*', { count: 'exact', head: true });

    // 3. Daily calls over 30 days
    // We would normally group by DATE, but since we don't have a direct SQL function available in PostgREST,
    // we'll fetch the logs for the last 30 days and group them in JS (fine for our current scale).
    const { data: dailyLogs } = await supabaseAdmin
      .from('ai_request_log')
      .select('provider, called_at')
      .gte('called_at', thirtyDaysAgo);

    // Grouping for line chart
    const dailyChartData: any = {};
    if (dailyLogs) {
      dailyLogs.forEach((log) => {
        const date = log.called_at.split('T')[0];
        if (!dailyChartData[date]) dailyChartData[date] = { date };
        dailyChartData[date][log.provider] = (dailyChartData[date][log.provider] || 0) + 1;
      });
    }

    // 4. Token consumption this month
    const { data: monthlyLogs } = await supabaseAdmin
      .from('ai_request_log')
      .select('provider, tokens_cost')
      .gte('called_at', startOfMonth);

    const tokensPerProvider: any = {};
    if (monthlyLogs) {
      monthlyLogs.forEach((log) => {
        tokensPerProvider[log.provider] = (tokensPerProvider[log.provider] || 0) + (log.tokens_cost || 0);
      });
    }

    // 5. Top 10 users today
    const { data: todayLogs } = await supabaseAdmin
      .from('ai_request_log')
      .select('user_id, provider, feature, profiles(email, full_name)')
      .gte('called_at', startOfToday);

    const usersMap: any = {};
    if (todayLogs) {
      todayLogs.forEach((log) => {
        if (!usersMap[log.user_id]) {
          usersMap[log.user_id] = {
            id: log.user_id,
            email: (log.profiles as any)?.email || 'Unknown',
            full_name: (log.profiles as any)?.full_name || 'Unknown',
            requests: 0,
            features: new Set()
          };
        }
        usersMap[log.user_id].requests += 1;
        usersMap[log.user_id].features.add(log.feature);
      });
    }
    const topUsers = Object.values(usersMap)
      .map((u: any) => ({ ...u, features: Array.from(u.features).join(', ') }))
      .sort((a: any, b: any) => b.requests - a.requests)
      .slice(0, 10);

    res.json({
      providers: providers || [],
      cache: {
        total: totalRequests || 0,
        hits: 0,
        rate: 0
      },
      chartData: Object.values(dailyChartData).sort((a: any, b: any) => a.date.localeCompare(b.date)),
      tokensPerProvider,
      topUsers
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A04: AI Admin Actions
router.post('/ai-usage/toggle-fallback', async (req: Request, res: Response) => {
  const { provider, activate } = req.body;
  try {
    await supabaseAdmin
      .from('platform_ai_balance')
      .update({ is_fallback_active: activate })
      .eq('provider', provider);
    
    await logAuditAction(req.user!.id, activate ? 'AI_FALLBACK_ACTIVATED' : 'AI_FALLBACK_DEACTIVATED', provider, 'provider');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A05: Subscription & Revenue Analytics
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString();
    
    // 1. All Paid Subscriptions (table)
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, plan_id, status, created_at, current_period_end, cancel_at, profiles(email, full_name)')
      .neq('plan_id', 'free')
      .order('created_at', { ascending: false });

    // 2. Revenue Chart (MRR over 12 months)
    // In a real app we'd query invoices. We'll approximate MRR from active subscriptions.
    const revenueData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      revenueData.push({
        month: d.toLocaleString('default', { month: 'short' }),
        revenue: (subs || []).filter(s => s.status === 'active').length * 40 // Assuming 40 GHS/mo avg
      });
    }

    // 3. Churn Tracker (Cancelled/Expired this month vs last month)
    const { count: churnThisMonth } = await supabaseAdmin.from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['canceled', 'past_due', 'unpaid'])
      .gte('updated_at', startOfThisMonth);
      
    const { count: churnLastMonth } = await supabaseAdmin.from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['canceled', 'past_due', 'unpaid'])
      .gte('updated_at', startOfLastMonth)
      .lt('updated_at', startOfThisMonth);

    // 4. Failed Payments Log (mocked from webhooks if present)
    let paymentLogs: any[] = [];
    try {
      const { data } = await supabaseAdmin.from('paystack_webhook_logs').select('id, event_type, user_id, amount, reference, status, created_at, profiles(email)').order('created_at', { ascending: false }).limit(50);
      if (data) paymentLogs = data;
    } catch (e) {
      console.warn("No paystack webhook logs table found");
    }

    res.json({
      subscriptions: subs || [],
      revenueChart: revenueData,
      churn: {
        thisMonth: churnThisMonth || 0,
        lastMonth: churnLastMonth || 0
      },
      paymentLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// A05: Manual Plan Override
router.post('/subscriptions/override', async (req: Request, res: Response) => {
  const { userId, newPlan, expiryDays } = req.body;
  try {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (expiryDays || 30));

    // Update or Insert Subscription
    await supabaseAdmin.from('subscriptions').upsert({
      user_id: userId,
      plan_id: newPlan,
      status: 'active',
      current_period_end: expiry.toISOString()
    });

    // Also update profile plan shorthand
    await supabaseAdmin.from('profiles').update({ plan: newPlan }).eq('id', userId);

    await logAuditAction(req.user!.id, 'SUBSCRIPTION_MANUALLY_OVERRIDDEN', userId, 'subscription', { newPlan, expiryDays });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

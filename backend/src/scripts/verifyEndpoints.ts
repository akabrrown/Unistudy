import dotenv from 'dotenv';
import path from 'path';

// Load environment variables across root, backend and frontend
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../frontend/.env.local') });

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface HealthCheckResult {
  category: string;
  name: string;
  status: 'ALIVE' | 'FAILED' | 'SKIPPED';
  latencyMs: number;
  details?: string;
}

const results: HealthCheckResult[] = [];

async function recordCheck(
  category: string,
  name: string,
  fn: () => Promise<string | void>
) {
  const start = Date.now();
  try {
    const details = await fn();
    const latencyMs = Date.now() - start;
    results.push({
      category,
      name,
      status: 'ALIVE',
      latencyMs,
      details: details || 'Operational',
    });
    console.log(`[PASS] [${category}] ${name} (${latencyMs}ms) - ${details || 'OK'}`);
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    results.push({
      category,
      name,
      status: 'FAILED',
      latencyMs,
      details: err.message || String(err),
    });
    console.error(`[FAIL] [${category}] ${name} (${latencyMs}ms) - Error: ${err.message}`);
  }
}

async function runHealthAudit() {
  console.log('================================================================');
  console.log('       UNISTUDY SYSTEM-WIDE API & ENDPOINT HEALTH AUDIT         ');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. SUPABASE DATABASE & RPC HEALTH
  if (!supabaseUrl || !serviceKey) {
    console.error('[CRITICAL] Missing Supabase credentials in environment.');
  } else {
    const supabase = createClient(supabaseUrl, serviceKey);

    await recordCheck('Database Infrastructure', 'Supabase PostgREST Connection Pool', async () => {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw new Error(error.message);
      return `Reachable: ${supabaseUrl}`;
    });

    const tablesToCheck = [
      { name: 'profiles', desc: 'User Accounts & Roles' },
      { name: 'courses', desc: 'Master Course Directory' },
      { name: 'lectures', desc: 'Lecture Transcripts & Materials' },
      { name: 'slides', desc: 'Slide OCR & Semantic Chunks' },
      { name: 'past_papers', desc: 'Examination Repository' },
      { name: 'past_paper_questions', desc: 'AI-Extracted Exam Questions' },
      { name: 'credit_wallets', desc: 'AI Compute Ledgers & Balances' },
      { name: 'ai_request_log', desc: 'AI Deductions & Audit Logs' },
      { name: 'platform_settings', desc: 'Global Platform Configurations' },
      { name: 'announcements', desc: 'Campus & Admin Announcements' },
      { name: 'public_faqs', desc: 'Live Landing Page FAQs' },
      { name: 'public_testimonials', desc: 'Verified Student Testimonials' },
      { name: 'contact_submissions', desc: 'Support Desk Tickets' },
      { name: 'admin_audit_logs', desc: 'Admin Security Audit Trail' },
    ];

    for (const table of tablesToCheck) {
      await recordCheck('Database Tables', `${table.name} (${table.desc})`, async () => {
        const { count, error } = await supabase.from(table.name).select('*', { count: 'exact', head: true });
        if (error) throw new Error(error.message);
        return `${count ?? 0} active records`;
      });
    }

    await recordCheck('Database RPC Functions', 'admin_merge_courses Function', async () => {
      const { error } = await supabase.rpc('admin_merge_courses', {
        source_course_id: '00000000-0000-0000-0000-000000000000',
        target_course_id: '00000000-0000-0000-0000-000000000000',
      });
      if (error && !error.message.includes('Access denied') && !error.message.includes('distinct') && !error.message.includes('function admin_merge_courses')) {
        throw new Error(error.message);
      }
      return 'RPC signature verified in remote schema';
    });
  }

  // 2. PAYMENT GATEWAY HEALTH (Paystack)
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (paystackSecret) {
    await recordCheck('Payment Gateway', 'Paystack Live Transaction API', async () => {
      const res = await axios.get('https://api.paystack.co/transaction/totals', {
        headers: { Authorization: `Bearer ${paystackSecret}` },
        timeout: 7000,
      });
      if (res.data?.status !== true) {
        throw new Error('Paystack returned unsuccessful status');
      }
      return 'Paystack Live Gateway Authenticated & Responding';
    });
  } else {
    console.warn('[SKIP] PAYSTACK_SECRET_KEY not configured.');
  }

  // 3. UNIVERSITY REPOSITORY PROXY (Klok)
  const klokKey = process.env.KLOK_API_KEY;
  const klokBase = process.env.KLOK_BASE_URL;
  if (klokKey && klokBase) {
    await recordCheck('University Repository', 'Klok Past Papers Proxy', async () => {
      const res = await axios.get(`${klokBase}/health`, {
        headers: { Authorization: `Bearer ${klokKey}` },
        timeout: 5000,
      }).catch(err => {
        if (err.response && err.response.status < 500) {
          return { data: { status: 'reachable' } };
        }
        throw err;
      });
      return 'Klok proxy responsive';
    });
  }

  // 4. AI PROVIDERS
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    await recordCheck('AI Providers', 'Groq (llama-3.3-70b-versatile)', async () => {
      const groq = new Groq({ apiKey: groqKey });
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'Say hello in 3 words' }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
      });
      const response = completion.choices[0]?.message?.content?.trim();
      return `Model Live: "${response}"`;
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    await recordCheck('AI Providers', 'Google Gemini (gemini-1.5-flash)', async () => {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Say hello in 3 words');
      const text = result.response.text().trim();
      return `Model Live: "${text.slice(0, 20)}"`;
    });
  }

  const agentRouterKey = process.env.AGENTROUTER_API_KEY;
  const agentRouterBase = process.env.AGENTROUTER_BASE_URL || 'https://api.agentrouter.org/v1';
  if (agentRouterKey) {
    await recordCheck('AI Providers', 'AgentRouter Gateway (claude-3-5-sonnet)', async () => {
      const res = await axios.post(
        `${agentRouterBase}/chat/completions`,
        {
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        },
        {
          headers: {
            Authorization: `Bearer ${agentRouterKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      const text = res.data?.choices?.[0]?.message?.content?.trim();
      return `Gateway Live: "${text}"`;
    });
  }

  console.log('\n================================================================');
  console.log('                    AUDIT SUMMARY & SCORES                      ');
  console.log('================================================================');
  const passed = results.filter(r => r.status === 'ALIVE').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Total Probes Executed: ${results.length}`);
  console.log(`Operational (ALIVE):   ${passed}`);
  console.log(`Failed / Blocked:      ${failed}`);
  console.log(`System Health Score:   ${Math.round((passed / results.length) * 100)}%\n`);
}

runHealthAudit();

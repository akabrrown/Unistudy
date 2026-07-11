**UniStudy AI**  
**Doc 14: Admin Panel**  
_10 Admin Pages · Phase 5 · Full platform control for administrators_

**Table of Contents**
=====================

**OVERVIEW**  
The Admin Panel is a fully separate section of the platform accessible only to users with role = 'admin'. It gives administrators complete visibility and control over the platform — users, content, AI usage, subscriptions, settings, and audit trails. All admin actions are logged immutably in the audit\_logs table.

<table><tbody><tr><td><strong>Admin Page</strong></td><td><strong>Route</strong></td><td><strong>Key Function</strong></td></tr><tr><td>Overview Dashboard</td><td>/admin</td><td>KPIs, live stats, system health</td></tr><tr><td>User Management</td><td>/admin/users</td><td>Search, view, suspend, change plan</td></tr><tr><td>Content Moderation</td><td>/admin/content</td><td>Review lectures, past papers, flags</td></tr><tr><td>AI Usage Monitor</td><td>/admin/ai-usage</td><td>Provider call volume, cost estimates</td></tr><tr><td>Subscription Manager</td><td>/admin/subscriptions</td><td>Active subs, revenue, churn</td></tr><tr><td>Referral Tracker</td><td>/admin/referrals</td><td>Referral codes, conversions, credits</td></tr><tr><td>Platform Settings</td><td>/admin/settings</td><td>Feature flags, limits, maintenance mode</td></tr><tr><td>Audit Logs</td><td>/admin/audit</td><td>Every admin action with full details</td></tr><tr><td>Announcements</td><td>/admin/announcements</td><td>Broadcast emails to users by plan tier</td></tr><tr><td>Lecturer Approvals</td><td>/admin/lecturers</td><td>Approve/reject lecturer role requests</td></tr></tbody></table>

<table><tbody><tr><td><strong>14.1</strong></td><td><strong>Overview Dashboard</strong><br><em>/admin — Real-time KPIs, system health, and platform-wide activity</em></td></tr></tbody></table>

### **KPI Cards**

*   Total Users (all time) / New Users (this week)
*   Active Subscriptions — Pro count + Enterprise count
*   Monthly Recurring Revenue (MRR) in GHS — calculated from active subscriptions
*   Daily AI Calls — total across all providers today
*   Storage Used — Cloudinary bandwidth this month
*   Uptime (last 30 days) — pulled from BetterUptime API

### **Activity Feed**

*   Live feed of: new signups, new subscriptions, content uploads, support flags
*   Powered by Supabase Realtime — updates without page refresh

<table><tbody><tr><td>// /app/api/admin/overview/route.ts<br>export async function GET(req: NextRequest) {<br>await requireAdmin(req); // throws 403 if not admin<br>const [users, subs, aiCalls, newToday] = await Promise.all([<br>supabase.from('profiles').select('id', { count: 'exact', head: true }),<br>supabase.from('subscriptions').select('plan').eq('status', 'active'),<br>supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true })<br>.gte('created_at', startOfToday),<br>supabase.from('profiles').select('id', { count: 'exact', head: true })<br>.gte('created_at', startOfToday),<br>]);<br>const mrr = subs.data.reduce((t, s) =&gt; {<br>return t + (s.plan === 'pro' ? 4900 : s.plan === 'enterprise' ? 14900 : 0);<br>}, 0) / 100; // in GHS<br>return NextResponse.json({<br>totalUsers: users.count,<br>newToday: newToday.count,<br>activeSubs: subs.data.length,<br>mrr,<br>aiCallsToday: aiCalls.count,<br>});<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>14.2</strong></td><td><strong>User Management</strong><br><em>/admin/users — Full user table with search, filter, profile view, suspend, plan change</em></td></tr></tbody></table>

### **User Table Columns**

<table><tbody><tr><td><strong>Column</strong></td><td><strong>Source</strong></td><td><strong>Filterable</strong></td></tr><tr><td>Name + Avatar</td><td>profiles.full_name, avatar_url</td><td>No</td></tr><tr><td>Email</td><td>profiles.email</td><td>Search</td></tr><tr><td>Plan</td><td>profiles.plan</td><td>Filter: free/pro/enterprise</td></tr><tr><td>Role</td><td>profiles.role</td><td>Filter: student/lecturer/admin</td></tr><tr><td>Joined</td><td>profiles.created_at</td><td>Sort</td></tr><tr><td>Last Active</td><td>study_sessions MAX date</td><td>Sort</td></tr><tr><td>Total XP</td><td>profiles.total_xp</td><td>Sort</td></tr><tr><td>Status</td><td>Derived from subscription.status</td><td>Filter: active/suspended</td></tr></tbody></table>

### **Admin Actions per User**

*   View full profile — all courses, lectures, quiz scores, subscription history
*   Change plan — manually upgrade/downgrade without payment
*   Suspend account — sets profiles.role = 'suspended', blocks all API access
*   Delete account — hard delete with cascade (GDPR compliance)
*   Reset password — triggers Supabase magic link to user's email
*   Impersonate (view-only) — see the platform as that user without editing

<table><tbody><tr><td>// /app/api/admin/users/suspend/route.ts<br>export async function POST(req: NextRequest) {<br>await requireAdmin(req);<br>const { userId, reason } = await req.json();<br>await supabase.from('profiles')<br>.update({ role: 'suspended' }).eq('id', userId);<br>// Log the action<br>await supabase.from('audit_logs').insert({<br>admin_id: session.user.id,<br>action: 'USER_SUSPENDED',<br>target_user_id: userId,<br>details: { reason }<br>});<br>// Email the user<br>await resend.emails.send({<br>from: process.env.EMAIL_FROM!,<br>to: userEmail,<br>subject: 'Your UniStudy AI account has been suspended',<br>html: buildSuspensionEmail(reason)<br>});<br>return NextResponse.json({ success: true });<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>14.3</strong></td><td><strong>Content Moderation</strong><br><em>/admin/content — All lectures and past papers, quality flags, removal tools</em></td></tr></tbody></table>

*   Table: all uploaded lectures across all users — sortable by date, quality score, flag count
*   Quality filter: show only 'needs\_attention' lectures flagged by the AI quality checker
*   Flag filter: show content flagged by 3+ students as incorrect or inappropriate
*   Actions: view lecture (read-only), remove lecture, warn uploader, mark as reviewed
*   Past papers: same table for community bank papers — remove if low quality or flagged

<table><tbody><tr><td>// /app/api/admin/content/route.ts<br>export async function GET(req: NextRequest) {<br>await requireAdmin(req);<br>const { filter } = Object.fromEntries(new URL(req.url).searchParams);<br>let query = supabase.from('lectures')<br>.select('id, title, created_at, quality_score, profiles(email)')<br>.order('created_at', { ascending: false });<br>if (filter === 'flagged') query = query.eq('quality_score', 'needs_attention');<br>const { data } = await query;<br>return NextResponse.json(data);<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>14.4</strong></td><td><strong>AI Usage Monitor</strong><br><em>/admin/ai-usage — Provider call volumes, estimated costs, top consumers</em></td></tr></tbody></table>

Every AI call is logged to ai\_usage\_logs with the provider, feature, and token count. The AI Usage Monitor aggregates this data to show cost estimates and identify high-consumption users.

<table><tbody><tr><td><strong>Provider</strong></td><td><strong>Cost Estimate</strong></td><td><strong>Tracked By</strong></td></tr><tr><td>Gemini 1.5 Flash</td><td>$0.075 / 1M input tokens</td><td>ai_usage_logs WHERE provider = 'gemini'</td></tr><tr><td>Groq Llama 3 70B</td><td>$0.59 / 1M tokens</td><td>ai_usage_logs WHERE provider = 'groq'</td></tr><tr><td>Together AI</td><td>$0.90 / 1M tokens</td><td>ai_usage_logs WHERE provider = 'together'</td></tr><tr><td>HuggingFace</td><td>Free tier — count only</td><td>ai_usage_logs WHERE provider = 'huggingface'</td></tr></tbody></table>

*   Line chart: daily AI calls per provider over last 30 days — Chart.js
*   Top 10 users by AI call volume — with option to cap or upgrade their plan
*   Free tier warning: alert when approaching 80% of any provider's free limit

<table><tbody><tr><td><strong>14.5</strong></td><td><strong>Subscription Manager</strong><br><em>/admin/subscriptions — All active subscriptions, revenue chart, churn tracking</em></td></tr></tbody></table>

*   Table: all active subscriptions — user, plan, amount, start date, next billing date
*   Revenue chart: MRR over last 12 months — Chart.js bar chart in plum
*   Churn tracker: subscriptions cancelled this month vs last month
*   Failed payments: list of users whose last Paystack charge failed — with retry option
*   Manual override: grant Pro access without payment — for partnerships or comps

<table><tbody><tr><td><strong>14.6</strong></td><td><strong>Platform Settings</strong><br><em>/admin/settings — Feature flags, per-plan limits, maintenance mode</em></td></tr></tbody></table>

All platform settings are stored in the platform\_settings table as key-value pairs. The admin can change them without a code deployment.

<table><tbody><tr><td><strong>Setting Key</strong></td><td><strong>Default Value</strong></td><td><strong>Effect</strong></td></tr><tr><td>COMMUNITY_BANK_ENABLED</td><td>true</td><td>Enables/disables community past paper sharing</td></tr><tr><td>STUDY_GROUPS_ENABLED</td><td>true</td><td>Enables/disables study group creation</td></tr><tr><td>PARTNER_MATCHER_ENABLED</td><td>true</td><td>Enables/disables study partner matching</td></tr><tr><td>MAINTENANCE_MODE</td><td>false</td><td>Shows maintenance page to all non-admin users</td></tr><tr><td>FREE_COURSE_LIMIT</td><td>3</td><td>Max courses for free plan users</td></tr><tr><td>FREE_LECTURE_LIMIT</td><td>5</td><td>Max lectures per course for free plan</td></tr><tr><td>FREE_AI_CALLS_PER_DAY</td><td>30</td><td>Max AI explanation calls per day on free plan</td></tr><tr><td>FREE_TRIAL_DAYS</td><td>7</td><td>Length of Pro free trial for new signups</td></tr><tr><td>MAX_UPLOAD_SIZE_MB</td><td>50</td><td>Max file size for lecture uploads</td></tr></tbody></table>

<table><tbody><tr><td>// /app/api/admin/settings/route.ts<br>export async function PATCH(req: NextRequest) {<br>await requireAdmin(req);<br>const { key, value } = await req.json();<br>await supabase.from('platform_settings')<br>.upsert({ key, value, updated_at: new Date() }, { onConflict: 'key' });<br>await supabase.from('audit_logs').insert({<br>admin_id: session.user.id,<br>action: 'SETTING_CHANGED',<br>details: { key, value }<br>});<br>return NextResponse.json({ success: true });<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>14.7</strong></td><td><strong>Audit Logs</strong><br><em>/admin/audit — Every admin action, immutable, with full context</em></td></tr></tbody></table>

*   Immutable: INSERT-only RLS on audit\_logs — no UPDATE or DELETE allowed, even for admins
*   Columns: timestamp, admin name, action type, target user, details JSON
*   Filter by: action type, admin, date range, target user
*   Export: download audit log as CSV for compliance reporting

<table><tbody><tr><td>-- Supabase RLS: audit_logs INSERT only — no edit, no delete<br>ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;<br>CREATE POLICY audit_insert ON audit_logs FOR INSERT<br>TO authenticated WITH CHECK (auth.uid() IN (<br>SELECT id FROM profiles WHERE role = 'admin'<br>));<br>-- No SELECT, UPDATE, DELETE policies for non-admins<br>-- Admins access via service role key only</td></tr></tbody></table>

<table><tbody><tr><td><strong>14.8</strong></td><td><strong>Announcements</strong><br><em>/admin/announcements — Broadcast to all users or specific plan tiers</em></td></tr></tbody></table>

*   Target: All users / Free users only / Pro users only / Enterprise only
*   Type: In-app banner (shown on dashboard for 48 hours) or Email broadcast
*   Preview: admin sees exactly what users will see before sending
*   History: all past announcements with open rate (for email broadcasts)

<table><tbody><tr><td>// /app/api/admin/announcements/send/route.ts<br>export async function POST(req: NextRequest) {<br>await requireAdmin(req);<br>const { title, body, target, type } = await req.json();<br>// Get target users<br>let query = supabase.from('profiles').select('id, email');<br>if (target !== 'all') query = query.eq('plan', target);<br>const { data: users } = await query;<br>if (type === 'email') {<br>// Batch send via Resend (max 50 per call)<br>const chunks = chunkArray(users, 50);<br>for (const chunk of chunks) {<br>await resend.batch.send(chunk.map(u =&gt; ({<br>from: process.env.EMAIL_FROM!,<br>to: u.email,<br>subject: title,<br>html: buildAnnouncementEmail(title, body)<br>})));<br>}<br>} else {<br>// In-app banner — stored in platform_settings<br>await supabase.from('platform_settings').upsert({<br>key: 'ACTIVE_ANNOUNCEMENT',<br>value: JSON.stringify({ title, body, target, expires: Date.now() + 48*3600*1000 })<br>}, { onConflict: 'key' });<br>}<br>return NextResponse.json({ sent: users.length });<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>14.9</strong></td><td><strong>Lecturer Approvals</strong><br><em>/admin/lecturers — Approve or reject lecturer role requests</em></td></tr></tbody></table>

*   Lecturers self-register with role request = 'lecturer\_pending'
*   Admin sees a queue of pending requests with the applicant's name, email, university, and reason
*   Approve: sets profiles.role = 'lecturer', sends welcome email
*   Reject: sends rejection email with reason, role remains 'student'
*   Lecturers can be revoked back to student at any time

<table><tbody><tr><td><strong>14.10</strong></td><td><strong>Admin Guard — requireAdmin()</strong><br><em>Server-side helper that enforces admin role on every protected route</em></td></tr></tbody></table>

<table><tbody><tr><td>// /lib/security/adminGuard.ts<br>import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';<br>import { cookies } from 'next/headers';<br>import { NextRequest, NextResponse } from 'next/server';<br>export async function requireAdmin(req: NextRequest) {<br>const supabase = createRouteHandlerClient({ cookies });<br>const { data: { session } } = await supabase.auth.getSession();<br>if (!session) {<br>throw new Response('Unauthorized', { status: 401 });<br>}<br>const { data: profile } = await supabase<br>.from('profiles').select('role').eq('id', session.user.id).single();<br>if (profile?.role !== 'admin') {<br>throw new Response('Forbidden', { status: 403 });<br>}<br>return session; // return for use in the route handler<br>}<br>// Usage in any admin route:<br>export async function GET(req: NextRequest) {<br>const session = await requireAdmin(req);<br>// ... safe to proceed<br>}</td></tr></tbody></table>

UniStudy AI · Doc 14: Admin Panel · Phase 5 · 10 Admin Pages
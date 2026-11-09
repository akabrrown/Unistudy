# UniStudy AI — Security & Engineering Rules

## 1. Authentication & Credentials
- All user passwords must be hashed using bcrypt (cost >= 10) via Supabase GoTrue.
- Server-side Zod validation is mandatory on all auth server actions (`login`, `signup`, `resetPassword`).
- Login attempts are rate-limited to 5 attempts per 15 minutes per IP/email.
- Signup attempts are rate-limited to 5 accounts per 15 minutes per IP.
- Passwords must be checked against HaveIBeenPwned API before signup/reset to reject breached credentials.
- Passwords must be between 8 and 128 characters (protects against bcrypt 72-byte truncation issues and ReDoS).
- Password reset OTPs and recovery links expire in <= 1 hour and are single-use.

## 2. API Keys & Environment Isolation
- `NEXT_PUBLIC_` variables must NEVER contain private secrets, service role keys, payment keys, or AI provider credentials.
- All AI calls and payment operations run exclusively on the Express backend or Next.js server actions.
- `.env*` files are strictly gitignored and must never be committed.

## 3. Database & Row Level Security (RLS)
- Every table in Supabase MUST have Row Level Security enabled.
- `USING (true)` is strictly prohibited on user data (`courses`, `lectures`, `slides`, `profiles`, `flashcards`, `quiz_attempts`, `slide_notes`, `slide_chats`, `calendar_events`).
- Users can strictly only SELECT, INSERT, UPDATE, or DELETE records where `auth.uid() = user_id` or where foreign-key ownership is proven via `EXISTS (SELECT 1 FROM lectures WHERE lectures.id = slides.lecture_id AND lectures.user_id = auth.uid())`.
- `credit_wallets` cannot be mutated directly from the client; all balances are modified via verified server-side security-definer RPCs (`increment_credit_wallet`, `decrement_credit_wallet`).
- Admin tables (`ai_api_keys`, `admin_audit_logs`, `platform_settings`) require `profiles.role = 'admin'`.

## 4. HTTPS, Transport & Cookie Security
- Production HSTS (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`) is enforced in `next.config.ts`.
- Security headers `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` are active on all routes.
- Cookies set via Supabase SSR must always use `{ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }`.

## 5. Safe Queries & XSS Elimination
- All database operations must use parameterized queries through Supabase client or parameterized RPCs. Zero raw SQL string interpolation.
- No `dangerouslySetInnerHTML` on untrusted input. Markdown is rendered safely through sanitized AST parsers.

## 6. Payments & Pricing
- Paystack webhook signatures must be compared using constant-time equality (`crypto.timingSafeEqual`) with buffer length validation.
- All purchases verify `data.amount` against canonical server-side bundle pricing (`CREDIT_BUNDLES[id].price * 100`).
- Credit amounts granted are derived solely from server configuration, never from user-supplied metadata.

## 7. Package & Supply Chain Hygiene
- Run `pnpm audit` regularly. Zero high or critical vulnerabilities allowed in production builds.

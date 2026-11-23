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

## 8. AI Quality, Grounding & Verification Gates
- All website AI prompts, Zod schemas, grounding retrieval (`aiTutor.ts`), span hallucination checks (`groundingVerifier.ts`), MixTeX LaTeX normalization (`latexNormalizer.ts`), and AI footprint stripping (`textHumanizer.ts`) live in `shared/lib/` and follow `.agents/rules/`.
- Structured extraction/grading/OCR endpoints run at `temperature: 0.1–0.2`; tutoring and honors essay rewriting run at `0.55`.
- Before shipping any AI change, run:
  - `cd backend; npx tsx --test ../shared/lib/*.test.ts ../shared/evals/evalRunner.test.ts`
  - `cd backend; npx tsc --noEmit`
  - `cd mobile; npx tsc --noEmit`
  - `cd frontend; npm run build`

## 9. UPSA Brand UI & Styling Standard
- Every feature, button, page, dialog, or UI component must strictly use the UPSA brand color system:
  - **UPSA Deep Navy:** `#00004E` (Primary buttons, structural headers, active states, text authority)
  - **UPSA Gold:** `#D89A06` (Accent badges, active tab borders, focus rings, highlights)
  - **UPSA White:** `#FFFFFF` (Surface contrast, text on navy)
- Both Light Theme and Dark Theme must be verified for high contrast and readability.
- Zero generic purple/pink gradients; zero AI sparkle icons (`Sparkles`).
- Follow the complete styling contract in `.agents/rules/04-upsa-brand-ui-styling-contract.md`.

## 10. World-Class System Speed & Local-First Offline Architecture
- **Multi-Tier Local-First Reads (RAM → IndexedDB → SWR Background Sync):**
  - Read-heavy data (past questions, slide notes, lecture transcripts, course outlines) must render instantaneously from local storage before any network request is initiated.
  - Tier 1: In-memory module cache (0ms).
  - Tier 2: Dexie / IndexedDB persistent local cache (<5ms).
  - Tier 3: Asynchronous background SWR (`stale-while-revalidate`) revalidation to keep content synchronized without blocking the UI.
- **Predictive Lookahead Preloading:**
  - Sequential user journeys (e.g. Slide $N \rightarrow N+1, N+2$, Course $\rightarrow$ First Lecture, Quiz Question $Q \rightarrow Q+1$) must eagerly warm the buffer in background microtasks or idle callbacks (`requestIdleCallback`) so page transitions are 0ms instant.
- **Zero-Delay AI Streaming Architecture:**
  - AI responses must flush SSE stream headers immediately (`res.flushHeaders()` / edge stream chunk 0) within <100ms.
  - Decouple background compute (e.g. PDF generation, analytics, database logging) from active token streaming.
- **3-State Resilient Circuit Breakers (Hystrix Pattern):**
  - External dependencies (Redis, AI providers, OCR microservices) must be wrapped in a 3-state circuit breaker (`CLOSED` $\rightarrow$ `OPEN` $\rightarrow$ `HALF_OPEN` with canary probe successes required to close).
  - Systems must gracefully degrade to local-first or fallback modes when a dependency fails, never crashing or hanging the user request.
- **Interactive Form Pending States (`useFormStatus`):**
  - Every form submission and authentication button must immediately provide visual feedback upon click.
  - In Next.js App Router server action forms, buttons must be extracted into dedicated client components utilizing React 19's `useFormStatus()`, rendering an accessible spinner (`Loader2`) and descriptive pending text (`Signing in...`), while disabling re-clicks to prevent race conditions.


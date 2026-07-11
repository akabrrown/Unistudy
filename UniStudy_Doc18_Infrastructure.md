**UniStudy AI**  
**Doc 18: Infrastructure & Deployment**

**Table of Contents**
=====================

**ARCHITECTURE OVERVIEW**

<table><tbody><tr><td><strong>Layer</strong></td><td><strong>Service</strong></td><td><strong>Free Tier Limit</strong></td><td><strong>Upgrade Trigger</strong></td></tr><tr><td>Frontend + API</td><td>Vercel</td><td>100GB BW/mo</td><td>&gt; 10s functions</td></tr><tr><td>Database</td><td>Supabase</td><td>500MB DB</td><td>DB &gt; 500MB</td></tr><tr><td>Media CDN</td><td>Cloudinary</td><td>25 credits/mo</td><td>&gt; 25GB storage</td></tr><tr><td>Cache</td><td>Upstash Redis</td><td>10,000 req/day</td><td>PAYG after</td></tr><tr><td>Security</td><td>Arcjet</td><td>10,000 req/mo</td><td>&gt; 10k req/mo</td></tr><tr><td>Converter</td><td>Render</td><td>750 hrs/mo</td><td>Need always-on</td></tr><tr><td>Email</td><td>Resend</td><td>3,000 emails/mo</td><td>&gt; 3k emails</td></tr><tr><td>AI — Vision</td><td>Gemini Flash</td><td>15 req/min generous</td><td>API quota exhausted</td></tr><tr><td>AI — Fast</td><td>Groq</td><td>30 req/min</td><td>Quota exhausted</td></tr><tr><td>AI — Batch</td><td>Together AI</td><td>$1 free credit</td><td>Credit exhausted</td></tr><tr><td>AI — Embeddings</td><td>HuggingFace</td><td>30 req/min</td><td>Need dedicated EP</td></tr><tr><td>AI — Offline</td><td>Ollama</td><td>Unlimited (local)</td><td>N/A</td></tr><tr><td>Monitoring</td><td>BetterUptime</td><td>3 monitors</td><td>&gt; 3 monitors</td></tr><tr><td>Errors</td><td>Sentry</td><td>5k errors/mo</td><td>&gt; 5k errors</td></tr><tr><td>Mobile builds</td><td>Expo EAS</td><td>30 builds/mo</td><td>Active dev</td></tr></tbody></table>

<table><tbody><tr><td><strong>18.1</strong></td><td><strong>Vercel Configuration</strong><br><em>vercel.json — cron jobs, function timeouts, edge config</em></td></tr></tbody></table>

<table><tbody><tr><td>{<br>"crons": [<br>{ "path": "/api/cron/daily-brief", "schedule": "0 7 * * *" },<br>{ "path": "/api/cron/monthly-report", "schedule": "0 8 1 * *" },<br>{ "path": "/api/cron/expire-trials", "schedule": "0 0 * * *" },<br>{ "path": "/api/cron/spaced-rep-check", "schedule": "0 6 * * *" }<br>],<br>"functions": {<br>"app/api/lectures/upload/route.ts": { "maxDuration": 60 },<br>"app/api/past-papers/grade/route.ts": { "maxDuration": 60 },<br>"app/api/export/route.ts": { "maxDuration": 60 },<br>"app/api/cron/**": { "maxDuration": 300 }<br>}<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>18.2</strong></td><td><strong>Supabase Setup</strong><br><em>Database, Auth, Storage, Realtime — all in one free project</em></td></tr></tbody></table>

1.  Create project at supabase.com — choose region closest to Ghana (eu-west-2)
2.  Enable pgvector extension: Database → Extensions → search 'vector' → enable
3.  Run all CREATE TABLE scripts from Doc 1 / Master Doc in the SQL Editor
4.  Create all RLS policies per table — users own their rows
5.  Create ivfflat vector indexes on slides, flashcards, textbook\_chunks
6.  Set up Supabase Auth: enable Email + Google provider
7.  Copy SUPABASE\_URL and SUPABASE\_ANON\_KEY to Vercel environment variables

<table><tbody><tr><td>-- Run in Supabase SQL Editor to enable vector search<br>CREATE EXTENSION IF NOT EXISTS vector;<br>-- Critical performance indexes<br>CREATE INDEX idx_slides_lecture ON slides(lecture_id, slide_number);<br>CREATE INDEX idx_flashcards_review ON flashcards(lecture_id, next_review);<br>CREATE INDEX idx_courses_user ON courses(user_id, created_at DESC);<br>CREATE INDEX ON slides USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);<br>CREATE INDEX ON flashcards USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);<br>CREATE INDEX ON textbook_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);</td></tr></tbody></table>

<table><tbody><tr><td><strong>18.3</strong></td><td><strong>Python Converter Microservice</strong><br><em>Dockerfile — deploy to Render free tier</em></td></tr></tbody></table>

<table><tbody><tr><td>FROM python:3.11-slim<br>RUN apt-get update &amp;&amp; apt-get install -y \<br>libreoffice poppler-utils tesseract-ocr tesseract-ocr-eng \<br>&amp;&amp; rm -rf /var/lib/apt/lists/*<br>WORKDIR /app<br>COPY requirements.txt .<br>RUN pip install --no-cache-dir -r requirements.txt<br>COPY main.py .<br>EXPOSE 8000<br>CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]<br># requirements.txt<br># fastapi==0.111.0<br># uvicorn==0.30.0<br># python-pptx==0.6.23<br># pdf2image==1.17.0<br># Pillow==10.3.0<br># cloudinary==1.40.0<br># python-multipart==0.0.9<br># pytesseract==0.3.10</td></tr></tbody></table>

<table><tbody><tr><td><strong>18.4</strong></td><td><strong>CI/CD Pipeline</strong><br><em>GitHub → Vercel auto-deploy — zero configuration required</em></td></tr></tbody></table>

*   Connect GitHub repo to Vercel — install Vercel GitHub app
*   Push to main branch → Vercel production deploy (automatic)
*   Push to any other branch → Vercel preview deploy with unique URL
*   GitHub Actions (optional): run tsc, eslint, vitest on every PR

<table><tbody><tr><td># .github/workflows/ci.yml<br>name: CI<br>on: [pull_request]<br>jobs:<br>check:<br>runs-on: ubuntu-latest<br>steps:<br>- uses: actions/checkout@v4<br>- uses: actions/setup-node@v4<br>with: { node-version: '20' }<br>- run: npm ci<br>- run: npm run type-check # tsc --noEmit<br>- run: npm run lint # eslint<br>- run: npm run test # vitest run</td></tr></tbody></table>

<table><tbody><tr><td><strong>18.5</strong></td><td><strong>Scalability Cost Tiers</strong><br><em>Exact thresholds and costs for each growth stage</em></td></tr></tbody></table>

<table><tbody><tr><td><strong>Stage</strong></td><td><strong>Users</strong></td><td><strong>Monthly Cost</strong></td><td><strong>Services to Upgrade</strong></td></tr><tr><td>Launch</td><td>0–500</td><td><strong>$0</strong></td><td>Everything on free tier — no changes needed</td></tr><tr><td>Early Growth</td><td>500–2k</td><td>~$45</td><td>Supabase Pro ($25) + Render Starter ($7) + possibly Vercel Pro ($20)</td></tr><tr><td>Growth</td><td>2k–10k</td><td>~$150</td><td>Cloudinary Plus ($89) + Resend paid ($20) + Upstash PAYG (~$5)</td></tr><tr><td>Scale</td><td>10k–50k</td><td>~$400</td><td>Gemini paid + Groq paid + HuggingFace dedicated endpoint ($70)</td></tr><tr><td>Enterprise</td><td>50k+</td><td>Custom</td><td>Custom Supabase, dedicated infra, CDN contracts, SLA support</td></tr></tbody></table>

<table><tbody><tr><td><strong>18.6</strong></td><td><strong>Local Development Setup</strong><br><em>Everything needed to run the full stack locally</em></td></tr></tbody></table>

<table><tbody><tr><td># 1. Node.js 20+ — nodejs.org<br># 2. Python 3.11+ — python.org<br># 3. Docker Desktop (for local Supabase + converter) — docker.com<br># 4. Ollama for local AI — ollama.ai<br># Clone and install<br>git clone https://github.com/your-org/unistudy-ai<br>cd unistudy-ai &amp;&amp; npm install<br># Start local Supabase<br>npx supabase start<br># → Supabase running at http://localhost:54321<br># Start local converter (Docker)<br>cd converter &amp;&amp; docker build -t converter . &amp;&amp; docker run -p 8000:8000 converter<br># Pull local AI models<br>ollama pull llama3<br>ollama serve # → http://localhost:11434<br># Pull env vars from Vercel<br>npx vercel env pull .env.local<br># Start Next.js dev server<br>npm run dev # → http://localhost:3000<br># Expose localhost for Paystack webhooks<br>npx ngrok http 3000<br># → Copy the ngrok URL to Paystack webhook settings</td></tr></tbody></table>

UniStudy AI · Doc 18: Infrastructure & Deployment · All Phases
# UniStudy AI — Collegiate Academic Mastery Platform

UniStudy AI is an enterprise-grade university learning platform designed for higher education scholars (specifically tailored for the University of Professional Studies, Accra — UPSA). It bridges lecture slides, university past examination papers, personalized AI tutoring, and academic productivity tools into a unified, high-performance study workstation.

---

## 1. System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Client (Browser)       │
                                  │  Next.js 16 + React 19 + PWA│
                                  └──────────────┬──────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
        ┌───────────────────────────────┐                 ┌───────────────────────────────┐
        │       Next.js App Router      │                 │      Express API Backend      │
        │  Server Actions & API Routes  │                 │    Port 8005 (Microservices)  │
        └───────────────┬───────────────┘                 └───────────────┬───────────────┘
                        │                                                 │
                        └────────────────────────┬────────────────────────┘
                                                 │
         ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
         ▼                   ▼                   ▼                   ▼                   ▼
┌──────────────────┐ ┌───────────────┐   ┌─────────────────┐ ┌───────────────┐   ┌───────────────────┐
│ Supabase Cloud   │ │ Cloudinary    │   │ Gemini Vision   │ │ Groq LPU Cloud│   │ KLOK Search API   │
│ Postgres + Auth  │ │ CDN Storage   │   │ Flash 2.0 / 2.5 │ │ Qwen / Llama3 │   │ University Exam   │
│ RLS Policies     │ │ PDF & Images  │   │ OCR & Multimodal│ │ Fast Synthesis│   │ Question Archive  │
└──────────────────┘ └───────────────┘   └─────────────────┘ └───────────────┘   └───────────────────┘
```

### Core Technologies
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS, Motion, Lucide React, KaTeX (MixTeX).
- **Backend:** Node.js Express microservice suite + native Next.js Server Actions & API Route handlers.
- **Data & Auth:** Supabase PostgreSQL with strict Row Level Security (RLS) on all user data, GoTrue auth.
- **Local-First Speed:** Dexie.js (IndexedDB) + in-memory RAM caching for 0ms navigation and offline deck inspection.
- **AI Infrastructure:** Multi-tier failover routing across Google Gemini (multimodal vision + text), Groq (high-speed LPU inference), and OpenRouter.

---

## 2. Core Functional Modules

### 📚 Lecture Workstation & Slide Viewer
- **Presentation Canvas:** Dominant presentation view with thumbnail strip, keyboard navigation (`J`/`K`/`ArrowKeys`), and fullscreen focus workstation.
- **Multimodal AI Slide Explanation:** Grounded slide-by-slide pedagogical tutoring. When slides contain code, diagrams, or sparse text (e.g. Slide 12), the engine automatically routes to **Gemini Multimodal Vision** to inspect the real slide screenshot rather than hallucinating over empty extracted text.
- **Explanation Styles:** Standard university depth, Storyteller analogy mode, and Conceptual deep-dive mode.
- **Integrated Slide Chat:** Instant conversational inquiry grounded in the active slide's visual context.

### 📝 Past Examination Question Bank & Central Repository
- **Fast DB-First Central Bank:** Ultra-fast (<50ms) past questions delivery querying indexed database records rather than making blocking external HTTP calls during student requests.
- **Auto-Linking on Course Creation:** When a student creates a course (e.g. `BCPC 201`), central bank papers matching `normalized_course_code` are automatically associated and immediately surfaced on their dashboard.
- **Decoupled Background Sync Worker:** `/api/cron/sync-past-papers` background worker periodically checks external university endpoints (KLOK) for new past papers, downloads PDFs, caches to Cloudinary, extracts questions via Gemini, and persists to the bank without blocking student browsing.
- **Instant 0ms Local-First Cache:** Client-side in-memory and session storage renders past examination papers in 0ms on page mount with smooth background revalidation.
- **Native Direct Upload:** PDF past papers uploaded via web UI are processed natively in Next.js, stored in Cloudinary, and parsed into structured question records via Gemini Multimodal OCR.
- **Interactive Practice & Mock Exams:** Full simulated timed examination attempts with instant AI batch grading and rubrics.

### 🛠️ Academic Productivity Suite
- **Math & Graph Studio:** Mathematical syntax parsing and graphing calculator (Math.js + Plotly).
- **Notes Scanner:** Handwritten notes and whiteboard photo OCR converting math and STEM formulas into standard KaTeX notation.
- **Timetable & Exam Radar:** Real-time countdowns for mid-semester and end-semester examinations.
- **Wellbeing & Exam Anxiety Check-ins:** Mental fatigue tracking and study break reminders.

---

## 3. Brand & Design System

The application strictly enforces the official **UPSA Brand Identity Contract**:
- **Primary / Authority:** UPSA Deep Navy (`#00004E`)
- **Accent / Highlight:** UPSA Gold (`#D89A06`)
- **Surface / Contrast:** Clean Off-White (`#FFFFFF`) and Slate Dark Surfaces (`#0B0F19`)
- **Human-Craft Standards:** Zero "pill soup" badges, zero generic AI purple/pink gradients, zero AI buzzwords. Gold is applied with restraint to active tabs, focus rings, and high-priority badges.

---

## 4. Getting Started Locally

### Prerequisites
- Node.js 18.x or 20.x
- pnpm or npm
- Active Supabase project with migration schema applied

### 1. Clone the repository
```bash
git clone https://github.com/akabrrown/Unistudy.git
cd Unistudy
```

### 2. Configure Environment Variables

Create `frontend/.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Cloudinary Storage
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

# AI Providers
GEMINI_API_KEY=<google-gemini-key>
GROQ_API_KEY=<groq-api-key>
OPENROUTER_API_KEY=<openrouter-key>

# External Gateways
KLOK_BASE_URL=https://kloksearch.vercel.app
KLOK_API_KEY=<klok-key>
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8005
```

Create `backend/.env`:
```env
PORT=8005
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GEMINI_API_KEY=<google-gemini-key>
GROQ_API_KEY=<groq-api-key>
```

### 3. Run the Development Environment

Run the frontend:
```bash
cd frontend
npm install
npm run dev
```

Run the backend microservices (optional, for background tasks):
```bash
cd backend
npm install
npm run dev
```

The web application will be live at `http://localhost:3000`.

---

## 5. Recent Changelog & Key System Updates

- **Slide Progress & Resume Prompt:** Automatically remembers a student's reading position in any lecture slide deck. When returning to the deck from the dashboard or another page, a collegiate prompt allows resuming at their exact slide or starting fresh from Slide 1.
- **Progressive Web App (PWA) & Offline Shell:** Added Web App Manifest (`manifest.ts`), production Service Worker (`sw.js`), collegiate offline fallback screen (`/offline`), and `PwaManager` install/connectivity listener with Dexie IndexedDB local-first persistence.
- **Native Past Paper Uploads:** Past paper PDF uploads now run through a dedicated native Next.js API route (`/api/past-papers/upload`) featuring Gemini Multimodal PDF parsing and Cloudinary storage.
- **Removed Moodle Portal Sync:** Eliminated third-party Moodle credential scrapers (`MoodleSyncModal` and crawler background tasks) in favor of the resilient native past paper endpoint and KLOK repository search.
- **Multimodal AI Slide Vision:** Added substantive text threshold logic in `explain.ts` and `ai.ts`. When a slide contains graphical code or sparse text (e.g. only `"Slide 12"`), text-only models are bypassed in favor of Gemini Vision directly inspecting the slide image.
- **Scholar Handle Dashboard Greeting:** Dashboard header dynamically greets scholars using their personalized `@username` handle.
- **Course Workspace Hardening:** Removed references to non-existent database columns (`courses.department_id`, `courses.academic_year`, `lectures.cover_image_url`) to guarantee zero `400 Bad Request` queries across the application.

---

## 6. Architecture & Quality Invariants

- **TypeScript Strict:** All pull requests and commits must pass `npx tsc --noEmit` across both `frontend` and `backend` with zero errors.
- **Server-Side Authorization:** Every mutation and data query checks ownership against `auth.uid() = user_id` through database RLS policies.
- **Zero AI Tells:** Code and UI avoid automated narration, filler prose, or generic placeholders.

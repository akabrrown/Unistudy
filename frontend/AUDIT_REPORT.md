# Forensic UI/UX Audit: Human Craft vs. AI Scaffolding Analysis

**Platform Composite Score:** **79.0% Human UI Craft** vs. **21.0% AI Scaffolding**

## Cluster Overview

| Surface Cluster | Routes | Human Craft % | AI Tells % | Primary Vulnerability |
|---|---|---|---|---|
| Student Dashboard & Tools | 34 | **80.8%** | 19.2% | Polished |
| Auth & Onboarding | 6 | **73.7%** | 26.3% | Missing edge states |
| Admin Command Center | 10 | **79.5%** | 20.5% | Generic gradient / cards |
| Public & Marketing | 10 | **75.5%** | 24.5% | Generic gradient / cards |

---

## Student Dashboard & Tools (34 routes — 80.8% Human / 19.2% AI)

| Route | Human % | AI % | Identified AI Tells & Anti-Patterns | Key Human Craft Markers |
|---|---|---|---|---|
| `dashboard/lectures/[lectureId]/page.tsx` | **33%** | 67% | • Missing dedicated loading/skeleton state<br>• Silent or basic error banner | ✓ Authentic UPSA Navy (#00004E) & Gold tokens |
| `dashboard/courses/[courseId]/past-papers/page.tsx` | **66%** | 34% | • Boilerplate 3-column card grid<br>• Missing dedicated loading/skeleton state | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled empty-state zero data |
| `dashboard/past-papers/[id]/page.tsx` | **66%** | 34% | • Boilerplate 3-column card grid<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `dashboard/calculator/page.tsx` | **71%** | 29% | • Missing dedicated loading/skeleton state<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Explicit error feedback / toast |
| `dashboard/settings/profile/page.tsx` | **71%** | 29% | • Boilerplate 3-column card grid<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/youtube/watch/[videoId]/page.tsx` | **71%** | 29% | • Missing dedicated loading/skeleton state<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/analytics/page.tsx` | **75%** | 25% | • Generic AI marketing buzzwords<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/courses/[courseId]/discussion/[threadId]/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/courses/[courseId]/discussion/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/courses/[courseId]/drills/[drillId]/page.tsx` | **75%** | 25% | • Missing dedicated loading/skeleton state | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled empty-state zero data |
| `dashboard/courses/[courseId]/flashcards/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/courses/[courseId]/lectures/[lectureId]/poster/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/courses/[courseId]/quiz/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/past-papers/[id]/attempt/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/past-papers/drills/[id]/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/past-papers/results/[attemptId]/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `dashboard/settings/accessibility/page.tsx` | **75%** | 25% | • Generic AI marketing buzzwords<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/courses/[courseId]/lectures/[lectureId]/cheat-sheet/page.tsx` | **80%** | 20% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Handled loading / async state |
| `dashboard/scanner/page.tsx` | **83%** | 17% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Handled loading / async state |
| `dashboard/search/page.tsx` | **83%** | 17% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `dashboard/settings/billing/page.tsx` | **83%** | 17% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/essay-grader/page.tsx` | **85%** | 15% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/past-papers/page.tsx` | **85%** | 15% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/youtube/pinned/page.tsx` | **85%** | 15% | • Missing dedicated loading/skeleton state | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/page.tsx` | **87%** | 13% | • Boilerplate 3-column card grid | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/calendar/page.tsx` | **96%** | 4% | None (Clean Human UI) | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/chat/page.tsx` | **96%** | 4% | None (Clean Human UI) | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Handled loading / async state |
| `dashboard/courses/[courseId]/lectures/[lectureId]/page.tsx` | **96%** | 4% | None (Clean Human UI) | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Handled loading / async state |
| `dashboard/courses/[courseId]/past-papers/[paperId]/attempt/page.tsx` | **96%** | 4% | None (Clean Human UI) | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `dashboard/courses/page.tsx` | **96%** | 4% | None (Clean Human UI) | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/lectures/page.tsx` | **96%** | 4% | None (Clean Human UI) | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `dashboard/youtube/page.tsx` | **96%** | 4% | None (Clean Human UI) | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `dashboard/courses/[courseId]/page.tsx` | **100%** | 0% | • N/A (Server-side redirect route) | ✓ Server-side route orchestration |
| `dashboard/focus/page.tsx` | **100%** | 0% | • N/A (Server-side redirect route) | ✓ Server-side route orchestration |


## Auth & Onboarding (6 routes — 73.7% Human / 26.3% AI)

| Route | Human % | AI % | Identified AI Tells & Anti-Patterns | Key Human Craft Markers |
|---|---|---|---|---|
| `(auth)/signup/page.tsx` | **60%** | 40% | • Missing dedicated loading/skeleton state<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Explicit error feedback / toast<br>✓ Hardware-accelerated Framer Motion transitions |
| `(auth)/login/page.tsx` | **66%** | 34% | • Missing dedicated loading/skeleton state | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Explicit error feedback / toast |
| `(auth)/onboarding/page.tsx` | **66%** | 34% | • Missing dedicated loading/skeleton state<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Explicit error feedback / toast |
| `(auth)/forgot-password/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `(auth)/verify/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `(auth)/profile/page.tsx` | **100%** | 0% | • N/A (Server-side redirect route) | ✓ Server-side route orchestration |


## Admin Command Center (10 routes — 79.5% Human / 20.5% AI)

| Route | Human % | AI % | Identified AI Tells & Anti-Patterns | Key Human Craft Markers |
|---|---|---|---|---|
| `admin/audit/page.tsx` | **60%** | 40% | • Missing dedicated loading/skeleton state<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Explicit error feedback / toast |
| `admin/referrals/page.tsx` | **66%** | 34% | • Missing dedicated loading/skeleton state<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/ai-infrastructure/page.tsx` | **75%** | 25% | • Boilerplate 3-column card grid<br>• Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/page.tsx` | **80%** | 20% | • Generic purple/indigo/pink AI gradient<br>• Boilerplate 3-column card grid | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/institution-counts/page.tsx` | **83%** | 17% | • Missing dedicated loading/skeleton state | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/announcements/page.tsx` | **85%** | 15% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/settings/page.tsx` | **85%** | 15% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/content/page.tsx` | **87%** | 13% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/subscriptions/page.tsx` | **87%** | 13% | • Boilerplate 3-column card grid | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `admin/users/page.tsx` | **87%** | 13% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |


## Public & Marketing (10 routes — 75.5% Human / 24.5% AI)

| Route | Human % | AI % | Identified AI Tells & Anti-Patterns | Key Human Craft Markers |
|---|---|---|---|---|
| `brand/page.tsx` | **66%** | 34% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state |
| `contact/page.tsx` | **66%** | 34% | • Missing dedicated loading/skeleton state | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Explicit error feedback / toast |
| `cookies/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `how-it-works/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `pricing/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Handled loading / async state<br>✓ Explicit error feedback / toast |
| `privacy/page.tsx` | **75%** | 25% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `academic-integrity/page.tsx` | **80%** | 20% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `page.tsx` | **80%** | 20% | • Generic purple/indigo/pink AI gradient<br>• Boilerplate 3-column card grid | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |
| `terms/page.tsx` | **80%** | 20% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Domain-deep UPSA academic terminology<br>✓ Handled loading / async state |
| `features/page.tsx` | **83%** | 17% | • Missing explicit empty-state view | ✓ Authentic UPSA Navy (#00004E) & Gold tokens<br>✓ Complex asymmetric / tabbed ergonomic layout<br>✓ Domain-deep UPSA academic terminology |


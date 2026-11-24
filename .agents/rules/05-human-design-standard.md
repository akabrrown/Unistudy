---
trigger: always_on
---
# RULE 05: HUMAN-CRAFT DESIGN STANDARD (Linear, Notion, NotebookLM, Stripe)

## 1. Prime Aesthetic Mandate
Every interface, page, dialog, and component built in UniStudy must pass the **Senior Human Skeptic Test**:
> *If a senior product designer from Linear, Notion, Apple, or Stripe reviewed this screen, would they suspect AI involvement? Zero AI design tells may survive.*

---

## 2. The 6 Forbidden AI Anti-Patterns

1. **NO "PILL SOUP":**
   - **BANNED:** Wrapping every word, status, course code, and date in colored badge pills (`rounded-full px-2 py-0.5 border text-[10px]`).
   - **ENFORCED:** Plain typography, size/weight hierarchy, and muted text (`text-xs text-muted-foreground font-mono`). Badges are strictly reserved for urgent binary states (e.g., `● Overdue`, `● Failed`, `Pro`).

2. **NO SELF-NARRATING PROSE:**
   - **BANNED:** Subtitles explaining what the feature does or describing internal state (e.g., *"Personalized Tutor Tony · Academic & Scholarly · Slide Grounding & Mentoring"*, *"Active Grounding: General Academic Chat"*).
   - **ENFORCED:** The UI does not explain itself. Let layout, typography, and clear single-word labels carry the meaning.

3. **NO NESTED CARD-IN-CARD BOXES:**
   - **BANNED:** Boxing every section in `border border-border rounded-2xl p-4 bg-card` inside other cards.
   - **ENFORCED:** Open canvas with 24px–48px whitespace rhythm and subtle 1px hair-lines (`border-border/40`).

4. **NO PROMPT JARGON:**
   - **BANNED:** Silicon Valley AI jargon (*"Reasoning Engine"*, *"Dual-Pocket Wallet"*, *"Grounding Active"*, *"Calibrate Tutor"*).
   - **ENFORCED:** Student-first language (*"Model"*, *"Passes & Credits"*, *"Attached Slides"*, *"Tutor Style"*).

5. **RESTRAINED UPSA GOLD:**
   - **BANNED:** Gold borders and yellow backgrounds (`border-[#D89A06]/40 bg-[#FEF8E7]`) sprayed across every button and container.
   - **ENFORCED:** Gold is rare jewelry. Used only for active tabs (2px border), focus rings, high-priority alert badges, and subtle highlight stars.

6. **PROGRESSIVE DISCLOSURE OVER TOOLBAR CRAMMING:**
   - **BANNED:** Stacking 6–8 wide utility text buttons in the top navigation bar.
   - **ENFORCED:** 95% viewport focus on the student's task. Utility tools live in quiet icon buttons or a clean `···` dropdown.

---

## 3. Benchmark Mapping Reference

| Component / Workflow | Benchmark System | Key Interaction Habits |
|---|---|---|
| AI Study Tutor (`/dashboard/chat`) | **NotebookLM + Claude** | Whisper 48px top bar, collapsible source drawer, superscript citations `[Slide N]`, model selector beside send button. |
| Slide Viewer (`/dashboard/courses/...`) | **Readwise + Craft.do** | Dominant 70% presentation canvas, breadcrumb navigation, clean full-height note editor, keyboard navigation (J/K). |
| Student Dashboard (`/dashboard`) | **Linear** | Bento grid with hair-line dividers, muted typography, real student timetable widgets, zero wireframe boxes. |
| Past Papers Engine (`/dashboard/past-papers`) | **Brilliant.org + UWorld** | High-density tabular index, official university exam paper layout, clean percentage rubric breakdown. |
| Admin Control (`/admin`) | **Linear Admin + Stripe** | High-density tables, sparklines, clean status indicators, copyable IDs. |
| Public Landing (`/`) | **Stripe Press + Harvard OCW** | Bold serif academic headlines, real interactive previews, generous breathing room. |

---

## 4. Verification Check Before Completion
Before any frontend work is merged:
- [ ] Are all pill badges justified by an urgent status?
- [ ] Is there zero self-narrating prose?
- [ ] Does the page breathe with at least 24px vertical spacing?
- [ ] Is the primary task visually dominant (taking >= 70% of the viewport)?
- [ ] Does `npx tsc --noEmit` pass with 0 errors?

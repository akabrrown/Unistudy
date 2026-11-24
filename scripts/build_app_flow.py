"""
Generates UniStudy_App_Flow.docx - Complete App Flow & User Journeys
"""
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from generate_spec_suite import (
    create_base_document, add_cover_page, add_heading_1,
    add_heading_2, add_heading_3, add_callout, add_styled_table
)

def build_app_flow():
    doc = create_base_document()
    add_cover_page(
        doc,
        title="UniStudy App Flow & User Journey Specification",
        subtitle="Complete Information Architecture, Screen-by-Screen Navigation, and Decision Trees",
        doc_type="Application Flow Specification (App Flow)",
        version="1.0"
    )

    # 1. Information Architecture Overview
    add_heading_1(doc, "1. Information Architecture & Navigation Hierarchy")
    doc.add_paragraph(
        "UniStudy's information architecture is structured around five core navigational domains, "
        "designed to provide 0ms access to critical academic workflows with zero cognitive friction:"
    )
    doc.add_paragraph("1. Public Marketing & Institutional Landing (/): Value propositions, feature overviews, curriculum alignment, pricing bundles, and authentication triggers.")
    doc.add_paragraph("2. Student Academic Command Center (/dashboard): Central Bento Grid surfacing current semester courses, exam focus packs, past questions, and daily inspiration.")
    doc.add_paragraph("3. Course & Lecture Workspaces (/dashboard/courses/[id]): Deep lecture decks, split-screen slide viewers, slide notes, flashcard generators, and discussion boards.")
    doc.add_paragraph("4. Interactive AI Study Tutor (/dashboard/chat): Grounded conversational tutor, dual-pocket wallet, model reasoning engine selector, and cross-session memory.")
    doc.add_paragraph("5. Past Question & Examination Engine (/dashboard/past-papers): Full-text course search, timed examination drills, instant AI grading, and answer key explanations.")
    doc.add_paragraph("6. Administrative Portal (/admin): Cohort analytics, AI quota management, provider latency matrix, user management, and CMS editorial control.")

    # 2. Detailed User Journeys
    add_heading_1(doc, "2. End-to-End User Journeys")

    add_heading_2(doc, "2.1 Journey 1: First-Time Student Onboarding & Free Pass Allocation")
    doc.add_paragraph("• Step 1: Student visits /signup or /login via institutional email or personal credentials.")
    doc.add_paragraph("• Step 2: System validates password against HaveIBeenPwned API and creates Supabase auth record.")
    doc.add_paragraph("• Step 3: Student completes Onboarding (/onboarding): Selects Institution (UPSA), Programme of Study (e.g. BSc Accounting), and Year of Study (Level 100-400).")
    doc.add_paragraph("• Step 4: Automatic Welcome Bonus: Security-definer trigger seeds the student's credit_wallets with 8 Renewable Free Passes and 20 Welcome Paid Credits.")
    doc.add_paragraph("• Step 5: Student is routed directly to /dashboard with an empty-state prompt to enroll in their first course.")

    add_heading_2(doc, "2.2 Journey 2: Lecture Slide Upload, Cloudinary CDN Processing & Slide Viewing")
    doc.add_paragraph("• Step 1: From course details (/dashboard/courses/[id]), student clicks '+ Add Lecture'.")
    doc.add_paragraph("• Step 2: Student inputs Week Number (e.g. Week 3) and Lecture Title, then uploads PDF or PPTX slide deck.")
    doc.add_paragraph("• Step 3: Server uploads raw document to Supabase Storage and triggers asynchronous Cloudinary webhook.")
    doc.add_paragraph("• Step 4: Cloudinary renders individual high-density slide images (WebP) and stores slide records in database.")
    doc.add_paragraph("• Step 5: Student opens Slide Viewer (/dashboard/courses/[id]/lectures/[lectureId]). Left pane displays interactive slides; right pane offers markdown note-taking and slide-level AI chat.")

    add_heading_2(doc, "2.3 Journey 3: Grounded AI Tutor Session & Engine Selection")
    doc.add_paragraph("• Step 1: Student navigates to /dashboard/chat. Chat drawer displays previous sessions synced via IndexedDB.")
    doc.add_paragraph("• Step 2: Student chooses Grounding: Either selects 'Attach Deck' to ground conversation in a specific lecture (e.g. BCPC 208 / Week 2) or stays in 'General Academic Mode'.")
    doc.add_paragraph("• Step 3: Student optionally selects AI Reasoning Engine at the prompt bar: Smart Auto (Default), Deep Reasoner (Complex proofs), or Speed Flash (Instant summaries).")
    doc.add_paragraph("• Step 4: Student submits query via text, multi-file attachment (up to 5 files), or voice dictation.")
    doc.add_paragraph("• Step 5: Server deducts 1 Free Pass (or 1 Paid Credit if passes exhausted), flushes SSE stream headers in <20ms, and streams chunked tokens.")
    doc.add_paragraph("• Step 6: Response renders formatted KaTeX math, exact [Slide N] clickable links, follow-up suggestion chips, and per-answer thumbs up/down feedback.")

    add_heading_2(doc, "2.4 Journey 4: Past Paper Search, Practice Drill & Automated Grading")
    doc.add_paragraph("• Step 1: Student enters Past Papers browser (/dashboard/past-papers) and filters by course code (e.g. BCPC 208).")
    doc.add_paragraph("• Step 2: System searches local past_papers and queries external KLOK gateway (served from 10-minute in-memory cache).")
    doc.add_paragraph("• Step 3: Student selects an exam paper (e.g. End-Semester 2024) and launches Timed Attempt (/dashboard/past-papers/[id]/attempt).")
    doc.add_paragraph("• Step 4: Student types answers to Section A and Section B under countdown timer.")
    doc.add_paragraph("• Step 5: Upon submit, AI Evaluator grades student answers against official marking schemes, generating a percentage score, strengths, weaknesses, and model answers.")

    # 3. Decision Trees & State Machines
    add_heading_1(doc, "3. Decision Trees & Core State Machines")

    add_heading_2(doc, "3.1 Credit & Free Pass Deduction State Machine")
    headers_credit = ["Current Wallet State", "Action Triggered", "Deduction Path", "User UI Feedback"]
    data_credit = [
        ["Free Passes > 0", "AI Chat / Essay Grade", "Decrement free_passes by 1; record timestamp.", "⚡ 'X/8 Free' updates live in top wallet pill."],
        ["Free Passes = 0, Paid Credits > 0", "AI Chat / Essay Grade", "Decrement paid_credits by 1.", "🪙 'X Paid' updates; toast confirms paid credit used."],
        ["Free Passes = 0, Paid Credits = 0", "AI Chat / Essay Grade", "Block mutation; route to Paystack checkout.", "Dialog displays: 'Free pass refills in Xh Ym' + Top-up button."],
        ["Free Passes < 8, Elapsed Time >= 6h", "Cron trigger / Login", "Reset free_passes = 8; update refilled_at.", "Toast notification: 'Your 8 Free Passes have been refilled!'"]
    ]
    add_styled_table(doc, headers_credit, data_credit, [1.6, 1.6, 1.8, 1.5])

    add_heading_2(doc, "3.2 Online vs. Offline Sync Queue State Machine")
    doc.add_paragraph(
        "When the browser detects network interruption (navigator.onLine === false), the platform transitions to Offline Mode: "
        "Read requests are served synchronously from Dexie.js IndexedDB in <2ms. Write mutations (taking notes, rating flashcards, creating chat messages) "
        "are enqueued into Dexie's sync_queue. Upon network reconnection ('online' event listener), the queue auto-flushes in chronological order, "
        "updating Supabase in the background with zero user intervention."
    )

    # 4. Navigation Route Directory (100 Routes)
    add_heading_1(doc, "4. Screen-by-Screen Navigation Matrix (Summary of Key Routes)")
    headers_nav = ["Route URL Pattern", "Access Guard", "Primary Function", "Key Components & Modals"]
    data_nav = [
        ["/", "Public", "Marketing landing page, curriculum overview, pricing", "HeroSection, BrandFeatureShowcase, CTA"],
        ["/login", "Public (Guest)", "Authentication login with HaveIBeenPwned checks", "AuthForm, PasswordResetLink"],
        ["/signup", "Public (Guest)", "Account registration with institution picker", "SignupWizard, InstitutionSelect"],
        ["/dashboard", "Authenticated (Student)", "Academic command center & Bento grid", "BentoGrid, CourseCards, QuoteWidget"],
        ["/dashboard/courses", "Authenticated (Student)", "All enrolled courses grid & creation", "CourseGrid, AddCourseDialog"],
        ["/dashboard/courses/[id]", "Authenticated (Student)", "Course details, lectures list, syllabus", "LectureList, AddLectureModal, SyllabusView"],
        ["/dashboard/courses/[id]/lectures/[lid]", "Authenticated (Student)", "Split-screen slide viewer & notes", "SlideViewer, NoteEditor, SlideChat"],
        ["/dashboard/chat", "Authenticated (Student)", "AI Study Tutor, model selector, memory", "ChatDrawer, StreamAsk, ContextMeter, ModelMenu"],
        ["/dashboard/past-papers", "Authenticated (Student)", "Past questions browser & search", "PaperSearch, CourseFilter, PaperCard"],
        ["/dashboard/past-papers/[id]/attempt", "Authenticated (Student)", "Timed past question interactive drill", "DrillTimer, QuestionSheet, SubmitDialog"],
        ["/dashboard/essay-grader", "Authenticated (Student)", "Academic essay rubric evaluator", "EssayInput, RubricFeedback, ModelRewriteView"],
        ["/dashboard/settings/billing", "Authenticated (Student)", "Wallet balance, Paystack top-up, usage log", "CreditBundleGrid, PaystackModal, UsageTable"],
        ["/admin", "Admin Role Required", "Platform analytics, revenue, AI provider health", "AdminOverview, ProviderLatencyChart, AuditLog"]
    ]
    add_styled_table(doc, headers_nav, data_nav, [1.8, 1.4, 1.8, 1.5])

    output_path = os.path.abspath("docs/specifications/UniStudy_App_Flow.docx")
    doc.save(output_path)
    print(f"Generated: {output_path}")

if __name__ == "__main__":
    build_app_flow()

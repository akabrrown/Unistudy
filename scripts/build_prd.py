"""
Generates UniStudy_PRD.docx - Product Requirements Document
"""
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from generate_spec_suite import (
    create_base_document, add_cover_page, add_heading_1,
    add_heading_2, add_heading_3, add_callout, add_styled_table
)

def build_prd():
    doc = create_base_document()
    add_cover_page(
        doc,
        title="UniStudy Product Requirements Document",
        subtitle="Comprehensive Product Specification for the AI-Native Higher-Education Academic Platform",
        doc_type="Product Requirements Document (PRD)",
        version="1.0"
    )

    # 1. Executive Summary & Problem Framing
    add_heading_1(doc, "1. Executive Summary & Problem Framing")
    p = doc.add_paragraph(
        "Higher education in West Africa—specifically across collegiate institutions like the University of Professional Studies, "
        "Accra (UPSA) and neighboring universities—presents unique academic and infrastructure challenges. Undergraduate and post-graduate "
        "students are confronted with dense, unstructured lecture slide decks, fragmented past examination papers circulating as unindexed "
        "photocopies, and a lack of 24/7 personalized academic tutoring. Compounding these hurdles are high mobile data tariffs and intermittent "
        "campus Wi-Fi, which make heavy cloud-only platforms unusable during critical examination revision periods."
    )
    p = doc.add_paragraph(
        "UniStudy is an AI-native collegiate study companion engineered to bridge this gap. Grounded strictly in validated course syllabi, "
        "lecture decks, and official past questions, UniStudy delivers deterministic tutoring, spaced-repetition flashcards, automated essay evaluation, "
        "and interactive past paper drills. By pairing an instant 0ms local-first architecture (Dexie IndexedDB + RAM) with multi-model AI reasoning "
        "and a dual-pocket credit model (renewable 6-hour passes + permanent paid credits), UniStudy democratizes world-class academic support for every student."
    )

    add_callout(
        doc,
        "Core Value Proposition: Academic Grounding Over Generic Chat. Unlike generic chatbots (ChatGPT, Claude) that hallucinate non-existent case laws, "
        "fabricated accounting standards, or foreign formulas, UniStudy's AI Tutor is deterministically anchored in uploaded lecture slides and official "
        "Ghanaian university past papers, providing exact page-level citations for every academic claim.",
        title="PRODUCT INVARIANT: ZERO-HALLUCINATION ACADEMIC GROUNDING"
    )

    # 2. Target Personas
    add_heading_1(doc, "2. Target User Personas & Academic Journey")
    headers_persona = ["Persona Profile", "Academic Pain Points", "Key UniStudy Solution", "Success Metric"]
    data_persona = [
        [
            "Kwame (The Exam Crammer)\nLevel 200 Accounting / BBA\nHigh mobile data consciousness",
            "Overwhelmed 72h before exams; has 14 unread slide decks and scattered PDF past questions with no answer keys.",
            "Exam Focus Mode: Auto-matches lecturer emphasis to past papers; 1-click Flashcard generation; offline slide reading.",
            "Reduces pre-exam panic; achieves 80%+ pass rate on past question simulation."
        ],
        [
            "Akosua (The Honors Achiever)\nLevel 400 Law / Public Relations\nStrives for First Class GPA",
            "Needs deep essay critique, rigorous case law citations, and active recall testing across multi-semester courses.",
            "Honors Essay Grader with 100/100 rewrites; AI Tutor cross-session memory; LaTeX and complex legal citation formatting.",
            "Saves 10+ hours per week in essay outlining and citation verification."
        ],
        [
            "Kofi (The STEM & Quantitative Learner)\nLevel 100 IT / Business Informatics\nStruggles with Math & Code",
            "Stuck on mathematical proofs, quadratic graphing, and programming syntax with no teaching assistant available late at night.",
            "Universal Math & Graph Solver with CAS verification; code debugging sandbox; step-by-step KaTeX formula breakdown.",
            "Resolves quantitative assignment blockers in <2 minutes."
        ],
        [
            "Academic Administrator / Lecturer\nDepartmental Head / Course Coordinator",
            "No visibility into which slide topics confuse students; outdated course materials remain in circulation.",
            "Admin CMS & Analytics: Cohort topic confusion heatmap, slide engagement metrics, curriculum alignment audits.",
            "Identifies syllabus blind-spots prior to mid-semester examinations."
        ]
    ]
    add_styled_table(doc, headers_persona, data_persona, [1.5, 1.8, 1.8, 1.4])

    # 3. Product Scope & Functional Requirements
    add_heading_1(doc, "3. Functional Requirements & Feature Matrix")

    add_heading_2(doc, "3.1 Course & Lecture Slide Management")
    doc.add_paragraph(
        "Students can create custom courses aligned with their institution's semester curriculum (e.g. BCPC 208, PBUS 301). "
        "The system accepts PDF and PPTX slide uploads, auto-extracts high-resolution slide thumbnails via Cloudinary CDN, "
        "organizes content by lecture weeks (Week 1 through Week 14), and preserves OCR text for instant full-text search."
    )

    add_heading_2(doc, "3.2 Split-Screen Slide Viewer & Interactive Notes")
    doc.add_paragraph(
        "A collegiate-grade split-pane interface allowing students to view lecture slides on the left while taking rich-text notes or "
        "engaging in slide-specific AI conversations on the right. Features include single-click jump to specific slides, zoom controls, "
        "presentation mode, and markdown note exports."
    )

    add_heading_2(doc, "3.3 AI Study Tutor & Adaptive Reasoning Engine")
    doc.add_paragraph(
        "A conversational tutor powered by a multi-model reasoning gateway (Gemini 2.5/Flash, Claude 3.5 Sonnet, GPT-4o). Key features:"
    )
    doc.add_paragraph("• Grounded vs. General Mode: Seamless toggling between lecture-grounded context and global academic problem solving.")
    doc.add_paragraph("• Dynamic Engine Selector: Located ergonomically at the prompt input bar (Smart Auto, Deep Reasoner, Speed Flash).")
    doc.add_paragraph("• Cross-Session Tutor Memory: Remembers student learning style, weak subjects, and preferred tone (Scholarly vs. Casual).")
    doc.add_paragraph("• Real-Time Token Context Meter: Live visual progress bar monitoring prompt context ceiling (32k / 128k limit).")
    doc.add_paragraph("• Voice Dictation: Real-time speech-to-text audio input for hands-free study sessions.")
    doc.add_paragraph("• Multi-File Attachments: Up to 5 files or images simultaneously (5MB each) with instant thumbnail preview and OCR analysis.")
    doc.add_paragraph("• Transcript Export: 1-click export of full chat transcripts into formatted Markdown or printable PDF summaries.")

    add_heading_2(doc, "3.4 Past Questions & Examination Practice Engine")
    doc.add_paragraph(
        "Integrates with the KLOK examination database and local Supabase repositories. Automatically cleanses raw file paths, normalizes "
        "course codes (e.g. BCPC 208), deduplicates identical exam papers, and provides timed, scored test practice with AI model grading."
    )

    add_heading_2(doc, "3.5 Spaced Repetition Flashcards")
    doc.add_paragraph(
        "AI-assisted extraction of flashcard question-answer pairs directly from lecture slides or active chat responses. Supports Leitner "
        "spaced repetition box scheduling, flip animations, recall ratings (Again, Hard, Good, Easy), and deck mastery analytics."
    )

    add_heading_2(doc, "3.6 Essay Evaluator & Model Rewrites")
    doc.add_paragraph(
        "Critiques academic essays against university rubrics (Thesis clarity, evidence grounding, structure, grammatical precision). "
        "Generates multi-paragraph 100/100 model rewrites while running automated text-humanization to purge AI cliches and robotic phrasing."
    )

    add_heading_2(doc, "3.7 Universal Math & Coordinate Graph Solver")
    doc.add_paragraph(
        "Solves quadratic equations, differential calculus, definite integrals, matrices, and WASSCE/BECE coordinate geometry transformations. "
        "Integrates Computer Algebra Systems (mathjs / SymPy) for deterministic verification, eliminating mathematical hallucinations."
    )

    add_heading_2(doc, "3.8 Student Wellbeing & Study Mindset")
    doc.add_paragraph(
        "Integrated wellness tracking: daily motivational quotes from African and global thought leaders, study anxiety self-evaluations, "
        "and Pomodoro rest reminders to prevent academic burnout."
    )

    # 4. Non-Functional Requirements
    add_heading_1(doc, "4. Non-Functional Requirements (NFRs)")
    headers_nfr = ["Category", "Specification / Metric", "Architectural Strategy", "Verification Gate"]
    data_nfr = [
        [
            "Latency & Speed",
            "p95 API response < 350ms; AI stream chunk 0 < 100ms; Local navigation 0ms.",
            "Dexie.js IndexedDB Tier 1/2 local cache; Lookahead asset preloading; immediate SSE header flushing.",
            "APM telemetry monitoring and automated k6 performance load test."
        ],
        [
            "Reliability & Availability",
            "99.9% platform uptime; 100% resilient to third-party AI outages.",
            "3-state Hystrix circuit breaker (CLOSED -> OPEN -> HALF_OPEN); multi-model failover matrix.",
            "Chaos engineering injection testing on remote API timeouts."
        ],
        [
            "Security & Authorization",
            "Zero IDOR vulnerabilities; 100% Supabase Row-Level Security on user tables; HaveIBeenPwned password checks.",
            "Parameterized RPCs; strict foreign-key join existence checks; timing-safe Paystack signature verification.",
            "Automated SQL injection and RLS authorization test suite."
        ],
        [
            "Accessibility (a11y)",
            "WCAG 2.2 Level AA compliance; minimum 4.5:1 text contrast ratio; full keyboard navigation.",
            "Radix UI headless primitives; accessible ARIA labels; dual high-contrast themes (UPSA Navy & Gold).",
            "Lighthouse accessibility audit score >= 98%."
        ],
        [
            "Data & Quota Efficiency",
            "Free tier zero-cost execution; 90%+ edge caching on public GET endpoints.",
            "In-memory TTL cache (klokCache); client request deduplication; suppression of cache-busting timestamps.",
            "Zero unnecessary database egress verified via Supabase dashboard."
        ]
    ]
    add_styled_table(doc, headers_nfr, data_nfr, [1.4, 1.8, 1.8, 1.5])

    # 5. Success Metrics & KPIs
    add_heading_1(doc, "5. Success Metrics, KPIs & Release Gates")
    doc.add_paragraph("The commercial and academic viability of UniStudy is measured against five primary indicators:")
    doc.add_paragraph("1. Daily Active Engagement (DAU/MAU): Target > 45% during active semester weeks and > 75% during revision periods.")
    doc.add_paragraph("2. Question Practice Velocity: Average of >= 15 past paper questions attempted per active student weekly.")
    doc.add_paragraph("3. Flashcard Retention Rate: Long-term recall improvement of >= 35% after 21 days of spaced repetition.")
    doc.add_paragraph("4. Pass Rate Correlation: Measurable 0.5+ GPA improvement among students utilizing grounded tutoring.")
    doc.add_paragraph("5. AI Unit Economics: Gross margin >= 65% on paid credit bundles via aggressive zero-cost caching and prompt distillation.")

    output_path = os.path.abspath("docs/specifications/UniStudy_PRD.docx")
    doc.save(output_path)
    print(f"Generated: {output_path}")

if __name__ == "__main__":
    build_prd()

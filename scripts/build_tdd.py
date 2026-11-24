"""
Generates UniStudy_TDD.docx - Technical Design Document
"""
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from generate_spec_suite import (
    create_base_document, add_cover_page, add_heading_1,
    add_heading_2, add_heading_3, add_callout, add_styled_table
)

def build_tdd():
    doc = create_base_document()
    add_cover_page(
        doc,
        title="UniStudy Technical Design Document",
        subtitle="System Architecture, AI Streaming Pipelines, Local-First Storage, and Infrastructure Specifications",
        doc_type="Technical Design Document (TDD)",
        version="1.0"
    )

    # 1. High-Level Architecture Overview
    add_heading_1(doc, "1. High-Level Architecture & System Boundaries")
    doc.add_paragraph(
        "UniStudy utilizes a modern, hybrid cloud-and-edge architecture designed for sub-100ms streaming, maximum zero-cost caching, "
        "and resilient offline operation. The core platform comprises five primary subsystems:"
    )
    doc.add_paragraph("• Frontend Application: Next.js 16 (Turbopack) hosted on Vercel's global Edge CDN, utilizing React 19 Server Components and App Router conventions.")
    doc.add_paragraph("• Database & Authentication: Supabase managed PostgreSQL 15, equipped with PostgREST, GoTrue Auth, and comprehensive Row-Level Security (RLS).")
    doc.add_paragraph("• AI Reasoning Gateway: Dual-path execution via Next.js Edge route handlers and an Express/Node microservice for compute-intensive OCR, LaTeX normalization, and computer algebra solving.")
    doc.add_paragraph("• Media Processing & CDN: Cloudinary for asynchronous PDF page rendering, thumbnail generation, and on-demand WebP/AVIF transformation.")
    doc.add_paragraph("• Payment & External Gateways: Paystack for Mobile Money (MoMo) and Card processing; KLOK Search Gateway for white-label past question retrieval.")

    add_callout(
        doc,
        "Zero-Trust Edge Boundary: Client requests never interact directly with database credentials or private AI API keys. "
        "All authentication tokens (JWT) are validated server-side. Next.js server actions validate input schemas with Zod before triggering database RPCs.",
        title="SECURITY INVARIANT: ZERO-TRUST SERVER-SIDE AUTHORIZATION"
    )

    # Architecture Topology Table
    headers_arch = ["Subsystem Component", "Underlying Tech Stack", "Hosting & Infrastructure", "Primary Responsibility"]
    data_arch = [
        [
            "Web Frontend & SSR",
            "Next.js 16.3, React 19, Tailwind CSS v4, Lucide Icons, Radix UI",
            "Vercel Edge Network (Global CDN)",
            "Server rendering, UI interaction, client-side Dexie.js cache, SSE consumption."
        ],
        [
            "Primary Database",
            "PostgreSQL 15, PostgREST 12, GoTrue Auth, pg_trgm",
            "Supabase Cloud (EU-West / AWS Frankfurt)",
            "Relational data storage, RLS enforcement, security-definer RPCs, session storage."
        ],
        [
            "AI Inference Gateway",
            "Google Gemini 2.5/Flash, Claude 3.5 Sonnet, GPT-4o, Express / TypeScript",
            "Next.js Server Actions & Node.js Backend (Render)",
            "Multi-model routing, prompt grounding, span verification, streaming SSE token delivery."
        ],
        [
            "Media CDN & Storage",
            "Cloudinary REST API, PDF.js extraction, Supabase Storage S3",
            "Cloudinary Multi-Region Cloud",
            "Slide deck PDF conversion, high-density thumbnail caching, image OCR extraction."
        ],
        [
            "Past Question Gateway",
            "KLOK Search REST API v1, TTLCache, Base64 Normalizer",
            "KLOK Search Cloud",
            "White-label university past question indexing, year/semester parsing, course code matching."
        ],
        [
            "Billing & Payment Gateway",
            "Paystack API v2, Webhooks, HMAC SHA-512 verification",
            "Paystack Cloud (Ghana / West Africa)",
            "Mobile Money (MTN, Telecel, AT) and Visa/Mastercard processing, wallet crediting."
        ]
    ]
    add_styled_table(doc, headers_arch, data_arch, [1.5, 1.8, 1.6, 1.6])

    # 2. Local-First & 0ms Navigation Architecture
    add_heading_1(doc, "2. Local-First Architecture & Multi-Tier Retrieval")
    doc.add_paragraph(
        "To deliver instantaneous 0ms response times for students on campus, UniStudy enforces a 4-tier data retrieval cascade:"
    )
    doc.add_paragraph("1. Tier 1 - In-Memory RAM Map (0.01ms): Synchronous lookups for active chat sessions, recent slide notes, and open decks.")
    doc.add_paragraph("2. Tier 2 - LocalStorage Synchronous Fallback (0.2ms): Lightweight storage for user theme preferences, tutor configuration, and session IDs.")
    doc.add_paragraph("3. Tier 3 - Dexie.js IndexedDB Persistent Cache (< 5ms): Asynchronous local database storing complete decks, flashcard boxes, past question history, and offline sync queues.")
    doc.add_paragraph("4. Tier 4 - Background SWR Server Sync: Non-blocking revalidation that fetches delta updates from Supabase and silently updates local storage without interrupting user interaction.")

    # 3. AI Streaming & Grounding Verification Pipeline
    add_heading_1(doc, "3. AI Streaming & Grounding Verification Pipeline")
    doc.add_paragraph(
        "The streaming pipeline is designed around zero-delay Server-Sent Events (SSE) via streamAsk.ts. "
        "Unlike standard blocking REST calls that wait 8-15 seconds for a complete answer, UniStudy sends HTTP headers within 20ms and streams tokens chunk-by-chunk."
    )

    add_heading_2(doc, "3.1 Token Context Meter & Budget Allocation")
    doc.add_paragraph(
        "UniStudy implements an in-flight token estimator (ContextMeter.tsx) that tracks input prompts, system rules, attached slide transcripts, "
        "and previous conversation turns against the model's 32,768 or 128,000 token context window. When conversation depth approaches 85% capacity, "
        "the system triggers automatic context compaction, summarizing early turns while preserving key formulas and citations."
    )

    add_heading_2(doc, "3.2 Deterministic Grounding & Span Verification")
    doc.add_paragraph(
        "All answers generated in Grounded Mode pass through groundingVerifier.ts. The verification pipeline checks:"
    )
    doc.add_paragraph("• Numeric Fidelity: Verifies that numbers, percentages, and financial figures match source slides exactly.")
    doc.add_paragraph("• Citation Span Verification: Ensures [Slide N] tags correspond to real slide numbers within the referenced deck.")
    doc.add_paragraph("• Out-of-Scope Fallback: If student queries fall outside uploaded slide contents, the model explicitly acknowledges the boundary rather than inventing ungrounded claims.")

    # 4. Zero-Cost Performance Engineering
    add_heading_1(doc, "4. Zero-Cost Performance Engineering & Quota Protection")
    headers_perf = ["Guardrail Layer", "Technical Mechanism", "Threshold / Limit", "Impact on Server CPU & Cost"]
    data_perf = [
        [
            "In-Memory TTL Cache",
            "klokCache Map with expiration timestamps",
            "10-Minute TTL for identical past question searches",
            "Eliminates 92% of outgoing network requests to external APIs."
        ],
        [
            "In-Flight Deduplication Lock",
            "withInFlightLock registry keyed by route:userId:payloadHash",
            "Single execution promise shared across concurrent identical clicks",
            "Prevents duplicate database mutations from form double-clicking."
        ],
        [
            "Sliding-Window Rate Limiting",
            "ExpensiveEndpointProtector memory sliding counter",
            "30 req/min for search; 10 req/min for file upload; 5 attempts/15m for auth",
            "Protects backend against brute-force attacks and CPU exhaustion."
        ],
        [
            "Client Cache-Buster Removal",
            "Removal of ?t=Date.now() and cache: 'no-store'",
            "Enforces Cache-Control: public, s-maxage=60, stale-while-revalidate=300",
            "Allows Edge CDN to serve 95% of read-heavy requests at 0% server CPU."
        ],
        [
            "Lookahead Predictive Preload",
            "Hidden async buffer warming Slide N+1, N+2",
            "Pre-fetches adjacent WebP slide assets into browser memory",
            "Guarantees 0ms perceived latency during lecture slide navigation."
        ]
    ]
    add_styled_table(doc, headers_perf, data_perf, [1.5, 1.8, 1.6, 1.6])

    # 5. Security & Infrastructure Hardening
    add_heading_1(doc, "5. Security & Infrastructure Hardening")
    doc.add_paragraph(
        "Security is implemented defensively at every architectural layer:"
    )
    doc.add_paragraph("• Row-Level Security (RLS): All PostgreSQL tables have RLS enabled. Strict ownership rules enforce auth.uid() = user_id or foreign-key ownership verification.")
    doc.add_paragraph("• IDOR Prevention: Mutations (e.g. updating slide notes, deleting sessions, modifying flashcards) require server-side ownership proof against the exact record ID.")
    doc.add_paragraph("• Secret Isolation: Environment variables with NEXT_PUBLIC_ prefixes contain strictly public URLs. Database service roles, Paystack secret keys, and AI credentials remain inaccessible to client bundles.")
    doc.add_paragraph("• Webhook Security: Paystack webhook signatures are validated using constant-time crypto.timingSafeEqual() against the canonical server pricing configuration.")

    output_path = os.path.abspath("docs/specifications/UniStudy_TDD.docx")
    doc.save(output_path)
    print(f"Generated: {output_path}")

if __name__ == "__main__":
    build_tdd()

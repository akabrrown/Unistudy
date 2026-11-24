"""
Generates UniStudy_Backend_Schema.docx - Database Entity-Relationship & Backend Schema
"""
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from generate_spec_suite import (
    create_base_document, add_cover_page, add_heading_1,
    add_heading_2, add_heading_3, add_callout, add_styled_table
)

def build_backend_schema():
    doc = create_base_document()
    add_cover_page(
        doc,
        title="UniStudy Database Schema & ERD Specification",
        subtitle="Complete PostgreSQL Relational Schema, Row-Level Security Policies, Indexes, and Security-Definer RPCs",
        doc_type="Backend Schema Specification",
        version="1.0"
    )

    # 1. Architecture Overview
    add_heading_1(doc, "1. Database Architecture & Technology Overview")
    doc.add_paragraph(
        "UniStudy's data persistence layer is engineered on PostgreSQL 15 hosted via Supabase, with automatic REST/GraphQL generation via PostgREST. "
        "The schema enforces strict relational integrity, ACID transactional boundaries for credit billing, and 100% Row-Level Security (RLS) "
        "to guarantee tenant isolation."
    )

    add_callout(
        doc,
        "RLS Security Mandate: USING (true) is strictly prohibited on user data tables. Every query executes with auth.uid() context. "
        "User records must be bound by direct user_id matches or proven via foreign-key join existence (EXISTS checks). "
        "Mutations on financial wallets can only be executed via security-definer RPC functions with atomic transaction locking.",
        title="DATABASE INVARIANT: MANDATORY ROW-LEVEL SECURITY (RLS)"
    )

    # 2. Complete Entity-Relationship Model (Tables)
    add_heading_1(doc, "2. Relational Entity Schemas & DDL Definitions")

    # Table 1: profiles
    add_heading_2(doc, "2.1 Table: public.profiles (Student & Staff Identity)")
    doc.add_paragraph("Stores extended student profile data linked 1:1 with auth.users via foreign key cascade.")
    headers_prof = ["Column Name", "Data Type", "Constraints", "Description"]
    data_prof = [
        ["id", "UUID", "PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE", "User unique identifier."],
        ["email", "TEXT", "NOT NULL, UNIQUE", "Institutional or personal email."],
        ["full_name", "TEXT", "NULLABLE", "Student's registered full name."],
        ["institution_id", "UUID", "NULLABLE, REFERENCES institutions(id)", "Associated collegiate institution (UPSA)."],
        ["programme_id", "UUID", "NULLABLE, REFERENCES institution_programmes(id)", "Academic programme of study (e.g. BSc IT)."],
        ["year_of_study", "INT", "CHECK (year_of_study BETWEEN 100 AND 700)", "Academic level (100, 200, 300, 400)."],
        ["role", "TEXT", "DEFAULT 'student', CHECK (role IN ('student', 'lecturer', 'admin'))", "Access control role."],
        ["plan", "TEXT", "DEFAULT 'free'", "Subscription tier (free, pro, ultra)."],
        ["created_at", "TIMESTAMPTZ", "DEFAULT NOW(), NOT NULL", "Record creation timestamp."]
    ]
    add_styled_table(doc, headers_prof, data_prof, [1.4, 1.2, 2.2, 1.7])

    # Table 2: courses
    add_heading_2(doc, "2.2 Table: public.courses (Academic Courses)")
    doc.add_paragraph("Stores academic courses enrolled or created by students.")
    headers_course = ["Column Name", "Data Type", "Constraints", "Description"]
    data_course = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique course identifier."],
        ["user_id", "UUID", "NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE", "Owner student ID."],
        ["course_code", "TEXT", "NOT NULL", "Normalized course code (e.g. BCPC 208)."],
        ["title", "TEXT", "NOT NULL", "Official course title."],
        ["colour", "TEXT", "DEFAULT '#00004E'", "Hex color code for UI cards."],
        ["semester", "INT", "CHECK (semester IN (1, 2))", "Academic semester (First/Second)."],
        ["academic_year", "TEXT", "NULLABLE", "Academic year (e.g. 2024/2025)."],
        ["is_archived", "BOOLEAN", "DEFAULT FALSE", "Archive state flag."],
        ["created_at", "TIMESTAMPTZ", "DEFAULT NOW(), NOT NULL", "Creation timestamp."]
    ]
    add_styled_table(doc, headers_course, data_course, [1.4, 1.2, 2.2, 1.7])

    # Table 3: lectures & slides
    add_heading_2(doc, "2.3 Tables: public.lectures & public.slides (Curriculum Materials)")
    doc.add_paragraph("Hierarchical lecture decks and individual slide records extracted via Cloudinary.")
    headers_lec = ["Column Name", "Data Type", "Constraints", "Description"]
    data_lec = [
        ["id (lectures)", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique lecture identifier."],
        ["course_id", "UUID", "NOT NULL, REFERENCES courses(id) ON DELETE CASCADE", "Parent course foreign key."],
        ["title", "TEXT", "NOT NULL", "Lecture week or topic title."],
        ["week", "INT", "NULLABLE", "Curriculum week number (1 to 14)."],
        ["slide_count", "INT", "DEFAULT 0", "Total number of slides processed."],
        ["cover_image_url", "TEXT", "NULLABLE", "Thumbnail cover image URL."],
        ["processing", "BOOLEAN", "DEFAULT FALSE", "Asynchronous processing status flag."],
        ["id (slides)", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique slide page identifier."],
        ["lecture_id", "UUID", "NOT NULL, REFERENCES lectures(id) ON DELETE CASCADE", "Parent lecture foreign key."],
        ["slide_number", "INT", "NOT NULL", "1-based page index."],
        ["image_url", "TEXT", "NOT NULL", "High-resolution WebP slide URL on CDN."],
        ["ocr_text", "TEXT", "NULLABLE", "Extracted OCR text for search and AI grounding."]
    ]
    add_styled_table(doc, headers_lec, data_lec, [1.4, 1.2, 2.2, 1.7])

    # Table 4: past_papers & past_paper_attempts
    add_heading_2(doc, "2.4 Tables: public.past_papers & public.past_paper_attempts (Examinations)")
    doc.add_paragraph("Past examination question papers and student attempt evaluations.")
    headers_pp = ["Column Name", "Data Type", "Constraints", "Description"]
    data_pp = [
        ["id (past_papers)", "TEXT", "PRIMARY KEY", "Paper ID (UUID or normalized KLOK key)."],
        ["user_id", "UUID", "NULLABLE, REFERENCES profiles(id)", "User who uploaded or NULL if global."],
        ["course_id", "UUID", "NULLABLE, REFERENCES courses(id)", "Mapped course foreign key."],
        ["course_code", "TEXT", "NOT NULL", "Human-readable course code (BCPC 208)."],
        ["title", "TEXT", "NOT NULL", "Examination paper title."],
        ["year", "INT", "NOT NULL", "Examination year (e.g. 2024)."],
        ["semester", "INT", "DEFAULT 1", "Semester index (1 or 2)."],
        ["exam_type", "TEXT", "DEFAULT 'end-semester'", "Mid-semester or End-semester."],
        ["id (attempts)", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique attempt identifier."],
        ["user_id (attempts)", "UUID", "NOT NULL, REFERENCES profiles(id)", "Student who took the drill."],
        ["score_percentage", "NUMERIC(5,2)", "CHECK (score_percentage BETWEEN 0 AND 100)", "Graded test score."],
        ["feedback_json", "JSONB", "NULLABLE", "AI evaluation rubric breakdown."]
    ]
    add_styled_table(doc, headers_pp, data_pp, [1.4, 1.2, 2.2, 1.7])

    # Table 5: credit_wallets & credit_transactions
    add_heading_2(doc, "2.5 Tables: public.credit_wallets & public.credit_transactions (Billing Engine)")
    doc.add_paragraph("Manages the dual-pocket economy: 6-hour renewable passes and permanent paid credits.")
    headers_wall = ["Column Name", "Data Type", "Constraints", "Description"]
    data_wall = [
        ["id", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Wallet unique ID."],
        ["user_id", "UUID", "NOT NULL, UNIQUE, REFERENCES profiles(id)", "Student profile reference."],
        ["free_passes", "INT", "DEFAULT 8, CHECK (free_passes BETWEEN 0 AND 8)", "Renewable 6-hour pass allowance."],
        ["paid_credits", "INT", "DEFAULT 0, CHECK (paid_credits >= 0)", "Never-expiring purchased credits."],
        ["last_refill_at", "TIMESTAMPTZ", "DEFAULT NOW()", "Timestamp of last 6h pass replenishment."],
        ["id (transactions)", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Audit log transaction ID."],
        ["wallet_id", "UUID", "NOT NULL, REFERENCES credit_wallets(id)", "Parent wallet reference."],
        ["amount", "INT", "NOT NULL", "Credits added (+) or deducted (-)."],
        ["type", "TEXT", "CHECK (type IN ('free_refill', 'purchase', 'usage', 'bonus'))", "Transaction classification."],
        ["paystack_reference", "TEXT", "NULLABLE, UNIQUE", "Paystack payment reference."]
    ]
    add_styled_table(doc, headers_wall, data_wall, [1.4, 1.2, 2.2, 1.7])

    # Table 6: tutor_memories & ai_message_feedback
    add_heading_2(doc, "2.6 Tables: public.tutor_memories & public.ai_message_feedback (AI State)")
    doc.add_paragraph("Persists cross-session AI tutor memory facts and student answer feedback.")
    headers_ai = ["Column Name", "Data Type", "Constraints", "Description"]
    data_ai = [
        ["id (memories)", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique memory fact identifier."],
        ["user_id", "UUID", "NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE", "Owner student ID."],
        ["fact", "TEXT", "CHECK (char_length(fact) BETWEEN 3 AND 300)", "Learned fact (e.g. 'Struggles with torts')."],
        ["id (feedback)", "UUID", "PRIMARY KEY, DEFAULT gen_random_uuid()", "Unique feedback rating ID."],
        ["session_id", "TEXT", "NOT NULL", "Chat session identifier."],
        ["message_id", "TEXT", "NOT NULL", "Target AI message ID."],
        ["rating", "TEXT", "CHECK (rating IN ('up', 'down'))", "Thumbs up or thumbs down."],
        ["reason", "TEXT", "CHECK (char_length(reason) <= 500)", "Optional qualitative student reason."],
        ["model_used", "TEXT", "NULLABLE", "Underlying AI model (e.g. gemini-2.5-flash)."]
    ]
    add_styled_table(doc, headers_ai, data_ai, [1.4, 1.2, 2.2, 1.7])

    # 3. Row-Level Security Policy Specifications
    add_heading_1(doc, "3. Row-Level Security (RLS) Policy Specifications")
    headers_rls = ["Table Name", "Policy Name", "Command", "USING & WITH CHECK Logic"]
    data_rls = [
        ["profiles", "Users manage their own profile", "ALL", "auth.uid() = id"],
        ["courses", "Users manage their own courses", "ALL", "auth.uid() = user_id"],
        ["lectures", "Users manage lectures in their courses", "ALL", "EXISTS (SELECT 1 FROM courses WHERE courses.id = lectures.course_id AND courses.user_id = auth.uid())"],
        ["slides", "Users view slides in their lectures", "SELECT", "EXISTS (SELECT 1 FROM lectures JOIN courses ON courses.id = lectures.course_id WHERE lectures.id = slides.lecture_id AND courses.user_id = auth.uid())"],
        ["past_papers", "Users view own or public past papers", "SELECT", "auth.uid() = user_id OR user_id IS NULL"],
        ["past_paper_attempts", "Users view own attempts", "ALL", "auth.uid() = user_id"],
        ["credit_wallets", "Users read own wallet", "SELECT", "auth.uid() = user_id (Mutations restricted to RPCs)"],
        ["tutor_memories", "Users manage own memories", "ALL", "auth.uid() = user_id"],
        ["ai_message_feedback", "Users manage own feedback", "ALL", "auth.uid() = user_id"]
    ]
    add_styled_table(doc, headers_rls, data_rls, [1.4, 1.6, 1.0, 2.5])

    # 4. Security-Definer RPC Functions
    add_heading_1(doc, "4. Security-Definer Stored Procedures & Triggers")
    doc.add_paragraph(
        "Critical financial and quota operations are isolated in PostgreSQL security-definer functions that bypass standard user permissions "
        "while enforcing strict validation:"
    )
    doc.add_paragraph("• increment_credit_wallet(p_user_id UUID, p_amount INT, p_ref TEXT): Atomically increments paid_credits, records audit transaction, and guarantees idempotency on Paystack references.")
    doc.add_paragraph("• decrement_credit_wallet(p_user_id UUID, p_amount INT): Checks free_passes balance first; if 0, decrements paid_credits with CHECK (paid_credits >= 0) constraint to prevent race-condition overdrafts.")
    doc.add_paragraph("• refill_free_passes_cron(): Runs on a scheduled background worker to reset free_passes to 8 for all wallets where last_refill_at <= NOW() - INTERVAL '6 hours'.")

    # 5. Indexing & Query Optimization
    add_heading_1(doc, "5. Indexing Strategy & Performance Tuning")
    headers_idx = ["Target Table", "Index Name", "Columns Indexed", "Index Type & Purpose"]
    data_idx = [
        ["courses", "idx_courses_user_id", "user_id, is_archived", "B-Tree: Accelerates course dashboard rendering."],
        ["lectures", "idx_lectures_course_id", "course_id, week", "B-Tree: Chronological slide deck retrieval."],
        ["slides", "idx_slides_lecture_num", "lecture_id, slide_number", "B-Tree Composite: 0ms page index lookups."],
        ["past_papers", "idx_past_papers_code_trgm", "course_code, title", "GIN (pg_trgm): Fuzzy search across course codes."],
        ["past_paper_attempts", "idx_attempts_user_date", "user_id, started_at DESC", "B-Tree: Recent drill history rendering."],
        ["tutor_memories", "idx_tutor_memories_user", "user_id, created_at DESC", "B-Tree: Fast context memory injection."],
        ["credit_transactions", "idx_transactions_wallet", "wallet_id, created_at DESC", "B-Tree: Billing audit history lookups."]
    ]
    add_styled_table(doc, headers_idx, data_idx, [1.4, 1.6, 1.5, 2.0])

    output_path = os.path.abspath("docs/specifications/UniStudy_Backend_Schema.docx")
    doc.save(output_path)
    print(f"Generated: {output_path}")

if __name__ == "__main__":
    build_backend_schema()

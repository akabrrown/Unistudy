"""
Generates UniStudy_Design_Brief.docx - Design Brief & UI/UX Design System
"""
import os
import docx
from docx.shared import Inches, Pt, RGBColor
from generate_spec_suite import (
    create_base_document, add_cover_page, add_heading_1,
    add_heading_2, add_heading_3, add_callout, add_styled_table
)

def build_design_brief():
    doc = create_base_document()
    add_cover_page(
        doc,
        title="UniStudy Design Brief & UI/UX Design System",
        subtitle="Collegiate Visual Identity, Anti-Slop Guidelines, Component Specifications, and Interaction Contracts",
        doc_type="Design Brief & UI/UX Specification",
        version="1.0"
    )

    # 1. Brand Identity & Creative Direction
    add_heading_1(doc, "1. Brand Identity & Design Ethos")
    doc.add_paragraph(
        "UniStudy's visual design combines the timeless prestige of historic university scholarship with the speed and precision of "
        "modern high-performance AI tooling. The interface rejects disposable consumer app aesthetics in favor of authoritative collegiate craft."
    )
    doc.add_paragraph(
        "Every screen, button, badge, and interaction must feel intentional, structured, and academically credible—resembling a declassified "
        "scholar's research terminal rather than an algorithmic toy."
    )

    add_callout(
        doc,
        "The Anti-Slop Design Directive: All generic AI interface tropes are strictly banned. "
        "• BANNED: Neon purple-to-pink gradients, glowing psychedelic cards, and floating particle spheres.\n"
        "• BANNED: Generic AI sparkle icons (Sparkles) and clichéd robot avatars.\n"
        "• ENFORCED: Real collegiate heraldry, deep academic navy backgrounds, warm gold accents, high-contrast borders, and authentic typography.",
        title="DESIGN CONTRACT: ZERO AI SLOP"
    )

    # 2. Color System
    add_heading_1(doc, "2. The UPSA Collegiate Color System")
    doc.add_paragraph(
        "The palette is derived from the official identity of the University of Professional Studies, Accra (UPSA), "
        "engineered for maximum contrast and readability across daylight lecture halls and late-night study sessions."
    )

    headers_colors = ["Token Name", "Hex Code", "RGB / Alpha", "Role & Usage Specification"]
    data_colors = [
        [
            "UPSA Deep Navy\n(Primary Brand)",
            "#00004E",
            "rgb(0, 0, 78)",
            "Primary CTA buttons, main sidebar surface, structural headers, dark mode authority, active selection states."
        ],
        [
            "UPSA Gold\n(Accent Highlight)",
            "#D89A06",
            "rgb(216, 154, 6)",
            "Badge borders, active tab underlines, focus rings, progress indicators, motivational highlights."
        ],
        [
            "UPSA Gold Muted\n(Subtle Tint)",
            "#FEF8E7",
            "rgba(216, 154, 6, 0.12)",
            "Active session chip backgrounds, light-mode pill fills, subtle hover highlights, callout containers."
        ],
        [
            "Pure Surface White\n(High Contrast)",
            "#FFFFFF",
            "rgb(255, 255, 255)",
            "Light-mode card surfaces, primary text on navy buttons, crisp dialog backgrounds."
        ],
        [
            "Charcoal Text\n(Body Copy)",
            "#1A202C / #2D3748",
            "rgb(26, 32, 44)",
            "High-legibility body text, slide transcripts, and essay reviews in light theme."
        ],
        [
            "Academic Emerald\n(Success State)",
            "#10B981",
            "rgb(16, 185, 129)",
            "Passing test scores (>=70%), completed flashcard mastery, verified cloud sync status."
        ],
        [
            "Academic Crimson\n(Error & Alerts)",
            "#EF4444",
            "rgb(239, 68, 68)",
            "Critical validation errors, recording mic indicator, failed uploads, low wallet warnings."
        ]
    ]
    add_styled_table(doc, headers_colors, data_colors, [1.5, 1.2, 1.4, 2.4])

    # 3. Typography Hierarchy
    add_heading_1(doc, "3. Typography & Type Scale")
    doc.add_paragraph(
        "UniStudy utilizes Geist Sans and Inter as the primary functional typefaces, supplemented by classic serif display accents "
        "for academic prestige."
    )

    headers_type = ["Level / Role", "Font Family", "Size & Weight", "Tracking & Line Height", "Application Example"]
    data_type = [
        ["Display Title", "Geist / Inter", "28px / 32px · Bold (700)", "-0.025em / 1.2", "Page titles, Course Header"],
        ["Section Heading", "Geist / Inter", "20px / 24px · Bold (700)", "-0.02em / 1.25", "Bento Grid Section Titles"],
        ["Subheading", "Geist / Inter", "16px · SemiBold (600)", "-0.01em / 1.35", "Dialog titles, Card titles"],
        ["Body Text", "Geist / Inter", "13.5px / 14px · Regular (400)", "0 / 1.5", "Lecture notes, AI answers, PRD body"],
        ["Button & Label", "Geist / Inter", "12px / 13px · Bold (700)", "0 / 1.0", "New Chat, Attach Deck, Filter buttons"],
        ["Micro & Badges", "Geist / Inter", "10px / 11px · Bold (700)", "+0.03em / 1.0 (Uppercase)", "Course codes (BCPC 208), Slide badges"],
        ["Code & Formulas", "Geist Mono / KaTeX", "12.5px · Regular (400)", "0 / 1.4", "LaTeX formulas, Code debugging"]
    ]
    add_styled_table(doc, headers_type, data_type, [1.3, 1.3, 1.5, 1.4, 1.0])

    # 4. Layout Systems & Responsive Breakpoints
    add_heading_1(doc, "4. Layout Systems & Workspace Architecture")

    add_heading_2(doc, "4.1 Collapsible Drawer Architecture")
    doc.add_paragraph(
        "The interface balances screen real estate through a two-tier collapsible hierarchy:"
    )
    doc.add_paragraph("• Primary Navigation Sidebar (Left, 256px / w-64): Contains universal links (Dashboard, Courses, Past Papers, AI Tutor, Wellbeing, Settings). Collapses into an icon-only rail or slide-out sheet on mobile.")
    doc.add_paragraph("• Chat History Drawer (Left of Chat, 288px / w-72): Dedicated conversation drawer with search, rename, delete, and cloud sync status. Can be toggled open or closed with a single click via PanelLeftClose/PanelLeftOpen.")

    add_heading_2(doc, "4.2 Bento Grid Dashboard Layout")
    doc.add_paragraph(
        "The student dashboard utilizes an asymmetrical Bento Grid layout grouping real-time academic widgets: "
        "Enrolled Courses, Daily Motivational Quote, Quick Exam Focus, Past Question Jump-start, and Study Analytics Velocity."
    )

    # 5. Universal Five UI States
    add_heading_1(doc, "5. The Universal Five UI States Contract")
    headers_states = ["State Type", "Visual Requirement", "Component Implementation", "User Recovery Path"]
    data_states = [
        [
            "Loading State",
            "Zero layout shift; skeleton cards with subtle shimmer; buttons show animated spinner and action text.",
            "useFormStatus hook extracts pending status; button disables automatically to prevent double-clicks.",
            "Immediate visual feedback within <16ms."
        ],
        [
            "Empty State",
            "No blank void; display collegiate crest, explanatory text, and 1-click primary action CTA.",
            "EmptyState.tsx with UniStudy icon, title, description, and '+ Add First Course' trigger.",
            "Direct button jump to creation modal."
        ],
        [
            "Error State",
            "Clear diagnostic message; no cryptic stack traces; high-contrast crimson border and warning icon.",
            "Alert variant='destructive' with retry action button and fallback offline trigger.",
            "1-Click 'Retry Request' or 'Read Cached Version'."
        ],
        [
            "Success State",
            "Discreet toast notification; subtle green badge; micro-interaction checkmark without blocking user.",
            "Sonner toast with UPSA Gold accent border and auto-dismiss after 4 seconds.",
            "Non-blocking automatic dismiss."
        ],
        [
            "Offline State",
            "Persistent banner; 0ms local data presentation; disabled network-dependent mutations.",
            "OfflineIndicator.tsx checking navigator.onLine; Dexie.js reads; sync queue counter.",
            "Auto-flushes queue upon window 'online' event."
        ]
    ]
    add_styled_table(doc, headers_states, data_states, [1.3, 1.8, 1.9, 1.5])

    output_path = os.path.abspath("docs/specifications/UniStudy_Design_Brief.docx")
    doc.save(output_path)
    print(f"Generated: {output_path}")

if __name__ == "__main__":
    build_design_brief()

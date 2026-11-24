"""
UniStudy Professional Specification Suite Generator
Produces publication-grade DOCX files for:
1. Product Requirements Document (PRD)
2. Technical Design Document (TDD)
3. Design Brief & UI/UX Design System
4. Complete App Flow & User Journeys
5. Database Entity-Relationship & Backend Schema
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

NAVY_HEX = "00004E"
GOLD_HEX = "D89A06"
GOLD_LIGHT_HEX = "FEF8E7"
CHARCOAL_HEX = "2D3748"
GRAY_LIGHT_HEX = "F8F9FA"
BORDER_HEX = "D1D5DB"

NAVY_COLOR = RGBColor(0x00, 0x00, 0x4E)
GOLD_COLOR = RGBColor(0xD8, 0x9A, 0x06)
CHARCOAL_COLOR = RGBColor(0x2D, 0x37, 0x48)
MUTED_COLOR = RGBColor(0x71, 0x80, 0x96)

def set_cell_background(cell, color_hex):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_base_document():
    doc = docx.Document()
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # Header / Footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("UniStudy AI Academic Platform · Confidential Specification Suite")
        f_run.font.size = Pt(8.5)
        f_run.font.color.rgb = MUTED_COLOR

    # Configure Normal Style
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(10.5)
    font.color.rgb = CHARCOAL_COLOR
    style.paragraph_format.line_spacing = 1.15
    style.paragraph_format.space_after = Pt(4)

    return doc

def add_cover_page(doc, title, subtitle, doc_type, version="1.0"):
    # Header tag
    tag_p = doc.add_paragraph()
    tag_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    tag_run = tag_p.add_run("UNISTUDY ACADEMIC PLATFORM · SYSTEM SPECIFICATION")
    tag_run.font.bold = True
    tag_run.font.size = Pt(9.5)
    tag_run.font.color.rgb = GOLD_COLOR

    # Big Title
    t_p = doc.add_paragraph()
    t_p.paragraph_format.space_before = Pt(8)
    t_p.paragraph_format.space_after = Pt(4)
    t_run = t_p.add_run(title)
    t_run.font.bold = True
    t_run.font.size = Pt(26)
    t_run.font.color.rgb = NAVY_COLOR

    # Subtitle
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(20)
    sub_run = sub_p.add_run(subtitle)
    sub_run.font.size = Pt(13)
    sub_run.font.color.rgb = CHARCOAL_COLOR

    # Metadata Card Table
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Document Type", doc_type),
        ("Version & Status", f"v{version} · Production Release Standard"),
        ("Institution Alignment", "University of Professional Studies, Accra (UPSA) & West African Curricula"),
        ("Authors", "UniStudy Engineering, Product, Security & Academic Architecture Team"),
        ("Last Updated", "November 2026")
    ]
    for i, (label, val) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        
        set_cell_background(c0, "F0F4F8")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 70, 70, 100, 100)
        set_cell_margins(c1, 70, 70, 100, 100)

        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = NAVY_COLOR

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.size = Pt(9.5)

    doc.add_page_break()

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.bold = True
    run.font.size = Pt(16)
    run.font.color.rgb = NAVY_COLOR
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.bold = True
    run.font.size = Pt(12.5)
    run.font.color.rgb = NAVY_COLOR
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.bold = True
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x8C, 0x64, 0x04) # Deep Gold
    return p

def add_callout(doc, text, title="KEY REQUIREMENT / ARCHITECTURAL INVARIANT"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_background(cell, GOLD_LIGHT_HEX)
    set_cell_margins(cell, 100, 100, 140, 140)
    
    # Left border in Gold
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{GOLD_HEX}"/>'
        f'<w:top w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    r_title = p.add_run(f"★ {title}\n")
    r_title.font.bold = True
    r_title.font.size = Pt(9.5)
    r_title.font.color.rgb = NAVY_COLOR

    r_text = p.add_run(text)
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = CHARCOAL_COLOR

    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def add_styled_table(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Format header row
    hdr_row = table.rows[0]
    for idx, heading in enumerate(headers):
        cell = hdr_row.cells[idx]
        if col_widths and idx < len(col_widths):
            cell.width = Inches(col_widths[idx])
        set_cell_background(cell, NAVY_HEX)
        set_cell_margins(cell, 90, 90, 100, 100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(heading)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # Format data rows
    for r_idx, row_values in enumerate(data):
        row = table.rows[r_idx + 1]
        bg = GRAY_LIGHT_HEX if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            cell = row.cells[c_idx]
            if col_widths and c_idx < len(col_widths):
                cell.width = Inches(col_widths[c_idx])
            set_cell_background(cell, bg)
            set_cell_margins(cell, 70, 70, 100, 100)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(str(val))
            r.font.size = Pt(9)
            r.font.color.rgb = CHARCOAL_COLOR

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

print("Setup helper utilities successfully")

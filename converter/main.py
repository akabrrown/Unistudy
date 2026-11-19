import os
import json
import re
import threading
import zipfile
import xml.etree.ElementTree as ET
import html as _html
import requests
import shutil
import uuid
import base64
import fitz  # PyMuPDF
import cloudinary
import cloudinary.uploader
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, List
import logging
from ai_utils import execute_ai_task, openrouter_low_priority, gemini_vision, groq70b, huggingface_search, cohere_rerank, RerankRequest, supabase
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("converter")

app = FastAPI()

# Restrict CORS to known frontend/backend origins only
_allowed_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
    os.getenv("BACKEND_URL", "http://localhost:8005"),
    "https://app.unistudy.ai",
    "https://unistudy.vercel.app",
    "https://unistudy-silk.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"],
    max_age=86400,
)

# ---------------------------------------------------------------------------
# Shared-secret authentication for internal service calls
# ---------------------------------------------------------------------------
_converter_secret = os.getenv("CONVERTER_SECRET", "").strip().strip('"').strip("'")
_api_key_header = APIKeyHeader(name="X-Converter-Secret", auto_error=False)

async def verify_converter_secret(api_key: Optional[str] = Security(_api_key_header)):
    """Reject requests that don't carry the shared converter secret."""
    if not _converter_secret:
        # If CONVERTER_SECRET is not configured, allow calls for local development
        return api_key
    clean_key = (api_key or "").strip().strip('"').strip("'")
    if clean_key != _converter_secret:
        logger.warning(
            "Converter secret mismatch. Received key len=%d, expected len=%d",
            len(clean_key),
            len(_converter_secret),
        )
        raise HTTPException(status_code=401, detail="Invalid converter secret")
    return api_key

# ---------------------------------------------------------------------------
# Request models (JSON body instead of Form data)
# ---------------------------------------------------------------------------
class VisionRequest(BaseModel):
    user_id: str
    prompt: str
    mime_type: str = "application/pdf"
    base64pdf: str

class StreamRequest(BaseModel):
    user_id: str
    messages: List[dict]  # [{"role": "user", "content": "…"}]

class GenerateRequest(BaseModel):
    user_id: str
    prompt: str

class LowPriorityRequest(BaseModel):
    user_id: str
    prompt: str

class EmbedRequest(BaseModel):
    user_id: str
    query: str

# Cloudinary Config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

_EMU_PER_PT = 12700.0
_R_REL_ATTR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
_conversion_lock = threading.Lock()
_active_lecture_conversions = set()


def _parse_hex_rgb(hex_str: str):
    clean = (hex_str or "").strip().lstrip("#")
    if len(clean) != 6:
        return None
    try:
        return (
            int(clean[0:2], 16) / 255.0,
            int(clean[2:4], 16) / 255.0,
            int(clean[4:6], 16) / 255.0,
        )
    except ValueError:
        return None


def _rgb_to_hex(rgb) -> str:
    if not rgb:
        return "#1E293B"
    r = max(0, min(255, int(round(rgb[0] * 255))))
    g = max(0, min(255, int(round(rgb[1] * 255))))
    b = max(0, min(255, int(round(rgb[2] * 255))))
    return f"#{r:02X}{g:02X}{b:02X}"


def _luminance(rgb) -> float:
    if not rgb:
        return 1.0
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]


def _apply_color_transforms(rgb, clr_elem):
    if rgb is None or clr_elem is None:
        return rgb
    r, g, b = rgb
    for child in clr_elem:
        tag = child.tag.split("}")[-1]
        val_str = child.attrib.get("val", "")
        if not val_str:
            continue
        try:
            frac = int(val_str) / 100000.0
        except ValueError:
            continue
        if tag == "tint":
            r = r + (1.0 - r) * (1.0 - frac)
            g = g + (1.0 - g) * (1.0 - frac)
            b = b + (1.0 - b) * (1.0 - frac)
        elif tag == "shade":
            r *= frac
            g *= frac
            b *= frac
        elif tag == "lumMod":
            r = min(1.0, r * frac)
            g = min(1.0, g * frac)
            b = min(1.0, b * frac)
        elif tag == "lumOff":
            r = max(0.0, min(1.0, r + frac))
            g = max(0.0, min(1.0, g + frac))
            b = max(0.0, min(1.0, b + frac))
    return (max(0.0, min(1.0, r)), max(0.0, min(1.0, g)), max(0.0, min(1.0, b)))


def _extract_solid_color(elem, theme_colors: dict):
    if elem is None:
        return None
    for child in elem:
        tag = child.tag.split("}")[-1]
        if tag == "srgbClr":
            rgb = _parse_hex_rgb(child.attrib.get("val", ""))
            return _apply_color_transforms(rgb, child)
        if tag == "schemeClr":
            scheme = child.attrib.get("val", "")
            alias = {"tx1": "dk1", "bg1": "lt1", "tx2": "dk2", "bg2": "lt2"}.get(scheme, scheme)
            rgb = theme_colors.get(alias)
            return _apply_color_transforms(rgb, child)
        if tag == "sysClr":
            rgb = _parse_hex_rgb(child.attrib.get("lastClr", ""))
            return _apply_color_transforms(rgb, child)
    return None


def _parse_theme_colors(zf: zipfile.ZipFile) -> dict:
    colors = {
        "dk1": (0.07, 0.09, 0.15),
        "lt1": (1.0, 1.0, 1.0),
        "dk2": (0.12, 0.18, 0.36),
        "lt2": (0.93, 0.95, 0.98),
        "accent1": (0.23, 0.51, 0.96),
        "accent2": (0.93, 0.28, 0.60),
        "accent3": (0.06, 0.72, 0.51),
        "accent4": (0.96, 0.62, 0.04),
        "accent5": (0.55, 0.36, 0.96),
        "accent6": (0.08, 0.72, 0.65),
    }
    theme_files = sorted(n for n in zf.namelist() if n.startswith("ppt/theme/theme") and n.endswith(".xml"))
    if not theme_files:
        return colors
    try:
        root = ET.fromstring(zf.read(theme_files[0]))
        for node in root.iter():
            if node.tag.endswith("}clrScheme"):
                for entry in node:
                    key = entry.tag.split("}")[-1]
                    c = _extract_solid_color(entry, colors)
                    if c is not None:
                        colors[key] = c
                break
    except Exception:
        pass
    return colors


def _load_rels(zf: zipfile.ZipFile, xml_path: str) -> dict:
    import posixpath
    base_dir = posixpath.dirname(xml_path)
    rels_path = posixpath.join(base_dir, "_rels", posixpath.basename(xml_path) + ".rels")
    mapping = {}
    if rels_path not in zf.namelist():
        return mapping
    try:
        root = ET.fromstring(zf.read(rels_path))
        for rel in root:
            rid = rel.attrib.get("Id")
            target = rel.attrib.get("Target", "")
            rel_type = rel.attrib.get("Type", "")
            if not rid or not target:
                continue
            if target.startswith("/"):
                resolved = target.lstrip("/")
            else:
                resolved = posixpath.normpath(posixpath.join(base_dir, target))
            mapping[rid] = (rel_type, resolved)
    except Exception:
        pass
    return mapping


def _find_child(elem, local_name: str):
    if elem is None:
        return None
    for child in elem:
        if child.tag.split("}")[-1] == local_name:
            return child
    return None


def _parse_xfrm_box(sp_pr):
    xfrm = _find_child(sp_pr, "xfrm")
    if xfrm is None:
        return None
    off = _find_child(xfrm, "off")
    ext = _find_child(xfrm, "ext")
    if off is None or ext is None:
        return None
    try:
        x = int(off.attrib.get("x", "0")) / _EMU_PER_PT
        y = int(off.attrib.get("y", "0")) / _EMU_PER_PT
        w = int(ext.attrib.get("cx", "0")) / _EMU_PER_PT
        h = int(ext.attrib.get("cy", "0")) / _EMU_PER_PT
        return (x, y, w, h)
    except ValueError:
        return None


def _extract_placeholder_info(sp_elem, theme_colors: dict):
    nv_sp_pr = _find_child(sp_elem, "nvSpPr")
    nv_pr = _find_child(nv_sp_pr, "nvPr")
    ph = _find_child(nv_pr, "ph")
    if ph is None:
        return None, None
    ph_type = ph.attrib.get("type")
    ph_idx = ph.attrib.get("idx")
    sp_pr = _find_child(sp_elem, "spPr")
    box = _parse_xfrm_box(sp_pr)
    tx_body = _find_child(sp_elem, "txBody")
    default_sz = None
    default_rgb = None
    default_bold = False
    if tx_body is not None:
        lst_style = _find_child(tx_body, "lstStyle")
        lvl1 = _find_child(lst_style, "lvl1pPr") if lst_style is not None else None
        def_rpr = _find_child(lvl1, "defRPr") if lvl1 is not None else None
        if def_rpr is not None:
            if "sz" in def_rpr.attrib:
                try:
                    default_sz = int(def_rpr.attrib["sz"]) / 100.0
                except ValueError:
                    pass
            if def_rpr.attrib.get("b") == "1":
                default_bold = True
            sf = _find_child(def_rpr, "solidFill")
            if sf is not None:
                default_rgb = _extract_solid_color(sf, theme_colors)
    return (ph_type, ph_idx), {
        "box": box,
        "font_size": default_sz,
        "rgb": default_rgb,
        "bold": default_bold,
    }


def _extract_slide_paragraphs(root):
    paragraphs = []
    for p in root.iter():
        if p.tag.endswith("}p"):
            runs = [elem.text for elem in p.iter() if elem.tag.endswith("}t") and elem.text]
            if runs:
                para_text = " ".join("".join(runs).split())
                if para_text:
                    paragraphs.append(para_text)
    if not paragraphs:
        runs = [elem.text for elem in root.iter() if elem.tag.endswith("}t") and elem.text]
        fallback = " ".join("".join(runs).split())
        if fallback:
            paragraphs.append(fallback)
    return "\n".join(paragraphs)


def render_pptx_with_pymupdf(file_path: str, temp_dir: str) -> List[dict]:
    """
    Pure-Python PPTX-to-image renderer using PyMuPDF (fitz) + OpenXML parsing.
    Produces crisp 2x rendered slide JPGs when LibreOffice is unavailable (e.g., Render Linux Python runtime).
    """
    zf = zipfile.ZipFile(file_path, "r")
    try:
        theme_colors = _parse_theme_colors(zf)

        slide_w, slide_h = 960.0, 540.0
        if "ppt/presentation.xml" in zf.namelist():
            pres_root = ET.fromstring(zf.read("ppt/presentation.xml"))
            for el in pres_root.iter():
                if el.tag.endswith("}sldSz"):
                    try:
                        slide_w = max(200.0, int(el.attrib.get("cx", "12192000")) / _EMU_PER_PT)
                        slide_h = max(150.0, int(el.attrib.get("cy", "6858000")) / _EMU_PER_PT)
                    except ValueError:
                        pass
                    break

        slide_files = [f for f in zf.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", f)]
        slide_files.sort(key=lambda name: int(re.search(r"slide(\d+)\.xml", name).group(1)))

        xml_cache = {}
        rels_cache = {}

        def get_xml(path: str):
            if path not in xml_cache and path in zf.namelist():
                xml_cache[path] = ET.fromstring(zf.read(path))
            return xml_cache.get(path)

        def get_rels(path: str):
            if path not in rels_cache:
                rels_cache[path] = _load_rels(zf, path)
            return rels_cache[path]

        def collect_placeholders_and_bg(xml_path: str):
            root = get_xml(xml_path)
            if root is None:
                return {}, [], None
            ph_map = {}
            static_shapes = []
            c_sld = _find_child(root, "cSld")
            bg_elem = _find_child(c_sld, "bg") if c_sld is not None else None
            sp_tree = _find_child(c_sld, "spTree") if c_sld is not None else None
            if sp_tree is not None:
                for child in sp_tree:
                    tag = child.tag.split("}")[-1]
                    if tag == "sp":
                        ph_key, ph_data = _extract_placeholder_info(child, theme_colors)
                        if ph_key is not None:
                            ph_map[ph_key] = ph_data
                        else:
                            static_shapes.append((child, xml_path))
                    elif tag in ("pic", "grpSp"):
                        static_shapes.append((child, xml_path))
            return ph_map, static_shapes, bg_elem

        def lookup_ph(ph_map: dict, ph_type: Optional[str], ph_idx: Optional[str]):
            for k in ((ph_type, ph_idx), (ph_type, None), (None, ph_idx)):
                if k in ph_map:
                    return ph_map[k]
            return None

        def render_background(page, bg_elem, bg_xml_path: str):
            if bg_elem is None:
                return False
            bg_pr = _find_child(bg_elem, "bgPr")
            if bg_pr is not None:
                sf = _find_child(bg_pr, "solidFill")
                if sf is not None:
                    rgb = _extract_solid_color(sf, theme_colors)
                    if rgb is not None:
                        page.draw_rect(fitz.Rect(0, 0, slide_w, slide_h), color=None, fill=rgb)
                        return True
                bf = _find_child(bg_pr, "blipFill")
                if bf is not None:
                    blip = _find_child(bf, "blip")
                    if blip is not None and _R_REL_ATTR in blip.attrib:
                        rid = blip.attrib[_R_REL_ATTR]
                        rel_entry = get_rels(bg_xml_path).get(rid)
                        if rel_entry and rel_entry[1] in zf.namelist():
                            try:
                                page.insert_image(
                                    fitz.Rect(0, 0, slide_w, slide_h),
                                    stream=zf.read(rel_entry[1]),
                                    keep_proportion=False,
                                )
                                return True
                            except Exception:
                                pass
            bg_ref = _find_child(bg_elem, "bgRef")
            if bg_ref is not None:
                rgb = _extract_solid_color(bg_ref, theme_colors)
                if rgb is not None:
                    page.draw_rect(fitz.Rect(0, 0, slide_w, slide_h), color=None, fill=rgb)
                    return True
            return False

        def transform_box(box, grp_tx):
            x, y, w, h = box
            if grp_tx is None:
                return (x, y, w, h)
            gx, gy, gw, gh, cx0, cy0, ccw, cch = grp_tx
            sx = (gw / ccw) if ccw else 1.0
            sy = (gh / cch) if cch else 1.0
            return (gx + (x - cx0) * sx, gy + (y - cy0) * sy, w * sx, h * sy)

        def draw_cust_geom(page, x: float, y: float, w: float, h: float, cust_geom, fill_rgb, stroke_rgb, stroke_w: float) -> bool:
            path_lst = _find_child(cust_geom, "pathLst")
            if path_lst is None:
                return False
            drew_any = False
            for p_elem in path_lst:
                if not p_elem.tag.endswith("}path"):
                    continue
                try:
                    raw_pw = float(p_elem.attrib.get("w", "0"))
                except ValueError:
                    raw_pw = 0.0
                try:
                    raw_ph = float(p_elem.attrib.get("h", "0"))
                except ValueError:
                    raw_ph = 0.0

                def map_pt(pt_elem):
                    if pt_elem is None:
                        return None
                    try:
                        px = float(pt_elem.attrib.get("x", "0"))
                        py = float(pt_elem.attrib.get("y", "0"))
                    except ValueError:
                        return None
                    sx = (px / raw_pw) * w if raw_pw > 0 else px / _EMU_PER_PT
                    sy = (py / raw_ph) * h if raw_ph > 0 else py / _EMU_PER_PT
                    return fitz.Point(x + sx, y + sy)

                shape = page.new_shape()
                cur_pt = None
                has_segments = False
                closed = False
                for cmd in p_elem:
                    ctag = cmd.tag.split("}")[-1]
                    if ctag == "moveTo":
                        if has_segments:
                            shape.finish(
                                color=stroke_rgb,
                                fill=fill_rgb if closed else None,
                                width=stroke_w,
                                closePath=closed,
                                lineCap=1,
                                lineJoin=1,
                            )
                            has_segments = False
                            closed = False
                        cur_pt = map_pt(_find_child(cmd, "pt"))
                    elif ctag == "lnTo":
                        nxt = map_pt(_find_child(cmd, "pt"))
                        if cur_pt is not None and nxt is not None:
                            shape.draw_line(cur_pt, nxt)
                            cur_pt = nxt
                            has_segments = True
                            drew_any = True
                    elif ctag == "cubicBezTo":
                        pts = [map_pt(c) for c in cmd if c.tag.endswith("}pt")]
                        if cur_pt is not None and len(pts) == 3 and all(p is not None for p in pts):
                            shape.draw_bezier(cur_pt, pts[0], pts[1], pts[2])
                            cur_pt = pts[2]
                            has_segments = True
                            drew_any = True
                    elif ctag == "quadBezTo":
                        pts = [map_pt(c) for c in cmd if c.tag.endswith("}pt")]
                        if cur_pt is not None and len(pts) == 2 and all(p is not None for p in pts):
                            shape.draw_curve(cur_pt, pts[0], pts[1])
                            cur_pt = pts[1]
                            has_segments = True
                            drew_any = True
                    elif ctag == "close":
                        closed = True

                if has_segments:
                    shape.finish(
                        color=stroke_rgb,
                        fill=fill_rgb if closed else None,
                        width=stroke_w,
                        closePath=closed,
                        lineCap=1,
                        lineJoin=1,
                    )
                shape.commit()
            return drew_any

        def build_html_from_txbody(tx_body, ph_style: dict, fill_rgb, slide_number: int = 1):
            is_dark_bg = fill_rgb is not None and _luminance(fill_rgb) < 0.45
            default_hex = "#FFFFFF" if is_dark_bg else _rgb_to_hex(ph_style.get("rgb"))
            base_pt = ph_style.get("font_size") or (
                26.0 if ph_style.get("type") in ("title", "ctrTitle") else 14.0
            )
            default_bold = bool(ph_style.get("bold") or ph_style.get("type") in ("title", "ctrTitle"))

            lst_style = _find_child(tx_body, "lstStyle")
            p_elems = [p for p in tx_body if p.tag.endswith("}p")]
            body_chunks = []
            max_font_pt = 0.0
            dominant_align = "left"

            for p_idx, p in enumerate(p_elems):
                p_pr = _find_child(p, "pPr")
                lvl = 0
                algn = "left"
                bullet = ""
                if p_pr is not None:
                    try:
                        lvl = int(p_pr.attrib.get("lvl", "0"))
                    except ValueError:
                        lvl = 0
                    a_attr = p_pr.attrib.get("algn", "")
                    algn = {"ctr": "center", "r": "right", "just": "justify"}.get(a_attr, "left")
                    if _find_child(p_pr, "buNone") is None:
                        bu_char = _find_child(p_pr, "buChar")
                        if bu_char is not None and bu_char.attrib.get("char"):
                            bullet = _html.escape(bu_char.attrib["char"]) + " "
                        elif lvl > 0:
                            bullet = "&bull; "

                lvl_tag = f"lvl{min(9, lvl + 1)}pPr"
                lvl_def = _find_child(_find_child(lst_style, lvl_tag), "defRPr") if lst_style is not None else None
                lvl_sz = None
                if lvl_def is not None and "sz" in lvl_def.attrib:
                    try:
                        lvl_sz = int(lvl_def.attrib["sz"]) / 100.0
                    except ValueError:
                        pass

                spans = []
                for child in p:
                    ctag = child.tag.split("}")[-1]
                    if ctag == "br":
                        spans.append("<br/>")
                        continue
                    if ctag not in ("r", "fld"):
                        continue
                    t_el = _find_child(child, "t")
                    if ctag == "fld" and child.attrib.get("type") == "slidenum":
                        txt = str(slide_number)
                    else:
                        txt = t_el.text if t_el is not None and t_el.text else ""
                    if not txt:
                        continue
                    r_pr = _find_child(child, "rPr")
                    sz_pt = lvl_sz or base_pt
                    is_bold = default_bold
                    is_italic = False
                    hex_color = default_hex
                    if r_pr is not None:
                        if "sz" in r_pr.attrib:
                            try:
                                sz_pt = max(6.0, min(64.0, int(r_pr.attrib["sz"]) / 100.0))
                            except ValueError:
                                pass
                        if "b" in r_pr.attrib:
                            is_bold = r_pr.attrib["b"] == "1"
                        if "i" in r_pr.attrib:
                            is_italic = r_pr.attrib["i"] == "1"
                        sf = _find_child(r_pr, "solidFill")
                        if sf is not None:
                            c = _extract_solid_color(sf, theme_colors)
                            if c is not None:
                                hex_color = _rgb_to_hex(c)

                    max_font_pt = max(max_font_pt, sz_pt)
                    style_parts = [
                        f"font-size:{sz_pt:.1f}pt",
                        f"color:{hex_color}",
                    ]
                    if is_bold:
                        style_parts.append("font-weight:bold")
                    if is_italic:
                        style_parts.append("font-style:italic")
                    escaped = _html.escape(txt)
                    spans.append(f'<span style="{";".join(style_parts)}">{escaped}</span>')

                if spans:
                    if not body_chunks:
                        dominant_align = algn
                    pad_left = lvl * 12
                    mb = "2pt" if p_idx < len(p_elems) - 1 else "0"
                    p_style = f"margin:0 0 {mb} {pad_left}pt;line-height:1.18;text-align:{algn};font-family:sans-serif;"
                    body_chunks.append(f'<p style="{p_style}">{bullet}{"".join(spans)}</p>')

            if not body_chunks:
                return ("", 0.0, "left")
            return (f'<div style="font-family:sans-serif;">{"".join(body_chunks)}</div>', max_font_pt or base_pt, dominant_align)

        def draw_table(page, rect: fitz.Rect, tbl_elem):
            grid = _find_child(tbl_elem, "tblGrid")
            col_widths = []
            if grid is not None:
                for gc in grid:
                    if gc.tag.endswith("}gridCol"):
                        try:
                            col_widths.append(max(1.0, int(gc.attrib.get("w", "914400")) / _EMU_PER_PT))
                        except ValueError:
                            col_widths.append(80.0)
            rows = [r for r in tbl_elem if r.tag.endswith("}tr")]
            if not rows or not col_widths:
                return
            total_cw = sum(col_widths) or rect.width
            scale_x = rect.width / total_cw
            col_widths = [w * scale_x for w in col_widths]

            row_heights = []
            for r in rows:
                try:
                    row_heights.append(max(16.0, int(r.attrib.get("h", "370840")) / _EMU_PER_PT))
                except ValueError:
                    row_heights.append(24.0)
            total_rh = sum(row_heights)
            if total_rh > rect.height and total_rh > 0:
                scale_y = rect.height / total_rh
                row_heights = [h * scale_y for h in row_heights]

            cur_y = rect.y0
            for r_idx, tr in enumerate(rows):
                rh = row_heights[r_idx]
                tcs = [tc for tc in tr if tc.tag.endswith("}tc")]
                cur_x = rect.x0
                c_idx = 0
                for tc in tcs:
                    if c_idx >= len(col_widths):
                        break
                    span = 1
                    try:
                        span = max(1, int(tc.attrib.get("gridSpan", "1")))
                    except ValueError:
                        span = 1
                    cw = sum(col_widths[c_idx:c_idx + span])
                    cell_rect = fitz.Rect(cur_x, cur_y, cur_x + cw, cur_y + rh)
                    tc_pr = _find_child(tc, "tcPr")
                    fill_rgb = None
                    if tc_pr is not None:
                        sf = _find_child(tc_pr, "solidFill")
                        if sf is not None:
                            fill_rgb = _extract_solid_color(sf, theme_colors)
                    page.draw_rect(cell_rect, color=(0.78, 0.82, 0.88), fill=fill_rgb, width=0.6)
                    tx_body = _find_child(tc, "txBody")
                    if tx_body is not None:
                        html_str, _, _ = build_html_from_txbody(
                            tx_body,
                            {"font_size": 10.5, "rgb": (0.12, 0.16, 0.23), "bold": r_idx == 0},
                            fill_rgb,
                        )
                        if html_str:
                            inner = fitz.Rect(cell_rect.x0 + 3, cell_rect.y0 + 2, cell_rect.x1 - 3, cell_rect.y1 - 2)
                            if inner.width > 4 and inner.height > 4:
                                page.insert_htmlbox(inner, html_str, scale_low=0.5)
                    cur_x += cw
                    c_idx += span
                cur_y += rh

        def render_node(page, node, xml_path: str, ph_map: dict, grp_tx=None, slide_number: int = 1):
            tag = node.tag.split("}")[-1]
            if tag == "grpSp":
                grp_pr = _find_child(node, "grpSpPr")
                xfrm = _find_child(grp_pr, "xfrm")
                next_tx = grp_tx
                if xfrm is not None:
                    off = _find_child(xfrm, "off")
                    ext = _find_child(xfrm, "ext")
                    ch_off = _find_child(xfrm, "chOff")
                    ch_ext = _find_child(xfrm, "chExt")
                    if None not in (off, ext, ch_off, ch_ext):
                        try:
                            gx = int(off.attrib.get("x", "0")) / _EMU_PER_PT
                            gy = int(off.attrib.get("y", "0")) / _EMU_PER_PT
                            gw = int(ext.attrib.get("cx", "0")) / _EMU_PER_PT
                            gh = int(ext.attrib.get("cy", "0")) / _EMU_PER_PT
                            cx0 = int(ch_off.attrib.get("x", "0")) / _EMU_PER_PT
                            cy0 = int(ch_off.attrib.get("y", "0")) / _EMU_PER_PT
                            ccw = int(ch_ext.attrib.get("cx", "0")) / _EMU_PER_PT
                            cch = int(ch_ext.attrib.get("cy", "0")) / _EMU_PER_PT
                            gx, gy, gw, gh = transform_box((gx, gy, gw, gh), grp_tx)
                            next_tx = (gx, gy, gw, gh, cx0, cy0, ccw, cch)
                        except ValueError:
                            pass
                for child in node:
                    ctag = child.tag.split("}")[-1]
                    if ctag in ("sp", "pic", "grpSp", "graphicFrame"):
                        render_node(page, child, xml_path, ph_map, next_tx, slide_number)
                return

            if tag == "pic":
                sp_pr = _find_child(node, "spPr")
                box = _parse_xfrm_box(sp_pr)
                if box is None:
                    return
                x, y, w, h = transform_box(box, grp_tx)
                if w <= 1 or h <= 1:
                    return
                bf = _find_child(node, "blipFill")
                blip = _find_child(bf, "blip") if bf is not None else None
                if blip is not None and _R_REL_ATTR in blip.attrib:
                    rid = blip.attrib[_R_REL_ATTR]
                    rel_entry = get_rels(xml_path).get(rid)
                    if rel_entry and rel_entry[1] in zf.namelist():
                        try:
                            page.insert_image(
                                fitz.Rect(x, y, x + w, y + h),
                                stream=zf.read(rel_entry[1]),
                                keep_proportion=False,
                            )
                        except Exception:
                            pass
                return

            if tag == "graphicFrame":
                xfrm = _find_child(node, "xfrm")
                box = None
                if xfrm is not None:
                    off = _find_child(xfrm, "off")
                    ext = _find_child(xfrm, "ext")
                    if off is not None and ext is not None:
                        try:
                            box = (
                                int(off.attrib.get("x", "0")) / _EMU_PER_PT,
                                int(off.attrib.get("y", "0")) / _EMU_PER_PT,
                                int(ext.attrib.get("cx", "0")) / _EMU_PER_PT,
                                int(ext.attrib.get("cy", "0")) / _EMU_PER_PT,
                            )
                        except ValueError:
                            box = None
                if box is None:
                    return
                x, y, w, h = transform_box(box, grp_tx)
                if w <= 2 or h <= 2:
                    return
                tbl_elem = None
                for el in node.iter():
                    if el.tag.endswith("}tbl"):
                        tbl_elem = el
                        break
                if tbl_elem is not None:
                    draw_table(page, fitz.Rect(x, y, x + w, y + h), tbl_elem)
                return

            if tag == "sp":
                nv_sp_pr = _find_child(node, "nvSpPr")
                nv_pr = _find_child(nv_sp_pr, "nvPr")
                ph = _find_child(nv_pr, "ph")
                ph_type = ph.attrib.get("type") if ph is not None else None
                ph_idx = ph.attrib.get("idx") if ph is not None else None
                ph_style = dict(lookup_ph(ph_map, ph_type, ph_idx) or {})
                if ph_type and "type" not in ph_style:
                    ph_style["type"] = ph_type

                sp_pr = _find_child(node, "spPr")
                box = _parse_xfrm_box(sp_pr) or ph_style.get("box")
                if box is None:
                    return
                x, y, w, h = transform_box(box, grp_tx)
                if w + h <= 0.5:
                    return
                rect = fitz.Rect(x, y, x + max(w, 0.5), y + max(h, 0.5))

                fill_rgb = None
                if sp_pr is not None and _find_child(sp_pr, "noFill") is None:
                    sf = _find_child(sp_pr, "solidFill")
                    if sf is not None:
                        fill_rgb = _extract_solid_color(sf, theme_colors)
                    else:
                        style = _find_child(node, "style")
                        fill_ref = _find_child(style, "fillRef") if style is not None else None
                        if fill_ref is not None and fill_ref.attrib.get("idx", "0") != "0":
                            fill_rgb = _extract_solid_color(fill_ref, theme_colors)

                stroke_rgb = None
                stroke_w = 0.75
                ln = _find_child(sp_pr, "ln") if sp_pr is not None else None
                if ln is not None and _find_child(ln, "noFill") is None:
                    ln_sf = _find_child(ln, "solidFill")
                    if ln_sf is not None:
                        stroke_rgb = _extract_solid_color(ln_sf, theme_colors)
                    if "w" in ln.attrib:
                        try:
                            stroke_w = max(0.5, int(ln.attrib["w"]) / _EMU_PER_PT)
                        except ValueError:
                            pass

                cust_geom = _find_child(sp_pr, "custGeom") if sp_pr is not None else None
                prst_geom = _find_child(sp_pr, "prstGeom") if sp_pr is not None else None
                prst = prst_geom.attrib.get("prst", "rect") if prst_geom is not None else "rect"

                if fill_rgb is not None or stroke_rgb is not None:
                    drew_custom = False
                    if cust_geom is not None:
                        try:
                            drew_custom = draw_cust_geom(page, x, y, w, h, cust_geom, fill_rgb, stroke_rgb, stroke_w)
                        except Exception:
                            drew_custom = False
                    if not drew_custom:
                        try:
                            if prst == "ellipse":
                                page.draw_oval(rect, color=stroke_rgb, fill=fill_rgb, width=stroke_w)
                            elif prst == "roundRect":
                                page.draw_rect(rect, color=stroke_rgb, fill=fill_rgb, width=stroke_w, radius=0.08)
                            elif prst == "line" or w <= 0.2 or h <= 0.2:
                                page.draw_line(fitz.Point(x, y), fitz.Point(x + w, y + h), color=stroke_rgb or fill_rgb, width=stroke_w)
                            else:
                                page.draw_rect(rect, color=stroke_rgb, fill=fill_rgb, width=stroke_w)
                        except Exception:
                            page.draw_rect(rect, color=stroke_rgb, fill=fill_rgb, width=stroke_w)

                tx_body = _find_child(node, "txBody")
                if tx_body is not None:
                    html_str, max_font_pt, dominant_align = build_html_from_txbody(tx_body, ph_style, fill_rgb, slide_number)
                    if html_str:
                        body_pr = _find_child(tx_body, "bodyPr")
                        try:
                            ins_l = float(body_pr.attrib["lIns"]) / _EMU_PER_PT if body_pr is not None and "lIns" in body_pr.attrib else 3.0
                        except ValueError:
                            ins_l = 3.0
                        try:
                            ins_t = float(body_pr.attrib["tIns"]) / _EMU_PER_PT if body_pr is not None and "tIns" in body_pr.attrib else 1.5
                        except ValueError:
                            ins_t = 1.5
                        try:
                            ins_r = float(body_pr.attrib["rIns"]) / _EMU_PER_PT if body_pr is not None and "rIns" in body_pr.attrib else 3.0
                        except ValueError:
                            ins_r = 3.0
                        try:
                            ins_b = float(body_pr.attrib["bIns"]) / _EMU_PER_PT if body_pr is not None and "bIns" in body_pr.attrib else 1.5
                        except ValueError:
                            ins_b = 1.5

                        ix0 = x + ins_l
                        iy0 = y + ins_t
                        iw = max(1.0, w - ins_l - ins_r)
                        ih = max(1.0, h - ins_t - ins_b)

                        if fill_rgb is None and stroke_rgb is None:
                            min_w = max(iw + 6.0, 36.0)
                            if dominant_align == "center":
                                cx = ix0 + iw / 2.0
                                ix0 = cx - min_w / 2.0
                                ix1 = cx + min_w / 2.0
                            elif dominant_align == "right":
                                ix1 = ix0 + iw
                                ix0 = ix1 - min_w
                            else:
                                ix1 = ix0 + min_w
                            min_h = max(ih + 6.0, max_font_pt * 1.65)
                            iy1 = iy0 + min_h
                        else:
                            ix1 = ix0 + iw
                            iy1 = iy0 + max(ih, max_font_pt * 1.4)

                        inner = fitz.Rect(ix0, iy0, ix1, iy1)
                        try:
                            if hasattr(page, "insert_htmlbox"):
                                page.insert_htmlbox(inner, html_str, scale_low=0.5)
                            else:
                                plain = re.sub(r"<[^>]+>", " ", html_str)
                                page.insert_textbox(inner, plain, fontsize=max_font_pt or 12)
                        except Exception:
                            pass

        rendered_slides = []
        for idx, sf in enumerate(slide_files):
            slide_root = get_xml(sf)
            slide_rels = get_rels(sf)

            layout_path = None
            master_path = None
            for _, (rtype, target) in slide_rels.items():
                if rtype.endswith("/slideLayout") and target in zf.namelist():
                    layout_path = target
                    break
            if layout_path:
                for _, (rtype, target) in get_rels(layout_path).items():
                    if rtype.endswith("/slideMaster") and target in zf.namelist():
                        master_path = target
                        break

            ph_map = {}
            master_statics = []
            master_bg = None
            if master_path:
                m_ph, master_statics, master_bg = collect_placeholders_and_bg(master_path)
                ph_map.update(m_ph)

            layout_statics = []
            layout_bg = None
            if layout_path:
                l_ph, layout_statics, layout_bg = collect_placeholders_and_bg(layout_path)
                for k, v in l_ph.items():
                    merged = dict(ph_map.get(k, {}))
                    for sub_k, sub_v in v.items():
                        if sub_v is not None and sub_v is not False:
                            merged[sub_k] = sub_v
                    ph_map[k] = merged

            doc = fitz.open()
            try:
                page = doc.new_page(width=slide_w, height=slide_h)
                page.draw_rect(fitz.Rect(0, 0, slide_w, slide_h), color=None, fill=(1.0, 1.0, 1.0))

                c_sld = _find_child(slide_root, "cSld")
                slide_bg = _find_child(c_sld, "bg") if c_sld is not None else None
                if not render_background(page, slide_bg, sf):
                    if not (layout_path and render_background(page, layout_bg, layout_path)):
                        if master_path:
                            render_background(page, master_bg, master_path)

                slide_number = idx + 1
                show_master = slide_root.attrib.get("showMasterSp", "1") != "0"
                if show_master:
                    for st_node, st_path in master_statics:
                        render_node(page, st_node, st_path, ph_map, None, slide_number)
                for st_node, st_path in layout_statics:
                    render_node(page, st_node, st_path, ph_map, None, slide_number)

                sp_tree = _find_child(c_sld, "spTree") if c_sld is not None else None
                if sp_tree is not None:
                    for child in sp_tree:
                        ctag = child.tag.split("}")[-1]
                        if ctag in ("sp", "pic", "grpSp", "graphicFrame"):
                            render_node(page, child, sf, ph_map, None, slide_number)

                image_path = os.path.join(temp_dir, f"slide_{slide_number}.jpg")
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                pix.save(image_path)
            finally:
                doc.close()

            extracted_text = _extract_slide_paragraphs(slide_root)
            rendered_slides.append({
                "slide_number": idx + 1,
                "image_path": image_path,
                "extracted_text": extracted_text or f"Slide {idx + 1}",
            })

        return rendered_slides
    finally:
        zf.close()


def process_file_task(file_path: str, lecture_id: str, user_id: str, is_pptx: bool):
    temp_dir = os.path.dirname(file_path)
    with _conversion_lock:
        if lecture_id in _active_lecture_conversions:
            print(f"[Converter] Conversion already active for lecture {lecture_id}; skipping duplicate task.")
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            return
        _active_lecture_conversions.add(lecture_id)

    try:
        pdf_path = file_path
        direct_pptx_slides = None
        if is_pptx:
            # PPTX-to-PDF conversion via LibreOffice
            import subprocess
            print(f"Converting PPTX to PDF via LibreOffice: {file_path}")
            try:
                cmd = "libreoffice"
                if os.name == 'nt':
                    if shutil.which("soffice"):
                        cmd = "soffice"
                    elif os.path.exists(r"C:\Program Files\LibreOffice\program\soffice.exe"):
                        cmd = r"C:\Program Files\LibreOffice\program\soffice.exe"
                    else:
                        cmd = "soffice"

                profile_uri = "file:///" + os.path.join(temp_dir, "lo_profile").replace("\\", "/").lstrip("/")
                result = subprocess.run(
                    [cmd, "--headless", "--norestore", f"-env:UserInstallation={profile_uri}", "--convert-to", "pdf", file_path, "--outdir", temp_dir],
                    capture_output=True, text=True, timeout=120
                )
                if result.returncode == 0:
                    converted_pdf = os.path.join(temp_dir, os.path.splitext(os.path.basename(file_path))[0] + ".pdf")
                    if os.path.exists(converted_pdf):
                        pdf_path = converted_pdf
                    else:
                        raise RuntimeError("LibreOffice output PDF not found")
                else:
                    raise RuntimeError(f"LibreOffice conversion failed: {result.stderr}")
            except Exception as lo_err:
                print(f"LibreOffice conversion unavailable/failed: {lo_err}. Rendering PPTX slides via PyMuPDF fallback...")
                direct_pptx_slides = render_pptx_with_pymupdf(file_path, temp_dir)

        slides_to_process = []
        if direct_pptx_slides is not None:
            slides_to_process = direct_pptx_slides
        else:
            print(f"Extracting slides from PDF: {pdf_path}")
            doc = fitz.open(pdf_path)
            try:
                for i in range(len(doc)):
                    page = doc.load_page(i)
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                    slide_number = i + 1
                    image_path = os.path.join(temp_dir, f"slide_{slide_number}.jpg")
                    pix.save(image_path)
                    extracted_text = page.get_text("text").strip()
                    slides_to_process.append({
                        "slide_number": slide_number,
                        "image_path": image_path,
                        "extracted_text": extracted_text
                    })
            finally:
                doc.close()

        print(f"Extracted {len(slides_to_process)} slide images. Syncing to Supabase and Cloudinary concurrently...")
        try:
            supabase.table("lectures").update({"slide_count": len(slides_to_process)}).eq("id", lecture_id).execute()
        except Exception as e:
            print(f"Failed to update slide count: {e}")

        # Fetch existing slide rows to update in-place instead of inserting duplicates
        existing_by_num = {}
        try:
            existing_res = (
                supabase.table("slides")
                .select("id, slide_number, image_url, raw_text")
                .eq("lecture_id", lecture_id)
                .execute()
            )
            grouped = {}
            for row in (existing_res.data or []):
                try:
                    num = int(row.get("slide_number") or 0)
                except Exception:
                    continue
                if num > 0:
                    grouped.setdefault(num, []).append(row)

            for num, rows in grouped.items():
                rows.sort(
                    key=lambda r: 0
                    if (
                        isinstance(r.get("image_url"), str)
                        and r["image_url"].startswith("http")
                        and "placeholder" not in r["image_url"].lower()
                        and "dwyxspqbe" not in r["image_url"].lower()
                    )
                    else 1
                )
                existing_by_num[num] = rows[0]
                for extra in rows[1:]:
                    try:
                        supabase.table("slides").delete().eq("id", extra["id"]).execute()
                    except Exception:
                        pass
                if num > len(slides_to_process):
                    try:
                        supabase.table("slides").delete().eq("id", rows[0]["id"]).execute()
                        existing_by_num.pop(num, None)
                    except Exception:
                        pass
        except Exception as fetch_existing_err:
            print(f"Warning fetching existing slides for upsert: {fetch_existing_err}")

        def is_valid_slide_url(u: Optional[str]) -> bool:
            if not u or not isinstance(u, str) or not u.startswith("http"):
                return False
            low = u.lower()
            return "placeholder" not in low and "dwyxspqbe" not in low and "example.com" not in low

        def process_single_slide(slide_info):
            sn = slide_info["slide_number"]
            img_path = slide_info["image_path"]
            existing_row = existing_by_num.get(sn)

            # 1. Upload slide image to Cloudinary only when a rendered image file exists
            image_url = ""
            if img_path and os.path.exists(img_path):
                for attempt in range(2):
                    try:
                        response = cloudinary.uploader.upload(
                            img_path,
                            folder=f"unistudy/{user_id}/slides/{lecture_id}/",
                            format="webp",
                            quality="auto:good",
                            timeout=20
                        )
                        image_url = response.get("secure_url", "")
                        break
                    except Exception as upload_err:
                        if attempt == 1:
                            print(f"Warning: Cloudinary upload failed for slide {sn}: {upload_err}")
                            image_url = ""
                        else:
                            import time
                            time.sleep(1)

            if not is_valid_slide_url(image_url):
                if existing_row and is_valid_slide_url(existing_row.get("image_url")):
                    image_url = existing_row["image_url"]
                else:
                    image_url = "https://example.com/placeholder.png"

            # 2. Text extraction (direct from document structure, instant and 100% accurate)
            raw_text = slide_info.get("extracted_text", "") or f"Slide {sn}"
            explanation = ""

            slide_record = {
                "lecture_id": lecture_id,
                "slide_number": sn,
                "raw_text": raw_text,
                "explanation": explanation,
                "image_url": image_url
            }

            try:
                if existing_row:
                    update_fields = {"image_url": image_url}
                    if raw_text and raw_text != f"Slide {sn}":
                        update_fields["raw_text"] = raw_text
                    supabase.table("slides").update(update_fields).eq("id", existing_row["id"]).execute()
                    print(f"Updated slide {sn} image in DB.")
                else:
                    supabase.table("slides").insert(slide_record).execute()
                    print(f"Inserted slide {sn} into DB.")
            except Exception as e:
                print(f"Error saving slide {sn} into DB: {e}")
            return slide_record

        slides_to_insert = []
        import concurrent.futures
        
        # Max 8 workers for fast concurrent Cloudinary upload
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            future_to_slide = {executor.submit(process_single_slide, slide): slide for slide in slides_to_process}
            for future in concurrent.futures.as_completed(future_to_slide):
                try:
                    result = future.result()
                    if result:
                        slides_to_insert.append(result)
                except Exception as exc:
                    print(f"Slide processing generated an exception: {exc}")

        final_count = len(slides_to_insert)
        print(f"Finished processing all slides. Total slides inserted: {final_count}")
        try:
            supabase.table("lectures").update({
                "processing": False,
                "slide_count": final_count if final_count > 0 else len(slides_to_process)
            }).eq("id", lecture_id).execute()
        except Exception as e:
            print(f"Error finalizing lecture processing status: {e}")

    except RuntimeError as re:
        err_msg = str(re)
        print(f"Runtime error processing file: {err_msg}")
        import traceback
        traceback.print_exc()
        try:
            supabase.table("lectures").update({"processing": False}).eq("id", lecture_id).execute()
        except Exception as upd_err:
            print(f"Failed to clear processing state on error: {upd_err}")
    except Exception as e:
        print(f"Unexpected error processing file: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            supabase.table("lectures").update({"processing": False}).eq("id", lecture_id).execute()
        except Exception as upd_err:
            print(f"Failed to clear processing state on error: {upd_err}")
    finally:
        with _conversion_lock:
            _active_lecture_conversions.discard(lecture_id)
        # Always guarantee lecture processing is unblocked
        try:
            supabase.table("lectures").update({"processing": False}).eq("id", lecture_id).execute()
        except Exception:
            pass
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


@app.post("/convert", dependencies=[Depends(verify_converter_secret)])
async def convert_document(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    file_url: Optional[str] = Form(None),
    lecture_id: str = Form(...),
    user_id: str = Form(...)
):
    """
    Endpoint to receive a PDF/PPTX file or Cloudinary file_url, 
    convert it to slide images, upload to Cloudinary, and notify the main app.
    """
    with _conversion_lock:
        if lecture_id in _active_lecture_conversions:
            return {"status": "already processing", "lecture_id": lecture_id}

    # Create temp directory — use tempfile.gettempdir() for cross-platform support (Windows/Linux)
    import tempfile
    import urllib.parse
    temp_dir = os.path.join(tempfile.gettempdir(), str(uuid.uuid4()))
    os.makedirs(temp_dir, exist_ok=True)
    
    if file_url:
        parsed_url = urllib.parse.urlparse(file_url)
        clean_filename = os.path.basename(parsed_url.path) or "lecture.pdf"
        file_path = os.path.join(temp_dir, clean_filename)
        
        # Fast streaming download directly from Cloudinary CDN
        resp = requests.get(file_url, stream=True, timeout=60)
        resp.raise_for_status()
        with open(file_path, "wb") as buffer:
            for chunk in resp.iter_content(chunk_size=65536):
                buffer.write(chunk)
        is_pptx = clean_filename.lower().endswith('.pptx')
    elif file and file.filename:
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        is_pptx = file.filename.lower().endswith('.pptx')
    else:
        raise HTTPException(status_code=400, detail="Either file or file_url must be provided.")

    # Process in background so we don't block the HTTP response
    background_tasks.add_task(process_file_task, file_path, lecture_id, user_id, is_pptx)
    
    return {"status": "processing started", "lecture_id": lecture_id}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Low-priority free-tier endpoint (e.g., quotes, nudges)

@app.post("/low-priority", dependencies=[Depends(verify_converter_secret)])
async def low_priority_endpoint(body: LowPriorityRequest):
    """Handle low-priority free-tier text tasks via OpenRouter.
    Uses the free Llama-3-8B model by default. Quota is tracked under the
    `low_priority` category.
    """
    payload = {
        "model": "meta-llama/llama-3-8b-instruct:free",
        "messages": [{"role": "user", "content": body.prompt}],
    }
    return execute_ai_task(
        user_id=body.user_id,
        category="low_priority",
        payload=payload,
        provider_func=openrouter_low_priority,
    )

# ------------------------------------------------------------
# Vision endpoint – uses Gemini Flash (layer 1)
# ------------------------------------------------------------
@app.post("/vision", dependencies=[Depends(verify_converter_secret)])
async def vision_endpoint(body: VisionRequest):
    """Handle vision tasks (slide-explanation, PDF parsing, etc.).
    The caller must supply a base64-encoded PDF or image and a prompt.
    """
    payload = {
        "prompt": body.prompt,
        "mime_type": body.mime_type,
        "base64pdf": body.base64pdf,
    }
    try:
        return execute_ai_task(
            user_id=body.user_id,
            category="vision",
            payload=payload,
            provider_func=gemini_vision,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except Exception as exc:
        import traceback
        trace = traceback.format_exc()
        print("VISION ENDPOINT ERROR:", trace)
        raise HTTPException(status_code=500, detail={"error": str(exc), "trace": trace})

# ------------------------------------------------------------
# Streaming endpoint – uses Groq 70B (real‑time)
# ------------------------------------------------------------
@app.post("/stream", dependencies=[Depends(verify_converter_secret)])
async def stream_endpoint(body: StreamRequest):
    """Real-time chat / calculator via Groq 70B.
    ``messages`` should be a list of ``{"role":…, "content":…}`` objects.
    """
    payload = {"messages": body.messages}
    try:
        return execute_ai_task(
            user_id=body.user_id,
            category="streaming",
            payload=payload,
            provider_func=groq70b,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=429, detail=str(exc))

# ------------------------------------------------------------
# Generate endpoint – batch text generation (uses Gemini Flash)
# ------------------------------------------------------------
@app.post("/generate", dependencies=[Depends(verify_converter_secret)])
async def generate_endpoint(body: GenerateRequest):
    """Batch text generation (flashcards, summaries, etc.)."""
    payload = {"prompt": body.prompt}
    try:
        return execute_ai_task(
            user_id=body.user_id,
            category="generation",
            payload=payload,
            provider_func=gemini_vision,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=429, detail=str(exc))

# ------------------------------------------------------------
# Rerank endpoint – uses Cohere for relevance scoring (internal only)
# ------------------------------------------------------------
@app.post("/rerank", dependencies=[Depends(verify_converter_secret)])
async def rerank_endpoint(body: RerankRequest):
    """Rerank a list of candidate documents using Cohere.
    Returns the reordered list (top_n) with scores.
    """
    payload = {
        "query": body.query,
        "documents": body.documents,
        "model": body.model,
        "top_n": body.top_n,
    }
    try:
        return execute_ai_task(
            user_id=body.user_id,
            category="rerank",
            payload=payload,
            provider_func=cohere_rerank,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=429, detail=str(exc))

# ------------------------------------------------------------
# Embed / search endpoint – uses HuggingFace (no quota limit)
# ------------------------------------------------------------
@app.post("/embed", dependencies=[Depends(verify_converter_secret)])
async def embed_endpoint(
    user_id: str = Form(...),
    model: str = Form(...),
    inputs: str = Form(...),
):
    """Call HuggingFace for embeddings or other feature‑extraction tasks.
    ``inputs`` is a JSON‑encoded value compatible with the selected model.
    """
    try:
        payload = {
            "model": model,
            "inputs": json.loads(inputs),
            "url": "https://api-inference.huggingface.co/pipeline/feature-extraction",
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in inputs field")
    return execute_ai_task(
        user_id=user_id,
        category="search",
        payload=payload,
        provider_func=huggingface_search,
    )

# Ollama extraction helper – can be used by other services
# Vision extraction moved to Gemini. The function is no longer needed.
# If required, a similar wrapper can be implemented using the appropriate provider.

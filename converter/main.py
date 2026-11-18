import os
import json
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

def process_file_task(file_path: str, lecture_id: str, user_id: str, is_pptx: bool):
    temp_dir = os.path.dirname(file_path)
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
                    import shutil
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
                print(f"LibreOffice conversion unavailable/failed: {lo_err}. Using direct PPTX slide extraction...")
                # Fallback: Direct PPTX XML text extraction
                import zipfile, re
                import xml.etree.ElementTree as ET
                zf = zipfile.ZipFile(file_path, 'r')
                slide_files = [f for f in zf.namelist() if re.match(r'ppt/slides/slide\d+\.xml', f)]
                def get_num(name):
                    m = re.search(r'slide(\d+)\.xml', name)
                    return int(m.group(1)) if m else 0
                slide_files.sort(key=get_num)
                direct_pptx_slides = []
                for idx, sf in enumerate(slide_files):
                    xml_content = zf.read(sf)
                    root = ET.fromstring(xml_content)
                    texts = [elem.text for elem in root.iter() if elem.tag.endswith('}t') and elem.text]
                    slide_text = '\n'.join([t.strip() for t in texts if t.strip()])
                    direct_pptx_slides.append({
                        "slide_number": idx + 1,
                        "image_path": "",
                        "extracted_text": slide_text or f"Slide {idx + 1}"
                    })

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
        # Always guarantee lecture processing is unblocked
        try:
            supabase.table("lectures").update({"processing": False}).eq("id", lecture_id).execute()
        except Exception:
            pass
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


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

import os
import sys
import re
import tempfile
import requests
import fitz  # PyMuPDF
import win32com.client
import cloudinary
import cloudinary.uploader
from supabase import create_client, Client
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend', '.env.local'))

_cloud_key = os.getenv('CLOUDINARY_API_KEY')
_cloud_secret = os.getenv('CLOUDINARY_API_SECRET')
if not _cloud_key or not _cloud_secret:
    print('[Error] Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET')
    sys.exit(1)

cloudinary.config(
    cloud_name=os.getenv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME') or os.getenv('CLOUDINARY_CLOUD_NAME') or 'dtauhhlve',
    api_key=_cloud_key,
    api_secret=_cloud_secret
)

# Supabase Setup (service role only; the anon key cannot update other users' slides)
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print('[Error] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def is_real_image(url) -> bool:
    if not isinstance(url, str) or not url.startswith('http'):
        return False
    lowered = url.lower()
    return not any(marker in lowered for marker in ('placeholder', 'dwyxspqbe', 'example.com'))

def export_pptx_slides(pptx_path: str, output_dir: str):
    """Exports every slide in a PPTX file to JPG images using native PowerPoint."""
    ppt_app = win32com.client.Dispatch('PowerPoint.Application')
    pres = None
    try:
        pres = ppt_app.Presentations.Open(os.path.abspath(pptx_path), WithWindow=False)
        slide_count = pres.Slides.Count
        print(f'[PPTX] Exporting {slide_count} slides to JPG via PowerPoint...')
        # 17 = ppSaveAsJPG
        pres.SaveAs(os.path.abspath(output_dir), 17)
        return slide_count
    finally:
        if pres:
            pres.Close()
        ppt_app.Quit()

def export_pdf_slides(pdf_path: str, output_dir: str):
    """Exports every page in a PDF file to high-res JPG images using PyMuPDF."""
    doc = fitz.open(pdf_path)
    count = len(doc)
    print(f'[PDF] Exporting {count} pages to JPG via PyMuPDF (2x scale)...')
    for i in range(count):
        page = doc.load_page(i)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_file = os.path.join(output_dir, f"Slide{i + 1}.JPG")
        pix.save(img_file)
    doc.close()
    return count

def upload_single_slide(args):
    img_path, lecture_id, slide_num = args
    try:
        res = cloudinary.uploader.upload(
            img_path,
            folder=f"unistudy/slides/{lecture_id}/",
            public_id=f"slide_{slide_num}",
            format="webp",
            quality="auto:good",
            overwrite=True,
            timeout=25
        )
        return slide_num, res.get('secure_url', '')
    except Exception as e:
        print(f"[Upload Error] Slide {slide_num} upload failed: {e}")
        return slide_num, ''

def process_lecture(lecture_id: str):
    print(f"\n=======================================================")
    print(f"[SlideGen] Processing lecture: {lecture_id}")

    lec_res = supabase.table('lectures').select('id, title, file_url, slide_count').eq('id', lecture_id).single().execute()
    lecture = lec_res.data
    if not lecture or not lecture.get('file_url'):
        print(f"[Error] Lecture {lecture_id} not found or missing file_url")
        return

    file_url = lecture['file_url']
    title = lecture['title']
    is_pptx = '.pptx' in file_url.lower() or '.ppt' in file_url.lower() or '.pptx' in title.lower()

    print(f"[SlideGen] Title: {title} | Type: {'PPTX' if is_pptx else 'PDF'}")

    temp_dir = tempfile.mkdtemp()
    ext = '.pptx' if is_pptx else '.pdf'
    local_doc_path = os.path.join(temp_dir, f"deck{ext}")
    slides_out_dir = os.path.join(temp_dir, 'slides')
    os.makedirs(slides_out_dir, exist_ok=True)

    try:
        # 1. Download file
        print(f"[SlideGen] Downloading {file_url}...")
        r = requests.get(file_url, timeout=60)
        with open(local_doc_path, 'wb') as f:
            f.write(r.content)
        print(f"[SlideGen] Downloaded {len(r.content):,} bytes")

        # 2. Export slide pictures
        if is_pptx:
            export_pptx_slides(local_doc_path, slides_out_dir)
        else:
            export_pdf_slides(local_doc_path, slides_out_dir)

        # 3. Find exported slide image files
        all_files = os.listdir(slides_out_dir)
        slide_images = [f for f in all_files if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        slide_images.sort(key=natural_sort_key)
        total_slides = len(slide_images)
        print(f"[SlideGen] Found {total_slides} exported slide images.")

        if total_slides == 0:
            print("[SlideGen] No slide images generated.")
            return

        # 4. Upload slide pictures to Cloudinary concurrently
        upload_tasks = []
        for idx, img_name in enumerate(slide_images):
            slide_num = idx + 1
            full_img_path = os.path.join(slides_out_dir, img_name)
            upload_tasks.append((full_img_path, lecture_id, slide_num))

        uploaded_urls = {}
        print(f"[SlideGen] Uploading {total_slides} slide images to Cloudinary concurrently...")
        with ThreadPoolExecutor(max_workers=8) as executor:
            future_to_slide = {executor.submit(upload_single_slide, task): task[2] for task in upload_tasks}
            for future in as_completed(future_to_slide):
                s_num, secure_url = future.result()
                if secure_url:
                    uploaded_urls[s_num] = secure_url

        print(f"[SlideGen] Successfully uploaded {len(uploaded_urls)}/{total_slides} slides to Cloudinary!")

        # 5. Fetch existing slide rows for this lecture in Supabase
        slides_res = supabase.table('slides').select('id, slide_number, image_url').eq('lecture_id', lecture_id).execute()
        existing_slides = slides_res.data or []
        
        # Clean up any duplicate rows for the same slide_number
        from collections import defaultdict
        grouped = defaultdict(list)
        for s in existing_slides:
            try:
                num = int(s['slide_number'])
                grouped[num].append(s)
            except Exception:
                pass
        
        slide_map = {}
        for num, rows in grouped.items():
            # Keep the row that already has a real image; delete every other duplicate.
            rows.sort(key=lambda r: 0 if is_real_image(r.get('image_url')) else 1)
            slide_map[num] = rows[0]['id']
            if len(rows) > 1:
                for extra in rows[1:]:
                    try:
                        supabase.table('slides').delete().eq('id', extra['id']).execute()
                    except Exception as dup_err:
                        print(f"[SlideGen] Could not delete duplicate slide {extra['id']}: {dup_err}")

        print(f"[SlideGen] Updating {len(uploaded_urls)} slide records in Supabase...")
        update_count = 0
        for s_num, img_url in uploaded_urls.items():
            s_num_int = int(s_num)
            if s_num_int in slide_map:
                slide_id = slide_map[s_num_int]
                supabase.table('slides').update({'image_url': img_url}).eq('id', slide_id).execute()
                update_count += 1
            else:
                # Insert missing slide
                supabase.table('slides').insert({
                    'lecture_id': lecture_id,
                    'slide_number': s_num_int,
                    'raw_text': f"Slide {s_num_int}",
                    'explanation': '',
                    'image_url': img_url
                }).execute()
                update_count += 1

        # Also delete any extra placeholder slides if original count was larger than exported count
        for num, s_id in list(slide_map.items()):
            if num > total_slides:
                try:
                    supabase.table('slides').delete().eq('id', s_id).execute()
                except Exception:
                    pass

        # 6. Update lecture slide count and ensure processing is false
        supabase.table('lectures').update({
            'slide_count': total_slides,
            'processing': False
        }).eq('id', lecture_id).execute()

        print(f"[SlideGen] Complete! {update_count} slides now have genuine, high-res pictures on Cloudinary.")

    finally:
        # Cleanup temp directory
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

if __name__ == '__main__':
    if len(sys.argv) > 1:
        target_lecture_id = sys.argv[1]
        process_lecture(target_lecture_id)
    else:
        # Find lectures with placeholder slides
        print("[SlideGen] Finding recent lectures with placeholder slides...")
        res = supabase.table('lectures').select('id, title, file_url').order('created_at', desc=True).limit(40).execute()
        for lec in (res.data or []):
            if not lec.get('file_url'):
                continue
            # Check if this lecture has placeholder slides or no slides
            s_res = supabase.table('slides').select('id, image_url').eq('lecture_id', lec['id']).limit(1).execute()
            sample = s_res.data[0] if s_res.data else None
            is_placeholder = not sample or not sample.get('image_url') or 'placeholder' in sample.get('image_url', '') or 'dwyxspqbe' in sample.get('image_url', '')
            if is_placeholder:
                print(f"[SlideGen] Queueing lecture: {lec['title']} ({lec['id']})")
                try:
                    process_lecture(lec['id'])
                except Exception as err:
                    print(f"[SlideGen Error] Failed processing {lec['title']}: {err}")

import os
import subprocess
import shutil
import uuid
import cloudinary
import cloudinary.uploader
from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks
from pdf2image import convert_from_path

app = FastAPI()

# Cloudinary Config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

def process_file_task(file_path: str, lecture_id: str, user_id: str, is_pptx: bool):
    try:
        temp_dir = os.path.dirname(file_path)
        
        pdf_path = file_path
        if is_pptx:
            # Convert PPTX to PDF using LibreOffice
            print(f"Converting PPTX to PDF: {file_path}")
            subprocess.run([
                "libreoffice", "--headless", "--convert-to", "pdf", 
                file_path, "--outdir", temp_dir
            ], check=True)
            pdf_path = file_path.rsplit('.', 1)[0] + '.pdf'

        # Convert PDF to Images
        print(f"Converting PDF to Images: {pdf_path}")
        images = convert_from_path(pdf_path, dpi=200)

        uploaded_urls = []
        for i, image in enumerate(images):
            slide_number = i + 1
            image_path = os.path.join(temp_dir, f"slide_{slide_number}.png")
            image.save(image_path, "PNG")

            # Upload to Cloudinary
            response = cloudinary.uploader.upload(
                image_path,
                folder=f"unistudy/{user_id}/slides/{lecture_id}/"
            )
            uploaded_urls.append({
                "slide_number": slide_number,
                "url": response["secure_url"]
            })

        print(f"Successfully processed {len(uploaded_urls)} slides for lecture {lecture_id}")
        
        # Here we would normally ping the main Next.js API to let it know the images are ready.
        # e.g., requests.post("MAIN_API_URL/api/lectures/callback", json={...})

    except Exception as e:
        print(f"Error processing file: {str(e)}")
    finally:
        # Cleanup temp directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


@app.post("/convert")
async def convert_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    lecture_id: str = Form(...),
    user_id: str = Form(...)
):
    """
    Endpoint to receive a PDF/PPTX file, convert it to slide images, 
    upload to Cloudinary, and notify the main app.
    """
    # Create temp directory
    temp_dir = os.path.join("/tmp", str(uuid.uuid4()))
    os.makedirs(temp_dir, exist_ok=True)
    
    file_path = os.path.join(temp_dir, file.filename)
    
    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    is_pptx = file.filename.lower().endswith('.pptx')

    # Process in background so we don't block the HTTP response
    background_tasks.add_task(process_file_task, file_path, lecture_id, user_id, is_pptx)
    
    return {"status": "processing started", "lecture_id": lecture_id}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

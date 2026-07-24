import sys
from PIL import Image, ImageChops

def crop_background(image_path):
    print(f"Processing {image_path}...")
    try:
        im = Image.open(image_path)
        # Convert to RGB if necessary
        if im.mode != 'RGB':
            im = im.convert('RGB')
        
        # Determine background color (assume top-left pixel is background)
        bg_color = im.getpixel((0, 0))
        
        # Create a background image
        bg = Image.new(im.mode, im.size, bg_color)
        
        # Get difference between image and background
        diff = ImageChops.difference(im, bg)
        diff = ImageChops.add(diff, diff, 2.0, -100)
        
        # Get bounding box
        bbox = diff.getbbox()
        
        if bbox:
            print(f"  Cropping from {im.size} to bbox {bbox}")
            cropped_im = im.crop(bbox)
            cropped_im.save(image_path)
        else:
            print("  No bounding box found (image might be solid color).")
    except Exception as e:
        print(f"  Failed: {e}")

if __name__ == "__main__":
    images = [
        "public/logo.jpeg",
        "public/logo-dark.jpeg",
        "public/logo-splash.jpeg",
        "public/logo-secondary.jpeg",
        "public/app-icon.jpeg"
    ]
    for img in images:
        crop_background(img)

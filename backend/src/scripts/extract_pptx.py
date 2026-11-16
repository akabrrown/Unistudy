import sys
import io
import json
import re
import zipfile
import xml.etree.ElementTree as ET

def extract_pptx_slides(file_path_or_buffer):
    if isinstance(file_path_or_buffer, str):
        zf = zipfile.ZipFile(file_path_or_buffer, 'r')
    else:
        zf = zipfile.ZipFile(io.BytesIO(file_path_or_buffer), 'r')

    slide_files = [f for f in zf.namelist() if re.match(r'ppt/slides/slide\d+\.xml', f)]
    def get_num(name):
        m = re.search(r'slide(\d+)\.xml', name)
        return int(m.group(1)) if m else 0

    slide_files.sort(key=get_num)
    results = []

    for idx, f in enumerate(slide_files):
        xml_content = zf.read(f)
        root = ET.fromstring(xml_content)
        texts = [elem.text for elem in root.iter() if elem.tag.endswith('}t') and elem.text]
        slide_text = '\n'.join([t.strip() for t in texts if t.strip()])
        results.append({
            'slide_number': idx + 1,
            'raw_text': slide_text or f'Slide {idx + 1}',
            'xml_file': f
        })

    return results

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing file path'}))
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        slides = extract_pptx_slides(file_path)
        print(json.dumps({'success': True, 'slides': slides}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

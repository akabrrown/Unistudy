import requests, base64, os, sys
url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
resp = requests.get(url)
resp.raise_for_status()
pdf_bytes = resp.content
b64 = base64.b64encode(pdf_bytes).decode('utf-8')
print(b64)

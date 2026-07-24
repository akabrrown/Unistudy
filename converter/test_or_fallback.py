import os
import requests
import base64
import json
from dotenv import load_dotenv

load_dotenv()
or_key = os.getenv("OPENROUTER_API_KEY")

base64_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" # 1x1 transparent png
prompt = "Extract all text precisely from this slide. Return the result as a JSON object with two keys: 'raw_text' and 'explanation'."

or_url = "https://openrouter.ai/api/v1/chat/completions"
or_headers = {
    "Authorization": f"Bearer {or_key}",
    "HTTP-Referer": "https://unistudy.ai",
    "X-Title": "Unistudy",
    "Content-Type": "application/json"
}
or_data = {
    "model": "google/gemini-2.5-flash",
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
            ]
        }
    ],
    "response_format": {"type": "json_object"}
}

print("Calling OpenRouter...")
res = requests.post(or_url, headers=or_headers, json=or_data)
if not res.ok:
    print(f"FAILED: {res.status_code} - {res.text}")
else:
    print(f"SUCCESS: {res.json()}")

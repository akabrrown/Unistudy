import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const key = process.env.MS_TRANSLATOR_KEY;
const region = process.env.MS_TRANSLATOR_REGION;

if (!key || key === 'your_key_here') {
  console.error("Please set MS_TRANSLATOR_KEY in backend/.env.local");
  process.exit(1);
}

const frontendMessagesDir = path.join(__dirname, '../../frontend/src/messages');
const baseLanguageFile = path.join(frontendMessagesDir, 'en.json');

const TARGET_LANGS = ['fr', 'tw', 'ha', 'yo', 'sw'];

async function translateText(text: string, to: string) {
  const endpoint = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${to}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key!,
      'Ocp-Apim-Subscription-Region': region || 'global',
      'Content-Type': 'application/json',
      'X-ClientTraceId': uuidv4().toString()
    },
    body: JSON.stringify([{ text }])
  });

  const data = await response.json();
  return data[0]?.translations?.[0]?.text || text;
}

async function translateObject(obj: any, to: string): Promise<any> {
  const result: any = {};
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'string') {
      console.log(`Translating: "${obj[k]}" to ${to}...`);
      result[k] = await translateText(obj[k], to);
    } else if (typeof obj[k] === 'object' && obj[k] !== null) {
      result[k] = await translateObject(obj[k], to);
    } else {
      result[k] = obj[k];
    }
  }
  return result;
}

async function main() {
  if (!fs.existsSync(baseLanguageFile)) {
    console.error("Base language file not found:", baseLanguageFile);
    process.exit(1);
  }

  const enData = JSON.parse(fs.readFileSync(baseLanguageFile, 'utf-8'));

  for (const lang of TARGET_LANGS) {
    console.log(`\n=== Generating translations for: ${lang} ===`);
    const translatedData = await translateObject(enData, lang);
    const outFile = path.join(frontendMessagesDir, `${lang}.json`);
    fs.writeFileSync(outFile, JSON.stringify(translatedData, null, 2));
    console.log(`Saved ${outFile}`);
  }
}

main().catch(console.error);

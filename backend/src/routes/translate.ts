import { Router, Request, Response } from 'express'
import { authenticateUser } from '../middleware/auth'

const router = Router()

router.post('/', authenticateUser, async (req: Request, res: Response) => {
  const { text, targetLanguage } = req.body;
  
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Missing text or targetLanguage' });
  }

  const key = process.env.MS_TRANSLATOR_KEY;
  const region = process.env.MS_TRANSLATOR_REGION;

  if (!key || key === 'your_key_here') {
    // Mock translation if key is missing
    console.warn("MS_TRANSLATOR_KEY not set. Using mock translation.");
    return res.json({ translatedText: `[${targetLanguage.toUpperCase()}] ${text}` });
  }

  try {
    const endpoint = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLanguage}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region || 'global',
        'Content-Type': 'application/json',
        'X-ClientTraceId': crypto.randomUUID()
      },
      body: JSON.stringify([{ text }])
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Microsoft Translator error:", data);
      return res.status(500).json({ error: 'Translation API error' });
    }

    const translatedText = data[0]?.translations?.[0]?.text;
    if (!translatedText) {
      return res.status(500).json({ error: 'Failed to extract translated text' });
    }

    res.json({ translatedText });
  } catch (error) {
    console.error("Translation request failed:", error);
    res.status(500).json({ error: 'Internal server error during translation' });
  }
});

export default router;

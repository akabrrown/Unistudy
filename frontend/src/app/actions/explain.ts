'use server'

import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GROQ_SMART_MODELS, GEMINI_CANDIDATE_MODELS, OPENROUTER_CANDIDATE_MODELS } from '../../../../shared/constants/aiModels'

export async function generateSlideExplanation(
  slideText: string,
  level: string = 'Med',
  courseContext: string = 'University Course',
  visionExplanation?: string,
  imageUrl?: string
): Promise<{ explanation: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { explanation: '', error: 'Unauthorized' };
    }

    const cleanText = (slideText && slideText !== 'Text extraction failed.') ? slideText : '';
    const cleanVision = (visionExplanation && visionExplanation !== 'Explanation pending.') ? visionExplanation : '';
    const isSubstantiveText = cleanText.trim().length > 25 && !/^slide\s*\d+$/i.test(cleanText.trim()) && !/^\d+$/.test(cleanText.trim());
    const hasImage = Boolean(imageUrl && !imageUrl.includes('placeholder'));

    const systemPrompt = 'You are an expert university AI tutor. Explain the slide clearly, concisely, and pedagogically in Markdown. Avoid generic introductions. Highlight key terms in bold.';
    const prompt = `Course: ${courseContext}\nStudent Level: ${level}\n\n${cleanText ? `Slide Content:\n"""\n${cleanText}\n"""\n` : ''}${cleanVision ? `Visual Context:\n"""\n${cleanVision}\n"""\n` : ''}Provide a clear, high-yield explanation in under 250 words.`;

    // 1. Fast path: Direct Groq execution (150-300ms) only when substantive text or vision description exists
    // (If the slide only has a slide number like "Slide 12", skip text-only models and use Gemini Vision with the actual image)
    if (process.env.GROQ_API_KEY && (isSubstantiveText || cleanVision || !hasImage)) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          model: GROQ_SMART_MODELS[0] || 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
        });
        const text = completion.choices[0]?.message?.content?.trim();
        if (text) {
          return { explanation: text };
        }
      } catch (groqErr) {
        console.warn('[actions/explain] Groq direct notice, trying next provider:', groqErr);
      }
    }

    // 2. OpenRouter execution (meta-llama/llama-3.3-70b-instruct or qwen/qwen-2.5-72b-instruct)
    if (process.env.OPENROUTER_API_KEY && (isSubstantiveText || cleanVision || !hasImage)) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENROUTER_CANDIDATE_MODELS[0] || 'meta-llama/llama-3.3-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.5,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (orRes.ok) {
          const orData = await orRes.json();
          const text = orData.choices?.[0]?.message?.content?.trim();
          if (text) {
            return { explanation: text };
          }
        }
      } catch (orErr) {
        console.warn('[actions/explain] OpenRouter direct notice:', orErr);
      }
    }

    // 3. Direct Gemini execution (Fast multimodal vision & text)
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        for (const modelName of GEMINI_CANDIDATE_MODELS) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: systemPrompt,
            });

            const parts: any[] = [{ text: prompt }];
            if (imageUrl && !imageUrl.includes('placeholder')) {
              try {
                const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(4000) });
                if (imgRes.ok) {
                  const buf = await imgRes.arrayBuffer();
                  const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
                  parts.push({
                    inlineData: {
                      data: Buffer.from(buf).toString('base64'),
                      mimeType: mimeType.split(';')[0],
                    },
                  });
                }
              } catch {}
            }

            const res = await model.generateContent({ contents: [{ role: 'user', parts }] });
            const text = res.response.text()?.trim();
            if (text) {
              return { explanation: text };
            }
          } catch (modelErr: any) {
            console.warn(`[actions/explain] Gemini ${modelName} notice:`, modelErr?.message || modelErr);
            if (modelErr?.message?.includes('403') || modelErr?.message?.includes('Permission denied')) {
              break;
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[actions/explain] Gemini direct notice:', geminiErr);
      }
    }

    // 4. Backend bridge fallback
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/explain`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ slideText, level, courseContext, visionExplanation, imageUrl }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const text = await res.text();
        // Parse SSE stream if backend streamed event stream
        const lines = text.split('\n\n');
        let full = '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              full += JSON.parse(dataStr);
            } catch {
              full += dataStr;
            }
          }
        }
        if (full) return { explanation: full };
      }
    } catch {}

    return {
      explanation: `### Key Slide Takeaways\n\n${cleanText || 'Review the slide concepts and core formulas highlighted in this section.'}`,
    };
  } catch (error: any) {
    console.error('Explanation API Error:', error);
    return { explanation: '', error: error.message };
  }
}

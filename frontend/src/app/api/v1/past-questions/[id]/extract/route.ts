import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';
import { GEMINI_CANDIDATE_MODELS } from '../../../../../../../../shared/constants/aiModels';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max duration for PDF OCR analysis

const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dtauhhlve',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function extractCourseCode(name: string): string {
  if (!name) return 'EXAM';
  const m = name.match(/([A-Z]{3,4}\s*\d{3})/i);
  return m ? m[1].toUpperCase().replace(/\s+/, ' ') : 'EXAM';
}

function parseYear(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return new Date().getFullYear();
  const m = String(val).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const paperId = params.id;
    const force = req.nextUrl.searchParams.get('force') === 'true';

    if (!paperId) {
      return NextResponse.json({ error: 'Missing past question paper ID' }, { status: 400 });
    }

    const supabase = await createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);

    // 1. If valid UUID and not forced, check if authentic questions are already in Supabase
    if (isUuid && !force) {
      const { data: existingQs } = await supabase
        .from('past_paper_questions')
        .select('*')
        .eq('past_paper_id', paperId)
        .order('question_number', { ascending: true });

      // Reject synthetic placeholders and fallback syllabus fabrications
      const isSynthetic = existingQs?.some((q: any) => 
        q.extracted_topic === 'MCQ|System Architecture' || 
        q.extracted_topic === 'THEORY|General Syllabus Examination' ||
        q.extracted_topic === 'MCQ|Core Topic' ||
        q.extracted_topic === 'THEORY|Advanced Topic' ||
        q.text_content?.includes('Comprehensive Syllabus Examination for') ||
        q.text_content?.includes('In the study of BCPC201') ||
        q.text_content?.includes('Define the fundamental principles and models covered in')
      );

      if (existingQs && existingQs.length > 0 && !isSynthetic) {
        return NextResponse.json({
          success: true,
          cached: true,
          questions: existingQs,
        });
      }

      if (isSynthetic) {
        // Delete stale synthetic questions
        await supabase
          .from('past_paper_questions')
          .delete()
          .eq('past_paper_id', paperId);
      }
    } else if (isUuid && force) {
      await supabase
        .from('past_paper_questions')
        .delete()
        .eq('past_paper_id', paperId);
    }

    // 2. Resolve paper details & direct PDF buffer
    let pdfBuffer: Buffer | null = null;
    let paperTitle = 'Past Examination Paper';
    let courseCode = extractCourseCode(paperId);
    let resolvedPaperRecord: any = null;

    if (isUuid) {
      const { data: pRec } = await supabase
        .from('past_papers')
        .select('*, courses(course_code, title)')
        .eq('id', paperId)
        .maybeSingle();

      if (pRec) {
        resolvedPaperRecord = pRec;
        paperTitle = pRec.title || paperTitle;
        courseCode = pRec.courses?.course_code || pRec.course_code || extractCourseCode(paperTitle);

        // 1. Check pRec.file_url or pRec.pdf_url (Cloudinary or Supabase Storage)
        const targetPdfUrl = pRec.file_url || pRec.pdf_url;
        if (targetPdfUrl) {
          try {
            const pRes = await fetch(targetPdfUrl);
            if (pRes.ok) {
              const buf = await pRes.arrayBuffer();
              if (buf.byteLength > 100) pdfBuffer = Buffer.from(buf);
            }
          } catch (_) {}
        }

        // 2. Check if past_paper_pages has image_url if not resolved from file_url
        if (!pdfBuffer) {
          const { data: pageRows } = await supabase
            .from('past_paper_pages')
            .select('image_url')
            .eq('past_paper_id', pRec.id)
            .limit(1);

          if (pageRows && pageRows.length > 0 && pageRows[0].image_url) {
            try {
              const pRes = await fetch(pageRows[0].image_url);
              if (pRes.ok) {
                const buf = await pRes.arrayBuffer();
                if (buf.byteLength > 100) pdfBuffer = Buffer.from(buf);
              }
            } catch (_) {}
          }
        }
      } else {
        return NextResponse.json(
          { error: 'Past examination paper not found. This paper may have been updated or merged. Please return to your past paper bank.' },
          { status: 404 }
        );
      }
    }

    // 2b. Direct fetch from KLOK if not resolved from Storage
    if (!pdfBuffer) {
      try {
        const klokDownloadUrl = `${KLOK_BASE_URL}/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}&download=1`;
        const kRes = await fetch(klokDownloadUrl, {
          headers: { 'x-klok-api-key': KLOK_API_KEY },
        });
        if (kRes.ok) {
          const buf = await kRes.arrayBuffer();
          if (buf.byteLength > 100) pdfBuffer = Buffer.from(buf);
        }
      } catch (_) {}
    }

    // 2c. Fallback search on KLOK by course code
    if (!pdfBuffer && courseCode && courseCode !== 'EXAM') {
      try {
        const sRes = await fetch(`${KLOK_BASE_URL}/api/v1/past-questions?q=${encodeURIComponent(courseCode.replace(/\s+/g, ''))}`, {
          headers: { 'x-klok-api-key': KLOK_API_KEY },
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          const items: any[] = sData.items || (Array.isArray(sData) ? sData : []);
          if (items.length > 0 && items[0]?.id) {
            const dRes = await fetch(`${KLOK_BASE_URL}/api/v1/past-questions/download?id=${encodeURIComponent(items[0].id)}&download=1`, {
              headers: { 'x-klok-api-key': KLOK_API_KEY },
            });
            if (dRes.ok) {
              const buf = await dRes.arrayBuffer();
              if (buf.byteLength > 100) pdfBuffer = Buffer.from(buf);
            }
          }
        }
      } catch (_) {}
    }

    // 2d. Fallback internal proxy call
    if (!pdfBuffer) {
      try {
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const internalUrl = `${protocol}://${host}/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}`;
        const dlRes = await fetch(internalUrl, {
          headers: { cookie: req.headers.get('cookie') || '' },
        });
        if (dlRes.ok) {
          const arrayBuf = await dlRes.arrayBuffer();
          if (arrayBuf.byteLength > 100) pdfBuffer = Buffer.from(arrayBuf);
        }
      } catch (_) {}
    }

    let extractedQuestions: any[] = [];
    let targetPdfUrl = resolvedPaperRecord?.file_url || resolvedPaperRecord?.pdf_url || '';

    // Query past_paper_pages for image_url if not found directly
    if (!targetPdfUrl && isUuid) {
      try {
        const { data: pageRows } = await supabase
          .from('past_paper_pages')
          .select('image_url')
          .eq('past_paper_id', paperId)
          .limit(1);
        if (pageRows && pageRows.length > 0 && pageRows[0].image_url) {
          targetPdfUrl = pageRows[0].image_url;
        }
      } catch (_) {}
    }

    // If Cloudinary URL points to a raw PDF, we can also extract pages using Cloudinary's pg_N rasterization
    let cloudinaryPdfBase = '';
    if (targetPdfUrl && targetPdfUrl.includes('res.cloudinary.com')) {
      cloudinaryPdfBase = targetPdfUrl;
    }

    // If no Cloudinary URL yet but we have the raw PDF buffer, upload it to Cloudinary
    // so we gain instant page-by-page rasterization capabilities
    if (!cloudinaryPdfBase && pdfBuffer) {
      try {
        const uploadRes = await new Promise<string | null>((resolve) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'unistudy_past_papers',
              resource_type: 'image',
              public_id: `paper_${paperId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`,
              format: 'pdf',
              overwrite: true,
            },
            (error, result) => {
              if (error || !result?.secure_url) {
                resolve(null);
              } else {
                resolve(result.secure_url);
              }
            }
          );
          stream.end(pdfBuffer);
        });

        if (uploadRes) {
          cloudinaryPdfBase = uploadRes;
          targetPdfUrl = uploadRes;

          if (isUuid && resolvedPaperRecord) {
            void supabase
              .from('past_papers')
              .update({ file_url: uploadRes })
              .eq('id', resolvedPaperRecord.id);
          }
        }
      } catch (uErr: any) {
        console.warn('[extract] Cloudinary buffer upload notice:', uErr.message);
      }
    }

    // Collect rasterized page images (pages 1 to 6) in parallel
    const pageImages: { pageNum: number; data: string; mimeType: string }[] = [];
    if (cloudinaryPdfBase) {
      try {
        const pagePromises = [1, 2, 3, 4, 5, 6].map(async (pg) => {
          const urlVariants = [
            cloudinaryPdfBase.replace('/upload/', `/upload/w_1000,pg_${pg}/`).replace(/\.[^./\\]+$/i, '.jpg'),
            cloudinaryPdfBase.replace('/upload/', `/upload/pg_${pg}/`).replace(/\.[^./\\]+$/i, '.jpg'),
            cloudinaryPdfBase.replace('/upload/', `/upload/f_jpg,pg_${pg}/`).replace(/\.[^./\\]+$/i, '.jpg'),
          ];
          for (const pageUrl of urlVariants) {
            try {
              const imgRes = await fetch(pageUrl);
              if (imgRes.ok) {
                const imgBuf = Buffer.from(await imgRes.arrayBuffer());
                if (imgBuf.byteLength > 2000) {
                  return { pageNum: pg, data: imgBuf.toString('base64'), mimeType: 'image/jpeg' };
                }
              }
            } catch (_) {}
          }
          return null;
        });

        const results = await Promise.all(pagePromises);
        for (const r of results) {
          if (r) pageImages.push(r);
        }
        pageImages.sort((a, b) => a.pageNum - b.pageNum);
      } catch (rasterErr: any) {
        console.warn('[extract] Cloudinary page rasterization notice:', rasterErr.message);
      }
    }

    const visionPrompt = `
You are an expert university exam analyzer. I am providing you with authentic university examination past paper pages: ${paperTitle} (${courseCode}).
Read every page carefully from beginning to end.
Transcribe and extract the EXACT questions as printed on the exam paper verbatim.
Do NOT invent, summarize, or alter questions. Include authentic question numbers, text, instructions, and multiple choice options (A, B, C, D) verbatim.
Do NOT hallucinate or create fictional questions. Only output what is actually printed on this document.

Return a valid JSON object strictly matching:
{
  "questions": [
    {
      "question_number": "1",
      "question_type": "mcq",
      "text_content": "Full verbatim question stem and all options if MCQ",
      "extracted_topic": "1-3 word concept topic",
      "marks_available": 1
    }
  ]
}
`;

    // 3. Method A & B: Try Gemini Multimodal Vision if key configured
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelsToTry = [
          'gemini-2.5-flash-preview-05-20',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          ...GEMINI_CANDIDATE_MODELS,
        ];
        const uniqueModels = Array.from(new Set(modelsToTry));

        if (pdfBuffer) {
          const base64Pdf = pdfBuffer.toString('base64');
          for (const modelName of uniqueModels) {
            try {
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: 'application/json' },
              });
              const result = await model.generateContent([
                visionPrompt,
                { inlineData: { data: base64Pdf, mimeType: 'application/pdf' } },
              ]);
              const rawText = result.response.text();
              const cleanText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
              const start = cleanText.indexOf('{');
              const end = cleanText.lastIndexOf('}');
              if (start !== -1 && end !== -1) {
                const parsed = JSON.parse(cleanText.slice(start, end + 1));
                if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                  extractedQuestions = parsed.questions;
                  break;
                }
              }
            } catch (modelErr: any) {
              console.warn(`[extract] Gemini model ${modelName} PDF inline notice:`, modelErr.message);
            }
          }
        }

        if ((!extractedQuestions || extractedQuestions.length === 0) && pageImages.length > 0) {
          for (const modelName of uniqueModels) {
            try {
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: 'application/json' },
              });
              const imageParts = pageImages.map((img) => ({
                inlineData: { data: img.data, mimeType: img.mimeType },
              }));
              const result = await model.generateContent([visionPrompt, ...imageParts]);
              const rawText = result.response.text();
              const cleanText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
              const start = cleanText.indexOf('{');
              const end = cleanText.lastIndexOf('}');
              if (start !== -1 && end !== -1) {
                const parsed = JSON.parse(cleanText.slice(start, end + 1));
                if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                  extractedQuestions = parsed.questions;
                  break;
                }
              }
            } catch (imgModelErr: any) {
              console.warn(`[extract] Gemini model ${modelName} raster images notice:`, imgModelErr.message);
            }
          }
        }
      } catch (geminiEx: any) {
        console.warn('[extract] Gemini vision exception:', geminiEx.message);
      }
    }

    // 3c. Method C: OpenRouter Multimodal Vision Pipeline (High-Accuracy Parallel Batching)
    if ((!extractedQuestions || extractedQuestions.length === 0) && process.env.OPENROUTER_API_KEY && pageImages.length > 0) {
      try {
        const openRouterModels = [
          'nvidia/nemotron-3.5-super-vl:free',
          'google/gemma-4-26b-a4b-it:free',
          'google/gemma-4-31b-it:free',
          'particle-ai/particle-1:free',
          'openrouter/auto',
        ];

        // Batch pages in chunks of 2 for fast, high-quality parallel extraction
        const chunks: { pageNum: number; data: string; mimeType: string }[][] = [];
        for (let i = 0; i < pageImages.length; i += 2) {
          chunks.push(pageImages.slice(i, i + 2));
        }

        const chunkPromises = chunks.map(async (chunk, cIdx) => {
          const imageParts = chunk.map((img) => ({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.data}` },
          }));

          for (const model of openRouterModels) {
            try {
              const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://unistudy.app',
                },
                body: JSON.stringify({
                  model,
                  messages: [
                    {
                      role: 'user',
                      content: [
                        { type: 'text', text: visionPrompt },
                        ...imageParts,
                      ],
                    },
                  ],
                  max_tokens: 3000,
                }),
              });

              if (orRes.ok) {
                const orData = await orRes.json();
                const content = orData.choices?.[0]?.message?.content;
                if (content) {
                  const cleanText = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
                  const start = cleanText.indexOf('{');
                  const end = cleanText.lastIndexOf('}');
                  if (start !== -1 && end !== -1) {
                    const parsed = JSON.parse(cleanText.slice(start, end + 1));
                    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                      return parsed.questions;
                    }
                  }
                }
              }
            } catch (mErr: any) {
              console.warn(`[extract] OpenRouter model ${model} chunk ${cIdx + 1} notice:`, mErr.message);
            }
          }
          return [];
        });

        const chunkResults = await Promise.all(chunkPromises);
        const combined = chunkResults.flat();
        if (combined.length > 0) {
          extractedQuestions = combined;
        }
      } catch (orErr: any) {
        console.warn('[extract] OpenRouter vision pipeline error:', orErr.message);
      }
    }

    // 3b. If PDF extraction yielded 0 questions, DO NOT fabricate synthetic questions.
    // Return 200 with is_scanned: true so the UI can gracefully show the PDF viewer
    // instead of surfacing a confusing 422 error to students.
    if (!extractedQuestions || extractedQuestions.length === 0) {
      // Resolve the best available PDF URL to pass back for the inline viewer
      let pdfViewUrl = targetPdfUrl || '';
      if (!pdfViewUrl && !isUuid) {
        pdfViewUrl = `/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}`;
      }

      return NextResponse.json({
        success: false,
        is_scanned: true,
        questions: [],
        pdf_url: pdfViewUrl,
        message:
          'This examination paper contains scanned images and cannot be automatically parsed. Use the PDF viewer below to read and practice with the authentic paper.',
      });
    }

    // 4. Persist authentic extracted questions into Supabase
    if (isUuid && resolvedPaperRecord) {
      try {
        const rowsToInsert = extractedQuestions.map((q, idx) => ({
          past_paper_id: resolvedPaperRecord.id,
          question_number: String(q.question_number || idx + 1),
          text_content: String(q.text_content || ''),
          extracted_topic: String(q.extracted_topic || 'Examination Problem'),
          marks_available: Number(q.marks_available || (q.question_type === 'mcq' ? 1 : 20)),
        }));

        await supabase.from('past_paper_questions').insert(rowsToInsert);
      } catch (insertErr: any) {
        console.warn('[extract] Supabase persistence notice:', insertErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      cached: false,
      questions: extractedQuestions.map((q, idx) => ({
        id: `extracted-${idx + 1}`,
        question_number: String(q.question_number || idx + 1),
        text_content: q.text_content,
        extracted_topic: q.extracted_topic,
        marks_available: q.marks_available,
        isMcq: q.question_type === 'mcq' || /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content || ''),
      })),
    });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions/[id]/extract] Fatal error:', err);
    return NextResponse.json({ error: 'Failed to extract examination paper' }, { status: 500 });
  }
}

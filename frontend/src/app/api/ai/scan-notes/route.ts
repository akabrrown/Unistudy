import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Please upload a valid image' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    const prompt = `
      You are an expert transcriber and academic assistant.
      The attached image contains handwritten (or typed) study notes.
      Please transcribe the notes precisely.
      Format the transcribed notes in clean Markdown.
      Use appropriate headings (H2, H3), bullet points, and bold text for emphasis.
      If there are diagrams, describe them briefly.
      Do not add external information, just transcribe and format what is in the image.
    `;

    let transcription = '';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Image, mimeType: file.type } },
        ]);
        transcription = result.response.text();
        if (transcription) break;
      } catch (err: any) {
        console.warn(`Gemini scan notes model ${modelName} failed:`, err?.message);
      }
    }

    if (!transcription) {
      return NextResponse.json({ error: 'Could not transcribe image. Please ensure image is clear and try again.' }, { status: 500 });
    }

    return NextResponse.json({ transcription });
  } catch (err: any) {
    console.error('Notes Scanner Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

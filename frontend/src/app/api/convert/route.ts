import { NextRequest, NextResponse } from 'next/server';

// Allow up to 60 seconds for Render free-tier cold starts
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // We append the secure backend secret from the server environment
    // without exposing it to the client. Defaults to standard project secret if not set in Vercel.
    const secret = (process.env.CONVERTER_SECRET || 'zT9xK2mP7vL4wQ8rN5bH1jC6dF3gY0')
      .trim()
      .replace(/^["']|["']$/g, '');
    
    // Support all common environment variable naming conventions for the Python converter
    const fastapiUrl = (
      process.env.CONVERTER_URL ||
      process.env.NEXT_PUBLIC_CONVERTER_URL ||
      process.env.NEXT_PUBLIC_FASTAPI_URL ||
      process.env.FASTAPI_URL ||
      'http://localhost:8000'
    ).trim().replace(/\/+$/, '');
    
    let convertRes: Response | null = null;
    let lastNetworkErr: any = null;

    // Use a 9-second timeout per attempt to safely complete before Vercel's 10s Hobby execution limit
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        convertRes = await fetch(`${fastapiUrl}/convert`, {
          method: 'POST',
          headers: {
            'X-Converter-Secret': secret,
          },
          body: formData,
          signal: AbortSignal.timeout(9000),
        });

        // If the service responded or returned a non-gateway error (e.g., 400 or 401), exit loop
        if (convertRes.ok || (convertRes.status !== 502 && convertRes.status !== 503 && convertRes.status !== 504)) {
          break;
        }

        console.warn(`[Converter Proxy] Attempt ${attempt} returned HTTP ${convertRes.status}. Retrying in case service is spinning up...`);
      } catch (err: any) {
        lastNetworkErr = err;
        console.warn(`[Converter Proxy] Attempt ${attempt} network error:`, err?.message);
      }

      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!convertRes) {
      console.error('Failed to reach converter service after retries:', lastNetworkErr);
      return NextResponse.json({
        error: `Could not connect to the slide conversion service at ${fastapiUrl}. The service may be starting up on Render. Please wait a few seconds and try again.`
      }, { status: 503 });
    }

    if (!convertRes.ok) {
      const rawText = await convertRes.text().catch(() => '');
      let readableError = rawText;

      if (convertRes.status === 404) {
        readableError = `Converter endpoint not found at ${fastapiUrl}/convert. Check NEXT_PUBLIC_FASTAPI_URL / CONVERTER_URL in Vercel environment variables.`;
      } else if (convertRes.status === 401) {
        readableError = `Converter authentication rejected secret. Ensure CONVERTER_SECRET on Vercel matches CONVERTER_SECRET on Render.`;
      } else if (convertRes.status === 502 || convertRes.status === 503 || convertRes.status === 504) {
        readableError = `Slide converter on Render is currently waking up or unavailable (HTTP ${convertRes.status}). Please try again in a few moments.`;
      } else {
        try {
          const parsed = JSON.parse(rawText);
          readableError = parsed.error || parsed.detail || rawText;
        } catch {}
      }

      return NextResponse.json({ error: readableError }, { status: convertRes.status });
    }
    
    const data = await convertRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Conversion Error:', error);
    return NextResponse.json({ error: error.message || 'Internal conversion error' }, { status: 500 });
  }
}

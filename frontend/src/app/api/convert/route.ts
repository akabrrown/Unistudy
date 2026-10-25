import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // We append the secure backend secret from the server environment
    // without exposing it to the client.
    const secret = process.env.CONVERTER_SECRET || '';
    
    // Fallback if NEXT_PUBLIC_FASTAPI_URL isn't set
    const fastapiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
    
    let convertRes: Response;
    try {
      convertRes = await fetch(`${fastapiUrl}/convert`, {
        method: 'POST',
        headers: {
          'X-Converter-Secret': secret,
        },
        body: formData,
      });
    } catch (networkErr: any) {
      console.error('Failed to reach converter service:', networkErr);
      return NextResponse.json({
        error: `Could not connect to converter at ${fastapiUrl}. Please verify the Python converter is deployed and running.`
      }, { status: 503 });
    }

    if (!convertRes.ok) {
        const errorText = await convertRes.text();
        const readableError = convertRes.status === 404
          ? `Converter endpoint not found at ${fastapiUrl}/convert. Check NEXT_PUBLIC_FASTAPI_URL in your environment variables.`
          : errorText;
        return NextResponse.json({ error: readableError }, { status: convertRes.status });
    }
    
    const data = await convertRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Conversion Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({
        signed: false,
        cloudName: cloudName || '',
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'unistudy/lectures';

    // Cloudinary signature formula: sort parameters alphabetically, serialize, append apiSecret, hash with SHA-1
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    return NextResponse.json({
      signed: true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    });
  } catch (error: any) {
    console.error('Upload signing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

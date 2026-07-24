// utils/avatarUpload.ts
// Uploads an image (local URI) to Cloudinary using the unsigned preset "unistudy.ai".
// Returns the URL of the uploaded image.

import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'unistudy.ai';

export async function uploadAvatar(uri: string): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
    const form = new FormData();
    form.append('file', `data:image/jpeg;base64,${base64}`);
    form.append('upload_preset', UPLOAD_PRESET);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: 'POST',
      body: form,
    });
    const data = await response.json();
    return data.secure_url || null;
  } catch (e) {
    console.error('Avatar upload failed', e);
    return null;
  }
}

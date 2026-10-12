import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/sarvam';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') || formData.get('file');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'Missing or invalid audio file' },
        { status: 400 }
      );
    }

    const languageCode = (formData.get('language_code') as string) || 'hi-IN';
    const model = (formData.get('model') as string) || 'saaras:v4';

    const result = await transcribeAudio(audioFile, languageCode, model);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('STT API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}


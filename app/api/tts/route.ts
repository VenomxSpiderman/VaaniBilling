import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/sarvam';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text || '';
    const languageCode = body.language_code || 'hi-IN';
    const speaker = body.speaker || 'ritu';
    const model = body.model || 'bulbul:v3';

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Text cannot be empty' },
        { status: 400 }
      );
    }

    const audioBuffer = await synthesizeSpeech(text, languageCode, speaker, model);

    if (!audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to synthesize speech or mock mode active', is_mock: true },
        { status: 200 }
      );
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to synthesize audio' },
      { status: 500 }
    );
  }
}


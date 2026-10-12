import { NextRequest, NextResponse } from 'next/server';
import { parseBillWithLLM, synthesizeSpeech } from '@/lib/sarvam';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript = body.transcript || '';
    const languageCode = body.language_code || 'hi-IN';
    const autoTTS = body.auto_tts ?? true;

    if (!transcript.trim()) {
      return NextResponse.json(
        { error: 'Transcript cannot be empty' },
        { status: 400 }
      );
    }

    // Step 1: LLM Parsing and catalog matching
    const parsedData = await parseBillWithLLM(transcript, languageCode);

    // Step 2: Generate TTS audio for the confirmation speech
    let audioBase64: string | null = null;
    if (autoTTS && parsedData.confirmationSpeech) {
      try {
        const audioBuffer = await synthesizeSpeech(
          parsedData.confirmationSpeech,
          languageCode,
          'ritu',
          'bulbul:v3'
        );
        if (audioBuffer) {
          audioBase64 = Buffer.from(audioBuffer).toString('base64');
        }
      } catch (ttsErr) {
        console.warn('TTS generation failed:', ttsErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      audioBase64,
    });
  } catch (error: any) {
    console.error('Process Bill Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process voice bill' },
      { status: 500 }
    );
  }
}


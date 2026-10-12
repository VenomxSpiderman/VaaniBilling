# 🎙️ Skill: Audio & Voice Pipeline (`skills/audio-voice-pipeline.md`)

Use this skill when implementing audio recording, audio format transcoding, or audio playback in the browser and backend.

---

## 1. Browser Microphone Capture (MediaRecorder)
```ts
// Standard cross-browser setup with fallback audio constraints
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,
    sampleRate: 16000, // Ideal for speech recognition
    echoCancellation: true,
    noiseSuppression: true,
  }
});

const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/mp4';

const mediaRecorder = new MediaRecorder(stream, { mimeType });
const chunks: Blob[] = [];

mediaRecorder.ondataavailable = (e) => {
  if (e.data.size > 0) chunks.push(e.data);
};

mediaRecorder.onstop = () => {
  const audioBlob = new Blob(chunks, { type: mimeType });
  // Send audioBlob in FormData to /api/stt
};
```

---

## 2. Audio Payload Forwarding to Sarvam STT
In Next.js Route Handler (`app/api/stt/route.ts`):
```ts
const formData = await req.formData();
const audioBlob = formData.get('audio') as Blob;

const outgoingFormData = new FormData();
// Name must have an extension (.wav or .webm) so Sarvam detects MIME type properly
outgoingFormData.append('file', audioBlob, 'voice_input.webm');
outgoingFormData.append('model', 'saaras:v4');
outgoingFormData.append('language_code', 'hi-IN');

const res = await fetch('https://api.sarvam.ai/speech-to-text', {
  method: 'POST',
  headers: { 'api-subscription-key': process.env.SARVAM_API_KEY! },
  body: outgoingFormData,
});
```

---

## 3. Bulbul TTS Audio Playback
Sarvam returns an array of base64 strings containing standard 16-bit PCM WAV headers.
```ts
// Direct HTML5 Audio playback from base64
const playBase64Audio = (base64Audio: string) => {
  const audioUrl = `data:audio/wav;base64,${base64Audio}`;
  const audio = new Audio(audioUrl);
  audio.play().catch(err => console.log('Autoplay policy caught:', err));
};
```

---

## 4. Reducing Perceived Latency
1. **Parallel Execution:** Trigger Sarvam TTS on confirmation text while updating the UI state.
2. **Audio Pre-caching:** Cache static auditory cues (e.g. *Mic start chime*, *Success ping*) in `public/sounds/` to play zero-latency auditory feedback the moment recording starts or finishes.


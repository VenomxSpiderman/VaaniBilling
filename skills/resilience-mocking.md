# 🛡️ Skill: Mocking & Demo Resilience (`skills/resilience-mocking.md`)

Use this skill when implementing offline fallbacks, testing without burning Sarvam credits, and safeguarding against live presentation failures.

---

## 1. Why Resilience is Critical
During campus hackathon evaluations:
1. Wi-Fi connections can be throttled or drop packets.
2. Free tier Sarvam API credits can run out mid-demo (`HTTP 402`).
3. Ambient room noise can distort real microphone input.

**Golden Rule:** The app must gracefully operate in **both** live API mode and offline/mock mode without showing unhandled error screens.

---

## 2. API Key Detection & Mock Activation
In backend service layers:
```ts
const isMockMode = !process.env.SARVAM_API_KEY || 
                   process.env.SARVAM_API_KEY === 'your_sarvam_api_key_here';

if (isMockMode) {
  return generateMockResponse(transcript);
}
```

---

## 3. Pre-Configured Test Prompt Vectors
Provide 1-click test chips in the UI to demonstrate variety:

```ts
export const DEMO_PROMPTS = [
  {
    label: "Udhaar Order (Hindi)",
    command: "Sharma ji ko do kilo Aashirvaad atta, ek litre sarson tel aur teen packet parle-g udhaar pe likh do",
    expectedPayment: "credit",
    expectedCustomer: "Sharma ji"
  },
  {
    label: "Cash Order (Hinglish)",
    command: "Ramesh ko ek packet Tata namak aur do kilo daawat basmati chawal nagad",
    expectedPayment: "cash",
    expectedCustomer: "Ramesh"
  },
  {
    label: "Dairy & Butter (Colloquial)",
    command: "Sunita bhabhi ke khate mein ek packet Amul butter aur do Amul milk packet likh lo",
    expectedPayment: "credit",
    expectedCustomer: "Sunita bhabhi"
  }
];
```

---

## 4. Silent WAV Audio Mock for TTS
When `SARVAM_API_KEY` is not present, return a valid 44-byte PCM WAV header so browser `<audio>` components do not throw format errors:
```ts
export function createSilentWavBuffer(): Uint8Array {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = 4000; // 0.25s silence
  const dataByteLength = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataByteLength);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataByteLength, 40);

  return new Uint8Array(buffer);
}
```


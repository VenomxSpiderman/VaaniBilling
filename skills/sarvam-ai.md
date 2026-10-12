# 🛠️ Skill: Sarvam AI Integration (`skills/sarvam-ai.md`)

Use this skill when interacting with Sarvam AI REST API endpoints.

---

## 1. Authentication & Base URL
* **Base URL:** `https://api.sarvam.ai`
* **Header:** `"api-subscription-key": process.env.SARVAM_API_KEY`
* *Caution:* Do **not** use `Bearer <token>` or `Authorization` header.

---

## 2. Speech-to-Text (ASR)
* **Endpoint:** `POST https://api.sarvam.ai/speech-to-text`
* **Content-Type:** `multipart/form-data`
* **Form Fields:**
  * `file`: Audio blob or file (`audio/wav`, `audio/webm`, `audio/mp3`)
  * `model`: `"saaras:v4"` (latest) or `"saaras:v3"`
  * `language_code`: `"hi-IN"`, `"ta-IN"`, `"te-IN"`, `"mr-IN"`, `"bn-IN"`, `"gu-IN"`, etc.
  * `mode`: When using `saaras:v3`, set `mode="codemix"` for Hinglish / colloquial speech.
  * `with_timestamps`: `false` (default) or `true`
* **Response Format:**
  ```json
  {
    "request_id": "req_...",
    "transcript": "दो किलो आटा और एक लीटर तेल",
    "language_code": "hi-IN"
  }
  ```

---

## 3. Text-to-Speech (TTS)
* **Endpoint:** `POST https://api.sarvam.ai/text-to-speech`
* **Content-Type:** `application/json`
* **Payload:**
  ```json
  {
    "inputs": ["Sharma ji ka do sau rupaye udhaar likh diya hai."],
    "target_language_code": "hi-IN",
    "speaker": "ritu",
    "model": "bulbul:v3"
  }
  ```
* **Available Speakers:** `"ritu"`, `"aditya"`, `"priya"`, `"rahul"`.
* **Response Format:**
  ```json
  {
    "audios": ["<base64_encoded_wav_pcm_audio>"]
  }
  ```
* **Client Audio Playback:**
  ```ts
  const audioBlobUrl = `data:audio/wav;base64,${data.audios[0]}`;
  new Audio(audioBlobUrl).play();
  ```

---

## 4. Chat Completion (LLM)
* **Endpoint:** `POST https://api.sarvam.ai/chat/completions` (OpenAI-compatible)
* **Content-Type:** `application/json`
* **Models:** `sarvam-30b`, `sarvam-105b`
* **Payload:**
  ```json
  {
    "model": "sarvam-30b",
    "messages": [
      { "role": "system", "content": "You are a bilingual JSON extractor..." },
      { "role": "user", "content": "Parse: '2 kg atta cash'" }
    ],
    "temperature": 0.1
  }
  ```

---

## 5. Quota & Status Code Handling
* `402 Payment Required`: Credits exhausted. Intercept this and trigger mock fallback.
* `400 Bad Request`: Audio file empty or invalid multipart encoding.
* `401 Unauthorized`: Missing or invalid `api-subscription-key`.


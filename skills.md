# 🧭 Global Skills Router — VaaniBilling & Indic AI

> **⚡ Context Optimization Directive:**  
> This file is a lightweight routing table (< 60 lines). **Do NOT load all sub-skills into agent memory at once.**  
> Match your current task against the table below and load **only** the single corresponding routed skill file.

---

## 🚦 Task Dispatch Protocol

| If your task involves... | Read this skill file | What it contains |
| :--- | :--- | :--- |
| **Calling Sarvam AI APIs** | [`skills/sarvam-ai.md`](file:///Users/tatha/Downloads/Project/skills/sarvam-ai.md) | Endpoint URLs, headers (`api-subscription-key`), STT/TTS/Chat schemas, 402 quota handlers |
| **Microphone, Audio & Voice UX** | [`skills/audio-voice-pipeline.md`](file:///Users/tatha/Downloads/Project/skills/audio-voice-pipeline.md) | `MediaRecorder`, Web Audio API, 16kHz WAV/WebM encoding, Base64 PCM playback, latency tricks |
| **Kirana Ledger, Units & Udhaar** | [`skills/domain-kirana-ledger.md`](file:///Users/tatha/Downloads/Project/skills/domain-kirana-ledger.md) | Indic units (*pao, ser, peti*), Udhaar vs. Cash heuristics, Khata balance math, WhatsApp slip format |
| **Mocking, Resilience & Live Demo** | [`skills/resilience-mocking.md`](file:///Users/tatha/Downloads/Project/skills/resilience-mocking.md) | Offline fallbacks, test prompt vectors, zero-credit mock handlers, dummy WAV buffers |
| **Frontend POS UI & Tailwind** | [`skills/frontend-pos.md`](file:///Users/tatha/Downloads/Project/skills/frontend-pos.md) | Next.js App Router rules, POS grid layout, mic pulse animations, 58mm thermal print CSS |

---

## 📋 Core Architectural Contracts

1. **Authentication Header:** Always set `api-subscription-key: <KEY>`. Never use `Authorization: Bearer`.
2. **Language Codes:** Strictly BCP-47 standard:
   `hi-IN` (Hindi), `ta-IN` (Tamil), `te-IN` (Telugu), `bn-IN` (Bengali), `mr-IN` (Marathi), `gu-IN` (Gujarati), `kn-IN` (Kannada), `en-IN` (Indian English).
3. **Graceful Fallback Invariant:** If `SARVAM_API_KEY` is missing or returns `HTTP 402 (Payment Required)`, the system must automatically degrade to realistic mock responses without throwing unhandled UI exceptions.
4. **Environment Variables:**
   * `SARVAM_API_KEY`: API key from dashboard.sarvam.ai
   * `SARVAM_BASE_URL`: Defaults to `https://api.sarvam.ai`
   * `SARVAM_STT_MODEL`: Defaults to `saaras:v4`
   * `SARVAM_TTS_MODEL`: Defaults to `bulbul:v3`

---

## 🧪 Post-Edit Agent Verification Checklist
Before finishing any modification:
1. Run `npx tsc --noEmit` inside `vaani-billing/` to verify zero TypeScript errors.
2. Confirm both mock mode and live API paths handle payload errors safely.
3. Preserve comments and documentation in touched files.

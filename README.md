# VaaniBilling (वाणी बिलिंग)

### Sovereign Ambient Voice-to-Ledger and Multilingual POS for Indian Retail
Powered by Sarvam AI Indic Intelligence APIs (Saaras ASR, Sarvam Chat LLM, and Bulbul TTS).

---

## Overview

In India, millions of micro and small merchants (kirana stores, mandi traders, neighborhood provision stores, and pharmacies) operate in high-density environments where counter transactions occur rapidly while hands are occupied weighing goods, packaging items, or handling cash. Existing digital POS and ledger systems require merchants to repeatedly stop physical labor to type product names, quantities, and prices on touchscreens.

VaaniBilling transforms any smartphone, tablet, or counter workstation into an ambient, voice-driven retail point-of-sale terminal:

1. **Natural Spoken Ingestion**: Merchants speak colloquial commands in code-mixed Indian languages (e.g., Hindi, Marathi, Tamil, Telugu, Gujarati, Bengali, Kannada, or Hinglish).
2. **Speech Recognition**: Sarvam Saaras (`saaras:v4`) captures colloquial shopkeeper phrasing, local terminology, and regional accents.
3. **Structured Entity Extraction**: Sarvam Chat (`sarvam-30b`) extracts customer identifiers, classifies payment types (Cash, Udhaar/Credit, UPI), fuzzy matches spoken items against the store catalog, and calculates line-item totals.
4. **Verbal Confirmation**: Sarvam Bulbul (`bulbul:v3`) generates audio playback in regional voices confirming the customer name, item count, total price, and payment terms back to the counter.
5. **Offline-First Digital Khata**: A dual-entry debit and credit ledger persists transactions and customer debt directly inside the browser using IndexedDB, removing dependency on external database servers.
6. **Hands-Free Ambient Voice Activity Detection**: Client-side audio processing monitors energy levels and automatically truncates speech after silence intervals, eliminating manual push-to-talk requirements.
7. **Instant Invoicing**: One-click generation of formatted receipts for dispatch via WhatsApp.

---

## System Architecture

```
[Merchant Spoken Order]
          |
          v
[Web Audio API VAD and Energy Analyser]
          |
          v
[Sarvam Saaras STT (saaras:v4)]  ---> Generates Text Transcript
          |
          v
[Sarvam Chat LLM (sarvam-30b)]   ---> Extracts Customer, Payment Terms, and Line Items
          |
          +---> [IndexedDB Store]       ---> Updates Customer Balance and Transaction History
          |
          +---> [Reactive POS UI]       ---> Displays Real-Time Bill Table
          |
          +---> [Sarvam Bulbul (bulbul:v3)] ---> Audio Playback to Merchant and Customer
          |
          +---> [WhatsApp Integration]  ---> Generates Customer Receipt
```

---

## Core Capabilities

### 1. Hands-Free Voice Activity Detection (VAD)
The application includes a client-side audio analysis pipeline implemented with the Web Audio API (`AudioContext` and `AnalyserNode`). It evaluates root-mean-square audio energy in real time against configurable thresholds:
- Activates speech capture when energy crosses store background noise thresholds.
- Automatically completes the utterance and triggers transcription after 1.2 seconds of sustained silence.
- Includes a live canvas-based frequency visualizer that displays real-time microphone energy.

### 2. Spoken Order Parsing and Catalog Matching
Spoken phrases often reference colloquial synonyms rather than exact inventory titles. The system combines prompt engineering with a fuzzy resolution index to map aliases to normalized inventory items:
- Maps colloquial terms (e.g., "gehu ka atta", "aashirvaad", "chakki atta") to canonical product records.
- Extracts unit descriptors (kg, gm, litre, packet, piece) and calculates item rates dynamically.
- Identifies credit cues ("udhaar", "khata", "baki", "kal dega") to set payment mode automatically.

### 3. Persistent Digital Khata Ledger
An offline-first storage layer built on native browser IndexedDB manages debt tracking without cloud infrastructure:
- Tracks individual customer profiles, contact numbers, and cumulative balances.
- Implements dual-entry accounting: debit entries increment balance upon credit purchase; credit (Jama) entries decrement balance upon payment receipt.
- Features a slide-out Khata drawer listing customers sorted by total outstanding debt.
- Provides one-click payment settlement forms and pre-filled WhatsApp payment reminder triggers.

### 4. Verbal Confirmation Feedback
Voice interfaces in busy retail spaces require confirmation to ensure accuracy. The system converts structured transaction summaries into polite vernacular confirmations synthesized through Sarvam Bulbul TTS:
- Plays synthesized audio through the device speaker.
- Halts active audio playback immediately if the merchant speaks or interacts with the interface.

### 5. Resilient Fallback Engine
If network connectivity is interrupted, an API subscription key is not configured, or quota limits are exceeded, the system automatically routes requests through a rule-based extraction parser and synthetic audio generator. Core interface interactions remain operable under all network conditions.

---

## Customer Profile and Phone Number Resolution

Customer telephone numbers are handled through a progressive resolution strategy:

1. **Existing Customer Recognition**: When an order mentions a known customer name, the system queries the local IndexedDB database. If a matching customer profile is found, their saved phone number and running ledger balance are linked automatically.
2. **Spoken Phone Ingestion**: If a phone number is dictated within the spoken command, the entity extractor isolates the ten-digit sequence and stores it against the customer profile.
3. **Manual Entry and Association**: Phone numbers entered or updated through the POS interface or Khata drawer are persisted to the database for subsequent transactions.
4. **Targeted Dispatch**: When dispatching invoices or payment reminders:
   - For customers with recorded numbers, WhatsApp opens directly to the customer's phone number (`https://wa.me/91XXXXXXXXXX`).
   - For customers without recorded numbers, the link opens the contact picker (`https://wa.me/?text=...`) for quick selection from the device contacts.

---

## Supported Languages

The platform supports speech transcription and text-to-speech synthesis across eight Indian languages:

| Language Code | Language | Native Script |
| :--- | :--- | :--- |
| `hi-IN` | Hindi | हिन्दी |
| `bn-IN` | Bengali | বাংলা |
| `gu-IN` | Gujarati | ગુજરાતી |
| `kn-IN` | Kannada | ಕನ್ನಡ |
| `mr-IN` | Marathi | मराठी |
| `ta-IN` | Tamil | தமிழ் |
| `te-IN` | Telugu | తెలుగు |
| `en-IN` | Indian English | English |

---

## Repository Structure

```
vaani-billing/
├── .github/
│   └── workflows/
│       └── ci.yml
├── app/
│   ├── api/
│   │   ├── process-bill/
│   │   │   └── route.ts
│   │   ├── stt/
│   │   │   └── route.ts
│   │   └── tts/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AudioVisualizer.tsx
│   └── KhataDrawer.tsx
├── lib/
│   ├── catalog.ts
│   ├── db.ts
│   ├── sarvam.ts
│   ├── types.ts
│   └── vad.ts
├── skills/
│   ├── audio-voice-pipeline.md
│   ├── domain-kirana-ledger.md
│   ├── frontend-pos.md
│   ├── resilience-mocking.md
│   └── sarvam-ai.md
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── next.config.mjs
├── package.json
├── package-lock.json
├── postcss.config.js
├── skills.md
├── tailwind.config.js
└── tsconfig.json
```

---

## Getting Started

### Prerequisites
- Node.js 18.18 or higher (Node.js 20 recommended)
- npm, pnpm, or yarn package manager

### Installation

Clone the repository and install dependencies:

```bash
cd vaani-billing
npm install
```

### Environment Configuration

Create a local environment configuration file:

```bash
cp .env.example .env.local
```

Configure your Sarvam AI API credentials inside `.env.local`:

```env
SARVAM_API_KEY=your_sarvam_api_key_here
SARVAM_BASE_URL=https://api.sarvam.ai
SARVAM_STT_MODEL=saaras:v4
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_TTS_SPEAKER=ritu
SARVAM_CHAT_MODEL=sarvam-30b
PORT=3000
```

When running without an API key, the application operates in offline simulation mode using internal heuristic parsers.

### Development Server

Start the local development server:

```bash
npm run dev
```

Navigate to `http://localhost:3000` in a supported browser (Chrome, Edge, or Safari).

### Production Build

Create an optimized production build and launch the server:

```bash
npm run build
npm start
```

### Static Type Verification

Run the TypeScript compiler to verify type compliance:

```bash
npx tsc --noEmit
```

---

## License

This project is licensed under the terms of the MIT License. Refer to the LICENSE file for details.

# 🎙️ VaaniBilling (वाणी बिलिंग)
### Sovereign Ambient Voice-to-Ledger & Multilingual Invoicing for Bharat’s Merchants
*Powered by Sarvam AI Indic Intelligence APIs (`saaras:v4`, `sarvam-30b`, `bulbul:v3`).*

---

## 🚀 The Vision
In India, millions of local shopkeepers (*Kiranas*, mandi traders, pan shops, hardware retailers) conduct trade while their hands are busy weighing grains, packaging items, or counting cash. Modern POS apps (Khatabook, Vyapar) force them to stop and type item names on small touchscreens.

**VaaniBilling** turns any smartphone, tablet, or desktop counter into an ambient voice terminal:
1. **Speaks Naturally:** The shopkeeper speaks colloquially in code-mixed Hindi, Marathi, Tamil, Telugu, Gujarati, Bengali, Kannada, or Hinglish:
   > *"Sharma ji ko do kilo Aashirvaad atta, ek litre sarson tel aur teen packet parle-g udhaar pe likh do."*
2. **Sarvam Saaras STT (`saaras:v4`):** Accurately captures colloquial terms, regional accents, and kirana terminology.
3. **Sarvam Chat LLM (`sarvam-30b`):** Extracts customer names, payment terms (Cash / Udhaar / UPI), fuzzy matches items against store inventory, and computes itemized billing.
4. **Sarvam Bulbul TTS (`bulbul:v3`):** Delivers instantaneous verbal audio confirmation back to the shopkeeper and customer:
   > *"Sharma ji ka ₹265 ka hisaab udhaar khate mein jod diya gaya hai."*
5. **Persistent Offline-First Khata (IndexedDB):** Stores customer balances, dual-entry debit/credit ledger, and settlement histories client-side without requiring external database servers.
6. **Ambient Hands-Free VAD Mode:** Web Audio API with real-time Voice Activity Detection and live frequency visualizer for fully hands-free checkout.
7. **Instant WhatsApp Invoice:** Generates a 1-click formatted receipt for the buyer.

---

## 🏗️ Architecture

```
[Shopkeeper Voice / Ambient Audio]
               │
               ▼
   [Web Audio API VAD & Visualizer]
               │
               ▼
     [Sarvam Saaras STT]  ──► Transcribes Code-Mixed Dialect
               │
               ▼
     [Sarvam Chat LLM]   ──► Extracts Entities & Matches Inventory
               │
               ├──► [IndexedDB Khata] ──► Persistent Customer Ledger & Balances
               │
               ├──► [Live POS Table] ──► Real-Time Itemized Bill
               │
               ├──► [Sarvam Bulbul TTS] ──► Spoken Verbal Confirmation
               │
               └──► [WhatsApp Invoice] ──► Vernacular Customer Receipt
```

---

## ✨ Features Implemented

- 🎙️ **Ambient Hands-Free Mode:** Continuous listening with silence detection (1.2s auto-truncation) powered by client-side Voice Activity Detection (`lib/vad.ts`).
- 📊 **Real-Time Soundwave Visualizer:** Live canvas frequency bars that pulse when voice input is detected.
- 📖 **Digital Khata Ledger Drawer:** Slide-out drawer tracking debtors sorted by outstanding balances with one-click payment settlement (*Jama*) and WhatsApp debt reminders.
- 🛒 **Fuzzy Store Inventory Resolver:** Automatic mapping of colloquial aliases (e.g. *"gehu ka atta"* -> *Aashirvaad Shudh Chakki Atta*).
- 🔊 **Sarvam Bulbul TTS Audio Playback:** Instant verbal confirmation with interruption handling when clicking or speaking.
- 🛡️ **Zero-Crash Resilience & Mock Mode:** Automatic local fallback when `SARVAM_API_KEY` is absent or quota-limited, ensuring demonstrations never fail.
- 🌐 **8 Indian Languages:** Hindi, Bengali, Gujarati, Kannada, Marathi, Tamil, Telugu, and Indian English.

---

## 📦 Project Structure

```
vaani-billing/
├── app/
│   ├── api/
│   │   ├── stt/route.ts          # Sarvam Saaras STT endpoint
│   │   ├── process-bill/route.ts # Sarvam LLM entity extraction + Bulbul TTS
│   │   └── tts/route.ts          # Sarvam Bulbul TTS standalone endpoint
│   ├── globals.css               # Tailwind CSS styles
│   ├── layout.tsx                # HTML root layout & metadata
│   └── page.tsx                  # Interactive Voice POS & Ledger Dashboard
├── components/
│   ├── AudioVisualizer.tsx       # Live frequency canvas soundbar visualizer
│   └── KhataDrawer.tsx           # Digital Udhaar ledger drawer with Jama/WhatsApp
├── lib/
│   ├── catalog.ts                # Kirana inventory & fuzzy name matcher
│   ├── db.ts                     # Offline-first IndexedDB persistence layer
│   ├── sarvam.ts                 # Typed Sarvam AI client (STT, LLM, TTS)
│   ├── types.ts                  # TypeScript types & data schemas
│   └── vad.ts                    # Client-side Voice Activity Detection (Web Audio API)
├── skills/                       # Indic AI & Kirana domain guidelines
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore file protecting API keys & build files
├── package.json                  # Next.js 15, React 19, Tailwind, Lucide dependencies
├── tailwind.config.js            # Kirana-themed color palette
└── tsconfig.json                 # TypeScript configurations
```

---

## 🛠️ Quickstart

### 1. Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your Sarvam AI API subscription key from [dashboard.sarvam.ai](https://dashboard.sarvam.ai):
```env
SARVAM_API_KEY=your_sarvam_api_key_here
```
*(Note: If you run without an API key, the app automatically switches to rich offline mock mode for demonstrations).*

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm start
```

---

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.

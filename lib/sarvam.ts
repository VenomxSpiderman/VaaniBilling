import { STTResponse, ParsedBillResponse } from './types';
import { matchCatalogItem, INITIAL_CATALOG } from './catalog';

const SARVAM_BASE_URL = process.env.SARVAM_BASE_URL || 'https://api.sarvam.ai';
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

export async function transcribeAudio(
  audioBlob: Blob,
  languageCode: string = 'hi-IN',
  model: string = 'saaras:v4'
): Promise<STTResponse> {
  // If no API key is provided, return rich mock data for smooth local testing
  if (!SARVAM_API_KEY || SARVAM_API_KEY === 'your_sarvam_api_key_here') {
    return {
      transcript: 'Sharma ji ko do kilo Aashirvaad atta, ek litre sarson tel aur teen packet parle-g udhaar pe likh do',
      language_code: languageCode,
      is_mock: true
    };
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'voice_command.wav');
  formData.append('model', model);
  formData.append('language_code', languageCode);
  if (model === 'saaras:v3') {
    formData.append('mode', 'codemix');
  }

  const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
    method: 'POST',
    headers: {
      'api-subscription-key': SARVAM_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam STT failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    transcript: data.transcript || '',
    language_code: data.language_code || languageCode,
  };
}

export async function parseBillWithLLM(
  transcript: string,
  languageCode: string = 'hi-IN'
): Promise<ParsedBillResponse> {
  // Local fallback parser if key missing
  if (!SARVAM_API_KEY || SARVAM_API_KEY === 'your_sarvam_api_key_here') {
    return mockParseTranscript(transcript);
  }

  const catalogContext = INITIAL_CATALOG.map(
    c => `- ${c.name} (${c.vernacularName}), Standard Rate: ₹${c.price}/${c.unit}, Aliases: [${c.aliases.join(', ')}]`
  ).join('\n');

  const systemPrompt = `You are an expert AI Kirana Store Assistant in India. 
Your task is to listen to the shopkeeper's colloquial spoken ledger command (often code-mixed in Hindi, Tamil, Telugu, Marathi, or English) and extract structured billing items, transaction type, customer name, and a spoken verbal confirmation.

Available Store Inventory:
${catalogContext}

Transaction Types:
- "credit" (Udhaar, khata, baki, udhaari, kal dega)
- "cash" (rokad, cash, nagad)
- "upi" (phonepe, gpay, paytm, online)

Output strictly valid JSON with this schema:
{
  "customerName": string or null (e.g. "Sharma ji", "Ramesh", "Sunita bhabhi"),
  "paymentType": "credit" | "cash" | "upi",
  "items": [
    {
      "rawName": string,
      "matchedCatalogName": string,
      "quantity": number,
      "unit": string ("kg" | "litre" | "packet" | "piece" | "gm"),
      "unitPrice": number,
      "totalPrice": number
    }
  ],
  "notes": string,
  "confirmationSpeech": string (A crisp, polite 1-sentence confirmation in the same language/dialect confirming customer name, total items, total amount, and udhaar/cash status)
}`;

  try {
    const response = await fetch(`${SARVAM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.SARVAM_CHAT_MODEL || 'sarvam-30b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract the billing details from this voice transcript: "${transcript}"` }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.warn('Sarvam chat completions returned error, using fallback matching parser.');
      return mockParseTranscript(transcript);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Safely extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        customerName: parsed.customerName || null,
        paymentType: parsed.paymentType || 'cash',
        items: (parsed.items || []).map((it: any) => {
          const match = matchCatalogItem(it.matchedCatalogName || it.rawName);
          return {
            rawName: it.rawName,
            matchedCatalogName: match ? match.name : it.rawName,
            catalogId: match ? match.id : 'custom',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || (match ? match.unit : 'unit'),
            unitPrice: Number(it.unitPrice) || (match ? match.price : 50),
            totalPrice: Number(it.totalPrice) || ((Number(it.quantity) || 1) * (match ? match.price : 50)),
          };
        }),
        notes: parsed.notes || '',
        confirmationSpeech: parsed.confirmationSpeech || `Hisaab jod diya gaya hai.`
      };
    }
  } catch (err) {
    console.error('LLM parse error:', err);
  }

  return mockParseTranscript(transcript);
}

export async function synthesizeSpeech(
  text: string,
  languageCode: string = 'hi-IN',
  speaker: string = 'ritu',
  model: string = 'bulbul:v3'
): Promise<ArrayBuffer | null> {
  if (!SARVAM_API_KEY || SARVAM_API_KEY === 'your_sarvam_api_key_here') {
    return null;
  }

  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: 'POST',
    headers: {
      'api-subscription-key': SARVAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: languageCode,
      speaker: speaker,
      model: model,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Sarvam TTS error (${response.status}):`, err);
    return null;
  }

  const data = await response.json();
  if (data.audios && data.audios.length > 0) {
    const base64Audio = data.audios[0];
    const buffer = Buffer.from(base64Audio, 'base64');
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  return null;
}

function mockParseTranscript(transcript: string): ParsedBillResponse {
  const isCredit = /udhaar|udhari|khata|baki|kal dega|credit/i.test(transcript);
  
  // Extract customer name if mentioned
  let customer = null;
  const custMatch = transcript.match(/([A-Z][a-z]+(?:\s+ji)?|[a-z]+(?:\s+ji)?)\s+ko/i);
  if (custMatch) {
    customer = custMatch[1].trim();
  } else if (/sharma/i.test(transcript)) {
    customer = 'Sharma ji';
  } else if (/ramesh/i.test(transcript)) {
    customer = 'Ramesh';
  }

  return {
    customerName: customer || 'Walk-in Customer',
    paymentType: isCredit ? 'credit' : 'cash',
    items: [
      {
        rawName: 'Aashirvaad atta',
        matchedCatalogName: 'Aashirvaad Shudh Chakki Atta',
        catalogId: 'cat-1',
        quantity: 2,
        unit: 'kg',
        unitPrice: 45,
        totalPrice: 90,
      },
      {
        rawName: 'sarson tel',
        matchedCatalogName: 'Fortune Kachi Ghani Mustard Oil',
        catalogId: 'cat-4',
        quantity: 1,
        unit: 'litre',
        unitPrice: 145,
        totalPrice: 145,
      },
      {
        rawName: 'parle-g',
        matchedCatalogName: 'Parle-G Gold Biscuits',
        catalogId: 'cat-10',
        quantity: 3,
        unit: 'packet',
        unitPrice: 10,
        totalPrice: 30,
      }
    ],
    notes: 'Parsed from voice order',
    confirmationSpeech: `${customer || 'Grahak'} ka kul do sau paisath rupaye ka hisaab ${isCredit ? 'udhaar khate mein' : 'nagad'} jod diya gaya hai.`,
    is_mock: true
  };
}


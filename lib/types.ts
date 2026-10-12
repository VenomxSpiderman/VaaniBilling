export type SupportedLanguage = 
  | 'hi-IN' // Hindi
  | 'bn-IN' // Bengali
  | 'gu-IN' // Gujarati
  | 'kn-IN' // Kannada
  | 'ml-IN' // Malayalam
  | 'mr-IN' // Marathi
  | 'od-IN' // Odia
  | 'pa-IN' // Punjabi
  | 'ta-IN' // Tamil
  | 'te-IN' // Telugu
  | 'en-IN'; // Indian English

export interface CatalogItem {
  id: string;
  name: string;
  vernacularName: string;
  category: 'Grains & Pulses' | 'Dairy & Oils' | 'Spices & Condiments' | 'Snacks & Beverages' | 'Personal Care & Household';
  price: number; // MRP or selling rate in INR
  unit: 'kg' | 'gm' | 'litre' | 'ml' | 'packet' | 'piece' | 'can' | 'bottle';
  aliases: string[]; // Colloquial synonyms e.g. ["aashirvaad", "gehu ka atta", "flour"]
}

export interface BillItem {
  id: string;
  matchedCatalogId?: string;
  name: string;
  vernacularName?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
}

export type PaymentType = 'cash' | 'credit' | 'upi'; // 'credit' = Udhaar

export interface BillOrder {
  id: string;
  customerName?: string;
  customerPhone?: string;
  paymentType: PaymentType;
  items: BillItem[];
  subtotal: number;
  notes?: string;
  timestamp: string;
  rawTranscript: string;
  confirmationAudioText?: string;
}

export interface CustomerLedger {
  id: string;
  name: string;
  phone: string;
  totalOutstanding: number; // Udhaar amount
  lastTransactionAt: string;
  transactions: {
    billId: string;
    amount: number;
    type: 'debit' | 'credit'; // debit = purchased on udhaar; credit = settled money
    timestamp: string;
    description: string;
  }[];
}

export interface STTResponse {
  transcript: string;
  language_code: string;
  is_mock?: boolean;
}

export interface ParsedBillResponse {
  customerName: string | null;
  paymentType: PaymentType;
  items: {
    rawName: string;
    matchedCatalogName: string;
    catalogId: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  notes: string;
  confirmationSpeech: string;
  is_mock?: boolean;
}


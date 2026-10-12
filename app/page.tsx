'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  ShoppingBag, 
  BookOpen, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  IndianRupee, 
  Trash2, 
  Plus, 
  Volume2, 
  CreditCard,
  User,
  ArrowRight,
  Radio
} from 'lucide-react';
import { BillItem, PaymentType, SupportedLanguage } from '@/lib/types';
import { INITIAL_CATALOG } from '@/lib/catalog';
import {
  addCustomer,
  addBill,
  addTransaction,
  getAllCustomers,
  type Bill,
} from '@/lib/db';
import KhataDrawer from '@/components/KhataDrawer';
import { VoiceActivityDetector } from '@/lib/vad';
import AudioVisualizer from '@/components/AudioVisualizer';

const SAMPLE_VOICE_COMMANDS = [
  "Sharma ji ko do kilo Aashirvaad atta, ek litre sarson tel aur teen packet parle-g udhaar pe likh do",
  "Ramesh ko ek packet Tata namak aur do kilo daawat basmati chawal nagad",
  "Sunita bhabhi ke khate mein ek packet Amul butter aur do Amul milk packet likh lo",
  "Gupta ji ko 500 gram cheeni aur ek chai patti packet, kal shaam ko paise denge"
];

const LANGUAGES: { code: SupportedLanguage; label: string; native: string }[] = [
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'en-IN', label: 'Indian English', native: 'English' },
];

export default function HomePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('hi-IN');
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Bill State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [billItems, setBillItems] = useState<BillItem[]>([
    {
      id: '1',
      name: 'Aashirvaad Shudh Chakki Atta',
      vernacularName: 'आशीर्वाद चक्की आटा',
      quantity: 2,
      unit: 'kg',
      unitPrice: 45,
      totalPrice: 90,
      confidence: 0.98,
    },
    {
      id: '2',
      name: 'Fortune Kachi Ghani Mustard Oil',
      vernacularName: 'फॉर्च्यून सरसों तेल',
      quantity: 1,
      unit: 'litre',
      unitPrice: 145,
      totalPrice: 145,
      confidence: 0.95,
    }
  ]);
  const [confirmationAudioUrl, setConfirmationAudioUrl] = useState<string | null>(null);
  const [confirmationSpeechText, setConfirmationSpeechText] = useState(
    'Walk-in customer ka do sau paitis rupaye ka hisaab nagad mein jod diya gaya hai.'
  );

  // Hands-Free Mode State
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(0);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [handsFreeStatus, setHandsFreeStatus] = useState<'ready' | 'listening' | 'processing' | 'speaking'>('ready');

  // Khata (Ledger) Drawer State
  const [isKhataOpen, setIsKhataOpen] = useState(false);
  const [outstandingCustomerCount, setOutstandingCustomerCount] = useState(0);

  // Audio recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Hands-free / VAD references
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const handsFreeResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const subtotal = billItems.reduce((acc, item) => acc + item.totalPrice, 0);

  // ─── Khata: Refresh outstanding customer count badge ──────────────────────
  const refreshOutstandingCount = useCallback(async () => {
    try {
      const all = await getAllCustomers();
      const withOutstanding = all.filter((c) => c.totalOutstanding > 0);
      setOutstandingCustomerCount(withOutstanding.length);
    } catch (err) {
      console.error('Error fetching customer count:', err);
    }
  }, []);

  // Load outstanding count on mount
  useEffect(() => {
    refreshOutstandingCount();
  }, [refreshOutstandingCount]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Could not access microphone. You can click on the sample prompt chips below to simulate voice commands!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    if (handsFreeMode) setHandsFreeStatus('processing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language_code', selectedLanguage);

      const sttRes = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });

      const sttData = await sttRes.json();
      if (sttData.transcript) {
        setTranscript(sttData.transcript);
        await processTranscript(sttData.transcript);
      }
    } catch (err) {
      console.error('Error handling audio:', err);
    } finally {
      setIsProcessing(false);
      if (handsFreeMode) setHandsFreeStatus('listening');
    }
  };

  const processTranscript = async (text: string) => {
    setIsProcessing(true);
    if (handsFreeMode) setHandsFreeStatus('processing');
    try {
      const res = await fetch('/api/process-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          language_code: selectedLanguage,
          auto_tts: true,
        }),
      });

      const result = await res.json();
      if (result.success && result.data) {
        const parsed = result.data;
        if (parsed.customerName) setCustomerName(parsed.customerName);
        if (parsed.paymentType) setPaymentType(parsed.paymentType);

        if (parsed.items && parsed.items.length > 0) {
          const formatted: BillItem[] = parsed.items.map((it: any, idx: number) => ({
            id: String(Date.now() + idx),
            name: it.matchedCatalogName || it.rawName,
            vernacularName: it.rawName,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            confidence: 0.95,
          }));
          setBillItems(formatted);
        }

        if (parsed.confirmationSpeech) {
          setConfirmationSpeechText(parsed.confirmationSpeech);
        }

        if (result.audioBase64) {
          const audioUrl = `data:audio/wav;base64,${result.audioBase64}`;
          setConfirmationAudioUrl(audioUrl);

          // Stop any previously playing TTS audio
          if (ttsAudioRef.current) {
            ttsAudioRef.current.pause();
            ttsAudioRef.current = null;
          }

          const audio = new Audio(audioUrl);
          ttsAudioRef.current = audio;

          if (handsFreeMode) setHandsFreeStatus('speaking');

          audio.onended = () => {
            ttsAudioRef.current = null;
            if (handsFreeMode) setHandsFreeStatus('listening');
          };

          audio.play().catch((e) => {
            console.log('Autoplay blocked:', e);
            ttsAudioRef.current = null;
            if (handsFreeMode) setHandsFreeStatus('listening');
          });
        }

        // ─── Persist bill to IndexedDB (Khata) ─────────────────────────────
        try {
          const resolvedName = parsed.customerName || 'Walk-in Customer';
          const resolvedPayment: 'cash' | 'credit' | 'upi' = parsed.paymentType || 'cash';

          const formattedItems: BillItem[] = (parsed.items || []).map((it: any, idx: number) => ({
            id: String(Date.now() + idx),
            name: it.matchedCatalogName || it.rawName,
            vernacularName: it.rawName,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            confidence: 0.95,
          }));

          const billTotal = formattedItems.reduce((acc: number, item: BillItem) => acc + item.totalPrice, 0);
          const billId = `BILL-${Date.now()}`;

          // Create or find the customer
          const customer = await addCustomer(resolvedName);

          // Save the bill record
          const billRecord: Bill = {
            id: billId,
            customerId: customer.id ?? null,
            customerName: resolvedName,
            paymentType: resolvedPayment,
            items: JSON.stringify(formattedItems),
            subtotal: billTotal,
            rawTranscript: text,
            confirmationAudioText: parsed.confirmationSpeech || '',
            createdAt: new Date().toISOString(),
          };
          await addBill(billRecord);

          // If credit (udhaar), add a debit transaction to the customer's ledger
          if (resolvedPayment === 'credit' && customer.id) {
            const itemsSummary = formattedItems
              .map((it: BillItem) => `${it.name} x${it.quantity}`)
              .join(', ');
            await addTransaction(
              customer.id,
              billTotal,
              'debit',
              billId,
              `उधार / Credit purchase: ${itemsSummary}`,
              JSON.stringify(formattedItems)
            );
          }

          // Refresh outstanding count badge
          await refreshOutstandingCount();
        } catch (dbErr) {
          console.error('Error persisting bill to IndexedDB:', dbErr);
        }
      }
    } catch (err) {
      console.error('Processing transcript error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulate = (cmd: string) => {
    setTranscript(cmd);
    processTranscript(cmd);
  };

  // ─── Hands-Free Mode Controls ─────────────────────────────────────────────

  /**
   * Interrupt any playing TTS audio (e.g. when user speaks or clicks during playback).
   */
  const stopTtsAudio = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      ttsAudioRef.current = null;
    }
  }, []);

  /**
   * Toggle hands-free (ambient listening) mode on/off.
   */
  const toggleHandsFreeMode = useCallback(async () => {
    if (handsFreeMode) {
      // Turn OFF hands-free mode
      if (vadRef.current) {
        vadRef.current.stop();
        vadRef.current = null;
      }
      if (handsFreeResumeTimerRef.current) {
        clearTimeout(handsFreeResumeTimerRef.current);
        handsFreeResumeTimerRef.current = null;
      }
      stopTtsAudio();
      setHandsFreeMode(false);
      setHandsFreeStatus('ready');
      setEnergyLevel(0);
      setIsSpeechActive(false);
    } else {
      // Turn ON hands-free mode — stop any existing push-to-talk recording
      if (isRecording) {
        stopRecording();
      }

      const vad = new VoiceActivityDetector();

      try {
        await vad.start(
          // onSpeechStart
          () => {
            setIsSpeechActive(true);
            // If TTS is playing and user starts speaking, interrupt it
            stopTtsAudio();
          },
          // onSpeechEnd — receives the audio blob
          (audioBlob: Blob) => {
            setIsSpeechActive(false);
            handleAudioUpload(audioBlob);
          },
          // onEnergyUpdate
          (energy: number) => {
            setEnergyLevel(energy);
          }
        );

        vadRef.current = vad;
        setHandsFreeMode(true);
        setHandsFreeStatus('listening');
      } catch (err) {
        console.error('Failed to start hands-free mode:', err);
        alert('Could not access microphone for hands-free mode.');
      }
    }
  }, [handsFreeMode, isRecording, stopRecording, stopTtsAudio, handleAudioUpload]);

  /**
   * Cleanup VAD on unmount.
   */
  useEffect(() => {
    return () => {
      if (vadRef.current) {
        vadRef.current.stop();
        vadRef.current = null;
      }
      if (handsFreeResumeTimerRef.current) {
        clearTimeout(handsFreeResumeTimerRef.current);
      }
      stopTtsAudio();
    };
  }, [stopTtsAudio]);

  const removeItem = (id: string) => {
    setBillItems((prev) => prev.filter((item) => item.id !== id));
  };

  const shareOnWhatsApp = () => {
    const itemsList = billItems
      .map((it) => `• ${it.name} (${it.quantity} ${it.unit}) = ₹${it.totalPrice}`)
      .join('\n');
    const msg = `*श्री लक्ष्मी किराना स्टोर - बिल*\nग्राहक: ${customerName}\nतारीख: ${new Date().toLocaleDateString()}\n\n${itemsList}\n\n*कुल राशि:* ₹${subtotal}\n*भुगतान प्रकार:* ${paymentType.toUpperCase()}\n\nदुकान आने के लिए धन्यवाद!`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-amber-200/60 bg-amber-500/10 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-amber-600/20">
            वाणी
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
              VaaniBilling <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-300">Sarvam Powered</span>
            </h1>
            <p className="text-xs text-stone-600">Ambient Voice-to-Ledger & Multilingual Invoicing for Bharat</p>
          </div>
        </div>

        {/* Language selector & quick badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <span>बोली / Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
              className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.label})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Voice Input & Live Bill */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Voice Command Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  बोलकर बिल बनाएं / Voice Billing
                </h2>
                <p className="text-xs text-stone-500">Hold mic to speak in Hindi, Hinglish, Tamil, Telugu, etc.</p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {handsFreeMode && (
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                    handsFreeStatus === 'listening'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : handsFreeStatus === 'processing'
                      ? 'text-amber-700 bg-amber-50 border-amber-200 animate-pulse'
                      : handsFreeStatus === 'speaking'
                      ? 'text-sky-700 bg-sky-50 border-sky-200'
                      : 'text-stone-600 bg-stone-50 border-stone-200'
                  }`}>
                    {handsFreeStatus === 'listening' && <><Radio className="w-3 h-3" /> सुन रहा है / Listening...</>}
                    {handsFreeStatus === 'processing' && <><RefreshCw className="w-3 h-3 animate-spin" /> Processing...</>}
                    {handsFreeStatus === 'speaking' && <><Volume2 className="w-3 h-3" /> बोल रहा है / Speaking...</>}
                    {handsFreeStatus === 'ready' && <>Ready</>}
                  </span>
                )}
                {!handsFreeMode && isProcessing && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse border border-amber-200">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Sarvam AI Processing...
                  </span>
                )}
              </div>
            </div>

            {/* Hands-Free Mode Toggle */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <button
                onClick={toggleHandsFreeMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 border ${
                  handsFreeMode
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm shadow-emerald-200/50'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${
                  handsFreeMode ? 'bg-emerald-500' : 'bg-stone-300'
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    handsFreeMode ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </div>
                <span>Hands-Free / हैंड्स फ्री</span>
              </button>
            </div>

            {/* Mic Center Button */}
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              {handsFreeMode ? (
                /* Hands-Free Mode: Continuous listening indicator */
                <button
                  onClick={toggleHandsFreeMode}
                  className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg bg-emerald-500 text-white shadow-emerald-500/30"
                >
                  <Radio className={`w-8 h-8 ${isSpeechActive ? 'animate-pulse' : ''}`} />
                  <span className="absolute inset-0 rounded-full border-4 border-emerald-300 animate-ping opacity-40"></span>
                  {isSpeechActive && (
                    <span className="absolute inset-0 rounded-full border-4 border-amber-400 animate-ping opacity-60"></span>
                  )}
                </button>
              ) : (
                /* Push-to-Talk Mode: Original mic button */
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isRecording 
                      ? 'bg-red-500 text-white shadow-red-500/40 scale-110 animate-bounce' 
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 hover:scale-105'
                  }`}
                >
                  {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  {isRecording && (
                    <span className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-75"></span>
                  )}
                </button>
              )}

              <p className="text-sm font-medium text-stone-700">
                {handsFreeMode
                  ? isSpeechActive
                    ? 'बोलना जारी रखें / Keep speaking...'
                    : 'बोलना शुरू करें / Start speaking anytime'
                  : isRecording
                    ? 'Listening... Speak items and customer name'
                    : 'Click to start speaking'}
              </p>

              {/* Audio Visualizer — shown in hands-free mode */}
              {handsFreeMode && (
                <div className="w-full max-w-xs mx-auto mt-1">
                  <AudioVisualizer
                    energyLevel={energyLevel}
                    isActive={isSpeechActive}
                    isListening={handsFreeMode}
                  />
                </div>
              )}
            </div>

            {/* Transcript display */}
            {transcript && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-800">
                <span className="font-semibold text-amber-800">Transcribed: </span>
                <span className="italic">"{transcript}"</span>
              </div>
            )}

            {/* Sample Command Chips */}
            <div className="mt-4 pt-4 border-t border-stone-100">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Sample Spoken Prompts (Click to test):
              </p>
              <div className="flex flex-col gap-1.5">
                {SAMPLE_VOICE_COMMANDS.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSimulate(cmd)}
                    className="text-left text-xs bg-stone-50 hover:bg-amber-50/80 hover:border-amber-300 border border-stone-200/70 rounded-lg px-3 py-1.5 text-stone-700 transition flex items-center justify-between group"
                  >
                    <span className="truncate">{cmd}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Itemized Bill Table */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-stone-700" />
                सामान की सूची / Current Bill ({billItems.length} items)
              </h2>
              <button
                onClick={() => setBillItems([])}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                Clear all
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="pb-2 font-medium">Item Name</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 font-medium">Rate</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {billItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-400">
                        No items added yet. Speak or click a sample prompt!
                      </td>
                    </tr>
                  ) : (
                    billItems.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50/50">
                        <td className="py-3">
                          <p className="font-semibold text-stone-900">{item.name}</p>
                          {item.vernacularName && (
                            <p className="text-[11px] text-stone-500">{item.vernacularName}</p>
                          )}
                        </td>
                        <td className="py-3 text-stone-700 font-medium">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 text-stone-600">₹{item.unitPrice}</td>
                        <td className="py-3 font-semibold text-stone-900 text-right">
                          ₹{item.totalPrice}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-stone-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bill Subtotal Footer */}
            <div className="mt-4 pt-4 border-t border-stone-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-stone-500">कुल योग / Total Amount</p>
                <p className="text-2xl font-black text-stone-900 flex items-center">
                  ₹{subtotal}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ledger, Customer Card & Action */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Customer & Payment Mode Box */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm">
            <h2 className="text-base font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-stone-700" />
              ग्राहक व भुगतान / Customer & Payment
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">
                  ग्राहक का नाम / Customer Name:
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-600 mb-2 block">
                  भुगतान का प्रकार / Payment Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                      paymentType === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <IndianRupee className="w-4 h-4" />
                    नकद (Cash)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                      paymentType === 'credit'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-400/40'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    उधार (Udhaar)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('upi')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                      paymentType === 'upi'
                        ? 'bg-sky-50 border-sky-500 text-sky-800'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    UPI / Online
                  </button>
                </div>
              </div>

              {paymentType === 'credit' && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">उधार खाता (Digital Khata Entry)</p>
                    <p className="text-[11px] text-amber-800">
                      ₹{subtotal} will be added to {customerName}'s outstanding ledger balance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bulbul Spoken Feedback Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-2xl p-6 border border-amber-200/80 shadow-sm">
            <h2 className="text-base font-semibold text-stone-900 mb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-600" />
              सरस्वती वाणी पुष्टि / Spoken Audio Confirmation
            </h2>
            <p className="text-xs text-stone-600 mb-4">
              Generated by Sarvam Bulbul TTS to confirm order verbally to shopkeeper & customer.
            </p>

            <div className="bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-800 italic mb-4">
              "{confirmationSpeechText}"
            </div>

            {confirmationAudioUrl && (
              <div className="mb-4">
                <audio controls src={confirmationAudioUrl} className="w-full h-8" />
              </div>
            )}

            <button
              onClick={shareOnWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-emerald-600/20 text-xs flex items-center justify-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              व्हाट्सएप पर बिल भेजें / Send WhatsApp Invoice
            </button>
          </div>

          {/* Quick Store Inventory Catalog Peek */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm flex-1">
            <h2 className="text-sm font-semibold text-stone-900 mb-3 flex items-center justify-between">
              <span>दुकान भंडार / Store Inventory ({INITIAL_CATALOG.length} items)</span>
              <span className="text-[11px] text-stone-400 font-normal">Fuzzy matched</span>
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {INITIAL_CATALOG.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100 text-xs">
                  <div>
                    <p className="font-semibold text-stone-800">{item.name}</p>
                    <p className="text-[10px] text-stone-500">{item.vernacularName}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-stone-900">₹{item.price}</span>
                    <span className="text-[10px] text-stone-500">/{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}


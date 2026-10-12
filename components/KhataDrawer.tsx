'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Users,
  IndianRupee,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Minus,
} from 'lucide-react';
import {
  getAllCustomers,
  settlePayment,
  getCustomerTransactions,
  type Customer,
  type Transaction,
} from '@/lib/db';

interface KhataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KhataDrawer({ isOpen, onClose }: KhataDrawerProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [jamaAmount, setJamaAmount] = useState('');
  const [showJamaFor, setShowJamaFor] = useState<number | null>(null);
  const [isSubmittingJama, setIsSubmittingJama] = useState(false);

  // Load all customers when drawer opens
  const loadCustomers = useCallback(async () => {
    try {
      const all = await getAllCustomers();
      setCustomers(all);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen, loadCustomers]);

  // Load transactions when a customer row is expanded
  const toggleCustomer = async (customerId: number) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
      setTransactions([]);
      setShowJamaFor(null);
      return;
    }

    setExpandedCustomerId(customerId);
    setShowJamaFor(null);
    setLoadingTxns(true);
    try {
      const txns = await getCustomerTransactions(customerId);
      setTransactions(txns);
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoadingTxns(false);
    }
  };

  // Handle Jama (settlement payment)
  const handleJamaSubmit = async (customerId: number) => {
    const amount = parseFloat(jamaAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmittingJama(true);
    try {
      await settlePayment(customerId, amount);
      setJamaAmount('');
      setShowJamaFor(null);

      // Refresh data
      await loadCustomers();
      const txns = await getCustomerTransactions(customerId);
      setTransactions(txns);
    } catch (err) {
      console.error('Error settling payment:', err);
    } finally {
      setIsSubmittingJama(false);
    }
  };

  // Open WhatsApp with polite Hindi reminder
  const sendWhatsAppReminder = (customer: Customer) => {
    const msg = `🙏 नमस्ते ${customer.name} जी,\n\nआपके खाते में ₹${customer.totalOutstanding} बकाया है। कृपया जब सुविधा हो भुगतान कर दीजिए।\n\nधन्यवाद,\nश्री लक्ष्मी किराना स्टोर`;
    const phone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
    const url = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Format date in a human-readable way
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('hi-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-amber-50/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                डिजिटल खाता / Khata Ledger
              </h2>
              <p className="text-[11px] text-stone-500">
                {customers.length} ग्राहक / customers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 'calc(100vh - 72px)' }}>
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-stone-300 mb-3" />
              <p className="text-sm font-medium text-stone-500">
                कोई ग्राहक नहीं / No customers yet
              </p>
              <p className="text-xs text-stone-400 mt-1">
                उधार (credit) बिल बनाने पर ग्राहक यहाँ दिखेंगे
              </p>
            </div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Customer Row */}
                <button
                  onClick={() => toggleCustomer(customer.id!)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50/80 transition text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        {customer.name}
                      </p>
                      {customer.phone && (
                        <p className="text-[11px] text-stone-500">{customer.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {customer.totalOutstanding > 0 ? (
                      <span className="text-sm font-bold text-red-600 flex items-center gap-0.5">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {customer.totalOutstanding}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✓ Clear
                      </span>
                    )}
                    {expandedCustomerId === customer.id ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Transaction Details */}
                {expandedCustomerId === customer.id && (
                  <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3">
                    {/* Action buttons */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() =>
                          setShowJamaFor(showJamaFor === customer.id ? null : customer.id!)
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        जमा करो / Record Payment
                      </button>
                      {customer.totalOutstanding > 0 && (
                        <button
                          onClick={() => sendWhatsAppReminder(customer)}
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          हिसाब माँगें
                        </button>
                      )}
                    </div>

                    {/* Jama (settlement) inline form */}
                    {showJamaFor === customer.id && (
                      <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <label className="text-xs font-medium text-emerald-800 mb-1.5 block">
                          जमा राशि / Payment Amount (₹):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={jamaAmount}
                            onChange={(e) => setJamaAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            min="1"
                          />
                          <button
                            onClick={() => handleJamaSubmit(customer.id!)}
                            disabled={isSubmittingJama || !jamaAmount}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 transition"
                          >
                            {isSubmittingJama ? '...' : 'जमा करो'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Transaction History */}
                    <div>
                      <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        लेन-देन इतिहास / Transaction History
                      </p>

                      {loadingTxns ? (
                        <p className="text-xs text-stone-400 py-2 text-center">Loading...</p>
                      ) : transactions.length === 0 ? (
                        <p className="text-xs text-stone-400 py-2 text-center">
                          कोई लेन-देन नहीं / No transactions
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {transactions.map((txn) => (
                            <div
                              key={txn.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                                txn.type === 'debit'
                                  ? 'bg-red-50/60 border-red-100'
                                  : 'bg-emerald-50/60 border-emerald-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {txn.type === 'debit' ? (
                                  <Minus className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p
                                    className={`font-medium truncate ${
                                      txn.type === 'debit' ? 'text-red-800' : 'text-emerald-800'
                                    }`}
                                  >
                                    {txn.description}
                                  </p>
                                  <p className="text-[10px] text-stone-400">
                                    {formatDate(txn.timestamp)}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`font-bold shrink-0 ml-2 ${
                                  txn.type === 'debit' ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                {txn.type === 'debit' ? '+' : '-'}₹{txn.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

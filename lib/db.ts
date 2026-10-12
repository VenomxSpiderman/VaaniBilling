// ─── Database Entity Types ───────────────────────────────────────────────────

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  aliases: string[];
  totalOutstanding: number; // Udhaar balance in ₹
  lastTransactionAt: string;
  createdAt: string;
}

export interface Transaction {
  id?: number;
  customerId: number;
  billId: string;
  amount: number;
  type: 'debit' | 'credit'; // debit = purchased on udhaar; credit = settled/jama
  timestamp: string;
  description: string;
  items?: string; // JSON stringified bill items snapshot
}

export interface Bill {
  id: string;
  customerId: number | null;
  customerName: string;
  paymentType: 'cash' | 'credit' | 'upi';
  items: string; // JSON stringified BillItem[]
  subtotal: number;
  rawTranscript: string;
  confirmationAudioText: string;
  createdAt: string;
}

const DB_NAME = 'VaaniBillingDB';
const DB_VERSION = 1;

/**
 * Open the native IndexedDB database with schema upgrades.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported or running server-side'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('customers')) {
        const custStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        custStore.createIndex('name', 'name', { unique: false });
        custStore.createIndex('totalOutstanding', 'totalOutstanding', { unique: false });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        const txnStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        txnStore.createIndex('customerId', 'customerId', { unique: false });
        txnStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('bills')) {
        const billStore = db.createObjectStore('bills', { keyPath: 'id' });
        billStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve([]);
    }
  });
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Add a new customer or find an existing one by name (case-insensitive).
 */
export async function addCustomer(name: string, phone?: string): Promise<Customer> {
  const normalized = name.trim().toLowerCase();
  const all = await getAllCustomers();

  const existing = all.find((c) => c.name.toLowerCase() === normalized);
  if (existing) {
    if (phone && !existing.phone && existing.id !== undefined) {
      const db = await openDB();
      const tx = db.transaction('customers', 'readwrite');
      existing.phone = phone;
      tx.objectStore('customers').put(existing);
    }
    return existing;
  }

  const now = new Date().toISOString();
  const newCustomer: Customer = {
    name: name.trim(),
    phone: phone || undefined,
    aliases: [],
    totalOutstanding: 0,
    lastTransactionAt: now,
    createdAt: now,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');
    const req = store.add(newCustomer);
    req.onsuccess = () => {
      newCustomer.id = req.result as number;
      resolve(newCustomer);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Fuzzy search for a customer by name.
 */
export async function getCustomerByName(name: string): Promise<Customer | undefined> {
  const normalized = name.trim().toLowerCase();
  const all = await getAllCustomers();

  // Exact match
  const exact = all.find((c) => c.name.toLowerCase() === normalized);
  if (exact) return exact;

  // Partial match
  return all.find(
    (c) =>
      c.name.toLowerCase().includes(normalized) ||
      normalized.includes(c.name.toLowerCase()) ||
      (c.aliases && c.aliases.some((a) => a.toLowerCase().includes(normalized)))
  );
}

/**
 * Get all customers, sorted by totalOutstanding descending (highest debt first).
 */
export async function getAllCustomers(): Promise<Customer[]> {
  const all = await getAllFromStore<Customer>('customers');
  return all.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
}

/**
 * Save a bill to the bills table.
 */
export async function addBill(bill: Bill): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bills', 'readwrite');
    const store = tx.objectStore('bills');
    const req = store.put(bill);
    req.onsuccess = () => resolve(bill.id);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Add a transaction (debit or credit) and update the customer's totalOutstanding.
 */
export async function addTransaction(
  customerId: number,
  amount: number,
  type: 'debit' | 'credit',
  billId: string,
  description: string,
  items?: string
): Promise<number> {
  const now = new Date().toISOString();
  const db = await openDB();

  const newTxn: Transaction = {
    customerId,
    billId,
    amount,
    type,
    timestamp: now,
    description,
    items,
  };

  const txnId = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const req = store.add(newTxn);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });

  // Update customer outstanding balance
  try {
    const custTx = db.transaction('customers', 'readwrite');
    const custStore = custTx.objectStore('customers');
    const getReq = custStore.get(customerId);
    getReq.onsuccess = () => {
      const customer = getReq.result as Customer | undefined;
      if (customer) {
        const delta = type === 'debit' ? amount : -amount;
        customer.totalOutstanding = Math.max(0, customer.totalOutstanding + delta);
        customer.lastTransactionAt = now;
        custStore.put(customer);
      }
    };
  } catch (err) {
    console.error('Failed to update customer balance:', err);
  }

  return txnId;
}

/**
 * Settle a payment (Jama/credit entry) — reduces the customer's outstanding balance.
 */
export async function settlePayment(customerId: number, amount: number): Promise<number> {
  const billId = `JAMA-${Date.now()}`;
  return addTransaction(
    customerId,
    amount,
    'credit',
    billId,
    `जमा / Payment received: ₹${amount}`
  );
}

/**
 * Get all transactions for a customer, sorted by timestamp descending.
 */
export async function getCustomerTransactions(customerId: number): Promise<Transaction[]> {
  const allTxns = await getAllFromStore<Transaction>('transactions');
  const filtered = allTxns.filter((t) => t.customerId === customerId);
  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Get recent bills, sorted by createdAt descending.
 */
export async function getRecentBills(limit: number = 20): Promise<Bill[]> {
  const bills = await getAllFromStore<Bill>('bills');
  return bills
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

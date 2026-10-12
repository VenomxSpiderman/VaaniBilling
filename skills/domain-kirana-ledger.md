# 🛒 Skill: Indian Kirana Retail & Ledger Domain (`skills/domain-kirana-ledger.md`)

Use this skill when processing Indic retail commands, currency calculations, Udhaar (credit) math, and invoice formatting.

---

## 1. Colloquial Indic Weight & Unit Heuristics
Shopkeepers and buyers frequently use traditional non-metric or informal unit phrases:

| Spoken Phrase | Metric Equivalent | Standard Unit Code |
| :--- | :--- | :--- |
| *Aadha kilo / Half kg* | 0.5 kg | `kg` |
| *Pao bhar / Pao* | 250 grams | `gm` (or 0.25 kg) |
| *Dedh kilo* | 1.5 kg | `kg` |
| *Dhai kilo* | 2.5 kg | `kg` |
| *Sawa kilo* | 1.25 kg | `kg` |
| *Ek packet / pouch* | 1 unit | `packet` |
| *Chhota dabba / Bada dabba* | Match SKU size | `piece` |
| *Ek peti / carton* | Bulk count (e.g., 12 or 24) | `box` |

---

## 2. Udhaar (Credit) vs. Nagad (Cash) Detection
Look for specific colloquial keywords in the transcript:
* **Udhaar (Credit / Baki):**
  * Keywords: `udhaar`, `udhari`, `khata`, `baki`, `likh lo`, `kal dega`, `baad mein dunga`, `hisab mein daal do`.
  * Action: Add total amount to `customer.totalOutstanding` in the ledger.
* **Nagad (Cash):**
  * Keywords: `rokad`, `cash`, `nagad`, `haath mein diya`, `chhutte nahi hai`.
* **UPI / Online:**
  * Keywords: `gpay`, `phonepe`, `paytm`, `qr code`, `online transfer`.

---

## 3. WhatsApp Click-to-Send Invoice Generator
Generate formatted text URL for instant WhatsApp sharing:
```ts
export function buildWhatsAppInvoiceUrl(order: BillOrder): string {
  const lineItems = order.items
    .map(it => `• ${it.name}: ${it.quantity} ${it.unit} @ ₹${it.unitPrice} = ₹${it.totalPrice}`)
    .join('\n');

  const text = [
    `*🧾 श्री लक्ष्मी किराना स्टोर — रसीद*`,
    `--------------------------------`,
    `*ग्राहक (Customer):* ${order.customerName || 'Walk-in'}`,
    `*तारीख (Date):* ${new Date().toLocaleDateString('en-IN')}`,
    `\n*सामान का विवरण:*`,
    lineItems,
    `--------------------------------`,
    `*कुल योग (Total):* ₹${order.subtotal}`,
    `*भुगतान प्रकार (Payment):* ${order.paymentType.toUpperCase()}`,
    order.paymentType === 'credit' ? `*(यह राशि आपके उधार खाते में दर्ज है)*` : `*(भुगतान प्राप्त हुआ, धन्यवाद!)*`,
    `\nपुनः पधारें! 🙏`
  ].join('\n');

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
```

---

## 4. Spoken Confirmation Rules (for Bulbul TTS)
* Keep confirmation speech **under 20 words**.
* Structure: `[Customer Name] + [Total Amount] + [Payment Mode (Udhaar / Cash)]`.
* Example:
  * *Hindi:* `"शर्मा जी का दो सौ साठ रुपये का बिल उधार खाते में जोड़ दिया गया है।"`
  * *Tamil:* `"சர்மா ஜிக்கு இருநூற்று அறுபது ரூபாய் கடன் கணக்கில் சேர்க்கப்பட்டது."`


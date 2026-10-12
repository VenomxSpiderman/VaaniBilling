# 💻 Skill: Frontend POS & UI (`skills/frontend-pos.md`)

Use this skill when building or styling UI components for the merchant dashboard.

---

## 1. UI Design Principles for Indian Retail
1. **High Information Density & Glanceability:** Shopkeepers want to see items, prices, and totals without nested scrolling.
2. **Accessible Regional Typography:** Support Devanagari, Bengali, Tamil, Telugu, and Kannada font rendering cleanly alongside English numbers and codes.
3. **Warm Indian Palette:**
   * Primary: Amber / Saffron (`amber-600`, `amber-500`) represents commerce, auspiciousness, and warmth.
   * Ledger Udhaar: `amber-700` / `orange-600` for credit tracking.
   * Cash Settled: `emerald-600` for completed payments.
   * Neutral: `stone-50` / `stone-100` / `stone-900` for high contrast readability.

---

## 2. Audio State Indicators
Always reflect audio states with clear visual animations:
* **Idle:** Solid amber mic icon.
* **Recording:** Pulsing red button with expanding `animate-ping` outer ring:
  ```tsx
  <button className="relative w-20 h-20 bg-red-500 rounded-full animate-bounce">
    <MicOff className="w-8 h-8" />
    <span className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-75" />
  </button>
  ```
* **Processing:** Rotating spinner (`RefreshCw className="animate-spin"`) and subtle pulsing badge.

---

## 3. Printable Thermal Receipt Styles
For 58mm or 80mm ESC/POS hardware printers, provide a printable view:
```css
@media print {
  body * {
    visibility: hidden;
  }
  #thermal-receipt-section, #thermal-receipt-section * {
    visibility: visible;
  }
  #thermal-receipt-section {
    position: absolute;
    left: 0;
    top: 0;
    width: 58mm;
    font-family: monospace;
    font-size: 11px;
  }
}
```


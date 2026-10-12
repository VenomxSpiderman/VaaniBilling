import { CatalogItem } from './types';

export const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: 'cat-1',
    name: 'Aashirvaad Shudh Chakki Atta',
    vernacularName: 'आशीर्वाद चक्की आटा',
    category: 'Grains & Pulses',
    price: 45, // per kg
    unit: 'kg',
    aliases: ['atta', 'aashirvaad', 'gehu ka atta', 'wheat flour', 'aata', 'chakki atta']
  },
  {
    id: 'cat-2',
    name: 'Daawat Rozana Basmati Rice',
    vernacularName: 'दावत बासमती चावल',
    category: 'Grains & Pulses',
    price: 90,
    unit: 'kg',
    aliases: ['chawal', 'rice', 'basmati', 'daawat', 'bhat']
  },
  {
    id: 'cat-3',
    name: 'Tata Sampann Toor Dal',
    vernacularName: 'तूर दाल (अरहर)',
    category: 'Grains & Pulses',
    price: 160,
    unit: 'kg',
    aliases: ['toor dal', 'arhar dal', 'tuvar dal', 'daal', 'peeli dal']
  },
  {
    id: 'cat-4',
    name: 'Fortune Kachi Ghani Mustard Oil',
    vernacularName: 'फॉर्च्यून सरसों तेल',
    category: 'Dairy & Oils',
    price: 145,
    unit: 'litre',
    aliases: ['sarson tel', 'mustard oil', 'fortune oil', 'kadwa tel', 'tel']
  },
  {
    id: 'cat-5',
    name: 'Amul Taaza Toned Milk (500ml)',
    vernacularName: 'अमूल ताज़ा दूध (500ml)',
    category: 'Dairy & Oils',
    price: 27,
    unit: 'packet',
    aliases: ['amul milk', 'doodh', 'taaza milk', 'amul doodh', 'milk packet']
  },
  {
    id: 'cat-6',
    name: 'Amul Butter (100g)',
    vernacularName: 'अमूल मक्खन',
    category: 'Dairy & Oils',
    price: 58,
    unit: 'piece',
    aliases: ['butter', 'makhan', 'amul butter', 'maska']
  },
  {
    id: 'cat-7',
    name: 'Tata Salt (1kg)',
    vernacularName: 'टाटा नमक',
    category: 'Spices & Condiments',
    price: 28,
    unit: 'packet',
    aliases: ['namak', 'salt', 'tata namak', 'noon']
  },
  {
    id: 'cat-8',
    name: 'Madhur Pure & Hygienic Sugar',
    vernacularName: 'चीनी / शक्कर',
    category: 'Spices & Condiments',
    price: 44,
    unit: 'kg',
    aliases: ['cheeni', 'shakkar', 'sugar', 'sakkar']
  },
  {
    id: 'cat-9',
    name: 'Everest Turmeric Powder (Haldi 200g)',
    vernacularName: 'एवरेस्ट हल्दी पाउडर',
    category: 'Spices & Condiments',
    price: 40,
    unit: 'packet',
    aliases: ['haldi', 'turmeric', 'everest haldi', 'manjal']
  },
  {
    id: 'cat-10',
    name: 'Parle-G Gold Biscuits',
    vernacularName: 'पारले-जी बिस्कुट',
    category: 'Snacks & Beverages',
    price: 10,
    unit: 'packet',
    aliases: ['parle g', 'parle-g', 'biscuit', 'biskoot']
  },
  {
    id: 'cat-11',
    name: 'Tata Tea Premium (250g)',
    vernacularName: 'टाटा टी प्रीमियम चायपत्ती',
    category: 'Snacks & Beverages',
    price: 130,
    unit: 'packet',
    aliases: ['chai patti', 'tea', 'chai', 'tata tea', 'chaye']
  },
  {
    id: 'cat-12',
    name: 'Rin Detergent Bar (250g)',
    vernacularName: 'रिन साबुन',
    category: 'Personal Care & Household',
    price: 20,
    unit: 'piece',
    aliases: ['rin sabun', 'detergent bar', 'sabun', 'rin']
  }
];

/**
 * Fuzzy matches transcribed spoken phrase to catalog item
 */
export function matchCatalogItem(spokenName: string): CatalogItem | null {
  const normalized = spokenName.toLowerCase().trim();

  // 1. Direct name or vernacular match
  for (const item of INITIAL_CATALOG) {
    if (item.name.toLowerCase().includes(normalized) || item.vernacularName.includes(spokenName)) {
      return item;
    }
  }

  // 2. Check aliases
  for (const item of INITIAL_CATALOG) {
    for (const alias of item.aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return item;
      }
    }
  }

  return null;
}


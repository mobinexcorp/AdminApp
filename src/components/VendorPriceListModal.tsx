import React, { useState, useMemo, useRef } from 'react';
import { VendorPriceListItem, VendorPriceSheet, DeviceGrade, VendorImportTemplate } from '../types';
import { INITIAL_PRICE_LIST_ITEMS, GRADES } from '../data/initialData';
import { DistributorPriceCompareModal } from './DistributorPriceCompareModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  Printer,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  Sliders,
  Layers,
  Sparkles,
  ChevronDown,
  Info,
  Calendar,
  Building2,
  PackageCheck,
  Bookmark,
  Save,
  Settings,
  PlusCircle,
  FolderOpen,
  Zap,
  Maximize2,
  Minimize2,
  Trophy
} from 'lucide-react';

// Default pre-configured templates for common vendor Excel layouts
const INITIAL_VENDOR_TEMPLATES: VendorImportTemplate[] = [
  {
    id: 'tmpl_tekcom',
    vendorName: 'TEKCOM',
    templateName: 'TEKCOM Section Format (*IPHONES*, @ $Price header, Model Color Qty)',
    colItem: 'Tekcom Section Format',
    colSpec: '',
    colGrade: '',
    colQty: 'Line End Qty',
    colCost: '@ $Price Line',
    defaultMarkup1: 10,
    defaultMarkup2: 15,
    description: 'Special Tekcom section format (*IPHONES*, @ $Price headers, extracts model/color/qty, and merges duplicate price entries without color)',
  },
  {
    id: 'tmpl_eco_atm',
    vendorName: 'ECO ATM',
    templateName: 'ECO ATM Single-Line (Phone Model Storage Quantity $Price)',
    colItem: 'Column A (Col 0)',
    colSpec: '',
    colGrade: '',
    colQty: 'Column B (Col 1)',
    colCost: 'Column C (Col 2)',
    defaultMarkup1: 10,
    defaultMarkup2: 15,
    description: 'Special ECO ATM single line layout: Phone Model Storage Quantity $Price (+ $10 price_list.xlsx export)',
  },
  {
    id: 'tmpl_imexel',
    vendorName: 'IMEXEL',
    templateName: 'IMEXEL 3-Col (Col A Model, Col B Qty, Col C Cost)',
    colItem: 'Column A (Col 0)',
    colSpec: '',
    colGrade: '',
    colQty: 'Column B (Col 1)',
    colCost: 'Column C (Col 2)',
    defaultMarkup1: 10,
    defaultMarkup2: 15,
    description: 'Standard 3-column format for IMEXEL sheets',
  },
  {
    id: 'tmpl_as_comercio',
    vendorName: 'AS COMERCIO HAROLDO',
    templateName: 'AS COMERCIO (Col A Model, Col D Qty, Col F Cost)',
    colItem: 'Column A (Col 0)',
    colSpec: '',
    colGrade: '',
    colQty: 'Column D (Col 3)',
    colCost: 'Column F (Col 5)',
    defaultMarkup1: 10,
    defaultMarkup2: 15,
    description: 'Multi-column layout with gaps for AS COMERCIO',
  },
  {
    id: 'tmpl_ice_mobile',
    vendorName: 'ICE MOBILE',
    templateName: 'ICE MOBILE Detailed 5-Col (Model, Spec, Grade, Qty, Cost)',
    colItem: 'Column A (Col 0)',
    colSpec: 'Column B (Col 1)',
    colGrade: 'Column C (Col 2)',
    colQty: 'Column D (Col 3)',
    colCost: 'Column E (Col 4)',
    defaultMarkup1: 10,
    defaultMarkup2: 15,
    description: 'Full 5-column breakdown with Grade and Storage',
  },
  {
    id: 'tmpl_global_wireless',
    vendorName: 'GLOBAL WIRELESS',
    templateName: 'GLOBAL WIRELESS Wide (Col A Model, Col E Stock, Col G Price)',
    colItem: 'Column A (Col 0)',
    colSpec: '',
    colGrade: '',
    colQty: 'Column E (Col 4)',
    colCost: 'Column G (Col 6)',
    defaultMarkup1: 12,
    defaultMarkup2: 18,
    description: 'Wide column format with custom margins',
  },
  {
    id: 'tmpl_distribuidora_vip',
    vendorName: 'DISTRIBUIDORA VIP',
    templateName: 'DISTRIBUIDORA VIP Compact (Col A Item, Col C Qty, Col D Cost)',
    colItem: 'Column A (Col 0)',
    colSpec: '',
    colGrade: '',
    colQty: 'Column C (Col 2)',
    colCost: 'Column D (Col 3)',
    defaultMarkup1: 10,
    defaultMarkup2: 15,
    description: 'Compact 4-column format',
  },
];

// -------------------------------------------------------------
// HELPER: PARSE ECO ATM SINGLE LINE OR ROW (Rule 1, 3, 4, 5, 6)
// Line format: iPhone Model Storage Quantity $Price
// Example: iPhone 17 Pro Max 256GB 172 $1,099.00
// -------------------------------------------------------------
export const parseEcoAtmRow = (
  row: any
): { phoneModel: string; qty: number; rawCost: number; pricePlus10: number; formattedPrice: string } | null => {
  if (row === null || row === undefined) return null;
  let lineStr = '';

  if (typeof row === 'string') {
    lineStr = row;
  } else if (Array.isArray(row)) {
    const firstCell = String(row[0] || '').trim();
    const joined = row
      .map((c) => (c !== null && c !== undefined ? String(c).trim() : ''))
      .filter(Boolean)
      .join(' ');

    if (/^(.*?)\s+(\d+)\s+\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/i.test(firstCell)) {
      lineStr = firstCell;
    } else {
      lineStr = joined;
    }
  }

  lineStr = lineStr.trim();
  if (!lineStr) return null;

  // Regex to extract:
  // Group 1 (Phone Model): Everything before quantity (e.g. iPhone 17 Pro Max 256GB)
  // Group 2 (Quantity): Number immediately before price (e.g. 172)
  // Group 3 (Price): Currency or number format (e.g. 1,099.00, $1,099.00, $245.00)
  const ecoRegex = /^(.*?)\s+(\d+)\s+\$?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)$/i;
  const match = lineStr.match(ecoRegex);

  if (match) {
    const phoneModel = match[1].trim();
    const qty = parseInt(match[2], 10);
    const rawCostStr = match[3].replace(/,/g, '');
    const rawCost = parseFloat(rawCostStr);

    if (phoneModel && !isNaN(qty) && !isNaN(rawCost)) {
      const pricePlus10 = Math.round((rawCost + 10) * 100) / 100;

      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(pricePlus10);

      return {
        phoneModel,
        qty,
        rawCost,
        pricePlus10,
        formattedPrice,
      };
    }
  }

  return null;
};

// -------------------------------------------------------------
// HELPER: TEKCOM INVENTORY PARSER (Python Script Logic)
// 1. Reads *IPHONES* section & header lines (@ $Price)
// 2. Extracts Base Model, Color, Notes, and Quantity
// 3. Merges duplicate price models (omits colors if same price)
// -------------------------------------------------------------
export const TEKCOM_PRICE_PATTERN = /@\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i;
export const TEKCOM_ITEM_PATTERN = /^(.*?)\s+(\d+)\s*$/;
export const TEKCOM_STORAGE_PATTERN = /\b(?:\d+(?:\.\d+)?\s*(?:GB|TB))\b/gi;

export interface TekcomRecord {
  baseModel: string;
  color: string;
  note: string;
  quantity: number;
  price: number;
}

export const splitModelColorAndNote = (
  description: string
): { baseModel: string; color: string; note: string } => {
  let note = '';
  let desc = description.trim();

  // Extract note in parentheses at end of line, e.g. "17 Pro 256GB Orange (Damaged Box)"
  const noteMatch = desc.match(/\(([^)]+)\)\s*$/);
  if (noteMatch) {
    note = noteMatch[1].trim();
    desc = desc.substring(0, noteMatch.index).trim();
  }

  // Find all storage matches in desc
  const storageMatches = Array.from(desc.matchAll(TEKCOM_STORAGE_PATTERN));

  if (storageMatches.length === 0) {
    return { baseModel: desc, color: '', note };
  }

  const lastMatch = storageMatches[storageMatches.length - 1];
  const matchIndex = lastMatch.index ?? 0;
  const matchLength = lastMatch[0].length;

  const baseModel = desc.substring(0, matchIndex + matchLength).trim();
  const color = desc.substring(matchIndex + matchLength).trim();

  return { baseModel, color, note };
};

export const readTekcomInventory = (rowsOrLines: any[]): TekcomRecord[] => {
  const records: TekcomRecord[] = [];
  let currentPrice: number | null = null;
  let insideIphoneSection = false;
  let sectionHeaderFound = false;

  // Scan rows/lines to check if *IPHONES* section header exists
  for (const row of rowsOrLines) {
    let text = '';
    if (typeof row === 'string') {
      text = row.trim();
    } else if (Array.isArray(row)) {
      text = row.map((c) => (c !== null && c !== undefined ? String(c).trim() : '')).filter(Boolean).join(' ');
    }
    const upperText = text.toUpperCase();
    if (upperText.includes('IPHONES')) {
      sectionHeaderFound = true;
      break;
    }
  }

  for (const row of rowsOrLines) {
    let text = '';
    if (typeof row === 'string') {
      text = row.trim();
    } else if (Array.isArray(row)) {
      text = row.map((c) => (c !== null && c !== undefined ? String(c).trim() : '')).filter(Boolean).join(' ');
    }
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const upperText = text.toUpperCase();

    if (upperText.includes('IPHONES')) {
      insideIphoneSection = true;
      continue;
    }

    if (insideIphoneSection && (upperText.includes('IPADS') || upperText.includes('AIRPODS') || upperText.includes('MACBOOKS') || upperText.includes('WATCHES'))) {
      break;
    }

    if (sectionHeaderFound && !insideIphoneSection) {
      continue;
    }

    // Check price pattern: @ $1490 or @1490
    const priceMatch = text.match(TEKCOM_PRICE_PATTERN);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/,/g, '');
      const parsedPrice = parseFloat(priceStr);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        currentPrice = parsedPrice;
      }
      continue;
    }

    if (currentPrice === null) continue;

    // Check item pattern: description + qty
    const itemMatch = text.match(TEKCOM_ITEM_PATTERN);
    if (!itemMatch) continue;

    const description = itemMatch[1].trim();
    const quantity = parseInt(itemMatch[2], 10);

    if (!description || isNaN(quantity) || quantity <= 0) continue;

    const { baseModel, color, note } = splitModelColorAndNote(description);

    if (!baseModel) continue;

    records.push({
      baseModel,
      color,
      note,
      quantity,
      price: currentPrice,
    });
  }

  return records;
};

export const combineTekcomInventory = (
  records: TekcomRecord[],
  m1: number,
  m2: number
): VendorPriceListItem[] => {
  // Step 1: Map set of prices for each (baseModel, note)
  const pricesByModel = new Map<string, Set<number>>();

  records.forEach((record) => {
    const modelKey = `${record.baseModel}__${record.note}`;
    if (!pricesByModel.has(modelKey)) {
      pricesByModel.set(modelKey, new Set());
    }
    pricesByModel.get(modelKey)!.add(record.price);
  });

  // Step 2: Group records by (baseModel, price, note)
  interface GroupData {
    baseModel: string;
    price: number;
    note: string;
    quantity: number;
    colors: string[];
  }

  const grouped = new Map<string, GroupData>();

  records.forEach((record) => {
    const groupKey = `${record.baseModel}__${record.price}__${record.note}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        baseModel: record.baseModel,
        price: record.price,
        note: record.note,
        quantity: 0,
        colors: [],
      });
    }

    const g = grouped.get(groupKey)!;
    g.quantity += record.quantity;

    if (record.color && !g.colors.includes(record.color)) {
      g.colors.push(record.color);
    }
  });

  // Step 3: Build output items
  const items: VendorPriceListItem[] = [];
  let index = 0;

  grouped.forEach((data) => {
    const modelKey = `${data.baseModel}__${data.note}`;
    const priceSet = pricesByModel.get(modelKey);
    const hasMultiplePrices = priceSet ? priceSet.size > 1 : false;

    let modelName = data.baseModel.toLowerCase().includes('iphone')
      ? data.baseModel
      : `iPhone ${data.baseModel}`;

    modelName = modelName.replace(/\s+/g, ' ').trim();

    // If same model has multiple prices across colors, list colors (e.g. "iPhone 17 Pro Max 1TB Blue/Orange")
    // If all colors have the same price, omit the color and combine total quantity!
    if (hasMultiplePrices && data.colors.length > 0) {
      modelName += ` ${data.colors.join('/')}`;
    }

    if (data.note) {
      modelName += ` (${data.note})`;
    }

    const p1 = Math.round((data.price + m1) * 100) / 100;
    const p2 = Math.round((data.price + m2) * 100) / 100;

    items.push({
      id: `pli_tekcom_${Date.now()}_${index++}`,
      itemName: modelName,
      spec: '',
      grade: 'Grade A',
      qtyAvailable: data.quantity,
      vendorCost: data.price,
      markup1: m1,
      markup2: m2,
      price1: p1,
      price2: p2,
      category: 'Apple',
    });
  });

  return items;
};

interface VendorPriceListModalProps {
  onClose: () => void;
  vendorNames?: string[];
}

export const VendorPriceListModal: React.FC<VendorPriceListModalProps> = ({
  onClose,
  vendorNames = ['TEKCOM', 'ECO ATM', 'IMEXEL', 'AS COMERCIO HAROLDO', 'ICE MOBILE', 'GLOBAL WIRELESS', 'DISTRIBUIDORA VIP'],
}) => {
  // Master State
  const [vendorName, setVendorName] = useState<string>('IMEXEL');
  const [sheetDate, setSheetDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [items, setItems] = useState<VendorPriceListItem[]>(INITIAL_PRICE_LIST_ITEMS);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showDistributorCompare, setShowDistributorCompare] = useState<boolean>(false);

  // Global Markup Controls
  const [defaultMarkup1, setDefaultMarkup1] = useState<number>(10); // + $10 first price
  const [defaultMarkup2, setDefaultMarkup2] = useState<number>(15); // + $15 second price
  const [markupType, setMarkupType] = useState<'dollar' | 'percent'>('dollar');

  // Multi-Vendor Templates State
  const [savedTemplates, setSavedTemplates] = useState<VendorImportTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('vendor_import_templates_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to read vendor import templates from storage', e);
    }
    return INITIAL_VENDOR_TEMPLATES;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('auto');
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);

  // Template Save & Management Modals
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateVendor, setSaveTemplateVendor] = useState('IMEXEL');
  const [showManageTemplatesModal, setShowManageTemplatesModal] = useState(false);

  // Excel Upload / Mapping State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rawExcelRows, setRawExcelRows] = useState<any[] | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [showColumnMapper, setShowColumnMapper] = useState(false);

  // Column Mappings
  const [colItem, setColItem] = useState('');
  const [colSpec, setColSpec] = useState('');
  const [colGrade, setColGrade] = useState('');
  const [colQty, setColQty] = useState('');
  const [colCost, setColCost] = useState('');

  // Table Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [stockOnly, setStockOnly] = useState<boolean>(false);

  // Notification States
  const [copiedText, setCopiedText] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Text Paste Modal / Drawer State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Add/Edit Single Item State
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<VendorPriceListItem | null>(null);
  const [formItemName, setFormItemName] = useState('');
  const [formSpec, setFormSpec] = useState('');
  const [formGrade, setFormGrade] = useState('Grade A');
  const [formQty, setFormQty] = useState<number>(10);
  const [formCost, setFormCost] = useState<number>(100);
  const [formMarkup1, setFormMarkup1] = useState<number>(10);
  const [formMarkup2, setFormMarkup2] = useState<number>(15);

  // ECO ATM Vendor Mode Check
  const isEcoAtmVendor = useMemo(() => {
    const norm = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return norm.includes('ecoatm') || norm.includes('eco') || selectedTemplateId === 'tmpl_eco_atm';
  }, [vendorName, selectedTemplateId]);

  // TEKCOM Vendor Mode Check
  const isTekcomVendor = useMemo(() => {
    const norm = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return norm.includes('tekcom') || selectedTemplateId === 'tmpl_tekcom';
  }, [vendorName, selectedTemplateId]);

  // -------------------------------------------------------------
  // HELPER: CLEAN & FORMAT MODEL DESCRIPTION (RULE 1 & 3)
  // -------------------------------------------------------------
  const cleanModelDescription = (rawDesc: string): string => {
    if (!rawDesc) return '';
    let str = rawDesc.trim();

    // Do not remove storage or keywords for ECO ATM or TEKCOM
    if (isEcoAtmVendor || isTekcomVendor) {
      return str;
    }

    // 1a. Delete everything before the word "iPhone" if present
    const iphoneIndex = str.search(/iphone/i);
    if (iphoneIndex !== -1) {
      str = str.substring(iphoneIndex);
    }

    // 1b. Storage size cut-off: 1TB, 512GB, 256GB, 128GB, 64GB, 32GB, 16GB
    const storageMatch = str.match(/(1TB|512GB|256GB|128GB|64GB|32GB|16GB)/i);
    if (storageMatch && storageMatch.index !== undefined) {
      const cutoffIndex = storageMatch.index + storageMatch[0].length;
      str = str.substring(0, cutoffIndex);
    }

    // 1c. Remove colors & SIM info & extraneous tags
    const noiseKeywords = [
      'PSIM', 'ESIM', 'PHYSICAL SIM', 'DUAL SIM', 'ESIM ONLY', 'FACTORY SEALED',
      'SPACE GRAY', 'SPACE GREY', 'GRAPHITE', 'SILVER', 'GOLD', 'ROSE GOLD',
      'MIDNIGHT', 'STARLIGHT', 'ALPINE GREEN', 'SIERRA BLUE', 'DEEP PURPLE',
      'NATURAL TITANIUM', 'BLACK TITANIUM', 'WHITE TITANIUM', 'BLUE TITANIUM', 'DESERT TITANIUM',
      'BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN', 'PURPLE', 'YELLOW', 'PINK', 'NATURAL',
      'UNLOCKED', 'CLEAN IMEI', 'NEW', 'USED', 'REFURBISHED'
    ];

    noiseKeywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      str = str.replace(regex, '');
    });

    // Clean extra whitespace
    str = str.replace(/\s+/g, ' ').trim();
    return str;
  };

  // -------------------------------------------------------------
  // HELPER: COMBINE DUPLICATE ITEMS WITH SAME MODEL & PRICE (RULE 2)
  // -------------------------------------------------------------
  const combineDuplicateItems = (rawList: VendorPriceListItem[], m1: number = defaultMarkup1, m2: number = defaultMarkup2): VendorPriceListItem[] => {
    const map = new Map<string, VendorPriceListItem>();

    rawList.forEach((item, index) => {
      const cleanedName = cleanModelDescription(item.itemName + (item.spec ? ' ' + item.spec : ''));
      if (!cleanedName) return;

      const costKey = item.vendorCost.toFixed(2);
      const compositeKey = `${cleanedName.toLowerCase()}__${costKey}`;

      const itemM1 = item.markup1 !== undefined ? item.markup1 : m1;
      const itemM2 = item.markup2 !== undefined ? item.markup2 : m2;
      const p1 = item.price1 !== undefined ? item.price1 : Math.round((item.vendorCost + itemM1) * 100) / 100;
      const p2 = item.price2 !== undefined ? item.price2 : Math.round((item.vendorCost + itemM2) * 100) / 100;

      if (map.has(compositeKey)) {
        const existing = map.get(compositeKey)!;
        existing.qtyAvailable += item.qtyAvailable || 1;
      } else {
        map.set(compositeKey, {
          ...item,
          id: `pli_clean_${Date.now()}_${index}`,
          itemName: cleanedName,
          spec: '',
          qtyAvailable: item.qtyAvailable || 1,
          vendorCost: item.vendorCost,
          markup1: itemM1,
          markup2: itemM2,
          price1: p1,
          price2: p2,
        });
      }
    });

    return Array.from(map.values());
  };

  // Manual Trigger to Clean & Combine Current Loaded Items
  const handleApplyFiveRuleCleanup = () => {
    const cleaned = combineDuplicateItems(items, defaultMarkup1, defaultMarkup2);
    setItems(cleaned);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // -------------------------------------------------------------
  // 1. DYNAMIC MARKUP RECALCULATION
  // -------------------------------------------------------------
  const applyGlobalMarkups = (m1: number, m2: number, type: 'dollar' | 'percent' = markupType) => {
    setDefaultMarkup1(m1);
    setDefaultMarkup2(m2);
    setItems((prev) =>
      prev.map((item) => {
        let p1 = 0;
        let p2 = 0;
        if (type === 'dollar') {
          p1 = Math.round((item.vendorCost + m1) * 100) / 100;
          p2 = Math.round((item.vendorCost + m2) * 100) / 100;
        } else {
          p1 = Math.round((item.vendorCost * (1 + m1 / 100)) * 100) / 100;
          p2 = Math.round((item.vendorCost * (1 + m2 / 100)) * 100) / 100;
        }
        return {
          ...item,
          markup1: m1,
          markup2: m2,
          price1: p1,
          price2: p2,
        };
      })
    );
  };

  const handleUpdateItemMarkup = (id: string, newM1: number, newM2: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const p1 = Math.round((item.vendorCost + newM1) * 100) / 100;
          const p2 = Math.round((item.vendorCost + newM2) * 100) / 100;
          return {
            ...item,
            markup1: newM1,
            markup2: newM2,
            price1: p1,
            price2: p2,
          };
        }
        return item;
      })
    );
  };

  const handleUpdateItemCost = (id: string, newCost: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const p1 = Math.round((newCost + item.markup1) * 100) / 100;
          const p2 = Math.round((newCost + item.markup2) * 100) / 100;
          return {
            ...item,
            vendorCost: newCost,
            price1: p1,
            price2: p2,
          };
        }
        return item;
      })
    );
  };

  // -------------------------------------------------------------
  // HELPER NUMERIC PARSERS FOR EXCEL/CSV DATA
  // -------------------------------------------------------------
  const parseCostValue = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    if (!str) return 0;
    // Replace European comma decimals if no dot exists, clean currency symbols
    let cleaned = str.replace(/[^0-9.,]/g, '');
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseQtyValue = (val: any): number => {
    if (val === undefined || val === null) return 1;
    if (typeof val === 'number') return isNaN(val) || val <= 0 ? 1 : Math.round(val);
    const str = String(val).trim();
    if (!str) return 1;
    const digits = str.replace(/[^0-9]/g, '');
    const num = parseInt(digits, 10);
    return isNaN(num) || num <= 0 ? 1 : num;
  };

  // -------------------------------------------------------------
  // MULTI-VENDOR TEMPLATE PERSISTENCE & HANDLERS
  // -------------------------------------------------------------
  const persistTemplates = (newTemplates: VendorImportTemplate[]) => {
    setSavedTemplates(newTemplates);
    try {
      localStorage.setItem('vendor_import_templates_v2', JSON.stringify(newTemplates));
    } catch (e) {
      console.error('Failed to save vendor templates to storage', e);
    }
  };

  const resolveHeaderFromTemplate = (headers: string[], targetColStr: string): string => {
    if (!targetColStr) return '';
    const exact = headers.find((h) => h.toLowerCase().trim() === targetColStr.toLowerCase().trim());
    if (exact) return exact;

    const colMatch = targetColStr.match(/\(Col\s*(\d+)\)/i);
    if (colMatch && colMatch[1] !== undefined) {
      const idx = parseInt(colMatch[1], 10);
      if (idx >= 0 && idx < headers.length) {
        return headers[idx];
      }
    }

    const letterMatch = targetColStr.match(/(?:Column|Col)\s*([A-Z])/i);
    if (letterMatch && letterMatch[1]) {
      const charCode = letterMatch[1].toUpperCase().charCodeAt(0);
      const idx = charCode - 65;
      if (idx >= 0 && idx < headers.length) {
        return headers[idx];
      }
    }

    return '';
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'auto') {
      setTemplateNotice('Switched to Auto-Detect Column Headers');
      setTimeout(() => setTemplateNotice(null), 3000);
      return;
    }

    if (templateId === 'tmpl_tekcom') {
      setVendorName('TEKCOM');
      setDefaultMarkup1(10);
      setDefaultMarkup2(15);
      setTemplateNotice(`Loaded TEKCOM Section Template (*IPHONES* section & @ $Price parser)`);
      setTimeout(() => setTemplateNotice(null), 3500);
      return;
    }

    const tmpl = savedTemplates.find((t) => t.id === templateId);
    if (tmpl) {
      if (tmpl.vendorName) setVendorName(tmpl.vendorName);
      if (tmpl.defaultMarkup1 !== undefined) setDefaultMarkup1(tmpl.defaultMarkup1);
      if (tmpl.defaultMarkup2 !== undefined) setDefaultMarkup2(tmpl.defaultMarkup2);

      if (excelHeaders.length > 0) {
        const itemResolved = resolveHeaderFromTemplate(excelHeaders, tmpl.colItem) || excelHeaders[0] || '';
        const specResolved = resolveHeaderFromTemplate(excelHeaders, tmpl.colSpec);
        const gradeResolved = resolveHeaderFromTemplate(excelHeaders, tmpl.colGrade);
        const qtyResolved = resolveHeaderFromTemplate(excelHeaders, tmpl.colQty) || (excelHeaders.length > 1 ? excelHeaders[1] : '');
        const costResolved = resolveHeaderFromTemplate(excelHeaders, tmpl.colCost) || (excelHeaders.length > 2 ? excelHeaders[2] : '');

        setColItem(itemResolved);
        setColSpec(specResolved);
        setColGrade(gradeResolved);
        setColQty(qtyResolved);
        setColCost(costResolved);

        if (rawExcelRows && rawExcelRows.length > 0) {
          processImportedRowsWithCols(
            itemResolved,
            specResolved,
            gradeResolved,
            qtyResolved,
            costResolved,
            tmpl.defaultMarkup1 ?? defaultMarkup1,
            tmpl.defaultMarkup2 ?? defaultMarkup2
          );
        }
      } else {
        if (tmpl.colItem) setColItem(tmpl.colItem);
        if (tmpl.colSpec !== undefined) setColSpec(tmpl.colSpec);
        if (tmpl.colGrade !== undefined) setColGrade(tmpl.colGrade);
        if (tmpl.colQty !== undefined) setColQty(tmpl.colQty);
        if (tmpl.colCost !== undefined) setColCost(tmpl.colCost);
      }

      setTemplateNotice(`Loaded Template: "${tmpl.templateName}"`);
      setTimeout(() => setTemplateNotice(null), 3500);
    }
  };

  const handleVendorNameChange = (newVendor: string) => {
    setVendorName(newVendor);

    // Auto-match TEKCOM template
    const isTekcom = newVendor.toLowerCase().replace(/[^a-z0-9]/g, '').includes('tekcom');
    if (isTekcom) {
      setSelectedTemplateId('tmpl_tekcom');
      setDefaultMarkup1(10);
      setDefaultMarkup2(15);
      setTemplateNotice(`Auto-selected TEKCOM template (*IPHONES* section & @ $Price parser)`);
      setTimeout(() => setTemplateNotice(null), 3500);
      return;
    }

    // Auto-match ECO ATM template
    const isEco = newVendor.toLowerCase().replace(/[^a-z0-9]/g, '').includes('ecoatm') || newVendor.toLowerCase().includes('eco');
    if (isEco) {
      setSelectedTemplateId('tmpl_eco_atm');
      setDefaultMarkup1(10);
      setDefaultMarkup2(15);
      setTemplateNotice(`Auto-selected ECO ATM template (Single-line parsing + $10 price_list.xlsx export)`);
      setTimeout(() => setTemplateNotice(null), 3500);
      return;
    }

    // Auto-match template if one exists for this vendor
    const matched = savedTemplates.find((t) => t.vendorName.toLowerCase().trim() === newVendor.toLowerCase().trim());
    if (matched) {
      setSelectedTemplateId(matched.id);
      if (matched.defaultMarkup1 !== undefined) setDefaultMarkup1(matched.defaultMarkup1);
      if (matched.defaultMarkup2 !== undefined) setDefaultMarkup2(matched.defaultMarkup2);
      if (matched.colItem) setColItem(matched.colItem);
      if (matched.colSpec !== undefined) setColSpec(matched.colSpec);
      if (matched.colGrade !== undefined) setColGrade(matched.colGrade);
      if (matched.colQty !== undefined) setColQty(matched.colQty);
      if (matched.colCost !== undefined) setColCost(matched.colCost);

      setTemplateNotice(`Auto-selected template "${matched.templateName}" for ${newVendor}`);
      setTimeout(() => setTemplateNotice(null), 3500);
    }
  };

  const handleSaveNewTemplate = () => {
    if (!saveTemplateName.trim()) return;

    const newTmpl: VendorImportTemplate = {
      id: `tmpl_custom_${Date.now()}`,
      vendorName: saveTemplateVendor || vendorName,
      templateName: saveTemplateName.trim(),
      colItem: colItem || excelHeaders[0] || '',
      colSpec: colSpec,
      colGrade: colGrade,
      colQty: colQty || excelHeaders[1] || '',
      colCost: colCost || excelHeaders[2] || '',
      defaultMarkup1: defaultMarkup1,
      defaultMarkup2: defaultMarkup2,
      description: `Custom format for ${saveTemplateVendor || vendorName}`,
    };

    const updated = [newTmpl, ...savedTemplates];
    persistTemplates(updated);
    setSelectedTemplateId(newTmpl.id);
    setShowSaveTemplateModal(false);
    setSaveTemplateName('');
    setSavedSuccess(true);
    setTemplateNotice(`Saved template "${newTmpl.templateName}"!`);
    setTimeout(() => {
      setSavedSuccess(false);
      setTemplateNotice(null);
    }, 3500);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    persistTemplates(updated);
    if (selectedTemplateId === id) setSelectedTemplateId('auto');
  };

  // -------------------------------------------------------------
  // 2. EXCEL READ & AUTO-DETECT COLUMNS WITH VENDOR TEMPLATE MATCHING
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setIsUploading(false);
      setUploadError('Failed to read the file from your disk. Please try again.');
    };

    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        if (!arrayBuffer) {
          setUploadError('File content was empty or unreadable.');
          setIsUploading(false);
          return;
        }

        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!data || data.length === 0) {
          setUploadError('The selected Excel sheet contains no rows.');
          setIsUploading(false);
          return;
        }

        const nonEmptyRows = data.filter((r) => Array.isArray(r) && r.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));

        if (nonEmptyRows.length === 0) {
          setUploadError('The selected Excel sheet has no valid data.');
          setIsUploading(false);
          return;
        }

        let firstRow = nonEmptyRows[0];
        const rowStr = firstRow.map((c: any) => String(c || '').toLowerCase()).join(' ');

        const headerKeywords = ['model', 'item', 'description', 'desc', 'qty', 'quantity', 'stock', 'cost', 'price', 'vendor', 'spec', 'grade', 'gb', 'amount'];
        const isHeader = headerKeywords.some((kw) => rowStr.includes(kw)) && !rowStr.includes('iphone') && !rowStr.includes('samsung');

        let headers: string[] = [];
        let rows: any[][] = [];

        if (isHeader) {
          headers = firstRow.map((h: any, idx: number) => String(h || '').trim() || `Col ${idx + 1}`);
          rows = nonEmptyRows.slice(1);
        } else {
          const maxCols = Math.max(...nonEmptyRows.map((r) => r.length));
          headers = Array.from({ length: maxCols }, (_, i) => `Column ${String.fromCharCode(65 + i)} (Col ${i})`);
          rows = nonEmptyRows;
        }

        setExcelHeaders(headers);
        setRawExcelRows(rows);

        // Active template matching
        const activeTmpl =
          savedTemplates.find((t) => t.id === selectedTemplateId) ||
          savedTemplates.find((t) => t.vendorName.toLowerCase().trim() === vendorName.toLowerCase().trim());

        let itemC = '';
        let specC = '';
        let gradeC = '';
        let qtyC = '';
        let costC = '';

        if (activeTmpl) {
          itemC = resolveHeaderFromTemplate(headers, activeTmpl.colItem);
          specC = resolveHeaderFromTemplate(headers, activeTmpl.colSpec);
          gradeC = resolveHeaderFromTemplate(headers, activeTmpl.colGrade);
          qtyC = resolveHeaderFromTemplate(headers, activeTmpl.colQty);
          costC = resolveHeaderFromTemplate(headers, activeTmpl.colCost);

          if (activeTmpl.defaultMarkup1 !== undefined) setDefaultMarkup1(activeTmpl.defaultMarkup1);
          if (activeTmpl.defaultMarkup2 !== undefined) setDefaultMarkup2(activeTmpl.defaultMarkup2);

          setTemplateNotice(`Importing with Template: "${activeTmpl.templateName}"`);
          setTimeout(() => setTemplateNotice(null), 3500);
        }

        // Auto-detect fallback if unresolved
        if (!itemC || !costC) {
          headers.forEach((h) => {
            const lower = h.toLowerCase();
            if (!itemC && (lower.includes('model') || lower.includes('item') || lower.includes('description') || lower.includes('device') || lower.includes('product') || lower.includes('name') || lower.includes('column a'))) {
              itemC = h;
            } else if (!specC && (lower.includes('spec') || lower.includes('memory') || lower.includes('capacity') || lower.includes('storage'))) {
              specC = h;
            } else if (!gradeC && (lower.includes('grade') || lower.includes('condition') || lower.includes('status') || lower.includes('quality'))) {
              gradeC = h;
            } else if (!qtyC && (lower.includes('qty') || lower.includes('quantity') || lower.includes('stock') || lower.includes('avail') || lower.includes('count') || lower.includes('column b'))) {
              qtyC = h;
            } else if (!costC && (lower.includes('cost') || lower.includes('price') || lower.includes('vendor') || lower.includes('rate') || lower.includes('unit') || lower.includes('amount') || lower.includes('buy') || lower.includes('column c'))) {
              costC = h;
            }
          });
        }

        if (!itemC && headers.length > 0) itemC = headers[0];
        if (!qtyC && headers.length > 1) qtyC = headers[1];
        if (!costC && headers.length > 2) costC = headers[2];

        setColItem(itemC);
        setColSpec(specC);
        setColGrade(gradeC);
        setColQty(qtyC);
        setColCost(costC);

        // Process rows with selected columns
        processImportedRowsWithCols(itemC, specC, gradeC, qtyC, costC, defaultMarkup1, defaultMarkup2, rows, headers);

        setIsUploading(false);
      } catch (err: any) {
        console.error('Error parsing Excel file:', err);
        setUploadError('Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv sheet.');
        setIsUploading(false);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const processImportedRowsWithCols = (
    itemC: string = colItem,
    specC: string = colSpec,
    gradeC: string = colGrade,
    qtyC: string = colQty,
    costC: string = colCost,
    m1: number = defaultMarkup1,
    m2: number = defaultMarkup2,
    sourceRows: any[][] | null = rawExcelRows,
    headers: string[] = excelHeaders
  ) => {
    if (!sourceRows || !headers || headers.length === 0) return;

    // Try TEKCOM section format parser first
    const tekcomRecords = readTekcomInventory(sourceRows);
    if (isTekcomVendor || tekcomRecords.length > 0) {
      if (tekcomRecords.length > 0) {
        const combinedTekcom = combineTekcomInventory(tekcomRecords, m1, m2);
        if (combinedTekcom.length > 0) {
          setItems(combinedTekcom);
          setShowColumnMapper(false);
          setSavedSuccess(true);
          setTemplateNotice(`Imported ${combinedTekcom.length} Tekcom phone models with merged colors & quantities!`);
          setTimeout(() => {
            setSavedSuccess(false);
            setTemplateNotice(null);
          }, 3500);
          return;
        }
      }
    }

    const itemIdx = headers.indexOf(itemC);
    const specIdx = headers.indexOf(specC);
    const gradeIdx = headers.indexOf(gradeC);
    const qtyIdx = headers.indexOf(qtyC);
    const costIdx = headers.indexOf(costC);

    const newItems: VendorPriceListItem[] = [];

    sourceRows.forEach((row, index) => {
      // Try ECO ATM single-line format parser (Rule 1, 3, 4, 5, 6)
      const ecoRes = parseEcoAtmRow(row);
      if (isEcoAtmVendor || ecoRes) {
        if (ecoRes) {
          const p1 = Math.round((ecoRes.rawCost + m1) * 100) / 100;
          const p2 = Math.round((ecoRes.rawCost + m2) * 100) / 100;

          newItems.push({
            id: `pli_imp_${Date.now()}_${index}`,
            itemName: ecoRes.phoneModel,
            spec: '',
            grade: 'Grade A',
            qtyAvailable: ecoRes.qty,
            vendorCost: ecoRes.rawCost,
            markup1: m1,
            markup2: m2,
            price1: p1,
            price2: p2,
            category: ecoRes.phoneModel.toLowerCase().includes('iphone') ? 'Apple' : 'Other'
          });
          return;
        }
      }

      const rawName = itemIdx >= 0 && row[itemIdx] !== undefined ? String(row[itemIdx]).trim() : '';
      if (!rawName) return;

      const rawSpec = specIdx >= 0 && row[specIdx] !== undefined ? String(row[specIdx]).trim() : '';
      const rawGrade = gradeIdx >= 0 && row[gradeIdx] !== undefined ? String(row[gradeIdx]).trim() : 'Grade A';

      const qty = qtyIdx >= 0 ? parseQtyValue(row[qtyIdx]) : 1;
      const cost = costIdx >= 0 ? parseCostValue(row[costIdx]) : 0;

      let p1 = cost + m1;
      let p2 = cost + m2;

      if (markupType === 'percent') {
        p1 = Math.round((cost * (1 + m1 / 100)) * 100) / 100;
        p2 = Math.round((cost * (1 + m2 / 100)) * 100) / 100;
      } else {
        p1 = Math.round(p1 * 100) / 100;
        p2 = Math.round(p2 * 100) / 100;
      }

      newItems.push({
        id: `pli_imp_${Date.now()}_${index}`,
        itemName: rawName,
        spec: rawSpec,
        grade: rawGrade,
        qtyAvailable: qty,
        vendorCost: cost,
        markup1: m1,
        markup2: m2,
        price1: p1,
        price2: p2,
        category: rawName.toLowerCase().includes('iphone') || rawName.toLowerCase().includes('ipad') ? 'Apple' : rawName.toLowerCase().includes('samsung') ? 'Samsung' : 'Other'
      });
    });

    if (newItems.length > 0) {
      const cleanedCombined = combineDuplicateItems(newItems, m1, m2);
      setItems(cleanedCombined);
      setShowColumnMapper(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      setUploadError('Could not extract valid item rows. Check column mapping selection.');
      setShowColumnMapper(true);
    }
  };

  const processImportedRows = () => {
    processImportedRowsWithCols();
  };

  // Handle Text Paste (TSV / CSV from Excel)
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText.trim().split(/\r?\n/);
    if (lines.length === 0) return;

    // Try TEKCOM section format parser first
    const tekcomRecords = readTekcomInventory(lines);
    if (isTekcomVendor || tekcomRecords.length > 0) {
      if (tekcomRecords.length > 0) {
        const combinedTekcom = combineTekcomInventory(tekcomRecords, defaultMarkup1, defaultMarkup2);
        if (combinedTekcom.length > 0) {
          setItems(combinedTekcom);
          setShowPasteModal(false);
          setPastedText('');
          setSavedSuccess(true);
          setTemplateNotice(`Parsed ${combinedTekcom.length} Tekcom items with merged quantities & colors!`);
          setTimeout(() => {
            setSavedSuccess(false);
            setTemplateNotice(null);
          }, 3500);
          return;
        }
      }
    }

    const newItems: VendorPriceListItem[] = [];

    lines.forEach((line, index) => {
      // Try ECO ATM single-line format parser first
      const ecoRes = parseEcoAtmRow(line);
      if (isEcoAtmVendor || ecoRes) {
        if (ecoRes) {
          const p1 = Math.round((ecoRes.rawCost + defaultMarkup1) * 100) / 100;
          const p2 = Math.round((ecoRes.rawCost + defaultMarkup2) * 100) / 100;

          newItems.push({
            id: `pli_imp_paste_${Date.now()}_${index}`,
            itemName: ecoRes.phoneModel,
            spec: '',
            grade: 'Grade A',
            qtyAvailable: ecoRes.qty,
            vendorCost: ecoRes.rawCost,
            markup1: defaultMarkup1,
            markup2: defaultMarkup2,
            price1: p1,
            price2: p2,
            category: ecoRes.phoneModel.toLowerCase().includes('iphone') ? 'Apple' : 'Other'
          });
          return;
        }
      }

      // Split by tab or comma
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length < 2) return;

      const namePart = parts[0].trim();
      if (!namePart || namePart.toLowerCase().includes('model') || namePart.toLowerCase().includes('item name')) return;

      let specPart = '';
      let gradePart = 'Grade A';
      let qtyPart = 10;
      let costPart = 100;

      if (parts.length >= 2) {
        // try to find numbers for cost & qty
        let costFound = false;
        for (let i = 1; i < parts.length; i++) {
          const valStr = parts[i].trim();
          if (valStr.startsWith('$') || !isNaN(parseFloat(valStr.replace('$', '')))) {
            const num = parseFloat(valStr.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) {
              if (!costFound) {
                costPart = num;
                costFound = true;
              } else {
                qtyPart = Math.round(num);
              }
            }
          } else if (valStr.toLowerCase().includes('grade') || valStr.toLowerCase().includes('new') || valStr.startsWith('Grade')) {
            gradePart = valStr;
          } else {
            specPart += (specPart ? ' ' : '') + valStr;
          }
        }
      }

      const m1 = defaultMarkup1;
      const m2 = defaultMarkup2;
      const p1 = Math.round((costPart + m1) * 100) / 100;
      const p2 = Math.round((costPart + m2) * 100) / 100;

      newItems.push({
        id: `pli_paste_${Date.now()}_${index}`,
        itemName: namePart,
        spec: specPart,
        grade: gradePart,
        qtyAvailable: qtyPart,
        vendorCost: costPart,
        markup1: m1,
        markup2: m2,
        price1: p1,
        price2: p2,
      });
    });

    if (newItems.length > 0) {
      const cleanedCombined = combineDuplicateItems(newItems, defaultMarkup1, defaultMarkup2);
      setItems(cleanedCombined);
      setShowPasteModal(false);
      setPastedText('');
    } else {
      alert('Could not parse text lines into valid price list items.');
    }
  };

  // Load Sample Demo Excel Sheet
  const handleLoadSampleData = () => {
    setItems(INITIAL_PRICE_LIST_ITEMS);
    applyGlobalMarkups(10, 15, 'dollar');
  };

  // Add / Edit Item Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormItemName('');
    setFormSpec('');
    setFormGrade('Grade A');
    setFormQty(10);
    setFormCost(100);
    setFormMarkup1(defaultMarkup1);
    setFormMarkup2(defaultMarkup2);
    setShowItemForm(true);
  };

  const handleOpenEdit = (item: VendorPriceListItem) => {
    setEditingItem(item);
    setFormItemName(item.itemName);
    setFormSpec(item.spec || '');
    setFormGrade(item.grade || 'Grade A');
    setFormQty(item.qtyAvailable);
    setFormCost(item.vendorCost);
    setFormMarkup1(item.markup1);
    setFormMarkup2(item.markup2);
    setShowItemForm(true);
  };

  const handleSaveItem = () => {
    if (!formItemName.trim()) return;

    const p1 = Math.round((formCost + formMarkup1) * 100) / 100;
    const p2 = Math.round((formCost + formMarkup2) * 100) / 100;

    if (editingItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
                ...i,
                itemName: formItemName,
                spec: formSpec,
                grade: formGrade,
                qtyAvailable: formQty,
                vendorCost: formCost,
                markup1: formMarkup1,
                markup2: formMarkup2,
                price1: p1,
                price2: p2,
              }
            : i
        )
      );
    } else {
      const newItem: VendorPriceListItem = {
        id: `pli_${Date.now()}`,
        itemName: formItemName,
        spec: formSpec,
        grade: formGrade,
        qtyAvailable: formQty,
        vendorCost: formCost,
        markup1: formMarkup1,
        markup2: formMarkup2,
        price1: p1,
        price2: p2,
      };
      setItems((prev) => [newItem, ...prev]);
    }
    setShowItemForm(false);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // -------------------------------------------------------------
  // 3. FILTERED ITEMS & CALCULATED STATS
  // -------------------------------------------------------------
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.spec && item.spec.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.grade && item.grade.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGrade = gradeFilter === 'all' || item.grade === gradeFilter;
      const matchesStock = !stockOnly || item.qtyAvailable > 0;

      return matchesSearch && matchesGrade && matchesStock;
    });
  }, [items, searchQuery, gradeFilter, stockOnly]);

  const stats = useMemo(() => {
    let totalQty = 0;
    let totalVendorCost = 0;
    let totalPrice1 = 0;
    let totalPrice2 = 0;

    items.forEach((i) => {
      const qty = i.qtyAvailable || 1;
      totalQty += qty;
      totalVendorCost += (i.vendorCost || 0) * qty;
      totalPrice1 += (i.price1 || 0) * qty;
      totalPrice2 += (i.price2 || 0) * qty;
    });

    const profit1 = totalPrice1 - totalVendorCost;
    const profit2 = totalPrice2 - totalVendorCost;

    return {
      totalItems: items.length,
      totalQty,
      totalVendorCost,
      totalPrice1,
      totalPrice2,
      profit1,
      profit2,
    };
  }, [items]);

  // 3-Row Live Sample Preview for Column Mapper
  const samplePreviewItems = useMemo(() => {
    if (!rawExcelRows || rawExcelRows.length === 0 || !excelHeaders || excelHeaders.length === 0) return [];

    const itemIdx = excelHeaders.indexOf(colItem);
    const specIdx = excelHeaders.indexOf(colSpec);
    const gradeIdx = excelHeaders.indexOf(colGrade);
    const qtyIdx = excelHeaders.indexOf(colQty);
    const costIdx = excelHeaders.indexOf(colCost);

    const samples: Array<{
      itemName: string;
      spec: string;
      grade: string;
      qty: number;
      cost: number;
      price1: number;
      price2: number;
    }> = [];

    for (let i = 0; i < Math.min(3, rawExcelRows.length); i++) {
      const row = rawExcelRows[i];
      if (!row || !Array.isArray(row)) continue;
      const rawName = itemIdx >= 0 && row[itemIdx] !== undefined ? String(row[itemIdx]).trim() : '';
      if (!rawName) continue;

      const rawSpec = specIdx >= 0 && row[specIdx] !== undefined ? String(row[specIdx]).trim() : '';
      const rawGrade = gradeIdx >= 0 && row[gradeIdx] !== undefined ? String(row[gradeIdx]).trim() : 'Grade A';
      const qty = qtyIdx >= 0 ? parseQtyValue(row[qtyIdx]) : 1;
      const cost = costIdx >= 0 ? parseCostValue(row[costIdx]) : 0;

      const p1 = Math.round((cost + defaultMarkup1) * 100) / 100;
      const p2 = Math.round((cost + defaultMarkup2) * 100) / 100;

      samples.push({
        itemName: rawName,
        spec: rawSpec,
        grade: rawGrade,
        qty,
        cost,
        price1: p1,
        price2: p2,
      });
    }

    return samples;
  }, [rawExcelRows, excelHeaders, colItem, colSpec, colGrade, colQty, colCost, defaultMarkup1, defaultMarkup2]);

  // -------------------------------------------------------------
  // 4. EXPORT HANDLERS: EXCEL, COPY TEXT, PDF, PRINT
  // -------------------------------------------------------------
  // Rule 4 & 5: Export Price List 1 Excel (Column A only: "iPhone 13 128GB 25 pcs $275")
  const handleDownloadExcelPrice1 = () => {
    const cleanedItems = combineDuplicateItems(items, defaultMarkup1, defaultMarkup2);
    
    const excelRows = cleanedItems.map((i) => {
      const formattedPrice = `$${Math.round(i.price1)}`;
      const colCombined = `${i.itemName}${i.spec ? ' ' + i.spec : ''} ${i.qtyAvailable} pcs ${formattedPrice}`;
      return {
        'Description': colCombined
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows, { header: ['Description'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price List 1');

    const cleanVendor = vendorName.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `PriceList1_${cleanVendor}_${sheetDate}.xlsx`);
  };

  // Rule 4 & 5: Export Price List 2 Excel (Column A only: "iPhone 13 128GB 25 pcs $280")
  const handleDownloadExcelPrice2 = () => {
    const cleanedItems = combineDuplicateItems(items, defaultMarkup1, defaultMarkup2);
    
    const excelRows = cleanedItems.map((i) => {
      const formattedPrice = `$${Math.round(i.price2)}`;
      const colCombined = `${i.itemName}${i.spec ? ' ' + i.spec : ''} ${i.qtyAvailable} pcs ${formattedPrice}`;
      return {
        'Description': colCombined
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows, { header: ['Description'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price List 2');

    const cleanVendor = vendorName.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `PriceList2_${cleanVendor}_${sheetDate}.xlsx`);
  };

  // ECO ATM Specific Export Handler (Rule 2, 3, 4, 5, 6, 7)
  const handleDownloadEcoAtmExcel = () => {
    const cleanedItems = combineDuplicateItems(items, defaultMarkup1, defaultMarkup2);

    const excelRows = cleanedItems.map((i) => {
      // Read price based on current profit value (Price 1 / Markup 1)
      const currentPrice1 = i.price1 ?? (i.vendorCost + (i.markup1 ?? defaultMarkup1));

      // Rule 5 & 6: Format as currency with thousands separators (e.g. $1,099.00 -> $1,109.00 or $245.00 -> $255.00)
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(currentPrice1);

      // Rule 3: Keep everything before quantity. Include full model name & storage size.
      let fullPhoneModel = i.itemName;
      if (i.spec && !fullPhoneModel.toLowerCase().includes(i.spec.toLowerCase())) {
        fullPhoneModel = `${fullPhoneModel} ${i.spec}`;
      }

      return {
        'Phone Model': fullPhoneModel,
        'Quantity': i.qtyAvailable,
        'Price': formattedPrice,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows, {
      header: ['Phone Model', 'Quantity', 'Price'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price List');

    // Rule 7: Export as a new Excel file named: price_list.xlsx
    XLSX.writeFile(workbook, 'price_list.xlsx');
  };

  // A) Download Processed Multi-Column Excel (.xlsx)
  const handleDownloadExcel = () => {
    if (isEcoAtmVendor) {
      handleDownloadEcoAtmExcel();
      return;
    }

    const excelRows = items.map((i) => ({
      'Item / Model': i.itemName,
      'Spec / Memory': i.spec || '',
      'Grade': i.grade || '',
      'Stock Available': i.qtyAvailable,
      'Vendor Cost ($)': i.vendorCost,
      'Price 1 (Cost + $10)': i.price1,
      'Price 2 (Cost + $15)': i.price2,
      'Profit 1 ($)': i.price1 - i.vendorCost,
      'Profit 2 ($)': i.price2 - i.vendorCost,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Price List');

    const cleanVendor = vendorName.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `PriceList_${cleanVendor}_${sheetDate}.xlsx`);
  };

  // B) Copy Formatted Customer Catalog Text (WhatsApp / Email / Text - Format: iPhone 13 128GB 25 pcs $275)
  const customerCatalogText = useMemo(() => {
    const header = `📱 DAILY VENDOR PRICE LIST - ${sheetDate} (${vendorName.toUpperCase()})
==================================================
`;
    const rows = items
      .map((i) => {
        const formattedPrice = `$${Math.round(i.price1)}`;
        return `${i.itemName}${i.spec ? ' ' + i.spec : ''} ${i.qtyAvailable} pcs ${formattedPrice}`;
      })
      .join('\n');

    const footer = `
--------------------------------------------------
Generated via InventoryManager System`;
    return header + rows + footer;
  }, [items, sheetDate, vendorName]);

  const handleCopyCustomerText = () => {
    navigator.clipboard.writeText(customerCatalogText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // C) Download PDF Price List
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [26, 28, 30];

    // Banner Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('INVENTORY MANAGER', 14, 13);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(191, 219, 254);
    doc.text(`DAILY VENDOR PRICE LIST CATALOG - ${vendorName.toUpperCase()}`, 14, 20);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Date: ${sheetDate}`, 196, 13, { align: 'right' });

    // Table Rows
    const tableRows = items.map((i) => [
      i.itemName,
      i.spec || '-',
      i.grade || 'Grade A',
      i.qtyAvailable,
      `$${i.vendorCost.toFixed(2)}`,
      `$${i.price1.toFixed(2)}`,
      `$${i.price2.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['Model / Description', 'Spec', 'Grade', 'Qty', 'Vendor Cost', 'Price 1 (+ $10)', 'Price 2 (+ $15)']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
      foot: [
        ['TOTAL SUMMARY', '', `${items.length} Items`, `${stats.totalQty}`, `$${stats.totalVendorCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, `$${stats.totalPrice1.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, `$${stats.totalPrice2.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 8,
        fontStyle: 'bold',
      }
    });

    doc.save(`PriceList_${vendorName}_${sheetDate}.pdf`);
  };

  // D) Print Report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = items
      .map(
        (i) => `
      <tr>
        <td style="font-weight: bold;">${i.itemName}</td>
        <td>${i.spec || '-'}</td>
        <td style="text-align: center;">${i.grade || 'Grade A'}</td>
        <td style="text-align: center;">${i.qtyAvailable}</td>
        <td style="text-align: right;">$${i.vendorCost.toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold; color: #1d4ed8;">$${i.price1.toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold; color: #047857;">$${i.price2.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Price List - ${vendorName} (${sheetDate})</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 20px; color: #1e293b; font-size: 12px; }
            .header { background: #1a1c1e; color: #ffffff; padding: 16px; border-radius: 4px; display: flex; justify-content: space-between; }
            .header h1 { margin: 0; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #1a1c1e; color: #ffffff; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer-row { background: #e2e8f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>INVENTORY MANAGER - DAILY VENDOR PRICE LIST</h1>
              <p style="margin:4px 0 0 0; font-size:11px; color:#93c5fd;">Vendor: ${vendorName} | Date: ${sheetDate}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Model / Item</th>
                <th>Spec</th>
                <th style="text-align: center;">Grade</th>
                <th style="text-align: center;">Stock Qty</th>
                <th style="text-align: right;">Vendor Cost</th>
                <th style="text-align: right;">Price 1 (+ $10)</th>
                <th style="text-align: right;">Price 2 (+ $15)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr class="footer-row">
                <td colspan="3">TOTALS (${items.length} items)</td>
                <td style="text-align: center;">${stats.totalQty}</td>
                <td style="text-align: right;">$${stats.totalVendorCost.toFixed(2)}</td>
                <td style="text-align: right; color: #1d4ed8;">$${stats.totalPrice1.toFixed(2)}</td>
                <td style="text-align: right; color: #047857;">$${stats.totalPrice2.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs select-none transition-all duration-200 ${isFullScreen ? 'p-0' : 'p-2 sm:p-4'}`}>
      <div className={`bg-white overflow-hidden flex flex-col transition-all duration-200 ${
        isFullScreen 
          ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0' 
          : 'rounded-lg border border-slate-300 shadow-2xl w-full max-w-6xl max-h-[95vh]'
      }`}>
        {/* Top Header Bar */}
        <div className="px-4 py-2.5 bg-[#1a1c1e] text-white flex items-center justify-between border-b border-black shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center font-bold text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tight text-white flex items-center gap-2">
                <span>Vendor Daily Excel Price List & Markup Processor</span>
                <span className="bg-emerald-900 text-emerald-300 border border-emerald-700 text-[10px] px-2 py-0.5 rounded font-mono">
                  + $10 / + $15 MARKUP ENGINE
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Upload vendor daily Excel sheets, auto-apply +$10 (Price 1) & +$15 (Price 2) markups, edit rates, and export customer price sheets.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowDistributorCompare(true)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded text-xs flex items-center gap-1.5 transition-colors shadow-xs border border-amber-400"
              title="Compare prices across multiple distributors (PCS, SCAL, ECO ATM, WE SELL CELLULAR) to find the cheapest cost price"
            >
              <Trophy className="w-3.5 h-3.5 fill-current text-slate-950" />
              <span className="hidden sm:inline">Compare Distributor Prices</span>
              <span className="sm:hidden">Compare</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              className="px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold border border-slate-700/60"
              title={isFullScreen ? "Exit Fullscreen" : "Full Screen Mode"}
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-amber-300">Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-slate-200">Full Screen</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vendor Metadata & Global Controls Bar */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center shrink-0 text-xs">
          {/* Vendor Name & Date Input */}
          <div className="md:col-span-5 flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-amber-600" />
                <span>Vendor Name</span>
              </label>
              <input
                type="text"
                list="vendor-names-list"
                value={vendorName}
                onChange={(e) => handleVendorNameChange(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:border-blue-500"
                placeholder="e.g. IMEXEL"
              />
              <datalist id="vendor-names-list">
                {vendorNames.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>Daily Sheet Date</span>
              </label>
              <input
                type="date"
                value={sheetDate}
                onChange={(e) => setSheetDate(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Vendor Import Template Selector */}
          <div className="md:col-span-7 bg-white p-2 rounded border border-slate-300 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase whitespace-nowrap flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                <span>Vendor Template:</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="flex-1 px-2 py-1 bg-indigo-50/60 border border-indigo-200 rounded text-xs font-semibold text-indigo-950 focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">✨ Auto-Detect (Smart Column Matching)</option>
                <optgroup label="Saved Vendor Templates">
                  {savedTemplates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.vendorName ? `[${tmpl.vendorName}] ` : ''}{tmpl.templateName}
                    </option>
                  ))}
                </optgroup>
              </select>

              <button
                onClick={() => setShowManageTemplatesModal(true)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] flex items-center gap-1 border border-slate-300"
                title="Manage and edit saved vendor import templates"
              >
                <Settings className="w-3 h-3 text-slate-600" />
                <span>Manage</span>
              </button>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase" title="Global Profit 1 ($)">Profit 1:</span>
                <input
                  type="number"
                  value={defaultMarkup1}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setDefaultMarkup1(val);
                    applyGlobalMarkups(val, defaultMarkup2);
                  }}
                  className="w-14 px-1 py-0.5 bg-blue-50 border border-blue-300 rounded text-xs font-bold text-blue-900 text-center"
                  placeholder="10"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase" title="Global Profit 2 ($)">Profit 2:</span>
                <input
                  type="number"
                  value={defaultMarkup2}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setDefaultMarkup2(val);
                    applyGlobalMarkups(defaultMarkup1, val);
                  }}
                  className="w-14 px-1 py-0.5 bg-emerald-50 border border-emerald-300 rounded text-xs font-bold text-emerald-900 text-center"
                  placeholder="15"
                />
              </div>

              <button
                onClick={() => applyGlobalMarkups(defaultMarkup1, defaultMarkup2)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                title="Recalculate prices for all items using current markup values"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Template Notification Banner */}
        {templateNotice && (
          <div className="bg-indigo-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-2xs">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-indigo-200" />
              <span>{templateNotice}</span>
            </span>
            <button onClick={() => setTemplateNotice(null)} className="text-[10px] underline opacity-80 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Action Header / Import Controls */}
        <div className="bg-slate-50 border-b border-slate-300 px-4 py-2 flex items-center justify-between gap-3 shrink-0 text-xs flex-wrap">
          {/* File Upload / Paste / 5-Step Clean Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-all shadow-2xs flex items-center gap-1.5"
              id="upload-vendor-excel-btn"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Reading Excel...' : 'UPLOAD DAILY VENDOR EXCEL (.XLSX)'}</span>
            </button>

            <button
              onClick={handleApplyFiveRuleCleanup}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold transition-all shadow-2xs flex items-center gap-1.5 border border-amber-500"
              title="Apply 5-Step Excel Processing Rules: Clean Model Name, Combine Duplicate Model+Price, Add +$10, Format 'iPhone 13 128GB 25 pcs $275'"
              id="apply-5-step-rules-btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>APPLY 5-STEP EXCEL RULES</span>
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold transition-colors flex items-center gap-1.5"
              id="paste-excel-text-btn"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>PASTE TEXT DATA</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD ITEM MANUALLY</span>
            </button>
          </div>

          {/* Export & Catalog Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {isEcoAtmVendor ? (
              <button
                onClick={handleDownloadEcoAtmExcel}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-all shadow-2xs flex items-center gap-1.5 border border-indigo-500 animate-pulse"
                title="Export price_list.xlsx (Columns: Phone Model, Quantity, Price + $10)"
                id="download-eco-atm-excel-btn"
              >
                <Download className="w-3.5 h-3.5 text-indigo-200" />
                <span>EXPORT price_list.xlsx (ECO ATM)</span>
              </button>
            ) : null}

            <button
              onClick={handleDownloadExcelPrice1}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded font-bold transition-colors shadow-2xs flex items-center gap-1.5 border border-emerald-600"
              title="Export Price List 1 Excel combining Column A (Model) + Column D (Qty) + Column F (Price 1: Cost + $10)"
              id="download-excel-price1-btn"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>PRICE 1</span>
            </button>

            <button
              onClick={handleDownloadExcelPrice2}
              className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded font-bold transition-colors shadow-2xs flex items-center gap-1.5 border border-teal-600"
              title="Export Price List 2 Excel combining Column A (Model) + Column D (Qty) + Column G (Price 2: Cost + $15)"
              id="download-excel-price2-btn"
            >
              <Download className="w-3.5 h-3.5 text-teal-300" />
              <span>PRICE 2</span>
            </button>

            <button
              onClick={handleCopyCustomerText}
              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 rounded font-bold transition-colors flex items-center gap-1.5"
              title="Copy clean formatted price list for WhatsApp or Email"
              id="copy-whatsapp-price-list-btn"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-600" />
                  <span>COPY CATALOG TEXT</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload Error Alert */}
        {uploadError && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2 text-xs flex items-center justify-between">
            <span>⚠️ {uploadError}</span>
            <button onClick={() => setUploadError(null)} className="font-bold underline text-[10px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Excel Column Mapper Overlay with Preset Layouts & Live 3-Row Preview */}
        {showColumnMapper && (
          <div className="bg-amber-50 border-b border-amber-300 p-4 text-xs space-y-3 shadow-inner">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-amber-900 uppercase flex items-center gap-2 text-xs">
                <Sliders className="w-4 h-4 text-amber-700" />
                <span>Map Excel Headers for {vendorName}</span>
              </h4>

              {/* Quick Layout Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Quick Layout Presets:</span>
                <button
                  onClick={() => {
                    if (excelHeaders.length >= 3) {
                      setColItem(excelHeaders[0]);
                      setColQty(excelHeaders[1]);
                      setColCost(excelHeaders[2]);
                    }
                  }}
                  className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded text-[10px] font-bold border border-amber-300"
                >
                  3-Col (A, B, C)
                </button>
                <button
                  onClick={() => {
                    if (excelHeaders.length >= 6) {
                      setColItem(excelHeaders[0]);
                      setColQty(excelHeaders[3]);
                      setColCost(excelHeaders[5]);
                    }
                  }}
                  className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded text-[10px] font-bold border border-amber-300"
                >
                  Multi-Col (A, D, F)
                </button>
                <button
                  onClick={() => {
                    if (excelHeaders.length >= 5) {
                      setColItem(excelHeaders[0]);
                      setColSpec(excelHeaders[1]);
                      setColGrade(excelHeaders[2]);
                      setColQty(excelHeaders[3]);
                      setColCost(excelHeaders[4]);
                    }
                  }}
                  className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded text-[10px] font-bold border border-amber-300"
                >
                  5-Col Detailed
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Model / Description *
                </label>
                <select
                  value={colItem}
                  onChange={(e) => setColItem(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="">-- Select Header --</option>
                  {excelHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Spec / Memory
                </label>
                <select
                  value={colSpec}
                  onChange={(e) => setColSpec(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="">-- None / Optional --</option>
                  {excelHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Grade / Condition
                </label>
                <select
                  value={colGrade}
                  onChange={(e) => setColGrade(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="">-- None / Default Grade A --</option>
                  {excelHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Stock Available Qty
                </label>
                <select
                  value={colQty}
                  onChange={(e) => setColQty(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="">-- None / Default 1 --</option>
                  {excelHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Vendor Base Cost ($) *
                </label>
                <select
                  value={colCost}
                  onChange={(e) => setColCost(e.target.value)}
                  className="w-full p-1.5 bg-white border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="">-- Select Header --</option>
                  {excelHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Sample Extraction Preview Table (3 Rows) */}
            {samplePreviewItems.length > 0 && (
              <div className="bg-white rounded border border-amber-200 p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 uppercase">
                  <span>Live Extraction Sample (First 3 Rows)</span>
                  <span className="text-slate-500 font-normal">Verifies model name, qty, and vendor cost</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-amber-100/60 text-amber-900 border-b border-amber-200">
                        <th className="p-1 font-bold">Model / Item</th>
                        <th className="p-1 font-bold">Spec</th>
                        <th className="p-1 font-bold text-center">Grade</th>
                        <th className="p-1 font-bold text-center">Qty</th>
                        <th className="p-1 font-bold text-right">Cost</th>
                        <th className="p-1 font-bold text-right text-blue-900">Price 1 (+ $10)</th>
                        <th className="p-1 font-bold text-right text-emerald-900">Price 2 (+ $15)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 text-slate-800 font-medium">
                      {samplePreviewItems.map((s, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/50">
                          <td className="p-1 font-semibold">{s.itemName}</td>
                          <td className="p-1 text-slate-600">{s.spec || '-'}</td>
                          <td className="p-1 text-center text-slate-600">{s.grade}</td>
                          <td className="p-1 text-center font-mono font-bold text-amber-900">{s.qty}</td>
                          <td className="p-1 text-right font-mono">${s.cost.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono font-bold text-blue-700">${s.price1.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono font-bold text-emerald-700">${s.price2.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                onClick={() => {
                  setSaveTemplateVendor(vendorName);
                  setSaveTemplateName(`${vendorName} Sheet Template`);
                  setShowSaveTemplateModal(true);
                }}
                className="px-3 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 rounded font-bold text-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-indigo-600" />
                <span>Save Mapping as Vendor Template</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowColumnMapper(false)}
                  className="px-3 py-1 bg-slate-200 text-slate-700 rounded font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={processImportedRows}
                  className="px-4 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs shadow-xs"
                >
                  Process & Calculate Prices (+ $10 / + $15)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Main Table & Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Summary Financial KPI Header */}
          <div className="bg-slate-50 p-3 rounded border border-slate-300 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Total Available Items:</span>
              <span className="font-mono text-sm font-bold text-slate-900">{stats.totalItems} Models</span>
              <span className="text-slate-500 font-normal">({stats.totalQty} total units available)</span>
            </span>
          </div>

          {/* Table Toolbar & Search Filters */}
          <div className="flex items-center justify-between gap-3 bg-slate-100 p-2 rounded border border-slate-300">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item model, spec, or grade..."
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Grade:</span>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="all">All Grades</option>
                  {GRADES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold text-xs">
                <input
                  type="checkbox"
                  checked={stockOnly}
                  onChange={(e) => setStockOnly(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>In Stock Only (&gt; 0)</span>
              </label>

              <span className="text-[11px] font-mono text-slate-500">
                Showing {filteredItems.length} of {items.length} items
              </span>
            </div>
          </div>

          {/* Table of Daily Price List Items */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-[#1a1c1e] px-3.5 py-2 text-white font-bold text-xs uppercase flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Daily Vendor Inventory & Price Adjustments</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-300">
                Vendor Base Cost → Price 1 (+${defaultMarkup1}) → Price 2 (+${defaultMarkup2})
              </span>
            </div>

            {/* Batch Profit Adjustment Bar for ALL Phones */}
            <div className="bg-indigo-950 text-indigo-100 px-3.5 py-2 border-b border-indigo-800 flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300 flex items-center gap-1 uppercase tracking-wide text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Profit Control (Applies to ALL {items.length} Phones):
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-indigo-900/80 px-2 py-1 rounded border border-indigo-700">
                  <span className="text-[10px] font-bold text-blue-200">PROFIT 1 ($):</span>
                  <input
                    type="number"
                    value={defaultMarkup1}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setDefaultMarkup1(val);
                      applyGlobalMarkups(val, defaultMarkup2);
                    }}
                    className="w-16 px-1.5 py-0.5 bg-blue-950 border border-blue-400 rounded text-center font-mono font-bold text-blue-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="10"
                  />
                  <button
                    onClick={() => applyGlobalMarkups(defaultMarkup1, defaultMarkup2)}
                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[10px] uppercase shadow-2xs transition-colors"
                    title="Apply Profit 1 value to ALL phones"
                  >
                    Apply All
                  </button>
                </div>

                <div className="flex items-center gap-1.5 bg-indigo-900/80 px-2 py-1 rounded border border-indigo-700">
                  <span className="text-[10px] font-bold text-emerald-200">PROFIT 2 ($):</span>
                  <input
                    type="number"
                    value={defaultMarkup2}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setDefaultMarkup2(val);
                      applyGlobalMarkups(defaultMarkup1, val);
                    }}
                    className="w-16 px-1.5 py-0.5 bg-emerald-950 border border-emerald-400 rounded text-center font-mono font-bold text-emerald-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="15"
                  />
                  <button
                    onClick={() => applyGlobalMarkups(defaultMarkup1, defaultMarkup2)}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] uppercase shadow-2xs transition-colors"
                    title="Apply Profit 2 value to ALL phones"
                  >
                    Apply All
                  </button>
                </div>

                {/* Preset Profit Quick Buttons */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-indigo-300">Presets:</span>
                  {[10, 15, 20, 25, 30].map((mVal) => (
                    <button
                      key={mVal}
                      onClick={() => {
                        setDefaultMarkup1(mVal);
                        applyGlobalMarkups(mVal, defaultMarkup2);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        defaultMarkup1 === mVal
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border-indigo-700'
                      }`}
                      title={`Set Profit 1 to +$${mVal} for ALL phones`}
                    >
                      +${mVal}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px] text-slate-700">
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">Model / Item Description</th>
                    <th className="p-2.5">Spec / Memory</th>
                    <th className="p-2.5 text-center">Grade</th>
                    <th className="p-2.5 text-center">Stock Available</th>
                    <th className="p-2.5 text-right bg-slate-200/60">Vendor Cost ($)</th>
                    <th className="p-2.5 text-right bg-blue-50 text-blue-900 border-l border-blue-200">
                      Price 1 (+${defaultMarkup1})
                    </th>
                    <th className="p-2.5 text-right bg-emerald-50 text-emerald-900 border-l border-emerald-200">
                      Price 2 (+${defaultMarkup2})
                    </th>
                    <th className="p-2.5 text-center">Profit 1 / 2</th>
                    <th className="p-2.5 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                        No price list items found. Click "UPLOAD DAILY VENDOR EXCEL" or "ADD ITEM MANUALLY" to populate.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const profit1 = item.price1 - item.vendorCost;
                      const profit2 = item.price2 - item.vendorCost;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{item.itemName}</td>
                          <td className="p-2.5 text-slate-600">{item.spec || '-'}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              {item.grade || 'Grade A'}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                item.qtyAvailable > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.qtyAvailable} pcs
                            </span>
                          </td>

                          {/* Editable Vendor Cost */}
                          <td className="p-2.5 text-right font-mono font-bold bg-slate-50/80">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400">$</span>
                              <input
                                type="number"
                                value={item.vendorCost}
                                onChange={(e) =>
                                  handleUpdateItemCost(item.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-1.5 py-0.5 border border-slate-300 rounded text-right font-mono text-xs font-bold focus:outline-none focus:border-blue-500 bg-white"
                                step="1"
                              />
                            </div>
                          </td>

                          {/* Price 1 (Cost + Profit 1) */}
                          <td className="p-2.5 text-right font-mono font-bold bg-blue-50/50 border-l border-blue-200 text-blue-900">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-blue-500">$</span>
                              <input
                                type="number"
                                value={item.price1}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const customM1 = val - item.vendorCost;
                                  handleUpdateItemMarkup(item.id, customM1, item.markup2);
                                }}
                                className="w-20 px-1.5 py-0.5 border border-blue-300 rounded text-right font-mono text-xs font-bold text-blue-900 focus:outline-none focus:border-blue-600 bg-white"
                                step="1"
                              />
                            </div>
                          </td>

                          {/* Price 2 (Cost + Profit 2) */}
                          <td className="p-2.5 text-right font-mono font-bold bg-emerald-50/50 border-l border-emerald-200 text-emerald-900">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-emerald-500">$</span>
                              <input
                                type="number"
                                value={item.price2}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const customM2 = val - item.vendorCost;
                                  handleUpdateItemMarkup(item.id, item.markup1, customM2);
                                }}
                                className="w-20 px-1.5 py-0.5 border border-emerald-300 rounded text-right font-mono text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-600 bg-white"
                                step="1"
                              />
                            </div>
                          </td>

                          {/* Profits (Editable Manual Profit Values + Quick Apply to All) */}
                          <td className="p-2.5 text-center font-mono text-[10px]">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="flex items-center gap-0.5" title="Edit Profit 1 ($)">
                                <span className="text-blue-600 font-bold text-[9px]">+</span>
                                <input
                                  type="number"
                                  value={item.markup1}
                                  onChange={(e) => {
                                    const customM1 = parseFloat(e.target.value) || 0;
                                    handleUpdateItemMarkup(item.id, customM1, item.markup2);
                                  }}
                                  className="w-14 px-1 py-0.5 border border-blue-300 rounded text-center font-mono text-xs font-bold text-blue-900 bg-blue-50/80 focus:bg-white focus:border-blue-600 focus:outline-none"
                                  step="1"
                                />
                              </div>
                              <span className="text-slate-300">|</span>
                              <div className="flex items-center gap-0.5" title="Edit Profit 2 ($)">
                                <span className="text-emerald-600 font-bold text-[9px]">+</span>
                                <input
                                  type="number"
                                  value={item.markup2}
                                  onChange={(e) => {
                                    const customM2 = parseFloat(e.target.value) || 0;
                                    handleUpdateItemMarkup(item.id, item.markup1, customM2);
                                  }}
                                  className="w-14 px-1 py-0.5 border border-emerald-300 rounded text-center font-mono text-xs font-bold text-emerald-900 bg-emerald-50/80 focus:bg-white focus:border-emerald-600 focus:outline-none"
                                  step="1"
                                />
                              </div>
                              <button
                                onClick={() => applyGlobalMarkups(item.markup1, item.markup2)}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-300 rounded text-[9px] font-bold transition-colors flex items-center gap-0.5 whitespace-nowrap"
                                title={`Apply +$${item.markup1} / +$${item.markup2} profit to ALL phones`}
                              >
                                <Zap className="w-2.5 h-2.5" />
                                <span>Apply All</span>
                              </button>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded"
                                title="Edit Item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200 rounded"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Summary & Close */}
        <div className="bg-slate-100 border-t border-slate-300 px-4 py-2.5 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Info className="w-4 h-4 text-blue-600" />
            <span>
              Tip: Changing vendor cost or markups automatically updates Price 1 (+${defaultMarkup1}) and Price 2 (+${defaultMarkup2}) across all exports.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs transition-colors"
          >
            CLOSE CONSOLE
          </button>
        </div>
      </div>

      {/* MODAL: PASTE TEXT DATA */}
      {showPasteModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 shadow-xl w-full max-w-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-xs uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Paste Daily Excel Text (Tab or Comma Separated)</span>
              </h3>
              <button onClick={() => setShowPasteModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Paste rows copied directly from Excel, WhatsApp, or Email. Supports standard TSV/CSV or <strong>Tekcom Section format (*IPHONES*, @ $Price)</strong>:
              <br />
              <code className="bg-slate-100 p-1 rounded font-mono text-[10px] block mt-1 whitespace-pre-wrap">
                {isTekcomVendor
                  ? `*IPHONES*\n@ $1490\n17 Pro Max 1TB Blue 38\n17 Pro Max 1TB Orange 113`
                  : `iPhone 15 Pro Max, 256GB, Grade A, 12, $890`}
              </code>
            </p>
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={
                isTekcomVendor
                  ? "*IPHONES*\n@ $1490\n17 Pro Max 1TB Blue 38\n17 Pro Max 1TB Orange 113\n\n@ $1140\n17 Pro Max 256GB Blue 34"
                  : "Paste rows here..."
              }
              className="w-full p-2.5 border border-slate-300 rounded font-mono text-xs focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  setPastedText(`*IPHONES*\n@ $1490\n17 Pro Max 1TB Blue 38\n17 Pro Max 1TB Orange 113\n\n@ $1140\n17 Pro Max 256GB Blue 34\n17 Pro Max 256GB Orange 20\n17 Pro Max 256GB Natural Titanium 15\n\n@ $990\n17 Pro 256GB Orange (Damaged Box) 15\n17 Pro 256GB Blue 42`);
                }}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[11px] border border-amber-300"
                type="button"
              >
                Insert Tekcom Sample Data
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessPastedText}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs"
                >
                  Process & Load Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SINGLE ITEM */}
      {showItemForm && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 shadow-xl w-full max-w-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-xs uppercase">
                {editingItem ? 'Edit Price List Item' : 'Add New Price List Item'}
              </h3>
              <button onClick={() => setShowItemForm(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                  Model / Item Name *
                </label>
                <input
                  type="text"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro Max"
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                  Spec / Storage / Memory
                </label>
                <input
                  type="text"
                  value={formSpec}
                  onChange={(e) => setFormSpec(e.target.value)}
                  placeholder="e.g. 256GB Unlocked"
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                    Grade / Condition
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs"
                  >
                    {GRADES.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                    Stock Qty Available
                  </label>
                  <input
                    type="number"
                    value={formQty}
                    onChange={(e) => setFormQty(parseInt(e.target.value) || 0)}
                    className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                  Vendor Base Cost ($) *
                </label>
                <input
                  type="number"
                  value={formCost}
                  onChange={(e) => setFormCost(parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs font-mono"
                  step="0.01"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-blue-800 uppercase mb-0.5">
                    Markup 1 ($)
                  </label>
                  <input
                    type="number"
                    value={formMarkup1}
                    onChange={(e) => setFormMarkup1(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 border border-blue-300 rounded font-semibold text-xs font-mono text-blue-900 bg-blue-50/50"
                  />
                  <span className="text-[10px] text-blue-700 block mt-0.5">
                    Price 1: ${(formCost + formMarkup1).toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">
                    Markup 2 ($)
                  </label>
                  <input
                    type="number"
                    value={formMarkup2}
                    onChange={(e) => setFormMarkup2(parseFloat(e.target.value) || 0)}
                    className="w-full p-1.5 border border-emerald-300 rounded font-semibold text-xs font-mono text-emerald-900 bg-emerald-50/50"
                  />
                  <span className="text-[10px] text-emerald-700 block mt-0.5">
                    Price 2: ${(formCost + formMarkup2).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setShowItemForm(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 bg-indigo-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-300" />
                <span>Save Vendor Import Template</span>
              </h3>
              <button onClick={() => setShowSaveTemplateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600">
                Save the current Excel column mappings so future sheets uploaded for this vendor automatically auto-map without manual configuration.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={saveTemplateVendor}
                  onChange={(e) => setSaveTemplateVendor(e.target.value)}
                  placeholder="e.g. IMEXEL"
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder="e.g. Daily 3-Col Excel Layout"
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-xs"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded p-2.5 space-y-1 text-[11px] font-mono text-indigo-900">
                <div className="font-bold text-[10px] text-indigo-800 uppercase mb-1">Active Column Mappings:</div>
                <div>• Model/Description: <span className="font-bold">{colItem || 'Not Mapped'}</span></div>
                <div>• Spec/Memory: <span className="font-bold">{colSpec || '(None)'}</span></div>
                <div>• Grade: <span className="font-bold">{colGrade || '(None)'}</span></div>
                <div>• Qty: <span className="font-bold">{colQty || '(None)'}</span></div>
                <div>• Vendor Cost: <span className="font-bold">{colCost || 'Not Mapped'}</span></div>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewTemplate}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-xs shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Saved Templates Modal */}
      {showManageTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>Saved Vendor Excel Import Templates ({savedTemplates.length})</span>
              </h3>
              <button onClick={() => setShowManageTemplatesModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
              <p className="text-slate-600">
                These templates store column header preferences for each vendor excel format. When you select a vendor or upload an excel file, the matching template is automatically loaded.
              </p>

              {savedTemplates.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded border border-dashed border-slate-300">
                  No saved vendor templates found. Map columns during import and click "Save Mapping as Vendor Template".
                </div>
              ) : (
                <div className="space-y-2">
                  {savedTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="bg-slate-50 border border-slate-200 rounded p-3 flex items-start justify-between gap-3 hover:border-indigo-300 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{tmpl.templateName}</span>
                          {tmpl.vendorName && (
                            <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              {tmpl.vendorName}
                            </span>
                          )}
                          {selectedTemplateId === tmpl.id && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-100">
                          <div><span className="text-slate-400 block">Model:</span> <span className="font-bold text-slate-800">{tmpl.colItem}</span></div>
                          <div><span className="text-slate-400 block">Spec:</span> {tmpl.colSpec || '-'}</div>
                          <div><span className="text-slate-400 block">Grade:</span> {tmpl.colGrade || '-'}</div>
                          <div><span className="text-slate-400 block">Qty:</span> {tmpl.colQty || '-'}</div>
                          <div><span className="text-slate-400 block">Cost:</span> <span className="font-bold text-slate-800">{tmpl.colCost}</span></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            handleSelectTemplate(tmpl.id);
                            setShowManageTemplatesModal(false);
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px]"
                        >
                          Use
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t flex justify-between items-center text-xs">
              <button
                onClick={() => {
                  setSavedTemplates(INITIAL_VENDOR_TEMPLATES);
                  persistTemplates(INITIAL_VENDOR_TEMPLATES);
                  setTemplateNotice('Reset vendor templates to system defaults');
                }}
                className="text-slate-600 hover:text-slate-900 underline text-[11px]"
              >
                Reset Default Presets
              </button>
              <button
                onClick={() => setShowManageTemplatesModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distributor Price Comparison Modal */}
      {showDistributorCompare && (
        <DistributorPriceCompareModal
          onClose={() => setShowDistributorCompare(false)}
          onApplyBestPriceList={(bestItems) => {
            const m1 = defaultMarkup1;
            const m2 = defaultMarkup2;
            const newPriceListItems: VendorPriceListItem[] = bestItems.map((item, idx) => {
              const cost = item.vendorCost;
              const p1 = Math.round((cost + m1) * 100) / 100;
              const p2 = Math.round((cost + m2) * 100) / 100;
              return {
                id: `pli_best_${Date.now()}_${idx}`,
                itemName: item.itemName,
                spec: '',
                grade: 'Grade A',
                qtyAvailable: 10,
                vendorCost: cost,
                markup1: m1,
                markup2: m2,
                price1: p1,
                price2: p2,
                category: 'Apple',
                notes: `Best Supplier: ${item.vendorName}`,
              };
            });
            setItems(newPriceListItems);
            setVendorName('BEST DISTRIBUTOR MIX');
            setShowDistributorCompare(false);
            setTemplateNotice(`Loaded ${newPriceListItems.length} Best Distributor prices into Price List Processor!`);
            setTimeout(() => setTemplateNotice(null), 4000);
          }}
        />
      )}
    </div>
  );
};

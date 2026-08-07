export type DeviceGrade = 'New' | 'Grade A+' | 'Grade A' | 'Grade B' | 'Grade C' | 'Refurbished' | 'For Parts';

export type RecordStatus = 'Completed' | 'Pending' | 'In Warranty' | 'Refunded';

export interface CustomerRecord {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  date: string; // YYYY-MM-DD
  model: string;
  imei: string;
  grade: DeviceGrade;
  invoiceNumber: string;
  invoiceAmount?: number;
  status: RecordStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorRecord {
  id: string;
  vendorName: string;
  model: string;
  imei: string;
  date: string; // YYYY-MM-DD
  invoiceNumber: string;
  grade?: DeviceGrade;
  invoiceAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesRecord {
  id: string;
  invoiceNumber: string; // customer invoice number
  date: string; // YYYY-MM-DD
  customerName: string;
  qty: number;
  totalInvoicePrice: number;
  costPrice: number;
  profit: number; // calculated totalInvoicePrice - costPrice
  vendorName: string;
  vendorInvoiceNumber: string;
  paidFrom: string; // e.g. Bank account, Zelle, Cash
  paidBy: string; // e.g. Customer Name / Account Rep
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesFilter {
  searchQuery: string;
  timePeriod: 'daily' | 'monthly' | 'yearly' | 'all';
  vendorFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'totalInvoicePrice' | 'profit' | 'invoiceNumber' | 'customerName';
  sortOrder: 'asc' | 'desc';
}

export interface VendorFilter {
  searchQuery: string;
  vendorFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'vendorName' | 'invoiceNumber' | 'model';
  sortOrder: 'asc' | 'desc';
}

export interface RecordFilter {
  searchQuery: string;
  gradeFilter: string;
  statusFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'customerName' | 'invoiceNumber' | 'model';
  sortOrder: 'asc' | 'desc';
}

export interface VendorPriceListItem {
  id: string;
  itemName: string;
  spec?: string;
  grade?: string;
  qtyAvailable: number;
  vendorCost: number;
  markup1: number; // default +$10
  markup2: number; // default +$15
  price1: number; // vendorCost + markup1
  price2: number; // vendorCost + markup2
  category?: string;
  notes?: string;
}

export interface VendorPriceSheet {
  id: string;
  sheetDate: string; // YYYY-MM-DD
  vendorName: string;
  title: string;
  defaultMarkup1: number; // $10
  defaultMarkup2: number; // $15
  items: VendorPriceListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorImportTemplate {
  id: string;
  vendorName: string;
  templateName: string;
  colItem: string;
  colSpec: string;
  colGrade: string;
  colQty: string;
  colCost: string;
  defaultMarkup1: number;
  defaultMarkup2: number;
  description?: string;
}

export interface DistributorPriceComparisonRow {
  id: string;
  model: string;
  grade?: string;
  prices: Record<string, number>; // distributorName -> price
  bestDistributor?: string;
  bestPrice?: number;
  worstPrice?: number;
  savings?: number;
  activeCount?: number;
}

export interface DistributorComparisonMatrix {
  distributors: string[];
  rows: DistributorPriceComparisonRow[];
  gradeName?: string;
  dateUpdated?: string;
}


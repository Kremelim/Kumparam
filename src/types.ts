export type TransactionType = 'income' | 'expense';

export type Category = string;

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: Category;
  merchant: string;
  date: string; // ISO string YYYY-MM-DD
  notes?: string;
}

export type Recurrence = 'none' | 'monthly' | 'quarterly' | 'yearly';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDate: string; // ISO string
  isPaid: boolean;
  recurrence: Recurrence;
  lastPaidDate?: string;
  linkedTransactionId?: string;
}

export interface RegularIncome {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDate: string; // ISO string for the recurring date
  isProcessed: boolean;
  recurrence: Recurrence;
  lastProcessedDate?: string;
  linkedTransactionId?: string;
}

export interface NetWorthEntry {
  id: string;
  month: string; // e.g., 'Oca', 'Şub'
  year: number;
  total: number;
  previousTotal: number;
  // Chart specific
  change: 'increase' | 'decrease' | 'none';
}

export interface InvestmentTx {
  id: string;
  type: 'deposit' | 'withdrawal' | 'gain' | 'loss';
  amount: number;
  date: string;
}

export interface Investment {
  id: string;
  name: string;
  type: 'Hisse Senedi' | 'Kripto' | 'Döviz' | 'Emlak' | 'Altın' | 'Fon' | 'Nema / PPF' | 'Diğer';
  balance: number;
  totalInvested: number;
  transactions?: InvestmentTx[];
  value?: number;
}

export interface Budget {
  id: string;
  category: Category;
  limit: number;
  spent: number;
}

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface Receipt {
  id: string;
  merchant: string;
  date: string; // ISO string YYYY-MM-DD
  totalAmount: number;
  items: ReceiptItem[];
  linkedTransactionId?: string; // If this receipt is linked to a transaction
}

export interface SimItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  day?: number;
  isOneTime?: boolean;
  oneTimeDate?: string;
  recurringMonths?: number;
  createdAt?: string;
}

export interface ProjectionSettings {
  id?: string;
  annualGrossRate: number;
  taxRate: number;
  projectionPeriod: number;
}

export interface NemaSettings {
  isEnabled: boolean;
  annualGrossRate: number;
  taxRate: number;
  startDate?: string;
}


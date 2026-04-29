export type TransactionType = 'income' | 'expense';

export type Category = 
  | 'Maaş' 
  | 'Market' 
  | 'Kira' 
  | 'Faturalar' 
  | 'Ulaşım' 
  | 'Sağlık' 
  | 'Eğitim' 
  | 'Yatırım' 
  | 'Diğer';

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

export interface Investment {
  id: string;
  name: string;
  type: 'Hisse Senedi' | 'Kripto' | 'Döviz' | 'Emlak' | 'Altın' | 'Fon';
  value: number;
  changePercent: number; // positive or negative
}

export interface Budget {
  id: string;
  category: Category;
  limit: number;
  spent: number;
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


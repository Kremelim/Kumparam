import toast from "react-hot-toast";
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, Bill, NetWorthEntry, Investment, Budget, Category, Recurrence, RegularIncome, SimItem, ProjectionSettings, Receipt } from '../types';
import { addMonths, addQuarters, addYears, format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

interface FinanceContextType {
  transactions: Transaction[];
  bills: Bill[];
  regularIncomes: RegularIncome[];
  netWorthHistory: NetWorthEntry[];
  investments: Investment[];
  budgets: Budget[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updatedTx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addBill: (b: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, updatedBill: Omit<Bill, 'id'>) => void;
  payBill: (id: string, amount: number, date: string) => void;
  undoBillPayment: (billId: string) => void;
  deleteBill: (id: string) => void;
  payCreditCardStatement: () => void;
  addRegularIncome: (ri: Omit<RegularIncome, 'id'>) => void;
  updateRegularIncome: (id: string, updatedRi: Omit<RegularIncome, 'id'>) => void;
  processRegularIncome: (id: string, amount: number, date: string) => void;
  undoRegularIncomeProcess: (id: string) => void;
  deleteRegularIncome: (id: string) => void;
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, updatedBudget: Omit<Budget, 'id'>) => void;
  deleteBudget: (id: string) => void;
  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, updatedInvestment: Omit<Investment, 'id'>) => void;
  deleteInvestment: (id: string) => void;
  receipts: Receipt[];
  addReceipt: (r: Omit<Receipt, 'id'>) => void;
  deleteReceipt: (id: string) => void;
  projectionItems: SimItem[];
  addProjectionItem: (item: Omit<SimItem, 'id'>) => void;
  updateProjectionItem: (id: string, updatedItem: Omit<SimItem, 'id'>) => void;
  deleteProjectionItem: (id: string) => void;
  projectionSettings: ProjectionSettings;
  updateProjectionSettings: (settings: ProjectionSettings) => void;
  totalIncome: number;
  totalExpenses: number;
  currentNetWorth: number;
  liquidCash: number;
  unpaidCreditCards: number;
  unpaidCurrentStatementCC: number;
  onboardingDone: boolean;
  completeOnboarding: (salary: number, rent: number, billsValue: number) => void;
  skipOnboarding: () => void;
  appTitle: string;
  setAppTitle: (title: string) => void;
  customCategories: string[];
  addCustomCategory: (cat: string) => void;
  isLoadingData: boolean;
  isSharedView: boolean;
  syncLocalToCloud: (overrideUserId?: string, silent?: boolean) => Promise<number>;
  recoverDataManual: () => Promise<number>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const isValidUUID = (str?: string) => {
    return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  };

  const recoverAllLocalData = () => {
    try {
      const allTxs: Transaction[] = [];
      const allBills: Bill[] = [];
      const allIncomes: RegularIncome[] = [];
      const allInvestments: Investment[] = [];
      const allBudgets: Budget[] = [];

      const baseKeys = ['fin_transactions', 'fin_bills', 'fin_regular_incomes', 'fin_investments', 'fin_budgets'];
      const keysToScan = [...baseKeys];
      
      // Also scan for user-specific local storage keys if a user is logged in
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('_') && baseKeys.some(bk => key.startsWith(bk + '_')))) {
          if (!keysToScan.includes(key)) {
             keysToScan.push(key);
          }
        }
      }

      for (const key of keysToScan) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const sanitizedId = isValidUUID(item.id) ? item.id : generateUUID();
                if (key.startsWith('fin_transactions')) allTxs.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_bills')) allBills.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_regular_incomes')) allIncomes.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_investments')) allInvestments.push({ ...item, id: sanitizedId });
                else if (key.startsWith('fin_budgets')) allBudgets.push({ ...item, id: sanitizedId });
              }
            });
          }
        } catch (e) {}
      }

      const sanitizeDate = (d: any) => {
        if (!d) return new Date().toISOString().split('T')[0];
        try {
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
        return new Date().toISOString().split('T')[0];
      };

      const deduplicateTxs = (txs: any[]): Transaction[] => {
        const seen = new Set<string>();
        const result: Transaction[] = [];
        for (const t of txs) {
          if (!t) continue;
          
          const amount = t.amount !== undefined ? Number(t.amount) : (t.value !== undefined ? Number(t.value) : 0);
          const merchant = t.merchant || t.name || t.title || 'Bilinmeyen';
          const category = t.category || 'Diğer';
          const date = sanitizeDate(t.date);
          const type = t.type === 'income' || t.type === 'expense' ? t.type : (amount > 0 ? 'income' : 'expense');
          
          if (merchant === 'Bilinmeyen' && amount === 0) continue;

          const contentSig = `${merchant}-${amount}-${date}-${type}`;
          if (!seen.has(t.id) && !seen.has(contentSig)) {
            seen.add(t.id);
            seen.add(contentSig);
            result.push({
              ...t,
              amount: Math.abs(amount),
              merchant,
              category,
              date,
              type
            });
          }
        }
        return result;
      };

      const deduplicateBills = (bills: any[]): Bill[] => {
        const seen = new Set<string>();
        const result: Bill[] = [];
        for (const b of bills) {
          const name = b.name || b.title || 'Fatura';
          if (!b) continue;
          const amount = b.amount !== undefined ? Number(b.amount) : (b.value !== undefined ? Number(b.value) : 0);
          const contentSig = `${name}-${amount}-${b.dueDate || ''}`;
          if (!seen.has(b.id) && !seen.has(contentSig)) {
            seen.add(b.id);
            seen.add(contentSig);
            result.push({
              ...b,
              name,
              amount: Math.abs(amount)
            });
          }
        }
        return result;
      };

      const deduplicateIncomes = (incomes: any[]): RegularIncome[] => {
        const seen = new Set<string>();
        const result: RegularIncome[] = [];
        for (const i of incomes) {
          const source = i.source || i.name || i.title || 'Gelir';
          if (!i) continue;
          const amount = i.amount !== undefined ? Number(i.amount) : (i.value !== undefined ? Number(i.value) : 0);
          const contentSig = `${source}-${amount}`;
          if (!seen.has(i.id) && !seen.has(contentSig)) {
            seen.add(i.id);
            seen.add(contentSig);
            result.push({
               ...i,
               source,
               amount: Math.abs(amount)
            });
          }
        }
        return result;
      };

      const deduplicateInvs = (invs: any[]): Investment[] => {
        const seen = new Set<string>();
        const result: Investment[] = [];
        for (const i of invs) {
          const name = i.name || i.title || 'Yatırım';
          if (!i) continue;
          const amount = i.amount !== undefined ? Number(i.amount) : (i.value !== undefined ? Number(i.value) : 0);
          const contentSig = `${name}-${i.type || ''}`;
          if (!seen.has(i.id) && !seen.has(contentSig)) {
            seen.add(i.id);
            seen.add(contentSig);
            result.push({
              ...i,
              name,
              amount: Math.abs(amount)
            });
          }
        }
        return result;
      };

      const deduplicateBudgets = (budgets: any[]): Budget[] => {
        const seen = new Set<string>();
        const result: Budget[] = [];
        for (const b of budgets) {
          if (!b || !b.category) continue;
          const contentSig = `${b.category || ''}`;
          if (!seen.has(b.id) && !seen.has(contentSig)) {
            seen.add(b.id);
            seen.add(contentSig);
            result.push(b);
          }
        }
        return result;
      };;

      return {
        txs: deduplicateTxs(allTxs),
        bills: deduplicateBills(allBills),
        incomes: deduplicateIncomes(allIncomes),
        investments: deduplicateInvs(allInvestments),
        budgets: deduplicateBudgets(allBudgets)
      };
    } catch (e) {
      console.error('Kurtarma hatası:', e);
      return { txs: [], bills: [], incomes: [], investments: [], budgets: [] };
    }
  };

  const getStoredData = <T,>(key: string, defaultValue: T, userId?: string): T => {
    try {
      if (userId) {
        const userSaved = localStorage.getItem(`${key}_${userId}`);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed) ? parsed.length > 0 : parsed !== null && parsed !== undefined) {
            return parsed;
          }
        }
      }
      const guestSaved = localStorage.getItem(key);
      if (guestSaved) {
        const parsed = JSON.parse(guestSaved);
        if (Array.isArray(parsed) ? parsed.length > 0 : parsed !== null && parsed !== undefined) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(`Error loading storage for ${key}:`, e);
    }
    return defaultValue;
  };

  const initialRecovered = recoverAllLocalData();

  const [transactions, setTransactions] = useState<Transaction[]>(() => initialRecovered.txs.length > 0 ? initialRecovered.txs : getStoredData('fin_transactions', [], user?.id));
  const [bills, setBills] = useState<Bill[]>(() => initialRecovered.bills.length > 0 ? initialRecovered.bills : getStoredData('fin_bills', [], user?.id));
  const [regularIncomes, setRegularIncomes] = useState<RegularIncome[]>(() => initialRecovered.incomes.length > 0 ? initialRecovered.incomes : getStoredData('fin_regular_incomes', [], user?.id));
  const [investments, setInvestments] = useState<Investment[]>(() => {
    const data = initialRecovered.investments.length > 0 ? initialRecovered.investments : getStoredData('fin_investments', [], user?.id);
    return data.map((inv: any) => ({ ...inv, balance: inv.balance !== undefined ? inv.balance : (inv.value || 0), totalInvested: inv.totalInvested !== undefined ? inv.totalInvested : (inv.value || 0) }));
  });
  const [storedBudgets, setStoredBudgets] = useState<Budget[]>(() => initialRecovered.budgets.length > 0 ? initialRecovered.budgets : getStoredData('fin_budgets', [], user?.id));
  const [receipts, setReceipts] = useState<Receipt[]>(() => getStoredData('fin_receipts', [], user?.id));
  const [customCategories, setCustomCategories] = useState<string[]>(() => getStoredData('fin_custom_categories', [], user?.id));
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => getStoredData('fin_onboarding', false, user?.id));
  const [appTitle, setAppTitle] = useState<string>(() => getStoredData('fin_app_title', 'Kumparam', user?.id));
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const searchParams = new URLSearchParams(window.location.search);
  const shareId = searchParams.get('share');
  const isSharedView = !!(shareId && shareId !== user?.id);
  const targetUserId = shareId || user?.id;

  const parseNotes = (notes?: string) => {
    if (!notes) return { isCC: false, dueDate: '', isPaid: false, actualNote: '' };
    const parts = notes.split('|');
    if (parts[0] === 'CC' && parts.length >= 4) {
      return { isCC: true, dueDate: parts[1], isPaid: parts[2] === '1', actualNote: parts.slice(3).join('|') };
    }
    return { isCC: false, dueDate: '', isPaid: false, actualNote: notes };
  };
  
  const [projectionItems, setProjectionItems] = useState<SimItem[]>(() => getStoredData('fin_proj_items', [], user?.id));
  const [projectionSettings, setProjectionSettings] = useState<ProjectionSettings>(() => getStoredData('fin_proj_settings', {
    annualGrossRate: 35.0,
    taxRate: 17.5,
    projectionPeriod: 365
  }, user?.id));

  const stateOwner = useRef<string | undefined>(targetUserId);

  useEffect(() => {
    stateOwner.current = targetUserId;
  }, [targetUserId]);

  const saveLocal = (key: string, data: any) => {
    if (stateOwner.current !== targetUserId) return;
    if (Array.isArray(data) && data.length === 0 && isLoadingData) return;
    const prefix = user ? `${key}_${user.id}` : key;
    localStorage.setItem(prefix, JSON.stringify(data));
  };

  // Save to local as backup always
  useEffect(() => saveLocal('fin_transactions', transactions), [transactions, user, targetUserId]);
  useEffect(() => saveLocal('fin_bills', bills), [bills, user, targetUserId]);
  useEffect(() => saveLocal('fin_regular_incomes', regularIncomes), [regularIncomes, user, targetUserId]);
  useEffect(() => saveLocal('fin_investments', investments), [investments, user, targetUserId]);
  useEffect(() => saveLocal('fin_budgets', storedBudgets), [storedBudgets, user, targetUserId]);
  useEffect(() => saveLocal('fin_receipts', receipts), [receipts, user, targetUserId]);
  useEffect(() => saveLocal('fin_custom_categories', customCategories), [customCategories, user, targetUserId]);
  useEffect(() => saveLocal('fin_onboarding', onboardingDone), [onboardingDone, user, targetUserId]);
  useEffect(() => saveLocal('fin_app_title', appTitle), [appTitle, user, targetUserId]);
  useEffect(() => saveLocal('fin_proj_items', projectionItems), [projectionItems, user, targetUserId]);
  useEffect(() => saveLocal('fin_proj_settings', projectionSettings), [projectionSettings, user, targetUserId]);

  const syncLocalToCloud = async (overrideUserId?: string, silent: boolean = false) => {
    const uid = overrideUserId || targetUserId;
    if (!uid) {
      if (!silent) toast.error('Buluta aktarmak için önce giriş yapmalısınız.');
      return 0;
    }

    let toastId: string | undefined = undefined;
    if (!silent) {
      toastId = toast.loading('Yerel veriler Supabase bulut hesabınıza aktarılıyor...');
    }

    try {
      const recovered = recoverAllLocalData();
      const localTxs = recovered.txs;
      const localBills = recovered.bills;
      const localIncomes = recovered.incomes;
      const localInvestments = recovered.investments;
      const localBudgets = recovered.budgets;
      const localProjItems = getStoredData<SimItem[]>('fin_proj_items', [], uid);

      let syncedCount = 0;
      let hasError = false;

      const deleteGuestKeys = () => {
        try {
          localStorage.removeItem('fin_transactions');
          localStorage.removeItem('fin_bills');
          localStorage.removeItem('fin_regular_incomes');
          localStorage.removeItem('fin_investments');
          localStorage.removeItem('fin_budgets');
        } catch(e) {}
      };

      const sanitizeDateStr = (d: any) => {
        if (!d) return new Date().toISOString().split('T')[0];
        try {
          const parsed = new Date(d);
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
          }
        } catch (e) {}
        return new Date().toISOString().split('T')[0];
      };

      if (localTxs.length > 0) {
        const txsToInsert = localTxs.map((t: any) => {
          let dateStr = t.date;
          if (!dateStr || dateStr.trim() === '') dateStr = new Date().toISOString().split('T')[0];
          return {
            id: isValidUUID(t.id) ? t.id : generateUUID(),
            type: t.type === 'income' ? 'income' : 'expense',
            amount: Number(t.amount) || 0,
            category: t.category || 'Diğer',
            merchant: t.merchant || 'Bilinmeyen',
            date: sanitizeDateStr(dateStr),
            notes: t.notes || '',
            user_id: uid
          };
        });
        const { error } = await supabase.from('transactions').upsert(txsToInsert, { onConflict: 'id' });
        if (!error) {
          syncedCount += localTxs.length;
        } else {
          hasError = true;
          console.error('Error syncing transactions:', error);
          if (!silent) toast.error(`İşlem Aktarım Hatası: ${error.message}`);
        }
      }

      if (localBills.length > 0) {
        const billsToInsert = localBills.map((b: any) => ({
          id: isValidUUID(b.id) ? b.id : generateUUID(),
          name: b.name || 'Fatura',
          amount: Number(b.amount) || 0,
          category: b.category || 'Diğer',
          dueDate: sanitizeDateStr(b.dueDate),
          recurrence: b.recurrence || 'monthly',
          isPaid: Boolean(b.isPaid),
          lastPaidDate: b.lastPaidDate ? sanitizeDateStr(b.lastPaidDate) : null,
          linkedTransactionId: b.linkedTransactionId || null,
          user_id: uid
        }));
        const { error } = await supabase.from('bills').upsert(billsToInsert, { onConflict: 'id' });
        if (!error) {
          syncedCount += localBills.length;
        } else {
          hasError = true;
          console.error('Error syncing bills:', error);
          if (!silent) toast.error(`Fatura Aktarım Hatası: ${error.message}`);
        }
      }

      if (localIncomes.length > 0) {
        const incomesToInsert = localIncomes.map((i: any) => ({
          id: isValidUUID(i.id) ? i.id : generateUUID(),
          source: i.source || i.name || 'Gelir',
          amount: Number(i.amount) || 0,
          dayOfMonth: Number(i.dayOfMonth || i.dueDate ? parseInt(i.dueDate.split('-')[2] || '1') : 1) || 1,
          user_id: uid
        }));
        const { error } = await supabase.from('regular_incomes').upsert(incomesToInsert, { onConflict: 'id' });
        if (!error) {
          syncedCount += localIncomes.length;
        } else {
          hasError = true;
          console.error('Error syncing incomes:', error);
          if (!silent) toast.error(`Gelir Aktarım Hatası: ${error.message}`);
        }
      }

      if (localInvestments.length > 0) {
        const invsToInsert = localInvestments.map((i: any) => ({
          id: isValidUUID(i.id) ? i.id : generateUUID(),
          name: i.name || 'Yatırım',
          type: i.type || 'stock',
          amount: Number(i.amount) || 0,
          currentRate: Number(i.currentRate) || 0,
          balance: Number(i.balance || i.value) || 0,
          totalInvested: Number(i.totalInvested || i.value) || 0,
          lastInterestDate: i.lastInterestDate ? sanitizeDateStr(i.lastInterestDate) : null,
          user_id: uid
        }));
        const { error } = await supabase.from('investments').upsert(invsToInsert, { onConflict: 'id' });
        if (!error) {
          syncedCount += localInvestments.length;
        } else {
          hasError = true;
          console.error('Error syncing investments:', error);
          if (!silent) toast.error(`Yatırım Aktarım Hatası: ${error.message}`);
        }
      }

      if (localBudgets.length > 0) {
        const budgetsToInsert = localBudgets.map((b: any) => ({
          id: isValidUUID(b.id) ? b.id : generateUUID(),
          category: b.category || 'Diğer',
          amount: Number(b.limit || b.amount) || 0,
          user_id: uid
        }));
        const { error } = await supabase.from('budgets').upsert(budgetsToInsert, { onConflict: 'id' });
        if (!error) {
          syncedCount += localBudgets.length;
        } else {
          hasError = true;
          console.error('Error syncing budgets:', error);
          if (!silent) toast.error(`Bütçe Aktarım Hatası: ${error.message}`);
        }
      }

      if (localProjItems.length > 0) {
        const projToInsert = localProjItems.map((p: any) => ({
          id: isValidUUID(p.id) ? p.id : generateUUID(),
          name: p.name || 'Projeksiyon',
          type: p.type || 'income',
          amount: Number(p.amount) || 0,
          day: Number(p.day) || 1,
          is_one_time: Boolean(p.isOneTime),
          one_time_date: p.oneTimeDate ? sanitizeDateStr(p.oneTimeDate) : null,
          recurring_months: Number(p.recurringMonths) || 12,
          created_at: p.createdAt ? sanitizeDateStr(p.createdAt) : new Date().toISOString(),
          user_id: uid
        }));
        await supabase.from('projection_items').upsert(projToInsert, { onConflict: 'id' });
      }

      if (!hasError && syncedCount > 0) {
        deleteGuestKeys();
      }

      if (!silent) {
        if (toastId) toast.dismiss(toastId);
        if (syncedCount > 0 || localBills.length > 0 || localInvestments.length > 0) {
          toast.success(`Yerel verileriniz (${syncedCount} işlem) Supabase hesabınıza aktarıldı!`);
        } else {
          toast.success('Yerel verileriniz senkronize edildi.');
        }
      }
      return syncedCount;
    } catch (err: any) {
      if (!silent) {
        if (toastId) toast.dismiss(toastId);
        toast.error(`Aktarım uyarısı: ${err.message || 'Bilinmeyen hata'}`);
      }
      return 0;
    }
  };

  const recoverDataManual = async () => {
    const toastId = toast.loading('Tarayıcı hafızasındaki tüm eski veriler taranıyor...');
    const recovered = recoverAllLocalData();
    const count = recovered.txs.length + recovered.bills.length + recovered.incomes.length + recovered.investments.length;

    if (count > 0) {
      if (targetUserId) {
        // Senkronize et
        await syncLocalToCloud(targetUserId, true);
        
        // Supabase'den güncel veriyi çek ve yerelle birleştirip ekrana bas
        try {
          const [txRes, billsRes, riRes, invRes, budgetsRes] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', targetUserId),
            supabase.from('bills').select('*').eq('user_id', targetUserId),
            supabase.from('regular_incomes').select('*').eq('user_id', targetUserId),
            supabase.from('investments').select('*').eq('user_id', targetUserId),
            supabase.from('budgets').select('*').eq('user_id', targetUserId),
          ]);
          
          const cloudTxs = txRes.data || [];
          const cloudBills = billsRes.data || [];
          const cloudIncomes = riRes.data || [];
          const cloudInvs = invRes.data || [];
          const cloudBudgets = budgetsRes.data || [];

          const txMap = new Map<string, Transaction>();
          recovered.txs.forEach(t => txMap.set(t.id, t));
          cloudTxs.forEach(t => txMap.set(t.id, t));
          
          const billsMap = new Map<string, Bill>();
          recovered.bills.forEach(b => billsMap.set(b.id, b));
          cloudBills.forEach(b => billsMap.set(b.id, b));
          
          const incomesMap = new Map<string, RegularIncome>();
          recovered.incomes.forEach(i => incomesMap.set(i.id, i));
          cloudIncomes.forEach(i => incomesMap.set(i.id, i));
          
          const invsMap = new Map<string, Investment>();
          recovered.investments.forEach(i => invsMap.set(i.id, i));
          cloudInvs.forEach((inv: any) => invsMap.set(inv.id, {
            ...inv,
            balance: inv.balance !== undefined ? inv.balance : (inv.value || 0),
            totalInvested: inv.totalInvested !== undefined ? inv.totalInvested : (inv.value || 0)
          }));
          
          const budgetsMap = new Map<string, Budget>();
          recovered.budgets.forEach(b => budgetsMap.set(b.id, b));
          cloudBudgets.forEach((b: any) => budgetsMap.set(b.id, { ...b, limit: b.amount || b.limit }));

          setTransactions(Array.from(txMap.values()));
          setBills(Array.from(billsMap.values()));
          setRegularIncomes(Array.from(incomesMap.values()));
          setInvestments(Array.from(invsMap.values()));
          setStoredBudgets(Array.from(budgetsMap.values()));

        } catch (e) {
          console.error("Refetch error:", e);
        }
      } else {
        setTransactions(recovered.txs);
        setBills(recovered.bills);
        setRegularIncomes(recovered.incomes);
        setInvestments(recovered.investments.map((inv: any) => ({ ...inv, balance: inv.balance !== undefined ? inv.balance : (inv.value || 0), totalInvested: inv.totalInvested !== undefined ? inv.totalInvested : (inv.value || 0) })));
        setStoredBudgets(recovered.budgets);
      }

      toast.dismiss(toastId);
      toast.success(`${count} adet eski/yerel veri başarıyla bulundu, ekranınıza yüklendi ve hesabınıza aktarıldı!`);
    } else {
      toast.dismiss(toastId);
      toast('Kurtarılacak ek yerel veri bulunamadı.');
    }
    return count;
  };

  // Load from Supabase on user init
  useEffect(() => {
    const fetchData = async () => {
      const recovered = recoverAllLocalData();

      if (!targetUserId) {
        setTransactions(recovered.txs);
        setBills(recovered.bills);
        setRegularIncomes(recovered.incomes);
        setInvestments(recovered.investments.map((inv: any) => ({ ...inv, balance: inv.balance !== undefined ? inv.balance : (inv.value || 0), totalInvested: inv.totalInvested !== undefined ? inv.totalInvested : (inv.value || 0) })));
        setStoredBudgets(recovered.budgets);
        setReceipts(getStoredData('fin_receipts', []));
        setCustomCategories(getStoredData('fin_custom_categories', []));
        setOnboardingDone(getStoredData('fin_onboarding', false));
        setAppTitle(getStoredData('fin_app_title', 'Kumparam'));
        setProjectionItems(getStoredData('fin_proj_items', []));
        setProjectionSettings(getStoredData('fin_proj_settings', { annualGrossRate: 35.0, taxRate: 17.5, projectionPeriod: 365 }));
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      
      setReceipts(getStoredData(`fin_receipts`, [], targetUserId));
      setCustomCategories(getStoredData(`fin_custom_categories`, [], targetUserId));
      setAppTitle(getStoredData(`fin_app_title`, 'Kumparam', targetUserId));
      setOnboardingDone(getStoredData(`fin_onboarding`, false, targetUserId));
      
      try {
        const [txRes, billsRes, riRes, invRes, budgetsRes, projItemsRes, projSettingsRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', targetUserId),
          supabase.from('bills').select('*').eq('user_id', targetUserId),
          supabase.from('regular_incomes').select('*').eq('user_id', targetUserId),
          supabase.from('investments').select('*').eq('user_id', targetUserId),
          supabase.from('budgets').select('*').eq('user_id', targetUserId),
          supabase.from('projection_items').select('*').eq('user_id', targetUserId),
          supabase.from('projection_settings').select('*').eq('user_id', targetUserId).maybeSingle()
        ]);

        const cloudTxs = txRes.data || [];
        const cloudBills = billsRes.data || [];
        const cloudIncomes = riRes.data || [];
        const cloudInvs = invRes.data || [];
        const cloudBudgets = budgetsRes.data || [];

        const txMap = new Map<string, Transaction>();
        recovered.txs.forEach(t => txMap.set(t.id, t));
        cloudTxs.forEach(t => txMap.set(t.id, t));
        const finalTxs = Array.from(txMap.values());

        const billsMap = new Map<string, Bill>();
        recovered.bills.forEach(b => billsMap.set(b.id, b));
        cloudBills.forEach(b => billsMap.set(b.id, b));
        const finalBills = Array.from(billsMap.values());

        const incomesMap = new Map<string, RegularIncome>();
        recovered.incomes.forEach(i => incomesMap.set(i.id, i));
        cloudIncomes.forEach(i => incomesMap.set(i.id, i));
        const finalIncomes = Array.from(incomesMap.values());

        const invsMap = new Map<string, Investment>();
        recovered.investments.forEach(i => invsMap.set(i.id, i));
        cloudInvs.forEach((inv: any) => invsMap.set(inv.id, {
          ...inv,
          balance: inv.balance !== undefined ? inv.balance : (inv.value || 0),
          totalInvested: inv.totalInvested !== undefined ? inv.totalInvested : (inv.value || 0)
        }));
        const finalInvs = Array.from(invsMap.values());

        const budgetsMap = new Map<string, Budget>();
        recovered.budgets.forEach(b => budgetsMap.set(b.id, b));
        cloudBudgets.forEach((b: any) => budgetsMap.set(b.id, { ...b, limit: b.amount || b.limit }));
        const finalBudgets = Array.from(budgetsMap.values());

        setTransactions(finalTxs);
        setBills(finalBills);
        setRegularIncomes(finalIncomes);
        setInvestments(finalInvs);
        setStoredBudgets(finalBudgets);

        const hasUnsyncedLocalData = (
          recovered.txs.length > cloudTxs.length ||
          recovered.bills.length > cloudBills.length ||
          recovered.incomes.length > cloudIncomes.length ||
          recovered.investments.length > cloudInvs.length ||
          (recovered.txs.length > 0 && cloudTxs.length === 0)
        );

        if (hasUnsyncedLocalData) {
          syncLocalToCloud(targetUserId, true);
        }

        if (projItemsRes.data) {
          setProjectionItems(projItemsRes.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            amount: item.amount,
            day: item.day,
            isOneTime: item.is_one_time,
            oneTimeDate: item.one_time_date,
            recurringMonths: item.recurring_months,
            createdAt: item.created_at
          })));
        }
        if (projSettingsRes.data) {
          setProjectionSettings({
            annualGrossRate: projSettingsRes.data.annual_gross_rate ?? 35.0,
            taxRate: projSettingsRes.data.tax_rate ?? 17.5,
            projectionPeriod: projSettingsRes.data.projection_period ?? 365
          });
        }
      } catch (err) {
        console.error("Supabase veri yükleme hatası:", err);
        setTransactions(recovered.txs);
        setBills(recovered.bills);
        setRegularIncomes(recovered.incomes);
        setInvestments(recovered.investments);
        setStoredBudgets(recovered.budgets);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [user, targetUserId]);

  // Computations
  const budgets: Budget[] = storedBudgets.map(b => ({
    ...b,
    spent: 0
  }));

  const { liquidCash, unpaidCreditCards, unpaidCurrentStatementCC, totalIncome, totalExpenses, currentNetWorth } = useMemo(() => {
     const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     const totalInc = sortedTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
     const totalExp = sortedTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
     const totalInv = investments.reduce((sum, inv) => sum + (inv.balance || 0), 0);

     if (sortedTxs.length === 0) {
       return { liquidCash: 0, unpaidCreditCards: 0, unpaidCurrentStatementCC: 0, totalIncome: 0, totalExpenses: 0, currentNetWorth: totalInv };
     }

     const today = new Date();
     let referenceDate = new Date(today.getFullYear(), today.getMonth(), 14);
     if (today > referenceDate) {
       referenceDate = new Date(today.getFullYear(), today.getMonth() + 1, 14);
     }
     const refString = format(referenceDate, 'yyyy-MM-dd');

     const unpaidCC = sortedTxs.filter(t => {
          if (t.type !== 'expense') return false;
          const parsed = parseNotes(t.notes);
          return parsed.isCC && !parsed.isPaid;
     }).reduce((sum, t) => sum + t.amount, 0);

     const unpaidCurrentStatementCC = sortedTxs.filter(t => {
          if (t.type !== 'expense') return false;
          const parsed = parseNotes(t.notes);
          return parsed.isCC && !parsed.isPaid && parsed.dueDate <= refString;
     }).reduce((sum, t) => sum + t.amount, 0);
     
     const currentCashExp = sortedTxs.filter(t => {
          if (t.type !== 'expense') return false;
          const parsed = parseNotes(t.notes);
          if (parsed.isCC) return parsed.isPaid;
          return true;
     }).reduce((sum, t) => sum + t.amount, 0);
     
     const liqCash = totalInc - currentCashExp;
     const netWorth = totalInc - totalExp + totalInv;

     return { 
       liquidCash: liqCash, 
       unpaidCreditCards: unpaidCC, 
       unpaidCurrentStatementCC,
       totalIncome: totalInc,
       totalExpenses: totalExp,
       currentNetWorth: netWorth
     };
  }, [transactions, investments]);

  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthEntry[]>([]);
  
  useEffect(() => {
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.balance, 0);
    if (transactions.length === 0) {
      setNetWorthHistory([{
        id: 'nw-current',
        month: format(new Date(), 'MMM', { locale: tr }),
        year: new Date().getFullYear(),
        total: currentNetWorth,
        previousTotal: currentNetWorth,
        change: 'none'
      }]);
      return;
    }

    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groupedByMonth: { [key: string]: { income: number, expense: number } } = {};
    sortedTxs.forEach(t => {
      const monthKey = format(new Date(t.date), 'yyyy-MM');
      if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = { income: 0, expense: 0 };
      if (t.type === 'income') groupedByMonth[monthKey].income += t.amount;
      else groupedByMonth[monthKey].expense += t.amount;
    });

    const monthKeys = Object.keys(groupedByMonth).sort();
    const currentMonthKey = format(new Date(), 'yyyy-MM');
    if (!groupedByMonth[currentMonthKey] && !monthKeys.includes(currentMonthKey)) {
      groupedByMonth[currentMonthKey] = { income: 0, expense: 0 };
    }
    
    const startDate = parseISO(`${monthKeys[0]}-01`);
    const endDate = parseISO(`${currentMonthKey}-01`);

    const monthsList: string[] = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      monthsList.push(format(d, 'yyyy-MM'));
      d = addMonths(d, 1);
    }

    const history: NetWorthEntry[] = [];
    let cumulative = 0; 

    monthsList.forEach((mKey, idx) => {
       const mData = groupedByMonth[mKey] || { income: 0, expense: 0 };
       cumulative += (mData.income - mData.expense);
       const monthTotal = cumulative + totalInvestments;
       const prevTotal = idx > 0 ? history[idx-1].total : monthTotal - (mData.income - mData.expense);

       history.push({
         id: `nw-${mKey}`,
         month: format(parseISO(`${mKey}-01`), 'MMM', { locale: tr }),
         year: parseInt(mKey.split('-')[0]),
         total: monthTotal,
         previousTotal: prevTotal,
         change: monthTotal > prevTotal ? 'increase' : (monthTotal < prevTotal ? 'decrease' : 'none')
       });
    });

    setNetWorthHistory(history);
  }, [transactions, investments, currentNetWorth]);

  const completeOnboarding = (salary: number, rent: number, billsValue: number) => {
    setOnboardingDone(true);
    // Let's rely on simple add records, they handle Supabase sync internally
    if (salary > 0) addTransaction({ type: 'income', amount: salary, category: 'Maaş', merchant: 'İşveren', date: format(new Date(), 'yyyy-MM-dd'), notes: 'Başlangıç Maaşı' });
    if (rent > 0) {
      addTransaction({ type: 'expense', amount: rent, category: 'Kira', merchant: 'Ev Sahibi', date: format(new Date(), 'yyyy-MM-dd') });
      addBudget({ category: 'Kira', limit: rent, spent: 0 });
    }
    if (billsValue > 0) addBudget({ category: 'Faturalar', limit: billsValue, spent: 0 });
  };

  const skipOnboarding = () => setOnboardingDone(true);

  // ------------- TRANSACTIONS -------------
  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (isSharedView) return;
    const tempId = generateUUID();
    setTransactions(prev => [...prev, { ...t, id: tempId }]);
    
    if (user) {
      const { data, error } = await supabase.from('transactions').insert({ ...t, id: tempId, user_id: user.id }).select().single();
      if (!error && data) {
        setTransactions(prev => prev.map(tx => tx.id === tempId ? data : tx));
      } else {
        console.error("Transaction ekleme hatası:", error);
        toast.error(`Veritabanına kaydedilemedi (Transactions): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateTransaction = async (id: string, updatedTx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updatedTx, id } : t));
    if (user) {
      const { error } = await supabase.from('transactions').update(updatedTx).eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error("Transaction güncelleme hatası:", error);
        toast.error(`Güncelleme kaydedilemedi: ${error.message}`);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (user) {
      const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error("Transaction silme hatası:", error);
        toast.error(`Silme işlemi veritabanında başarısız oldu: ${error.message}`);
      }
    }
  };

  const payCreditCardStatement = async () => {
     const today = new Date();
     
     let referenceDate = new Date(today.getFullYear(), today.getMonth(), 14);
     if (today > referenceDate) {
       referenceDate = new Date(today.getFullYear(), today.getMonth() + 1, 14);
     }
     
     const refString = format(referenceDate, 'yyyy-MM-dd');
     
     const txsToUpdate: Transaction[] = [];
     const updatedTxs = transactions.map(t => {
       if (t.type === 'expense') {
         const parsed = parseNotes(t.notes);
         if (parsed.isCC && !parsed.isPaid) {
           if (parsed.dueDate <= refString) {
             const updated = { ...t, notes: `CC|${parsed.dueDate}|1|${parsed.actualNote}` };
             txsToUpdate.push(updated);
             return updated;
           }
         }
       }
       return t;
     });


     setTransactions(updatedTxs);

     if (user && txsToUpdate.length > 0) {
       for (const tx of txsToUpdate) {
          const { error } = await supabase.from('transactions').update({ notes: tx.notes }).eq('id', tx.id).eq('user_id', user.id);
          if (error) {
             console.error("Kredi kartı ekstre ödeme hatası:", error);
          }
       }
     }
  };

  // ------------- BILLS -------------
  const addBill = async (b: Omit<Bill, 'id'>) => {
    const tempId = generateUUID();
    setBills(prev => [...prev, { ...b, id: tempId }]);
    
    if (user) {
      const { data, error } = await supabase.from('bills').insert({ ...b, id: tempId, user_id: user.id }).select().single();
      if (!error && data) {
        setBills(prev => prev.map(bill => bill.id === tempId ? data : bill));
      } else {
        console.error("Bill ekleme hatası:", error);
        toast.error(`Veritabanına kaydedilemedi (Bills): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateBill = async (id: string, updatedBill: Omit<Bill, 'id'>) => {
    setBills(prev => prev.map(b => b.id === id ? { ...updatedBill, id } : b));
    if (user) {
      const { error } = await supabase.from('bills').update(updatedBill).eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Güncelleme hatası (Bills): ${error.message}`);
    }
  };

  const payBill = async (id: string, amount: number, date: string) => {
    const billToPay = bills.find(b => b.id === id);
    if (!billToPay) return;

    let tempTxId = generateUUID();
    
    // Determine credit card default values
    const today = new Date();
    let defaultDueDate = new Date(today.getFullYear(), today.getMonth(), 14);
    if (today.getDate() > 14) {
      defaultDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 14);
    }
    const ccNotes = `CC|${format(defaultDueDate, 'yyyy-MM-dd')}|0|Fatura Ödemesi`;
    
    // Optimiztic UI
    setBills(prev => prev.map(b => b.id === id ? { ...b, isPaid: true, lastPaidDate: new Date().toISOString(), linkedTransactionId: tempTxId } : b));
    setTransactions(prev => [...prev, { id: tempTxId, type: 'expense', amount, category: billToPay.category as Category, merchant: billToPay.name, date, notes: ccNotes }]);

    if (user) {
      const { data: insertedTx } = await supabase.from('transactions')
        .insert({ id: tempTxId, type: 'expense', amount, category: billToPay.category, merchant: billToPay.name, date, notes: ccNotes, user_id: user.id })
        .select().single();
      
      const realTxId = insertedTx ? insertedTx.id : tempTxId;

      await supabase.from('bills').update({ isPaid: true, lastPaidDate: new Date().toISOString(), linkedTransactionId: realTxId }).eq('id', id).eq('user_id', user.id);

      if (billToPay.recurrence !== 'none') {
        const dueDateObj = parseISO(billToPay.dueDate);
        let nextDueDate = dueDateObj;
        if (billToPay.recurrence === 'monthly') nextDueDate = addMonths(dueDateObj, 1);
        else if (billToPay.recurrence === 'quarterly') nextDueDate = addQuarters(dueDateObj, 1);
        else if (billToPay.recurrence === 'yearly') nextDueDate = addYears(dueDateObj, 1);

        await supabase.from('bills').insert({
          id: generateUUID(),
          name: billToPay.name,
          amount: billToPay.amount,
          category: billToPay.category,
          dueDate: format(nextDueDate, 'yyyy-MM-dd'),
          isPaid: false,
          recurrence: billToPay.recurrence,
          user_id: user.id
        });
      }

      // Reload
      const [txRes, billsRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('bills').select('*').eq('user_id', user.id)
      ]);
      if (txRes.data) setTransactions(txRes.data);
      if (billsRes.data) setBills(billsRes.data);
    }
  };

  const undoBillPayment = async (id: string) => {
    const bill = bills.find(b => b.id === id);
    if (!bill) return;

    const txIdToDelete = bill.linkedTransactionId;
    setBills(prev => prev.map(b => b.id === id ? { ...b, isPaid: false, lastPaidDate: undefined, linkedTransactionId: undefined } : b));
    if (txIdToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== txIdToDelete));
    }

    if (user) {
      await supabase.from('bills').update({ isPaid: false, lastPaidDate: null, linkedTransactionId: null }).eq('id', id).eq('user_id', user.id);
      if (txIdToDelete) {
        await supabase.from('transactions').delete().eq('id', txIdToDelete).eq('user_id', user.id);
      }
    }
  };

  const deleteBill = async (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
    if (user) {
      const { error } = await supabase.from('bills').delete().eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Silme hatası (Bills): ${error.message}`);
    }
  };

  const addReceipt = (r: Omit<Receipt, 'id'>) => {
    const id = generateUUID();
    setReceipts(prev => [...prev, { ...r, id }]);
  };

  const deleteReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  // ------------- REGULAR INCOMES -------------
  const addRegularIncome = async (ri: Omit<RegularIncome, 'id'>) => {
    const tempId = generateUUID();
    setRegularIncomes(prev => [...prev, { ...ri, id: tempId }]);
    
    if (user) {
      const { data, error } = await supabase.from('regular_incomes').insert({ ...ri, id: tempId, user_id: user.id }).select().single();
      if (!error && data) {
        setRegularIncomes(prev => prev.map(item => item.id === tempId ? data : item));
      } else {
        console.error("Düzenli Gelir ekleme hatası:", error);
        toast.error(`Veritabanına kaydedilemedi (Regular Incomes): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateRegularIncome = async (id: string, updatedRi: Omit<RegularIncome, 'id'>) => {
    setRegularIncomes(prev => prev.map(r => r.id === id ? { ...updatedRi, id } : r));
    if (user) {
      const { error } = await supabase.from('regular_incomes').update(updatedRi).eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Güncelleme hatası (Regular Incomes): ${error.message}`);
    }
  };

  const processRegularIncome = async (id: string, amount: number, date: string) => {
    const riToProcess = regularIncomes.find(r => r.id === id);
    if (!riToProcess) return;

    let tempTxId = generateUUID();
    
    // Optimistic UI
    setRegularIncomes(prev => prev.map(r => r.id === id ? { ...r, isProcessed: true, lastProcessedDate: new Date().toISOString(), linkedTransactionId: tempTxId } : r));
    setTransactions(prev => [...prev, { id: tempTxId, type: 'income', amount, category: riToProcess.category as Category, merchant: riToProcess.name, date, notes: 'Düzenli Gelir' }]);

    if (user) {
      const { data: insertedTx } = await supabase.from('transactions')
        .insert({ id: tempTxId, type: 'income', amount, category: riToProcess.category, merchant: riToProcess.name, date, notes: 'Düzenli Gelir', user_id: user.id })
        .select().single();
      
      const realTxId = insertedTx ? insertedTx.id : tempTxId;

      await supabase.from('regular_incomes').update({ isProcessed: true, lastProcessedDate: new Date().toISOString(), linkedTransactionId: realTxId }).eq('id', id).eq('user_id', user.id);

      if (riToProcess.recurrence !== 'none') {
        const dueDateObj = parseISO(riToProcess.dueDate);
        let nextDueDate = dueDateObj;
        if (riToProcess.recurrence === 'monthly') nextDueDate = addMonths(dueDateObj, 1);
        else if (riToProcess.recurrence === 'quarterly') nextDueDate = addQuarters(dueDateObj, 1);
        else if (riToProcess.recurrence === 'yearly') nextDueDate = addYears(dueDateObj, 1);

        await supabase.from('regular_incomes').insert({
          id: generateUUID(),
          name: riToProcess.name,
          amount: riToProcess.amount,
          category: riToProcess.category,
          dueDate: format(nextDueDate, 'yyyy-MM-dd'),
          isProcessed: false,
          recurrence: riToProcess.recurrence,
          user_id: user.id
        });
      }

      // Reload
      const [txRes, riRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('regular_incomes').select('*').eq('user_id', user.id)
      ]);
      if (txRes.data) setTransactions(txRes.data);
      if (riRes.data) setRegularIncomes(riRes.data);
    }
  };

  const undoRegularIncomeProcess = async (id: string) => {
    const ri = regularIncomes.find(r => r.id === id);
    if (!ri) return;

    const txIdToDelete = ri.linkedTransactionId;
    setRegularIncomes(prev => prev.map(r => r.id === id ? { ...r, isProcessed: false, lastProcessedDate: undefined, linkedTransactionId: undefined } : r));
    if (txIdToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== txIdToDelete));
    }

    if (user) {
      await supabase.from('regular_incomes').update({ isProcessed: false, lastProcessedDate: null, linkedTransactionId: null }).eq('id', id).eq('user_id', user.id);
      if (txIdToDelete) {
        await supabase.from('transactions').delete().eq('id', txIdToDelete).eq('user_id', user.id);
      }
    }
  };

  const deleteRegularIncome = async (id: string) => {
    setRegularIncomes(prev => prev.filter(r => r.id !== id));
    if (user) {
      const { error } = await supabase.from('regular_incomes').delete().eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Silme hatası (Regular Incomes): ${error.message}`);
    }
  };

  // ------------- BUDGETS -------------
  const addBudget = async (b: Omit<Budget, 'id'>) => {
    const tempId = generateUUID();
    setStoredBudgets(prev => [...prev, { ...b, id: tempId }]);
    
    if (user) {
      const bPayload = { id: tempId, category: b.category, amount: b.limit, user_id: user.id };
      const { data, error } = await supabase.from('budgets').insert(bPayload).select().single();
      if (!error && data) {
        setStoredBudgets(prev => prev.map(budg => budg.id === tempId ? { ...budg, ...data } : budg));
      } else {
        console.error("Budget ekleme hatası:", error);
        toast.error(`Veritabanına kaydedilemedi (Budgets): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateBudget = async (id: string, updatedBudget: Omit<Budget, 'id'>) => {
    setStoredBudgets(prev => prev.map(b => b.id === id ? { ...updatedBudget, id } : b));
    if (user) {
      const bPayload = { category: updatedBudget.category, amount: updatedBudget.limit };
      const { error } = await supabase.from('budgets').update(bPayload).eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Güncelleme hatası (Budgets): ${error.message}`);
    }
  };

  const deleteBudget = async (id: string) => {
    setStoredBudgets(prev => prev.filter(b => b.id !== id));
    if (user) {
      const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Silme hatası (Budgets): ${error.message}`);
    }
  };

  // ------------- INVESTMENTS -------------
  const addInvestment = async (i: Omit<Investment, 'id'>) => {
    const tempId = generateUUID();
    setInvestments(prev => [...prev, { ...i, id: tempId }]);
    
    if (user) {
      const { data, error } = await supabase.from('investments').insert({ ...i, id: tempId, user_id: user.id }).select().single();
      if (!error && data) {
        setInvestments(prev => prev.map(inv => inv.id === tempId ? data : inv));
      } else {
        console.error("Investment ekleme hatası:", error);
        toast.error(`Veritabanına kaydedilemedi (Investments): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateInvestment = async (id: string, updatedInvestment: Omit<Investment, 'id'>) => {
    setInvestments(prev => prev.map(i => i.id === id ? { ...updatedInvestment, id } : i));
    if (user) {
      const { error } = await supabase.from('investments').update(updatedInvestment).eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Güncelleme hatası (Investments): ${error.message}`);
    }
  };

  const deleteInvestment = async (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    if (user) {
      const { error } = await supabase.from('investments').delete().eq('id', id).eq('user_id', user.id);
      if (error) toast.error(`Silme hatası (Investments): ${error.message}`);
    }
  };

  // ------------- PROJECTIONS -------------
  const addProjectionItem = async (item: Omit<SimItem, 'id'>) => {
    const tempId = generateUUID();
    const newItem = { ...item, id: tempId };
    setProjectionItems(prev => [...prev, newItem]);
    
    if (user) {
      // transform camelCase to snake_case for DB (or we match it in DB schema)
      // I will assume the DB schema is exact match or uses column wrapping. 
      // ACTUALLY wait!! Is there a problem if I send oneTimeDate? Supabase columns are usually snake_case, but let's just use what's in SimItem but mapped.
      // Easiest is just map exactly to camelCase in the table creation if we are sending camelCase.
      const dbPayload = {
        id: tempId, user_id: user.id,
        name: item.name, type: item.type, amount: item.amount, day: item.day,
        is_one_time: item.isOneTime, one_time_date: item.oneTimeDate,
        recurring_months: item.recurringMonths, created_at: item.createdAt || new Date().toISOString()
      };
      
      const { data, error } = await supabase.from('projection_items').insert(dbPayload).select().single();
      if (!error && data) {
         // data mapping from DB logic if returned snake_case
         setProjectionItems(prev => prev.map(pi => pi.id === tempId ? {
            id: data.id, name: data.name, type: data.type, amount: data.amount, day: data.day,
            isOneTime: data.is_one_time, oneTimeDate: data.one_time_date, 
            recurringMonths: data.recurring_months, createdAt: data.created_at
         } : pi));
      } else {
        console.error("Proj Item ekleme hatası:", error);
      }
    }
  };

  const updateProjectionItem = async (id: string, updatedItem: Omit<SimItem, 'id'>) => {
    setProjectionItems(prev => prev.map(i => i.id === id ? { ...updatedItem, id } : i));
    if (user) {
      const dbPayload = {
        name: updatedItem.name, type: updatedItem.type, amount: updatedItem.amount, day: updatedItem.day,
        is_one_time: updatedItem.isOneTime, one_time_date: updatedItem.oneTimeDate,
        recurring_months: updatedItem.recurringMonths, created_at: updatedItem.createdAt
      };
      const { error } = await supabase.from('projection_items').update(dbPayload).eq('id', id).eq('user_id', user.id);
      if (error) console.error("Proj Item güncelleme hatası:", error);
    }
  };

  const deleteProjectionItem = async (id: string) => {
    setProjectionItems(prev => prev.filter(i => i.id !== id));
    if (user) {
      const { error } = await supabase.from('projection_items').delete().eq('id', id).eq('user_id', user.id);
      if (error) console.error("Proj Item silme hatası:", error);
    }
  };

  const updateProjectionSettings = async (settings: ProjectionSettings) => {
    setProjectionSettings(settings);
    if (user) {
      const dbPayload = {
        user_id: user.id,
        annual_gross_rate: settings.annualGrossRate,
        tax_rate: settings.taxRate,
        projection_period: settings.projectionPeriod
      };
      // Upsert
      const { error } = await supabase.from('projection_settings').upsert(dbPayload, { onConflict: 'user_id' });
      if (error) console.error("Proj Settings hata:", error);
    }
  };

  return (
    <FinanceContext.Provider value={{
      transactions, bills, regularIncomes, netWorthHistory, investments, budgets,
      addTransaction, updateTransaction, deleteTransaction, payCreditCardStatement,
      addBill, updateBill, payBill, undoBillPayment, deleteBill,
      addRegularIncome, updateRegularIncome, processRegularIncome, undoRegularIncomeProcess, deleteRegularIncome,
      addBudget, updateBudget, deleteBudget,
      addInvestment, updateInvestment, deleteInvestment,
      receipts, addReceipt, deleteReceipt,
      projectionItems, addProjectionItem, updateProjectionItem, deleteProjectionItem,
      projectionSettings, updateProjectionSettings,
      
      totalIncome, totalExpenses, currentNetWorth, liquidCash, unpaidCreditCards, unpaidCurrentStatementCC, 
      onboardingDone, completeOnboarding, skipOnboarding,
      appTitle, setAppTitle, isLoadingData, isSharedView, syncLocalToCloud, recoverDataManual,
      customCategories, addCustomCategory: (cat: string) => setCustomCategories(prev => [...prev, cat])
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};

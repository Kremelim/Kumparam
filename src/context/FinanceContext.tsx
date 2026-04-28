import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, Bill, NetWorthEntry, Investment, Budget, Category, Recurrence } from '../types';
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
  addBudget: (b: Omit<Budget, 'id'>) => void;
  updateBudget: (id: string, updatedBudget: Omit<Budget, 'id'>) => void;
  deleteBudget: (id: string) => void;
  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, updatedInvestment: Omit<Investment, 'id'>) => void;
  deleteInvestment: (id: string) => void;
  totalIncome: number;
  totalExpenses: number;
  currentNetWorth: number;
  onboardingDone: boolean;
  completeOnboarding: (salary: number, rent: number, billsValue: number) => void;
  skipOnboarding: () => void;
  appTitle: string;
  setAppTitle: (title: string) => void;
  isLoadingData: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const loadFromStorage = <T,>(key: string, _defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return _defaultValue;
  };

  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage('fin_transactions', []));
  const [bills, setBills] = useState<Bill[]>(() => loadFromStorage('fin_bills', []));
  const [investments, setInvestments] = useState<Investment[]>(() => loadFromStorage('fin_investments', []));
  const [storedBudgets, setStoredBudgets] = useState<Budget[]>(() => loadFromStorage('fin_budgets', []));
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => loadFromStorage('fin_onboarding', false));
  const [appTitle, setAppTitle] = useState<string>(() => loadFromStorage('fin_app_title', 'Kumparam'));
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Save to local as backup always
  useEffect(() => { localStorage.setItem('fin_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('fin_bills', JSON.stringify(bills)); }, [bills]);
  useEffect(() => { localStorage.setItem('fin_investments', JSON.stringify(investments)); }, [investments]);
  useEffect(() => { localStorage.setItem('fin_budgets', JSON.stringify(storedBudgets)); }, [storedBudgets]);
  useEffect(() => { localStorage.setItem('fin_onboarding', JSON.stringify(onboardingDone)); }, [onboardingDone]);
  useEffect(() => { localStorage.setItem('fin_app_title', JSON.stringify(appTitle)); }, [appTitle]);

  // Load from Supabase on user init
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoadingData(true);
      try {
        const [txRes, billsRes, invRes, budgetsRes] = await Promise.all([
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('bills').select('*').eq('user_id', user.id),
          supabase.from('investments').select('*').eq('user_id', user.id),
          supabase.from('budgets').select('*').eq('user_id', user.id)
        ]);

        if (txRes.data) setTransactions(txRes.data);
        if (billsRes.data) setBills(billsRes.data);
        if (invRes.data) setInvestments(invRes.data);
        if (budgetsRes.data) setStoredBudgets(budgetsRes.data);

        if (txRes.error) console.error("Transactions fetch error:", txRes.error);
        if (billsRes.error) console.error("Bills fetch error:", billsRes.error);
        if (invRes.error) console.error("Investments fetch error:", invRes.error);
        if (budgetsRes.error) console.error("Budgets fetch error:", budgetsRes.error);
      } catch (err) {
        console.error("Supabase veri yükleme hatası:", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [user]);

  // Computations
  const budgets: Budget[] = storedBudgets.map(b => ({
    ...b,
    spent: transactions.filter(t => t.category === b.category && t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  }));

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalInvestments = investments.reduce((sum, inv) => sum + inv.value, 0);
  const currentNetWorth = (totalIncome - totalExpenses) + totalInvestments;

  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthEntry[]>([]);
  
  useEffect(() => {
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
    const tempId = generateUUID();
    setTransactions(prev => [...prev, { ...t, id: tempId }]);
    
    if (user) {
      const { data, error } = await supabase.from('transactions').insert({ ...t, id: tempId, user_id: user.id }).select().single();
      if (!error && data) {
        setTransactions(prev => prev.map(tx => tx.id === tempId ? data : tx));
      } else {
        console.error("Transaction ekleme hatası:", error);
        alert(`Veritabanına kaydedilemedi (Transactions): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateTransaction = async (id: string, updatedTx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updatedTx, id } : t));
    if (user) {
      const { error } = await supabase.from('transactions').update(updatedTx).eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error("Transaction güncelleme hatası:", error);
        alert(`Güncelleme kaydedilemedi: ${error.message}`);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (user) {
      const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
      if (error) {
        console.error("Transaction silme hatası:", error);
        alert(`Silme işlemi veritabanında başarısız oldu: ${error.message}`);
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
        alert(`Veritabanına kaydedilemedi (Bills): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateBill = async (id: string, updatedBill: Omit<Bill, 'id'>) => {
    setBills(prev => prev.map(b => b.id === id ? { ...updatedBill, id } : b));
    if (user) {
      const { error } = await supabase.from('bills').update(updatedBill).eq('id', id).eq('user_id', user.id);
      if (error) alert(`Güncelleme hatası (Bills): ${error.message}`);
    }
  };

  const payBill = async (id: string, amount: number, date: string) => {
    const billToPay = bills.find(b => b.id === id);
    if (!billToPay) return;

    let tempTxId = generateUUID();
    
    // Optimiztic UI
    setBills(prev => prev.map(b => b.id === id ? { ...b, isPaid: true, lastPaidDate: new Date().toISOString(), linkedTransactionId: tempTxId } : b));
    setTransactions(prev => [...prev, { id: tempTxId, type: 'expense', amount, category: billToPay.category as Category, merchant: billToPay.name, date, notes: 'Fatura Ödemesi' }]);

    if (user) {
      const { data: insertedTx } = await supabase.from('transactions')
        .insert({ id: tempTxId, type: 'expense', amount, category: billToPay.category, merchant: billToPay.name, date, notes: 'Fatura Ödemesi', user_id: user.id })
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
      if (error) alert(`Silme hatası (Bills): ${error.message}`);
    }
  };

  // ------------- BUDGETS -------------
  const addBudget = async (b: Omit<Budget, 'id'>) => {
    const tempId = generateUUID();
    setStoredBudgets(prev => [...prev, { ...b, id: tempId }]);
    
    if (user) {
      const bPayload = { id: tempId, category: b.category, limit: b.limit, user_id: user.id };
      const { data, error } = await supabase.from('budgets').insert(bPayload).select().single();
      if (!error && data) {
        setStoredBudgets(prev => prev.map(budg => budg.id === tempId ? { ...budg, ...data } : budg));
      } else {
        console.error("Budget ekleme hatası:", error);
        alert(`Veritabanına kaydedilemedi (Budgets): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateBudget = async (id: string, updatedBudget: Omit<Budget, 'id'>) => {
    setStoredBudgets(prev => prev.map(b => b.id === id ? { ...updatedBudget, id } : b));
    if (user) {
      const bPayload = { category: updatedBudget.category, limit: updatedBudget.limit };
      const { error } = await supabase.from('budgets').update(bPayload).eq('id', id).eq('user_id', user.id);
      if (error) alert(`Güncelleme hatası (Budgets): ${error.message}`);
    }
  };

  const deleteBudget = async (id: string) => {
    setStoredBudgets(prev => prev.filter(b => b.id !== id));
    if (user) {
      const { error } = await supabase.from('budgets').delete().eq('id', id).eq('user_id', user.id);
      if (error) alert(`Silme hatası (Budgets): ${error.message}`);
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
        alert(`Veritabanına kaydedilemedi (Investments): ${error?.message || 'Bilinmeyen hata'}`);
      }
    }
  };

  const updateInvestment = async (id: string, updatedInvestment: Omit<Investment, 'id'>) => {
    setInvestments(prev => prev.map(i => i.id === id ? { ...updatedInvestment, id } : i));
    if (user) {
      const { error } = await supabase.from('investments').update(updatedInvestment).eq('id', id).eq('user_id', user.id);
      if (error) alert(`Güncelleme hatası (Investments): ${error.message}`);
    }
  };

  const deleteInvestment = async (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    if (user) {
      const { error } = await supabase.from('investments').delete().eq('id', id).eq('user_id', user.id);
      if (error) alert(`Silme hatası (Investments): ${error.message}`);
    }
  };

  return (
    <FinanceContext.Provider value={{
      transactions, bills, netWorthHistory, investments, budgets,
      addTransaction, updateTransaction, deleteTransaction, 
      addBill, updateBill, payBill, undoBillPayment, deleteBill,
      addBudget, updateBudget, deleteBudget,
      addInvestment, updateInvestment, deleteInvestment,
      totalIncome, totalExpenses, currentNetWorth,
      onboardingDone, completeOnboarding, skipOnboarding,
      appTitle, setAppTitle, isLoadingData
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

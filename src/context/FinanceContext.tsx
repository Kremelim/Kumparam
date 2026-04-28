import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, Bill, NetWorthEntry, Investment, Budget, Category, Recurrence } from '../types';
import { addMonths, addQuarters, addYears, format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

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
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const initialTransactions: Transaction[] = [];
const initialBills: Bill[] = [];
const initialInvestments: Investment[] = [];
const initialBudgets: Budget[] = [];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadFromStorage = <T,>(key: string, _defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return _defaultValue;
  };

  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage('fin_transactions', initialTransactions));
  const [bills, setBills] = useState<Bill[]>(() => loadFromStorage('fin_bills', initialBills));
  const [investments, setInvestments] = useState<Investment[]>(() => loadFromStorage('fin_investments', initialInvestments));
  const [storedBudgets, setStoredBudgets] = useState<Budget[]>(() => loadFromStorage('fin_budgets', initialBudgets));
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => loadFromStorage('fin_onboarding', false));
  const [appTitle, setAppTitle] = useState<string>(() => loadFromStorage('fin_app_title', 'Finans Asistanım'));

  useEffect(() => {
    localStorage.setItem('fin_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fin_bills', JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem('fin_investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem('fin_budgets', JSON.stringify(storedBudgets));
  }, [storedBudgets]);

  useEffect(() => {
    localStorage.setItem('fin_onboarding', JSON.stringify(onboardingDone));
  }, [onboardingDone]);

  useEffect(() => {
    localStorage.setItem('fin_app_title', JSON.stringify(appTitle));
  }, [appTitle]);

  // Dynamic calculate spent for budgets based on current context
  const budgets: Budget[] = storedBudgets.map(b => ({
    ...b,
    spent: transactions.filter(t => t.category === b.category && t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  }));

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  const totalInvestments = investments.reduce((sum, inv) => sum + inv.value, 0);
  const currentNetWorth = (totalIncome - totalExpenses) + totalInvestments;

  // Generate history based on real net worth
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

    // Sort transactions by date ascending
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Group by month
    const groupedByMonth: { [key: string]: { income: number, expense: number } } = {};
    sortedTxs.forEach(t => {
      const monthKey = format(new Date(t.date), 'yyyy-MM');
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        groupedByMonth[monthKey].income += t.amount;
      } else {
        groupedByMonth[monthKey].expense += t.amount;
      }
    });

    const monthKeys = Object.keys(groupedByMonth).sort();
    
    // Make sure we include current month even if no transactions this month
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
    let cumulative = 0; // base running net income

    monthsList.forEach((mKey, idx) => {
       const mData = groupedByMonth[mKey] || { income: 0, expense: 0 };
       cumulative += (mData.income - mData.expense);
       
       // current total includes investments
       const totalInvestments = investments.reduce((sum, inv) => sum + inv.value, 0);
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
    const newTx: Transaction[] = [];
    if (salary > 0) newTx.push({ id: Math.random().toString(36).substr(2, 9), type: 'income', amount: salary, category: 'Maaş', merchant: 'İşveren', date: format(new Date(), 'yyyy-MM-dd'), notes: 'Başlangıç Maaşı' });
    if (rent > 0) newTx.push({ id: Math.random().toString(36).substr(2, 9), type: 'expense', amount: rent, category: 'Kira', merchant: 'Ev Sahibi', date: format(new Date(), 'yyyy-MM-dd') });
    
    setTransactions(prev => [...prev, ...newTx]);
    
    const newBudgets: Budget[] = [];
    if (rent > 0) newBudgets.push({ id: Math.random().toString(36).substr(2, 9), category: 'Kira', limit: rent, spent: 0 });
    if (billsValue > 0) newBudgets.push({ id: Math.random().toString(36).substr(2, 9), category: 'Faturalar', limit: billsValue, spent: 0 });
    
    setStoredBudgets(prev => [...prev, ...newBudgets]);
    setOnboardingDone(true);
  };

  const skipOnboarding = () => setOnboardingDone(true);

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...t, id: Math.random().toString(36).substr(2, 9) };
    setTransactions(prev => [...prev, newTx]);
  };

  const updateTransaction = (id: string, updatedTx: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...updatedTx, id } : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addBill = (b: Omit<Bill, 'id'>) => {
    const newBill: Bill = { ...b, id: Math.random().toString(36).substr(2, 9) };
    setBills(prev => [...prev, newBill]);
  };

  const updateBill = (id: string, updatedBill: Omit<Bill, 'id'>) => {
    setBills(prev => prev.map(b => b.id === id ? { ...updatedBill, id } : b));
  };

  const payBill = (id: string, amount: number, date: string) => {
    let txId = Math.random().toString(36).substr(2, 9);
    
    // Add transaction first
    setBills(prev => {
      const bill = prev.find(b => b.id === id);
      if (!bill) return prev;

      const updatedBills = prev.map(b => b.id === id ? { 
        ...b, 
        isPaid: true, 
        lastPaidDate: new Date().toISOString(),
        linkedTransactionId: txId
      } : b);

      if (bill.recurrence !== 'none') {
        const dueDateObj = parseISO(bill.dueDate);
        let nextDueDate = dueDateObj;
        if (bill.recurrence === 'monthly') nextDueDate = addMonths(dueDateObj, 1);
        else if (bill.recurrence === 'quarterly') nextDueDate = addQuarters(dueDateObj, 1);
        else if (bill.recurrence === 'yearly') nextDueDate = addYears(dueDateObj, 1);

        const nextBill: Bill = {
          ...bill,
          id: Math.random().toString(36).substr(2, 9),
          dueDate: format(nextDueDate, 'yyyy-MM-dd'),
          isPaid: false,
          lastPaidDate: undefined,
          linkedTransactionId: undefined
        };
        updatedBills.push(nextBill);
      }

      return updatedBills;
    });

    // Handle transaction addition outside of setBills callback
    const currentBills = bills;
    const billToPay = currentBills.find(b => b.id === id);
    if (billToPay) {
      const newTx: Transaction = {
        id: txId,
        type: 'expense',
        amount: amount,
        category: billToPay.category,
        merchant: billToPay.name,
        date: date,
        notes: 'Fatura Ödemesi'
      };
      setTransactions(prev => [...prev, newTx]);
    }
  };

  const undoBillPayment = (id: string) => {
    let txIdToDelete: string | undefined;

    setBills(prev => {
      const bill = prev.find(b => b.id === id);
      if (!bill) return prev;

      txIdToDelete = bill.linkedTransactionId;

      return prev.map(b => b.id === id ? {
        ...b,
        isPaid: false,
        lastPaidDate: undefined,
        linkedTransactionId: undefined
      } : b);
    });

    if (txIdToDelete) {
      deleteTransaction(txIdToDelete);
    }
  };

  const deleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const addBudget = (b: Omit<Budget, 'id'>) => {
    const newBudget: Budget = { ...b, id: Math.random().toString(36).substr(2, 9) };
    setStoredBudgets(prev => [...prev, newBudget]);
  };

  const updateBudget = (id: string, updatedBudget: Omit<Budget, 'id'>) => {
    setStoredBudgets(prev => prev.map(b => b.id === id ? { ...updatedBudget, id } : b));
  };

  const deleteBudget = (id: string) => {
    setStoredBudgets(prev => prev.filter(b => b.id !== id));
  };

  const addInvestment = (i: Omit<Investment, 'id'>) => {
    const newInv: Investment = { ...i, id: Math.random().toString(36).substr(2, 9) };
    setInvestments(prev => [...prev, newInv]);
  };

  const updateInvestment = (id: string, updatedInvestment: Omit<Investment, 'id'>) => {
    setInvestments(prev => prev.map(i => i.id === id ? { ...updatedInvestment, id } : i));
  };

  const deleteInvestment = (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
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
      appTitle, setAppTitle
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

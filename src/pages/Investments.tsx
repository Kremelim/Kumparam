import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TrendingUp, Plus, Edit2, Trash2, X, Activity } from 'lucide-react';
import { Investment, InvestmentTx } from '../types';
import { format } from 'date-fns';

export const Investments: React.FC = () => {
  const { investments, addInvestment, updateInvestment, deleteInvestment, addTransaction } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedInvForTx, setSelectedInvForTx] = useState<Investment | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Nema / PPF',
  });

  const [txFormData, setTxFormData] = useState({
    type: 'gain', // gain, loss, deposit, withdrawal
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const totalInvestmentValue = investments.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  const handleOpenModal = (inv?: Investment) => {
    if (inv) {
      setEditingInvestment(inv);
      setFormData({
        name: inv.name,
        type: inv.type,
      });
    } else {
      setEditingInvestment(null);
      setFormData({
        name: '',
        type: 'Nema / PPF',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInvestment(null);
  };

  const handleOpenTxModal = (inv: Investment) => {
    setSelectedInvForTx(inv);
    setTxFormData({
      type: 'gain',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setIsTxModalOpen(true);
  };

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingInvestment) {
      updateInvestment(editingInvestment.id, {
        name: formData.name,
        type: formData.type as any,
        balance: editingInvestment.balance || 0,
        totalInvested: editingInvestment.totalInvested || 0,
        transactions: editingInvestment.transactions || []
      });
    } else {
      addInvestment({
        name: formData.name,
        type: formData.type as any,
        balance: 0,
        totalInvested: 0,
        transactions: []
      });
    }
    handleCloseModal();
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvForTx) return;

    const amountNum = parseFloat(txFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const newTx: InvestmentTx = {
      id: Date.now().toString(),
      type: txFormData.type as any,
      amount: amountNum,
      date: txFormData.date
    };

    let newBalance = selectedInvForTx.balance || 0;
    let newInvested = selectedInvForTx.totalInvested || 0;

    if (newTx.type === 'deposit') {
      newBalance += amountNum;
      newInvested += amountNum;
      
      // Transfer money from liquid cash to investment account automatically
      addTransaction({
        type: 'expense',
        amount: amountNum,
        category: 'Yatırım',
        merchant: `${selectedInvForTx.name} Transfer`,
        date: txFormData.date,
        notes: 'Portföy Transferi'
      });
      
    } else if (newTx.type === 'withdrawal') {
      newBalance -= amountNum;
      newInvested -= amountNum; // approximate approach
      
      // Transfer money back to liquid cash
      addTransaction({
        type: 'income',
        amount: amountNum,
        category: 'Yatırım',
        merchant: `${selectedInvForTx.name} Çıkış`,
        date: txFormData.date,
        notes: 'Portföyden Nakite Transfer'
      });
      
    } else if (newTx.type === 'gain') {
      newBalance += amountNum;
    } else if (newTx.type === 'loss') {
      newBalance -= amountNum;
    }

    const updatedTxs = [...(selectedInvForTx.transactions || []), newTx];

    updateInvestment(selectedInvForTx.id, {
      ...selectedInvForTx,
      balance: newBalance,
      totalInvested: newInvested,
      transactions: updatedTxs
    });

    setIsTxModalOpen(false);
  };

  // Helper to calculate total profit for a specific asset
  const calculateProfit = (inv: Investment) => {
    return (inv.balance || 0) - (inv.totalInvested || 0);
  };

  const calculateProfitPercent = (inv: Investment) => {
    if (!inv.totalInvested) return 0;
    return (calculateProfit(inv) / inv.totalInvested) * 100;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-sm relative overflow-hidden flex items-center justify-between">
        <div className="absolute right-0 top-0 text-slate-800 opacity-50 transform translate-x-1/4 -translate-y-1/4">
          <TrendingUp className="w-48 h-48" />
        </div>
        <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-slate-400 mb-1 text-xs font-semibold uppercase tracking-wider">Toplam Yatırım / Portföy</p>
            <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(totalInvestmentValue)}</h2>
            <p className="text-[10px] text-emerald-400 mt-1 font-medium bg-emerald-900/40 inline-block px-2 py-1 rounded">Ana Sayfada Net Değerinize Anlık Yansır</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded font-bold text-xs hover:bg-emerald-500 transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1" /> Portföy Hesabı Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {investments.map((inv) => {
          const profit = calculateProfit(inv);
          const profitPct = calculateProfitPercent(inv);
          const isProfitable = profit >= 0;

          return (
          <div key={inv.id} className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{inv.type}</p>
                <h3 className="text-lg font-bold text-slate-900">{inv.name}</h3>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenModal(inv)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDeleteConfirm(inv.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Güncel Bakiye</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(inv.balance || 0)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Toplam Kar/Zarar</p>
                <p className={`text-lg font-bold flex items-center ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isProfitable ? '+' : '-'}{formatCurrency(Math.abs(profit))}
                  <span className="text-[10px] ml-1">({isProfitable ? '+' : '-'}{Math.abs(profitPct).toFixed(2)}%)</span>
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => handleOpenTxModal(inv)}
                className="flex-1 py-1.5 bg-slate-100 text-slate-800 rounded text-xs font-bold hover:bg-slate-200 transition flex justify-center items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" /> Nema / Kâr / Zarar Gir
              </button>
            </div>

            {deleteConfirm === inv.id && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 rounded-xl border border-rose-200">
                <p className="font-bold text-rose-600 mb-2 text-sm text-center">Bu hesabı kalıcı olarak silmek istiyor musunuz?</p>
                <div className="flex gap-2 w-full max-w-[200px]">
                   <button onClick={() => { deleteInvestment(inv.id); setDeleteConfirm(null); }} className="flex-1 bg-rose-600 text-white px-3 py-2 rounded text-xs font-bold">Evet</button>
                   <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-slate-200 text-slate-700 px-3 py-2 rounded text-xs font-bold">İptal</button>
                </div>
              </div>
            )}
          </div>
        )})}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingInvestment ? 'Portföy Düzenle' : 'Yeni Portföy / Hesap'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveInfo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hesap Adı</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: Garanti Hisse, Akbank PPF Fon"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hesap Türü</label>
                <select 
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400 bg-white"
                >
                  <option value="Hisse Senedi">Hisse Senedi</option>
                  <option value="Nema / PPF">PPF / Nema / Faiz Hesabı</option>
                  <option value="Kripto">Kripto</option>
                  <option value="Döviz">Döviz</option>
                  <option value="Altın">Altın</option>
                  <option value="Fon">Yatırım Fonu</option>
                  <option value="Diğer">Diğer Yatırım</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded hover:bg-slate-50">
                  İptal
                </button>
                <button type="submit" className="flex-1 py-2 text-xs font-bold text-white bg-slate-900 rounded hover:bg-slate-800">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTxModalOpen && selectedInvForTx && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 truncate pr-4">
                {selectedInvForTx.name}
              </h3>
              <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTx} className="p-5 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">İşlem Türü</label>
                <select 
                  required
                  value={txFormData.type}
                  onChange={(e) => setTxFormData({ ...txFormData, type: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="gain">Getiri Ekle (Nema, Al/Sat Kârı vb.)</option>
                  <option value="deposit">Anapara Transferi (Yatırım Hesabına Para Ekle)</option>
                  <option value="loss">Zarar Ekle (Değer Kaybı)</option>
                  <option value="withdrawal">Para Çek (Hesaptan Nakite Transfer)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Getiri veya Zarar sadece yatırım değerini etkiler. "Anapara / Para Çek" işlemleri ise nakit bakiyenizle (gider/gelir) otomatik senkronize olur.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">İşlem Tutarı (TL)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={txFormData.amount}
                  onChange={(e) => setTxFormData({ ...txFormData, amount: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tarih</label>
                <input 
                  type="date" 
                  required
                  value={txFormData.date}
                  onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsTxModalOpen(false)} className="flex-1 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded hover:bg-slate-50">
                  İptal
                </button>
                <button type="submit" className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700">
                  Kaydet ve Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

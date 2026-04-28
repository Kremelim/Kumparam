import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, subDays, isAfter, isWithinInterval, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Transaction } from '../types';

export const Transactions: React.FC = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    merchant: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const handleOpenModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTx(tx);
      setFormData({
        type: tx.type,
        amount: tx.amount.toString(),
        category: tx.category,
        merchant: tx.merchant,
        date: tx.date,
        notes: tx.notes || ''
      });
    } else {
      setEditingTx(null);
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        merchant: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (editingTx) {
      updateTransaction(editingTx.id, {
        ...formData,
        amount: amountNum
      });
    } else {
      addTransaction({
        ...formData,
        amount: amountNum
      });
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      deleteTransaction(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchMerchant = t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchMerchant) return false;

    const tDate = parseISO(t.date);
    const today = new Date();

    if (dateFilter === '7days') {
      return isAfter(tDate, subDays(today, 7));
    } else if (dateFilter === '30days') {
      return isAfter(tDate, subDays(today, 30));
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return isWithinInterval(tDate, { start: new Date(customStartDate), end: new Date(customEndDate) });
    }

    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
          <div className="font-bold text-slate-900 w-full sm:w-auto">İşlem Geçmişi</div>
          <div className="flex gap-2 w-full sm:w-auto items-center">
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Yeni
            </button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Mağaza ara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs border border-slate-200 rounded px-8 py-1.5 w-full sm:w-48 focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none bg-slate-50 font-medium text-slate-700"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="7days">Son 7 Gün</option>
              <option value="30days">Son 30 Gün</option>
              <option value="custom">Özel Aralık</option>
            </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 mb-4">
            <input 
              type="date" 
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input 
              type="date" 
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-[10px] text-slate-400 border-b border-slate-50 uppercase font-bold">
              <th className="pb-2">Tarih</th>
              <th className="pb-2">İşlem</th>
              <th className="pb-2 text-right">Tutar</th>
              <th className="pb-2 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                  Kriterlere uygun işlem bulunamadı.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 text-slate-500 text-xs">
                    {format(parseISO(tx.date), 'd MMM yyyy', { locale: tr })}
                  </td>
                  <td className="py-2.5">
                    <p className="font-semibold text-slate-900">{tx.merchant}</p>
                    <p className="text-[10px] text-slate-400">{tx.category}</p>
                  </td>
                  <td className={`py-2.5 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+ ' : '- '}{formatCurrency(tx.amount)}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deleteConfirm === tx.id ? (
                        <div className="flex items-center gap-2 bg-rose-50 px-2 py-1 rounded">
                          <span className="text-[10px] text-rose-600 font-bold">Emin misiniz?</span>
                          <button onClick={() => { deleteTransaction(tx.id); setDeleteConfirm(null); }} className="text-rose-600 hover:text-rose-700 font-bold text-xs p-1">Evet</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1">Hayır</button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleOpenModal(tx)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingTx ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    checked={formData.type === 'expense'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'expense' })}
                    className="accent-rose-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Gider</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    checked={formData.type === 'income'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' })}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Gelir</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tutar</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
                <input 
                  type="text" 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: Market, Kira, Maaş"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mağaza / Firma / Kurum</label>
                <input 
                  type="text" 
                  required
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tarih</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                />
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
    </div>
  );
};

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
  const [typeFilter, setTypeFilter] = useState<'all' | 'cc_unpaid' | 'cc_paid'>('all');
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
    notes: '',
    isCC: false,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    isPaid: false
  });

  const parseNotes = (notes?: string) => {
    if (!notes) return { isCC: false, dueDate: '', isPaid: false, actualNote: '' };
    const parts = notes.split('|');
    if (parts[0] === 'CC' && parts.length >= 4) {
      return { isCC: true, dueDate: parts[1], isPaid: parts[2] === '1', actualNote: parts.slice(3).join('|') };
    }
    return { isCC: false, dueDate: '', isPaid: false, actualNote: notes };
  };

  const handleOpenModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTx(tx);
      const parsed = parseNotes(tx.notes);
      setFormData({
        type: tx.type,
        amount: tx.amount.toString(),
        category: tx.category,
        merchant: tx.merchant,
        date: tx.date,
        notes: parsed.actualNote,
        isCC: parsed.isCC,
        dueDate: parsed.dueDate,
        isPaid: parsed.isPaid
      });
    } else {
      setEditingTx(null);
      const today = new Date();
      let defaultDueDate = new Date(today.getFullYear(), today.getMonth(), 14);
      if (today.getDate() > 14) {
        defaultDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 14);
      }
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        merchant: '',
        date: format(today, 'yyyy-MM-dd'),
        notes: '',
        isCC: true,
        dueDate: format(defaultDueDate, 'yyyy-MM-dd'),
        isPaid: false
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

    let finalNotes = formData.notes;
    if (formData.type === 'expense' && formData.isCC) {
      finalNotes = `CC|${formData.dueDate}|${formData.isPaid ? '1' : '0'}|${formData.notes}`;
    }

    const payload = {
      type: formData.type,
      amount: amountNum,
      category: formData.category as any,
      merchant: formData.merchant,
      date: formData.date,
      notes: finalNotes
    };

    if (editingTx) {
      updateTransaction(editingTx.id, payload);
    } else {
      addTransaction(payload);
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
    
    const parsed = parseNotes(t.notes);
    if (typeFilter === 'cc_unpaid') {
      if (!parsed.isCC || parsed.isPaid) return false;
    } else if (typeFilter === 'cc_paid') {
      if (!parsed.isCC || !parsed.isPaid) return false;
    }

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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none bg-slate-50 font-medium text-slate-700"
            >
              <option value="all">Tüm Tipler</option>
              <option value="cc_unpaid">Ödenmemiş Ekstre</option>
              <option value="cc_paid">Ödenmiş Ekstre</option>
            </select>

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
                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                       {tx.merchant}
                       {parseNotes(tx.notes).isCC && (
                         <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${parseNotes(tx.notes).isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                           {parseNotes(tx.notes).isPaid ? 'ÖDENDİ' : `K.KARTI (${format(parseISO(parseNotes(tx.notes).dueDate), 'd MMM', { locale: tr })})`}
                         </span>
                       )}
                    </p>
                    <p className="text-[10px] text-slate-400">{tx.category} {parseNotes(tx.notes).actualNote && ` • ${parseNotes(tx.notes).actualNote}`}</p>
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

              {formData.type === 'expense' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCC}
                      onChange={(e) => setFormData({ ...formData, isCC: e.target.checked })}
                      className="accent-slate-900 rounded"
                    />
                    <span className="text-sm font-bold text-slate-700">Kredi Kartı ile ödendi</span>
                  </label>
                  
                  {formData.isCC && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Son Ödeme Tarihi</label>
                        <input 
                          type="date" 
                          required={formData.isCC}
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <label className="flex flex-1 items-center gap-2 cursor-pointer mt-5">
                        <input
                          type="checkbox"
                          checked={formData.isPaid}
                          onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                          className="accent-slate-900 rounded"
                        />
                        <span className="text-sm font-medium text-slate-700">Ekstre Ödendi</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Açıklama / Ürün Sepeti (İsteğe bağlı)</label>
                <input 
                  type="text" 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: Market sepetindeki ürünler..."
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

import toast from "react-hot-toast";
import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, subDays, isAfter, isWithinInterval, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Search, Plus, Edit2, Trash2, X, Upload } from 'lucide-react';
import { Transaction } from '../types';
import { getCategoryColor } from '../lib/categories';
import { CategorySelect } from '../components/CategorySelect';

export const Transactions: React.FC = () => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | 'custom'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'cc_unpaid' | 'cc_paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
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
      if (today.getDate() > 4) {
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

  const handleImportSubmit = () => {
    // Very basic parsing for user pasting text like: "2023-10-15 150.50 Market alışverişi"
    const lines = importText.split('\n');
    let importedCount = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      // Extract numbers for amount, e.g. 150.50 or 150,50
      const matchAmount = line.match(/\b\d+([.,]\d+)?\b/);
      let amount = 0;
      if (matchAmount) {
         amount = parseFloat(matchAmount[0].replace(',', '.'));
      }
      
      // Extract basic date (YYYY-MM-DD or DD.MM.YYYY)
      const dateMatch = line.match(/\b(\d{4}-\d{2}-\d{2})\b/) || line.match(/\b(\d{2}\.\d{2}\.\d{4})\b/);
      let tDate = new Date();
      if (dateMatch) {
         if (dateMatch[0].includes('.')) {
            const [d, m, y] = dateMatch[0].split('.');
            tDate = new Date(`${y}-${m}-${d}`);
         } else {
            tDate = new Date(dateMatch[0]);
         }
      }
      
      if (amount > 0) {
        let calcDueDate = new Date(tDate.getFullYear(), tDate.getMonth(), 14);
        if (tDate.getDate() > 4) {
           calcDueDate = new Date(tDate.getFullYear(), tDate.getMonth() + 1, 14);
        }
        
        // Remove amount and date strings from description
        const descMatch = line.replace(matchAmount ? matchAmount[0] : '', '').replace(dateMatch ? dateMatch[0] : '', '').trim();
        const merchant = descMatch.substring(0, 30) || 'Otomatik Aktarım';

        addTransaction({
          type: 'expense',
          amount: amount,
          category: 'Diğer',
          merchant: merchant,
          date: format(tDate, 'yyyy-MM-dd'),
          notes: `CC|${format(calcDueDate, 'yyyy-MM-dd')}|0|Aktarıldı`
        });
        importedCount++;
      }
    }
    
    toast.success(`${importedCount} işlem başarıyla aktarıldı! İşlemler 'Kredi Kartı' olarak işaretlendi ve son ödeme tarihleri 4'ü - 14'ü kuralına göre ayarlandı.`);
    setIsImportModalOpen(false);
    setImportText('');
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
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    
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
  }).sort((a, b) => {
    if (sortOption === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortOption === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortOption === 'amount_desc') return b.amount - a.amount;
    if (sortOption === 'amount_asc') return a.amount - b.amount;
    return 0;
  });

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category))).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
          <div className="font-bold text-slate-900 w-full sm:w-auto">İşlem Geçmişi</div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 mr-1" /> PDF/Metin Aktar
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Yeni
            </button>
            <div className="relative flex-1 min-w-[120px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Mağaza ara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs border border-slate-200 rounded px-8 py-1.5 w-full focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none bg-slate-50 font-medium text-slate-700 w-full sm:w-auto"
            >
              <option value="all">Tüm Tipler</option>
              <option value="cc_unpaid">Ödenmemiş Ekstre</option>
              <option value="cc_paid">Ödenmiş Ekstre</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none bg-slate-50 font-medium text-slate-700 w-full sm:w-auto"
            >
              <option value="all">Tüm Kategoriler</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none bg-slate-50 font-medium text-slate-700 w-full sm:w-auto"
            >
              <option value="all">Tüm Zamanlar</option>
              <option value="7days">Son 7 Gün</option>
              <option value="30days">Son 30 Gün</option>
              <option value="custom">Özel Aralık</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none bg-slate-50 font-medium text-slate-700 w-full sm:w-auto"
            >
              <option value="date_desc">Tarih (Yeniye)</option>
              <option value="date_asc">Tarih (Eskiye)</option>
              <option value="amount_desc">Tutar (Azalan)</option>
              <option value="amount_asc">Tutar (Artan)</option>
            </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 mb-4 overflow-x-auto w-full pb-2">
            <input 
              type="date" 
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 min-w-[110px]"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input 
              type="date" 
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 min-w-[110px]"
            />
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left min-w-[500px]">
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
                    <p className="mt-1 flex items-center gap-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getCategoryColor(tx.category)}`}>{tx.category}</span>
                      {parseNotes(tx.notes).actualNote && <span className="text-[10px] text-slate-400 font-medium"> • {parseNotes(tx.notes).actualNote}</span>}
                    </p>
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
                <CategorySelect 
                  value={formData.category}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
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
                  onChange={(e) => {
                    const newDate = e.target.value;
                    let newDueDate = formData.dueDate;
                    const d = new Date(newDate);
                    if (!isNaN(d.getTime())) {
                       let calcDueDate = new Date(d.getFullYear(), d.getMonth(), 14);
                       if (d.getDate() > 4) {
                          calcDueDate = new Date(d.getFullYear(), d.getMonth() + 1, 14);
                       }
                       newDueDate = format(calcDueDate, 'yyyy-MM-dd');
                    }
                    setFormData({ ...formData, date: newDate, dueDate: newDueDate });
                  }}
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

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                Ekstre Aktar (Kopyala/Yapıştır)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Bankanızın PDF e-ekstresinden kopyaladığınız veya CSV formatındaki metni aşağıya yapıştırın. Sistem tutarları, tarihleri otomatik bulup "Kredi Kartı" olarak işlem tarihine (kesim: 4'ü, ödeme: 14'ü kuralına göre) ekleyecektir.
              </p>
              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={10}
                placeholder="Örnek:
2023-11-05 Market 150.50
12.11.2023 Tiyatro 450,00"
                className="w-full text-xs font-mono border border-slate-200 rounded p-3 focus:outline-none focus:border-indigo-500"
              />
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="flex-1 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded hover:bg-slate-50">
                  İptal
                </button>
                <button onClick={handleImportSubmit} className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-500">
                  Otomatik Aktar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

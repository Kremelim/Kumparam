import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, parseISO, isBefore, isSameDay, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle2, DollarSign, Wallet, TrendingUp, AlertCircle, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { Recurrence, RegularIncome } from '../types';
import { getCategoryColor } from '../lib/categories';
import { CategorySelect } from '../components/CategorySelect';

export const RegularIncomes: React.FC = () => {
  const { regularIncomes, addRegularIncome, updateRegularIncome, deleteRegularIncome, processRegularIncome, undoRegularIncomeProcess } = useFinance();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [riToProcess, setRiToProcess] = useState<RegularIncome | null>(null);
  const [processFormData, setProcessFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [editingRi, setEditingRi] = useState<RegularIncome | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Maaş',
    dueDate: '',
    recurrence: 'monthly' as Recurrence
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const openProcessModal = (ri: RegularIncome) => {
    setRiToProcess(ri);
    setProcessFormData({
      amount: ri.amount.toString(),
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setIsProcessModalOpen(true);
  };

  const handleProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (riToProcess) {
      const amount = parseFloat(processFormData.amount);
      if (!isNaN(amount) && amount > 0) {
        processRegularIncome(riToProcess.id, amount, processFormData.date);
        setIsProcessModalOpen(false);
        setRiToProcess(null);
      }
    }
  };

  const getRecurrenceLabel = (r: Recurrence) => {
    switch (r) {
      case 'monthly': return 'Her Ay';
      case 'quarterly': return '3 Ayda Bir';
      case 'yearly': return 'Her Yıl';
      default: return 'Tek Seferlik';
    }
  };

  const getIcon = (category: string) => {
    if (category === 'Maaş') return <Wallet className="w-4 h-4" />;
    if (category === 'Yatırım') return <TrendingUp className="w-4 h-4" />;
    return <DollarSign className="w-4 h-4" />;
  };

  const handleOpenModal = (ri?: RegularIncome) => {
    if (ri) {
      setEditingRi(ri);
      setFormData({
        name: ri.name,
        amount: ri.amount.toString(),
        category: ri.category,
        dueDate: ri.dueDate,
        recurrence: ri.recurrence
      });
    } else {
      setEditingRi(null);
      setFormData({
        name: '',
        amount: '',
        category: 'Maaş',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        recurrence: 'monthly'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRi(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (editingRi) {
      updateRegularIncome(editingRi.id, {
        ...formData,
        amount: amountNum,
        isProcessed: editingRi.isProcessed,
        lastProcessedDate: editingRi.lastProcessedDate
      });
    } else {
      addRegularIncome({
        ...formData,
        amount: amountNum,
        isProcessed: false
      });
    }
    handleCloseModal();
  };

  const sortedRis = [...regularIncomes].sort((a, b) => {
    if (a.isProcessed === b.isProcessed) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return a.isProcessed ? 1 : -1;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900">Düzenli Gelirler (Nema/Burs vb.)</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-tight">
               {regularIncomes.filter(r => !r.isProcessed).length} Bekleyen
            </span>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-500 transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Yeni Gelir
          </button>
        </div>
        
        <div className="space-y-3">
          {sortedRis.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm flex flex-col items-center">
              <RefreshCw className="w-8 h-8 text-slate-300 mb-3" />
              <p>Kayıtlı düzenli gelir (ör: Burs, Kira, Nema) bulunmamaktadır.</p>
            </div>
          ) : (
            sortedRis.map((ri) => {
              const riDate = parseISO(ri.dueDate);
              const today = new Date();
              const isOverdue = !ri.isProcessed && isBefore(riDate, today) && !isSameDay(riDate, today);
              const daysLeft = differenceInDays(riDate, today);

              return (
                <div key={ri.id} className={cn("group flex items-center p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors", ri.isProcessed && "opacity-60 bg-slate-50")}>
                  <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center mr-3",
                    ri.isProcessed ? "bg-slate-200 text-slate-500" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {getIcon(ri.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={cn("text-sm font-bold truncate flex items-center gap-2", ri.isProcessed ? "text-slate-500 line-through" : "text-emerald-900")}>
                      {ri.name}
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${getCategoryColor(ri.category)} no-underline`}>{ri.category}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Tarih: {format(riDate, 'd MMM yyyy', { locale: tr })} &bull; Tekerrür: {getRecurrenceLabel(ri.recurrence)}
                    </p>
                  </div>
                  
                  <div className="text-right flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", ri.isProcessed ? "text-slate-500" : "text-slate-900")}>
                        +{formatCurrency(ri.amount)}
                      </p>
                      {!ri.isProcessed ? (
                        isOverdue ? (
                          <p className="text-[10px] text-rose-600 font-bold flex items-center justify-end">
                            <AlertCircle className="w-3 h-3 mr-0.5" /> Günü Geçti
                          </p>
                        ) : (
                          <p className={cn("text-[10px] font-bold", daysLeft <= 3 ? "text-emerald-500" : "text-slate-400")}>
                            {daysLeft === 0 ? "Bugün" : `${daysLeft} Gün Kaldı`}
                          </p>
                        )
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> İşlendi
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {!ri.isProcessed ? (
                        <button
                          onClick={() => openProcessModal(ri)}
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-100"
                          title="İşlendi Olarak İşaretle (Bakiyeye Ekle)"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => undoRegularIncomeProcess(ri.id)}
                          className="p-1.5 text-slate-400 bg-slate-100 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors border border-slate-200"
                          title="Geri Al"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 ml-2">
                        {deleteConfirm === ri.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 px-2 rounded">
                            <span className="text-[10px] text-rose-600 font-bold">Sil?</span>
                            <button onClick={() => { deleteRegularIncome(ri.id); setDeleteConfirm(null); }} className="text-rose-600 hover:text-rose-700 font-bold text-[10px] p-1">Evet</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 hover:text-slate-600 font-bold text-[10px] p-1">Hayır</button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleOpenModal(ri)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(ri.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ek/Düzenle Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingRi ? 'Geliri Düzenle' : 'Yeni Düzenli Gelir (Burs/Nema vb.)'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Gelir Adı</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: KYK Bursu, Kira Geliri, Yatırım Neması"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tutar (Beklenen)</label>
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
                <label className="block text-xs font-bold text-slate-500 mb-1">Tarih</label>
                <input 
                  type="date" 
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tekerrür (Yenilenme)</label>
                <select 
                  value={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as Recurrence })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                >
                  <option value="none">Tek Seferlik</option>
                  <option value="monthly">Her Ay</option>
                  <option value="quarterly">3 Ayda Bir</option>
                  <option value="yearly">Her Yıl</option>
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

      {/* İşleme Modalı */}
      {isProcessModalOpen && riToProcess && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Geliri İşle</h3>
              <button onClick={() => { setIsProcessModalOpen(false); setRiToProcess(null); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleProcess} className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">{riToProcess.name}</p>
                <p className="text-xs text-slate-500">Hesaba yatacak kesinleşmiş tutarı onaylayın.</p>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tutar (₺)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={processFormData.amount}
                  onChange={(e) => setProcessFormData({ ...processFormData, amount: e.target.value })}
                  className="w-full text-lg font-bold border border-slate-200 rounded p-2 focus:outline-none focus:border-emerald-500 text-emerald-600 bg-emerald-50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">İşlem Tarihi</label>
                <input 
                  type="date" 
                  required
                  value={processFormData.date}
                  onChange={(e) => setProcessFormData({ ...processFormData, date: e.target.value })}
                  className="w-full text-sm font-medium border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => { setIsProcessModalOpen(false); setRiToProcess(null); }} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded hover:bg-slate-50">
                  İptal
                </button>
                <button type="submit" className="flex-[2] flex items-center justify-center py-2.5 text-xs font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> İşçlem Olarak Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

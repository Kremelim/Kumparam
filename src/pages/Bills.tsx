import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { format, parseISO, isBefore, isSameDay, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle2, Zap, Wifi, Droplets, Home, FileText, AlertCircle, Plus, Edit2, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Recurrence, Bill } from '../types';
import { getCategoryColor } from '../lib/categories';
import { CategorySelect } from '../components/CategorySelect';

export const Bills: React.FC = () => {
  const { bills, addBill, updateBill, deleteBill, payBill, undoBillPayment } = useFinance();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [billToPay, setBillToPay] = useState<Bill | null>(null);
  const [payFormData, setPayFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    dueDate: '',
    recurrence: 'monthly' as Recurrence
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const openPayModal = (bill: Bill) => {
    setBillToPay(bill);
    setPayFormData({
      amount: bill.amount.toString(),
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setIsPayModalOpen(true);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (billToPay) {
      const amount = parseFloat(payFormData.amount);
      if (!isNaN(amount) && amount > 0) {
        payBill(billToPay.id, amount, payFormData.date);
        setIsPayModalOpen(false);
        setBillToPay(null);
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

  const getIcon = (name: string, category: string) => {
    const n = name.toLowerCase();
    if (n.includes('elektrik')) return <Zap className="w-4 h-4" />;
    if (n.includes('su')) return <Droplets className="w-4 h-4" />;
    if (n.includes('internet') || n.includes('telekom')) return <Wifi className="w-4 h-4" />;
    if (category === 'Kira') return <Home className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const handleOpenModal = (b?: Bill) => {
    if (b) {
      setEditingBill(b);
      setFormData({
        name: b.name,
        amount: b.amount.toString(),
        category: b.category,
        dueDate: b.dueDate,
        recurrence: b.recurrence
      });
    } else {
      setEditingBill(null);
      setFormData({
        name: '',
        amount: '',
        category: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        recurrence: 'monthly'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBill(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (editingBill) {
      updateBill(editingBill.id, {
        ...formData,
        amount: amountNum,
        isPaid: editingBill.isPaid,
        lastPaidDate: editingBill.lastPaidDate
      });
    } else {
      addBill({
        ...formData,
        amount: amountNum,
        isPaid: false
      });
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu faturayı silmek istediğinize emin misiniz?')) {
      deleteBill(id);
    }
  };

  const sortedBills = [...bills].sort((a, b) => {
    if (a.isPaid === b.isPaid) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return a.isPaid ? 1 : -1;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900">Faturalar & Abonelikler</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-tight">
               {bills.filter(b => !b.isPaid).length} Bekleyen
            </span>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Yeni
          </button>
        </div>
        
        <div className="space-y-3">
          {sortedBills.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm">
              Kayıtlı fatura bulunmamaktadır.
            </div>
          ) : (
            sortedBills.map((bill) => {
              const billDate = parseISO(bill.dueDate);
              const today = new Date();
              const isOverdue = !bill.isPaid && isBefore(billDate, today) && !isSameDay(billDate, today);
              const daysLeft = differenceInDays(billDate, today);

              return (
                <div key={bill.id} className={cn("group flex items-center p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors", bill.isPaid && "opacity-60 bg-slate-50")}>
                  <div className={cn(
                    "w-8 h-8 rounded flex items-center justify-center mr-3",
                    bill.isPaid ? "bg-slate-200 text-slate-500" : "bg-blue-100 text-blue-600"
                  )}>
                    {getIcon(bill.name, bill.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={cn("text-sm font-bold truncate flex items-center gap-2", bill.isPaid ? "text-slate-500 line-through" : "text-slate-900")}>
                      {bill.name}
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${getCategoryColor(bill.category)} no-underline`}>{bill.category}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Son Ödeme: {format(billDate, 'd MMM yyyy', { locale: tr })} &bull; Tekerrür: {getRecurrenceLabel(bill.recurrence)}
                    </p>
                  </div>
                  
                  <div className="text-right flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", bill.isPaid ? "text-slate-500" : "text-slate-900")}>
                        {formatCurrency(bill.amount)}
                      </p>
                      {!bill.isPaid ? (
                        isOverdue ? (
                          <p className="text-[10px] text-rose-600 font-bold flex items-center justify-end">
                            <AlertCircle className="w-3 h-3 mr-0.5" /> Gecikti
                          </p>
                        ) : (
                          <p className={cn("text-[10px] font-bold", daysLeft <= 3 ? "text-orange-500" : "text-slate-400")}>
                            {daysLeft === 0 ? "Bugün" : `${daysLeft} Gün Kaldı`}
                          </p>
                        )
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-end">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Ödendi
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {!bill.isPaid ? (
                        <button
                          onClick={() => openPayModal(bill)}
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-100"
                          title="Ödendi İşaretle"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => undoBillPayment(bill.id)}
                          className="p-1.5 text-slate-400 bg-slate-100 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors border border-slate-200"
                          title="Ödemeyi Geri Al"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 ml-2">
                        {deleteConfirm === bill.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 px-2 rounded">
                            <span className="text-[10px] text-rose-600 font-bold">Sil?</span>
                            <button onClick={() => { deleteBill(bill.id); setDeleteConfirm(null); }} className="text-rose-600 hover:text-rose-700 font-bold text-[10px] p-1">Evet</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 hover:text-slate-600 font-bold text-[10px] p-1">Hayır</button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleOpenModal(bill)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(bill.id)}
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingBill ? 'Faturayı Düzenle' : 'Yeni Fatura Ekle'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Fatura Adı</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: Elektrik Faturası"
                />
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
                <label className="block text-xs font-bold text-slate-500 mb-1">Son Ödeme Tarihi</label>
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

      {isPayModalOpen && billToPay && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Fatura Ödemesi</h3>
              <button onClick={() => { setIsPayModalOpen(false); setBillToPay(null); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePay} className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">{billToPay.name}</p>
                <p className="text-xs text-slate-500">Bu ayki tutarı onaylayın veya değiştirin.</p>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Tutar (₺)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={payFormData.amount}
                  onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                  className="w-full text-lg font-bold border border-slate-200 rounded p-2 focus:outline-none focus:border-emerald-500 text-emerald-600 bg-emerald-50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Ödeme Tarihi</label>
                <input 
                  type="date" 
                  required
                  value={payFormData.date}
                  onChange={(e) => setPayFormData({ ...payFormData, date: e.target.value })}
                  className="w-full text-sm font-medium border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => { setIsPayModalOpen(false); setBillToPay(null); }} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded hover:bg-slate-50">
                  İptal
                </button>
                <button type="submit" className="flex-[2] flex items-center justify-center py-2.5 text-xs font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Öde ve Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

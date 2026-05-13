import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Budget } from '../types';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export const BudgetPage: React.FC = () => {
  const { budgets, transactions, addBudget, updateBudget, deleteBudget } = useFinance();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    category: '',
    limit: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Compute the budget usage for the current selected month
  const displayBudgets = useMemo(() => {
    return budgets.map(b => {
      const spent = transactions
        .filter(t => t.category === b.category && t.type === 'expense')
        .filter(t => {
          const tDate = parseISO(t.date);
          return isWithinInterval(tDate, { start: monthStart, end: monthEnd });
        })
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...b, spent };
    });
  }, [budgets, transactions, monthStart, monthEnd]);

  const handleOpenModal = (b?: Budget) => {
    if (b) {
      setEditingBudget(b);
      setFormData({
        category: b.category,
        limit: b.limit.toString()
      });
    } else {
      setEditingBudget(null);
      setFormData({
        category: '',
        limit: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(formData.limit);
    if (isNaN(limitNum) || limitNum <= 0 || !formData.category) return;

    if (editingBudget) {
      updateBudget(editingBudget.id, {
        category: formData.category,
        limit: limitNum,
        spent: 0 // Will be dynamically computed
      });
    } else {
      addBudget({
        category: formData.category,
        limit: limitNum,
        spent: 0
      });
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu bütçeyi silmek istediğinize emin misiniz?')) {
      deleteBudget(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900">Kategori Bütçeleri</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700 w-24 text-center">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </span>
            <button onClick={handleNextMonth} className="p-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Yeni
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayBudgets.length === 0 ? (
            <div className="col-span-full text-center p-8 text-slate-500 text-sm">
              Kayıtlı bütçe bulunmamaktadır.
            </div>
          ) : (
            displayBudgets.map((budget) => {
              const progress = Math.min((budget.spent / budget.limit) * 100, 100);
              const isOverBudget = budget.spent > budget.limit;
              const isNearLimit = progress > 80 && !isOverBudget;
              
              let barColorClass = "bg-emerald-400";
              if (isOverBudget) barColorClass = "bg-rose-500";
              else if (isNearLimit) barColorClass = "bg-orange-400";

              return (
                <div key={budget.id} className="group relative border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-colors">
                  <div className="flex justify-between text-xs mb-1.5 flex-wrap gap-2">
                    <span className="font-semibold text-slate-900">{budget.category}</span>
                    <span className="text-slate-500">
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                      {isOverBudget && <span className="text-rose-600 font-bold ml-2">(Aşıldı)</span>}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`${barColorClass} h-full transition-all duration-1000`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] flex justify-between font-medium items-center h-5">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deleteConfirm === budget.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 px-1 rounded absolute -bottom-1 -left-1">
                          <span className="text-[9px] text-rose-600 font-bold">Sil?</span>
                          <button onClick={() => { deleteBudget(budget.id); setDeleteConfirm(null); }} className="text-rose-600 hover:text-rose-700 font-bold px-1">Evet</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 hover:text-slate-600 font-bold px-1">Hayır</button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleOpenModal(budget)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(budget.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    {!isOverBudget ? (
                      <span className="text-slate-400 ml-auto">{formatCurrency(budget.limit - budget.spent)} kaldı</span>
                    ) : (
                      <span className="text-rose-500 ml-auto">{formatCurrency(budget.spent - budget.limit)} fazla harcandı</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingBudget ? 'Bütçeyi Düzenle' : 'Yeni Bütçe Ekle'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategori</label>
                <input 
                  type="text" 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: Market"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Aylık Limit</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
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

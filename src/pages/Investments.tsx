import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Investment } from '../types';

export const Investments: React.FC = () => {
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    value: '',
    changePercent: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.value, 0);

  const handleOpenModal = (inv?: Investment) => {
    if (inv) {
      setEditingInvestment(inv);
      setFormData({
        name: inv.name,
        type: inv.type,
        value: inv.value.toString(),
        changePercent: inv.changePercent.toString()
      });
    } else {
      setEditingInvestment(null);
      setFormData({
        name: '',
        type: '',
        value: '',
        changePercent: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInvestment(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const valueNum = parseFloat(formData.value);
    const changeNum = parseFloat(formData.changePercent);
    if (isNaN(valueNum) || valueNum < 0 || isNaN(changeNum)) return;

    if (editingInvestment) {
      updateInvestment(editingInvestment.id, {
        name: formData.name,
        type: formData.type,
        value: valueNum,
        changePercent: changeNum
      });
    } else {
      addInvestment({
        name: formData.name,
        type: formData.type,
        value: valueNum,
        changePercent: changeNum
      });
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu yatırımı silmek istediğinize emin misiniz?')) {
      deleteInvestment(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-sm relative overflow-hidden flex items-center justify-between">
        <div className="absolute right-0 top-0 text-slate-800 opacity-50 transform translate-x-1/4 -translate-y-1/4">
          <TrendingUp className="w-48 h-48" />
        </div>
        <div className="relative z-10 w-full flex justify-between items-center">
          <div>
            <p className="text-slate-400 mb-1 text-xs font-semibold uppercase tracking-wider">Toplam Yatırım Değeri</p>
            <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(totalInvestmentValue)}</h2>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded font-bold text-xs hover:bg-emerald-500 transition"
          >
            <Plus className="w-4 h-4 mr-1" /> Yeni
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investments.map((inv) => (
          <div key={inv.id} className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{inv.name}</p>
              <div className={`text-xs font-bold flex items-center gap-0.5 ${inv.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {inv.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{Math.abs(inv.changePercent)}%</span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(inv.value)}</p>
            
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-slate-400 font-medium">Tür: {inv.type}</p>
              
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                {deleteConfirm === inv.id ? (
                  <div className="flex items-center gap-1 bg-rose-50 px-2 rounded absolute right-2 bottom-2 z-20">
                    <span className="text-[10px] text-rose-600 font-bold">Sil?</span>
                    <button onClick={() => { deleteInvestment(inv.id); setDeleteConfirm(null); }} className="text-rose-600 hover:text-rose-700 font-bold text-[10px] p-1">Evet</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-slate-400 hover:text-slate-600 font-bold text-[10px] p-1">Hayır</button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleOpenModal(inv)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(inv.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">
                {editingInvestment ? 'Yatırımı Düzenle' : 'Yeni Yatırım Ekle'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Yatırım Adı</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: BIST 100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tür</label>
                <input 
                  type="text" 
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  placeholder="örn: Hisse Senedi"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mevcut Değer</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Değişim (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.changePercent}
                    onChange={(e) => setFormData({ ...formData, changePercent: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-slate-400"
                    placeholder="örn: 5.2 veya -2.1"
                  />
                </div>
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

import React, { useState } from 'react';
import { X, TrendingUp, Save, Check, Calculator, AlertCircle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface NemaSettingsModalProps {
  onClose: () => void;
}

export const NemaSettingsModal: React.FC<NemaSettingsModalProps> = ({ onClose }) => {
  const { nemaSettings, updateNemaSettings, totalNemaEarned, currentNetWorth, liquidCash } = useFinance();
  
  const [isEnabled, setIsEnabled] = useState(nemaSettings.isEnabled);
  const [annualGrossRate, setAnnualGrossRate] = useState(nemaSettings.annualGrossRate);
  const [taxRate, setTaxRate] = useState(nemaSettings.taxRate);
  const [startDate, setStartDate] = useState(nemaSettings.startDate || '');

  const netAnnualRate = annualGrossRate * (1 - taxRate / 100);
  const dailyRate = (netAnnualRate / 100) / 365;

  const estimatedDailyNema = Math.max(0, liquidCash) * dailyRate;

  const handleSave = () => {
    updateNemaSettings({
      isEnabled,
      annualGrossRate,
      taxRate,
      startDate: startDate || undefined
    });
    onClose();
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Nema Ayarları</h2>
              <p className="text-slate-400 text-sm">Günlük faiz ve getiri yapılandırması</p>
            </div>
          </div>
          <button onClick={onClose} className="relative z-10 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6 items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Nema (Faiz) Hesaplama</h3>
              <p className="text-xs text-slate-500">Mevcut nakitiniz için günlük olarak işletilir.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isEnabled} 
                onChange={(e) => setIsEnabled(e.target.checked)} 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className={`space-y-4 transition-opacity duration-300 ${!isEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Yıllık Brüt Faiz (%)
                </label>
                <div className="relative border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all bg-white">
                  <input
                    type="number"
                    value={annualGrossRate}
                    onChange={(e) => setAnnualGrossRate(Number(e.target.value))}
                    className="w-full px-4 py-2.5 outline-none font-semibold text-slate-800"
                    min="0"
                    step="0.1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 font-medium">
                    %
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Stopaj Oranı (%)
                </label>
                <div className="relative border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all bg-white">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-4 py-2.5 outline-none font-semibold text-slate-800"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 font-medium">
                    %
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Başlangıç Tarihi
              </label>
              <div className="relative border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all bg-white">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 outline-none font-semibold text-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Eğer boş bırakılırsa hesabın oluşturulduğu tarihten veya ilk işlemden itibaren hesaplanır.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
              <h4 className="flex items-center gap-2 font-bold text-amber-800 mb-2">
                <Calculator className="w-4 h-4" />
                Getiri Önizlemesi
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-amber-700/80 mb-1 font-medium">Net Yıllık Faiz</p>
                  <p className="text-sm font-bold text-amber-900">% {netAnnualRate.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-700/80 mb-1 font-medium">Tahmini Günlük Getiri*</p>
                  <p className="text-sm font-bold text-amber-900">+{formatCurrency(estimatedDailyNema)} / gün</p>
                </div>
              </div>
              <p className="text-[10px] text-amber-700/60 mt-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Şu anki {formatCurrency(Math.max(0, liquidCash))} nakit üzerinden hesaplanmıştır.
              </p>
            </div>
            
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition"
          >
            İptal
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

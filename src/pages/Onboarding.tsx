import React, { useState } from 'react';
import { Wallet, Settings, ArrowRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const Onboarding: React.FC = () => {
  const { completeOnboarding, skipOnboarding } = useFinance();
  const [salary, setSalary] = useState('');
  const [rent, setRent] = useState('');
  const [bills, setBills] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeOnboarding(
      parseFloat(salary) || 0,
      parseFloat(rent) || 0,
      parseFloat(bills) || 0
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="bg-slate-900 p-8 text-white text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Finansal Asistanınıza Hoş Geldiniz</h1>
          <p className="text-slate-400 text-sm">Başlamak için bize bazı temel bilgilerinizi verin. Böylece size özel bir başlangıç sunabiliriz.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Aylık Net Maaşınız / Geliriniz</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium whitespace-nowrap">₺</span>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Aylık Kira Gideriniz</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium whitespace-nowrap">₺</span>
                <input
                  type="number"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Ortalama Fatura Bütçeniz</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium whitespace-nowrap">₺</span>
                <input
                  type="number"
                  value={bills}
                  onChange={(e) => setBills(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors shadow-md"
            >
              Kaydet ve Başla <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={skipOnboarding}
              className="w-full flex items-center justify-center gap-2 text-slate-500 font-bold py-3.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Şimdilik Atla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

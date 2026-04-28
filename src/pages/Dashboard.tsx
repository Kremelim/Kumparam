import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { format, isSameMonth, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const { netWorthHistory, transactions, bills, currentNetWorth, investments } = useFinance();
  
  const previousNetWorth = netWorthHistory[netWorthHistory.length - 2]?.total || 0;
  const netWorthChange = currentNetWorth - previousNetWorth;
  const upcomingBills = bills.filter(b => !b.isPaid && new Date(b.dueDate) >= new Date()).slice(0, 3);
  const overdueBills = bills.filter(b => !b.isPaid && new Date(b.dueDate) < new Date());

  const currentMonthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), new Date()));
  const currentMonthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const currentMonthExpenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Net Varlık</p>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded cursor-help" title="Nakit Bakiye + Toplam Yatırımlar">Nedir?</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(currentNetWorth)}</p>
          </div>
          <div className="mt-3 text-xs font-medium">
            {netWorthChange >= 0 ? (
              <span className="text-emerald-600">↑ {formatCurrency(netWorthChange)} geçen aya göre</span>
            ) : (
              <span className="text-rose-600">↓ {formatCurrency(Math.abs(netWorthChange))} geçen aya göre</span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bu Ayki Gelir</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(currentMonthIncome)}</p>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3">Sadece cari ayın verileri</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bu Ayki Gider</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{formatCurrency(currentMonthExpenses)}</p>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3">Sadece cari ayın verileri</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-orange-100 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bekleyen Faturalar</p>
              {overdueBills.length > 0 && <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-bold uppercase tracking-tight">Geciken Var</span>}
            </div>
            
            <div className="mt-3 space-y-2 flex-1 overflow-y-auto">
              {overdueBills.length > 0 && (
                <p className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded inline-block">{overdueBills.length} gecikmiş: {formatCurrency(overdueBills.reduce((a,b)=>a+b.amount,0))}</p>
              )}
              {upcomingBills.map(b => (
                <div key={b.id} className="text-xs flex justify-between items-center text-slate-600 border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                  <span className="truncate mr-1 font-medium">{b.name}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(b.amount)}</span>
                </div>
              ))}
              {overdueBills.length === 0 && upcomingBills.length === 0 && (
                <p className="text-xs font-medium text-emerald-600">Planlanmış fatura yok.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Net Worth Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Net Varlık Trendi</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded-sm"></span> Artış</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-400 rounded-sm"></span> Azalış</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={netWorthHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  dy={10} 
                  textAnchor="middle"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                  tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}B ₺` : `₺${value}`}
                  width={60}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
                  formatter={(value: number) => [formatCurrency(value), 'Net Varlık']}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {netWorthHistory.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.change === 'decrease' ? '#fb7185' : '#34d399'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="col-span-12 lg:col-span-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Son İşlemler</h3>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            {transactions.slice(-5).reverse().map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-900">{tx.merchant}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{tx.category} • {format(parseISO(tx.date), 'd MMM', { locale: tr })}</p>
                </div>
                <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-8 font-medium">Henüz işlem bulunmuyor.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

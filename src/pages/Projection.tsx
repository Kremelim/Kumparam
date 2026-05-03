import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { Calculator, Calendar, Plus, Trash2, Settings, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { format, getDate, isLastDayOfMonth, startOfMonth, addDays, parseISO, addMonths, isAfter } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SimItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  day?: number;
  isOneTime?: boolean;
  oneTimeDate?: string;
  recurringMonths?: number; // 0 for infinite,  3, 6, 12, etc.
  createdAt?: string; // ISO date string when added, to calculate expiration
}

export const Projection: React.FC = () => {
  const { currentNetWorth, projectionItems: items, projectionSettings, addProjectionItem, updateProjectionItem, deleteProjectionItem, updateProjectionSettings } = useFinance();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const annualGrossRate = projectionSettings.annualGrossRate;
  const taxRate = projectionSettings.taxRate;
  const projectionPeriod = projectionSettings.projectionPeriod;

  const setAnnualGrossRate = (val: number) => updateProjectionSettings({ ...projectionSettings, annualGrossRate: val });
  const setTaxRate = (val: number) => updateProjectionSettings({ ...projectionSettings, taxRate: val });
  const setProjectionPeriod = (val: number) => updateProjectionSettings({ ...projectionSettings, projectionPeriod: val });

  const [newItem, setNewItem] = useState<Partial<SimItem>>({
    name: '', type: 'expense', amount: 0, day: 1, isOneTime: false, oneTimeDate: format(new Date(), 'yyyy-MM-dd'), recurringMonths: 0
  });

  const handleAddItem = () => {
    if (newItem.name && newItem.amount && (newItem.day || (newItem.isOneTime && newItem.oneTimeDate))) {
      addProjectionItem({ 
        name: newItem.name, 
        type: newItem.type as 'expense' | 'income', 
        amount: newItem.amount, 
        day: newItem.day, 
        isOneTime: newItem.isOneTime, 
        oneTimeDate: newItem.oneTimeDate, 
        recurringMonths: newItem.recurringMonths, 
        createdAt: format(new Date(), 'yyyy-MM-dd') 
      });
      setNewItem({ name: '', type: 'expense', amount: 0, day: 1, isOneTime: false, oneTimeDate: format(new Date(), 'yyyy-MM-dd'), recurringMonths: 0 });
    }
  };

  const handleItemChange = (id: string, field: keyof SimItem, value: string | number | boolean) => {
    const existing = items.find(i => i.id === id);
    if(existing) {
        updateProjectionItem(id, { ...existing, [field]: value });
    }
  };

  const deleteItem = (id: string) => deleteProjectionItem(id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', notation: 'compact', maximumFractionDigits: 0 }).format(amount);
  };

  const [chartData, setChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalInterest: 0, finalNetWorth: 0 });

  useEffect(() => {
    let cash = currentNetWorth;
    let totalInterest = 0;
    
    const chartPoints = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentSimDate = new Date(today);
    
    const effectiveDailyRate = (annualGrossRate / 100) * (1 - (taxRate / 100)) / 365;

    // Önbellek, hangi günlerde olay olduğunu hızlıca bilmek için (testere dişi grafiği net çizmek adına)
    const dateEventsCache = new Map<string, boolean>();
    const checkHasEvents = (date: Date) => {
       const key = format(date, 'yyyy-MM-dd');
       if (dateEventsCache.has(key)) return dateEventsCache.get(key)!;
       const dom = getDate(date);
       const evs = items.filter(item => {
            if (item.isOneTime && item.oneTimeDate) {
                return key === item.oneTimeDate;
            }
            if (item.day === dom) {
                if (item.recurringMonths && item.createdAt) {
                    const createdDate = parseISO(item.createdAt);
                    const expirationDate = addMonths(createdDate, item.recurringMonths);
                    if (isAfter(date, expirationDate)) {
                        return false;
                    }
                }
                return true;
            }
            return false;
       });
       const has = evs.length > 0;
       dateEventsCache.set(key, has);
       return has;
    };

    for (let i = 0; i <= projectionPeriod; i++) {
        // 1. Her gün için önceki günün bakiyesine günlük bileşik faiz (nema) uygulanır
        if (cash > 0) {
            const interest = cash * effectiveDailyRate;
            cash += interest;
            totalInterest += interest;
        }

        const dayOfMonth = getDate(currentSimDate);
        
        // 2. Bugün gerçekleşmesi gereken nakit akışları (Giren/Çıkan)
        const dayEvents = items.filter(item => {
            if (item.isOneTime && item.oneTimeDate) {
                return format(currentSimDate, 'yyyy-MM-dd') === item.oneTimeDate;
            }
            if (item.day === dayOfMonth) {
                if (item.recurringMonths && item.createdAt) {
                    const createdDate = parseISO(item.createdAt);
                    const expirationDate = addMonths(createdDate, item.recurringMonths);
                    if (isAfter(currentSimDate, expirationDate)) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        });
        
        // Önce gelirler eklensin (maaş yattığı gün kredi kartı da ödenebilsin diye)
        dayEvents.sort((a, b) => (a.type === 'income' ? -1 : 1) - (b.type === 'income' ? -1 : 1));
        
        dayEvents.forEach(ev => {
           if (ev.type === 'income') {
               cash += ev.amount;
           } else {
               cash -= ev.amount;
           }
        });
        
        // 3. Günlük grafiğe kayıt
        let shouldChart = false;
        
        // Testere dişi (sawtooth) grafiği kusursuz çizmek için:
        // - Başlangıç ve bitiş
        // - Olay olan günler (düşüş/çıkış sonrası)
        // - Olay olan günlerden BİR ÖNCEKİ günler (zirve noktaları)
        // - Ay sonları (genel seyri kaybetmemek için)
        if (i === 0 || i === projectionPeriod) {
            shouldChart = true;
        } else if (dayEvents.length > 0) {
            shouldChart = true;
        } else if (checkHasEvents(addDays(currentSimDate, 1))) {
            shouldChart = true;
        } else if (isLastDayOfMonth(currentSimDate)) {
            shouldChart = true;
        }

        if (shouldChart) {
            chartPoints.push({
                date: currentSimDate.getTime(),
                displayDate: format(currentSimDate, 'd MMMM yyyy, EEEE', { locale: tr }),
                bakiye: Math.round(cash),
                nema: Math.round(totalInterest),
            });
        }
        
        currentSimDate = addDays(currentSimDate, 1);
    }
    
    setChartData(chartPoints);
    setSummary({
        totalInterest,
        finalNetWorth: cash
    });
    
  }, [items, annualGrossRate, taxRate, currentNetWorth, projectionPeriod]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-500" />
          Akıllı Birikim & Nakit Akışı
        </h2>
        <p className="text-slate-500 text-sm">
          Maaş ve harcama döngünüzü günlük olarak simüle ederek gerçekçi faiz/nema getirinizi ve net varlık büyümenizi görün. Nema günü gününe işler, giderler anlık düşüş (testere dişi) yaratır.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sol Kolon: Nema Ayarları ve Toplam */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Seçili Dönem Tahmini Ek Getiri (Nema)</p>
              <h3 className="text-4xl font-black text-emerald-400 mb-1">
                +{formatCurrency(summary.totalInterest)}
              </h3>
              <p className="text-slate-300 text-sm mt-4 leading-relaxed font-medium">
                Gelirinizi Nema/PPF hesaplarında tutarak ve giderleri tam zamanında çıkarak elde edeceğiniz <strong className="text-white">ekstra net para</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" /> PPF/Faiz Ayarları
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Yıllık Brüt Faiz (%)
                </label>
                <div className="relative">
                  <input type="number" step="0.1" value={annualGrossRate} onChange={e => setAnnualGrossRate(Number(e.target.value))} className="w-full text-base font-bold border border-slate-200 rounded p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-emerald-700 bg-emerald-50/30" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  Stopaj / Vergi (%)
                </label>
                <div className="relative">
                  <input type="number" step="0.1" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-full text-base font-bold border border-slate-200 rounded p-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-700 bg-slate-50" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>
            <div className="mt-5 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-emerald-800 leading-relaxed">
                Hesaplama <strong>günlük bileşik faiz</strong> üzerinden stopaj düşülerek net olarak yapılmaktadır. Formül: {'Bakiye * (1 + (BrütFaiz * (1-Stopaj)) / 365)'}
              </p>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Liste & Grafik */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Grafik */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Net Varlık Büyüme Trendi</h3>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Mevcut varlıklar + Nema + Gelir/Gider projeksiyonu</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 mb-2 md:mb-0 rounded-lg self-start md:self-auto overflow-x-auto min-w-[280px]">
                {[
                  { label: '1A', days: 30, text: '1 Ay' },
                  { label: '3A', days: 90, text: '3 Ay' },
                  { label: '6A', days: 180, text: '6 Ay' },
                  { label: '1Y', days: 365, text: '1 Yıl' },
                  { label: '3Y', days: 1095, text: '3 Yıl' },
                  { label: '5Y', days: 1825, text: '5 Yıl' }
                ].map(p => (
                  <button 
                    key={p.days} 
                    onClick={() => setProjectionPeriod(p.days)}
                    className={`px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded-md transition-all whitespace-nowrap ${projectionPeriod === p.days ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {p.text}
                  </button>
                ))}
              </div>
              <div className="text-right whitespace-nowrap hidden md:block">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dönem Sonu Tahmin</p>
                <p className="text-2xl font-black text-emerald-600">{formatCurrency(summary.finalNetWorth)}</p>
              </div>
            </div>

            {/* Mobile view for the right hand side */}
            <div className="text-left md:hidden mb-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dönem Sonu Tahmin</p>
              <p className="text-2xl font-black text-emerald-600">{formatCurrency(summary.finalNetWorth)}</p>
            </div>

            <div className="h-[350px] w-full mt-4 min-w-0 flex-1">
              {isMounted && (
                <ResponsiveContainer width="100%" height={350} minWidth={100} minHeight={100}>
                  <AreaChart data={chartData} margin={{ top: 10, right: -10, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="colorBakiye" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNema" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    scale="time"
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(unixTime) => projectionPeriod > 365 ? format(new Date(unixTime), 'MMM yyyy', { locale: tr }) : format(new Date(unixTime), 'd MMM', { locale: tr })}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    minTickGap={30}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(value) => formatCompactCurrency(value)}
                    dx={-10}
                    width={60}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={({ active, payload }) => {
                       if (active && payload && payload.length) {
                           const data = payload[0].payload;
                           return (
                               <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl min-w-[200px]">
                                   <p className="text-slate-500 font-bold text-xs mb-3 pb-2 border-b border-slate-100">{data.displayDate}</p>
                                   <div className="flex items-center justify-between gap-4 mb-2">
                                      <span className="text-slate-600 font-medium text-xs flex items-center gap-1.5">
                                         <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Toplam Varlık
                                      </span>
                                      <span className="font-bold text-slate-900">{formatCurrency(data.bakiye)}</span>
                                   </div>
                                   <div className="flex items-center justify-between gap-4">
                                      <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
                                         <div className="w-2 h-2 rounded-full bg-amber-500"></div> Biriken Nema (Toplam)
                                      </span>
                                      <span className="font-bold text-amber-600 text-xs">+{formatCurrency(data.nema)}</span>
                                   </div>
                               </div>
                           );
                       }
                       return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bakiye" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorBakiye)" 
                    strokeWidth={3}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="nema" 
                    stroke="#f59e0b" 
                    fillOpacity={1} 
                    fill="url(#colorNema)" 
                    strokeWidth={3}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Nakit Akışı */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-slate-500" /> Şablon: Aylık Rutin Giren ve Çıkanlar
            </h3>
            
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 md:p-4 border border-slate-100 bg-slate-50 hover:bg-slate-100/70 rounded-xl group transition-colors gap-3 md:gap-4 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-300">
                  <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full">
                    <div className="w-full md:flex-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5 md:hidden uppercase tracking-wider">İsim</label>
                      <input 
                        value={item.name} 
                        onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                        className="w-full text-sm font-bold border border-transparent hover:border-slate-300 focus:border-emerald-500 bg-transparent hover:bg-white focus:bg-white rounded p-1.5 focus:outline-none transition-all placeholder-slate-400"
                        placeholder="İsim"
                      />
                    </div>
                    <div className="w-full md:w-40 flex items-center bg-white md:bg-transparent rounded border border-slate-100 md:border-transparent px-2 md:px-0">
                      {item.isOneTime ? (
                        <input
                          type="date"
                          value={item.oneTimeDate || ''}
                          onChange={e => handleItemChange(item.id, 'oneTimeDate', e.target.value)}
                          className="w-full text-[13px] font-bold border border-transparent hover:border-slate-300 focus:border-emerald-500 bg-transparent hover:bg-white focus:bg-white rounded p-1.5 focus:outline-none transition-all text-slate-700"
                        />
                      ) : (
                        <>
                          <span className="text-slate-400 font-bold mr-1 text-[11px] uppercase md:normal-case md:text-sm">Ayın</span>
                          <input 
                            type="number" min="1" max="31"
                            value={item.day || ''} 
                            onChange={e => handleItemChange(item.id, 'day', Number(e.target.value))}
                            className="w-12 text-sm font-bold border border-transparent hover:border-slate-300 focus:border-emerald-500 bg-transparent hover:bg-white focus:bg-white rounded p-1.5 focus:outline-none transition-all text-center"
                          />
                          <span className="text-slate-400 font-bold ml-1 text-sm shrink-0 whitespace-nowrap">.günü</span>
                        </>
                      )}
                    </div>
                    <div className="w-full md:w-36 flex items-center bg-white md:bg-transparent rounded border border-slate-100 md:border-transparent px-2 md:px-0">
                      <span className={`font-black text-lg mr-1 shrink-0 whitespace-nowrap ${item.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>{item.type === 'income' ? '+' : '-'}₺</span>
                      <input 
                        type="number"
                        value={item.amount || ''} 
                        onChange={e => handleItemChange(item.id, 'amount', Number(e.target.value))}
                        className={`w-full min-w-0 text-lg font-black border border-transparent hover:border-slate-300 focus:border-emerald-500 bg-transparent hover:bg-white focus:bg-white rounded p-1 focus:outline-none transition-all ${item.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}
                      />
                    </div>
                    <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-2 mt-2 md:mt-0 flex-wrap">
                      <select 
                          value={item.isOneTime ? 'once' : 'recurring'} 
                          onChange={e => handleItemChange(item.id, 'isOneTime', e.target.value === 'once')}
                          className="w-full md:w-auto text-[11px] font-bold border border-slate-200 md:border-transparent md:hover:border-slate-300 focus:border-emerald-500 bg-white md:bg-transparent md:hover:bg-white focus:bg-white rounded p-2 md:p-1.5 focus:outline-none transition-all text-slate-500 uppercase tracking-wider appearance-none"
                        >
                          <option value="recurring">Rutin</option>
                          <option value="once">1 Kez</option>
                      </select>
                      {!item.isOneTime && (
                        <select 
                            value={item.recurringMonths || 0} 
                            onChange={e => handleItemChange(item.id, 'recurringMonths', Number(e.target.value))}
                            className="w-full md:w-auto text-[11px] font-bold border border-slate-200 md:border-transparent md:hover:border-slate-300 focus:border-emerald-500 bg-emerald-50 md:bg-transparent md:hover:bg-emerald-50 focus:bg-emerald-50 rounded p-2 md:p-1.5 focus:outline-none transition-all text-emerald-700 uppercase tracking-wider appearance-none"
                          >
                            <option value={0}>Sürekli</option>
                            <option value={3}>3 Ay</option>
                            <option value={6}>6 Ay</option>
                            <option value={12}>12 Ay</option>
                        </select>
                      )}
                      <select 
                          value={item.type} 
                          onChange={e => handleItemChange(item.id, 'type', e.target.value)}
                          className="w-full md:w-auto text-xs font-bold border border-slate-200 md:border-transparent md:hover:border-slate-300 focus:border-emerald-500 bg-white md:bg-transparent md:hover:bg-white focus:bg-white rounded p-2 md:p-1.5 focus:outline-none transition-all text-slate-600 appearance-none"
                        >
                          <option value="expense">Gider (-)</option>
                          <option value="income">Gelir (+)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center self-end md:self-auto mt-2 md:mt-0">
                    <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-rose-600 p-2 md:p-1.5 bg-white rounded-lg shadow-sm md:opacity-0 md:group-hover:opacity-100 transition-all border border-slate-200 md:border-transparent hover:border-rose-200 hover:bg-rose-50">
                      <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">Henüz bir düzenli nakit akışı eklemediniz.</p>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Hızlı Akış Ekle</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="w-full md:w-56 lg:w-64">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Kategori / İsim</label>
                  <input 
                    placeholder="Örn: Aidat" 
                    value={newItem.name} 
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="w-full text-sm font-bold border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex-1 min-w-[120px] max-w-full md:max-w-[150px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Tutar (₺)</label>
                  <input 
                    type="number" 
                    value={newItem.amount || ''} 
                    onChange={e => setNewItem({...newItem, amount: Number(e.target.value)})}
                    className="w-full text-sm font-bold border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex-1 min-w-[120px] max-w-full md:max-w-[150px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Sıklık</label>
                  <select 
                    value={newItem.isOneTime ? 'once' : 'recurring'} 
                    onChange={e => setNewItem({...newItem, isOneTime: e.target.value === 'once', recurringMonths: 0})}
                    className="w-full text-sm font-bold border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="recurring">Rutin</option>
                    <option value="once">Tek Sefer</option>
                  </select>
                </div>
                {!newItem.isOneTime && (
                  <div className="flex-1 min-w-[120px] max-w-full md:max-w-[150px]">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Süre</label>
                    <select 
                      value={newItem.recurringMonths || 0} 
                      onChange={e => setNewItem({...newItem, recurringMonths: Number(e.target.value)})}
                      className="w-full text-sm font-bold border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
                    >
                      <option value={0}>Sürekli</option>
                      <option value={3}>3 Ay</option>
                      <option value={6}>6 Ay</option>
                      <option value={12}>12 Ay</option>
                    </select>
                  </div>
                )}
                <div className="flex-1 min-w-[120px] max-w-full md:max-w-[150px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Tür</label>
                  <select 
                    value={newItem.type} 
                    onChange={e => setNewItem({...newItem, type: e.target.value as 'income'|'expense'})}
                    className="w-full text-sm font-bold border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="expense">Gider (-)</option>
                    <option value="income">Gelir (+)</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[145px] max-w-full md:max-w-[170px]">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">{newItem.isOneTime ? "Tarih" : "Ödeme Günü"}</label>
                  {newItem.isOneTime ? (
                     <input 
                       type="date" 
                       value={newItem.oneTimeDate || ''} 
                       onChange={e => setNewItem({...newItem, oneTimeDate: e.target.value})}
                       className="w-full text-[13px] font-bold border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                     />
                  ) : (
                    <div className="relative">
                      <input 
                        type="number" min="1" max="31" 
                        value={newItem.day || ''} 
                        onChange={e => setNewItem({...newItem, day: Number(e.target.value)})}
                        className="w-full text-sm font-bold border border-slate-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold pointer-events-none">. gün</span>
                    </div>
                  )}
                </div>
                <div className="w-full xl:w-auto mt-2 xl:mt-0 xl:-ml-1">
                  <button 
                    onClick={handleAddItem}
                    className="w-full h-[42px] px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-lg flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Ekle
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ShoppingCart, Calendar, Search, Trash2, Tag, Receipt as ReceiptIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export const Receipts: React.FC = () => {
  const { receipts, deleteReceipt } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(amount);
  };

  const filteredReceipts = receipts
    .filter(r => r.merchant.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 r.items?.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedReceipt = receipts.find(r => r.id === selectedReceiptId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700">
            <ReceiptIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Alışveriş Fişleri</h2>
            <p className="text-xs font-medium text-slate-500">Taradığınız fişler ve ürün sepetleri burada saklanır.</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Fiş veya ürün ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Henüz Fiş Yok</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            "Fatura Tara (AI)" sayfasından market fişlerinizi taratarak buraya eklenmesini sağlayabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* List of Receipts */}
          <div className="w-full md:w-1/3 flex flex-col gap-3">
            {filteredReceipts.map(receipt => (
              <div 
                key={receipt.id}
                onClick={() => setSelectedReceiptId(receipt.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedReceiptId === receipt.id 
                    ? 'bg-slate-900 border-slate-900 shadow-md transform scale-[1.02]' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold truncate pr-3 ${selectedReceiptId === receipt.id ? 'text-white' : 'text-slate-900'}`}>
                    {receipt.merchant}
                  </h3>
                  <span className={`text-sm font-bold whitespace-nowrap ${selectedReceiptId === receipt.id ? 'text-emerald-400' : 'text-slate-900'}`}>
                    {formatCurrency(receipt.totalAmount)}
                  </span>
                </div>
                <div className={`flex items-center text-[11px] font-medium ${selectedReceiptId === receipt.id ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(parseISO(receipt.date), 'dd MMM yyyy', { locale: tr })}
                  <span className="mx-2">•</span>
                  <Tag className="w-3 h-3 mr-1" />
                  {receipt.items?.length || 0} Ürün
                </div>
              </div>
            ))}
            
            {filteredReceipts.length === 0 && searchTerm && (
              <div className="text-center py-8 text-sm text-slate-500">
                Aramanıza uygun fiş bulunamadı.
              </div>
            )}
          </div>

          {/* Receipt Details */}
          <div className="w-full md:w-2/3 sticky top-4">
            {selectedReceipt ? (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedReceipt.merchant}</h2>
                    <p className="text-xs font-semibold text-slate-500 flex items-center mt-1">
                       <Calendar className="w-3.5 h-3.5 mr-1.5" />
                       {format(parseISO(selectedReceipt.date), 'dd MMMM yyyy, EEEE', { locale: tr })}
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('Bu fişi silmek istediğinize emin misiniz?')) {
                        deleteReceipt(selectedReceipt.id);
                        setSelectedReceiptId(null);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors tooltip-trigger"
                    title="Fişi Sil"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-0">
                  <div className="px-5 py-3 bg-slate-100/50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ürün listesi</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tutar</span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                    {selectedReceipt.items && selectedReceipt.items.length > 0 ? (
                      selectedReceipt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-5 hover:bg-slate-50/50 transition-colors">
                          <span className="text-sm font-semibold text-slate-800 pr-4">{item.name}</span>
                          <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatCurrency(item.price)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-sm text-slate-500">
                        Bu fişte taranmış detaylı ürün bilgisi bulunmuyor.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Toplam Tutar</span>
                  <span className="text-2xl font-black">{formatCurrency(selectedReceipt.totalAmount)}</span>
                </div>
              </div>
            ) : (
              <div className="h-[400px] bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center text-slate-400 p-6 text-center">
                <div>
                  <ReceiptIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-sm text-slate-500">Detaylarını görmek için soldan bir fiş seçin.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Camera, Loader2, CheckCircle, FileText, ScanLine, AlertCircle } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { format } from 'date-fns';
import { Recurrence } from '../types';
import { getCategoryColor } from '../lib/categories';

export const AiScanner: React.FC = () => {
  const { addTransaction, addBill, addReceipt } = useFinance();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        scanImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const scanImage = async (base64DataUrl: string) => {
    setIsScanning(true);
    setResult(null);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = base64DataUrl.split(',')[1];
      const mimeType = base64DataUrl.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: "Bu faturanın veya fişin üzerindeki bilgileri çıkar." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchant: {
                type: Type.STRING,
                description: "Satıcı veya firmanın adı."
              },
              amount: {
                type: Type.NUMBER,
                description: "Faturadaki toplam tutar (Türk Lirası cinsinden)."
              },
              date: {
                type: Type.STRING,
                description: "Fatura tarihi veya fiş tarihi YYYY-MM-DD formatında, bulamazsan bugünün tarihi."
              },
              dueDate: {
                type: Type.STRING,
                description: "Son ödeme tarihi (sadece ödenecek faturalar için, YYYY-MM-DD)."
              },
              category: {
                type: Type.STRING,
                description: "Kategori seçimi: 'Market', 'Kira', 'Faturalar', 'Ulaşım', 'Sağlık', 'Eğitim', 'Diğer'."
              },
              isBill: {
                type: Type.BOOLEAN,
                description: "Bu belge ödenmesi gereken bir fatura mıdır? (Elektrik, Su, Doğalgaz, İnternet vb.) Fiş ise false."
              },
              items: {
                type: Type.ARRAY,
                description: "Eğer bu bir fiş ise (fatura değilse), fişte yer alan ürün veya hizmetlerin listesi.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Ürün veya hizmetin adı." },
                    price: { type: Type.NUMBER, description: "Ürünün fiyatı." }
                  },
                  required: ["name", "price"]
                }
              }
            },
            required: ["merchant", "amount", "date", "category", "isBill"]
          }
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        setResult(parsed);
      } else {
        throw new Error("Tarama sonucu boş döndü.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fatura okunurken bir hata oluştu.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApproveTransaction = () => {
    if (result) {
      if (!result.isBill) {
        addReceipt({
          merchant: result.merchant || 'Bilinmeyen Satıcı',
          date: result.date || format(new Date(), 'yyyy-MM-dd'),
          totalAmount: result.amount || 0,
          items: result.items || []
        });
      }

      const txDate = result.date ? new Date(result.date) : new Date();
      let defaultDueDate = new Date(txDate.getFullYear(), txDate.getMonth(), 14);
      if (txDate.getDate() > 4) {
        defaultDueDate = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 14);
      }
      
      const actualNote = result.items && result.items.length > 0 
                  ? `AI ile tarandı. ${result.items.length} ürün içeriyor.` 
                  : 'AI ile tarandı';
                  
      const ccNotes = `CC|${format(defaultDueDate, 'yyyy-MM-dd')}|0|${actualNote}`;

      addTransaction({
        type: 'expense',
        merchant: result.merchant || 'Bilinmeyen Satıcı',
        amount: result.amount || 0,
        date: result.date || format(new Date(), 'yyyy-MM-dd'),
        category: ['Market', 'Kira', 'Faturalar', 'Ulaşım', 'Sağlık', 'Eğitim', 'Diğer'].includes(result.category) 
                  ? result.category 
                  : 'Diğer',
        notes: ccNotes
      });
      setImagePreview(null);
      setResult(null);
    }
  };

  const handleApproveBill = () => {
    if (result) {
      addBill({
        name: result.merchant || 'Yeni Fatura',
        amount: result.amount || 0,
        category: ['Market', 'Kira', 'Faturalar', 'Abonelikler', 'Diğer'].includes(result.category) 
                  ? result.category 
                  : 'Faturalar',
        dueDate: result.dueDate || result.date || format(new Date(), 'yyyy-MM-dd'),
        recurrence: 'monthly' as Recurrence,
        isPaid: false
      });
      setImagePreview(null);
      setResult(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
      {!imagePreview ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 border-dashed text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4">
            <ScanLine className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Fatura Yükle veya Fotoğraf Çek</h3>
          <p className="text-xs text-slate-500 mb-6 max-w-xs">Kameranızı kullanarak fişin fotoğrafını çekin veya galeriden seçin.</p>
          
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImageCapture}
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-4 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition"
          >
            <Camera className="w-4 h-4 mr-2" />
            Kamera / Fotoğraf
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center min-h-[300px]">
             <img src={imagePreview} alt="Taranan Fatura" className="max-w-full max-h-[400px] object-contain p-2" />
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center">
               <FileText className="w-4 h-4 mr-2 text-slate-400" /> Tarama Sonucu
            </h3>
            
            {isScanning ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-700">Yapay zeka analiz ediyor...</p>
                <p className="text-[10px] text-slate-400 mt-1">Lütfen bekleyin...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                 <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-3">
                   <AlertCircle className="w-6 h-6" />
                 </div>
                 <p className="text-xs font-semibold text-rose-600 mb-4">{error}</p>
                 <button 
                  onClick={() => { setImagePreview(null); setResult(null); setError(null); }}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold hover:bg-slate-200"
                 >
                   Tekrar Dene
                 </button>
              </div>
            ) : result ? (
              <div className="flex-1 flex flex-col">
                <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Satıcı / Kurum</label>
                    <div className="text-sm font-bold text-slate-900 p-2 border border-slate-100 rounded bg-slate-50">{result.merchant}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tutar</label>
                    <div className="text-lg font-bold p-2 border border-slate-100 rounded bg-slate-50 text-slate-900">
                      {formatCurrency(result.amount)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tarih</label>
                      <div className="text-xs font-semibold text-slate-900 p-2 border border-slate-100 rounded bg-slate-50">{result.date}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Kategori</label>
                      <div className={`text-xs font-semibold p-2 border border-slate-100 rounded bg-slate-50 ${getCategoryColor(result.category)}`}>{result.category}</div>
                    </div>
                  </div>
                  {result.dueDate && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Son Ödeme Tarihi</label>
                      <div className="text-xs font-semibold text-rose-600 p-2 border border-rose-100 rounded bg-rose-50">{result.dueDate}</div>
                    </div>
                  )}
                  {result.isBill && (
                    <div className="text-[10px] font-bold text-orange-600 bg-orange-50 p-2 rounded">
                      Bu belge bir fatura olarak algılandı.
                    </div>
                  )}
                  {result.items && result.items.length > 0 && (
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Ürünler</label>
                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        {result.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 text-xs border-b border-slate-50 last:border-0 bg-slate-50/50">
                            <span className="font-medium text-slate-700 truncate mr-2">{item.name}</span>
                            <span className="font-bold text-slate-900 whitespace-nowrap">{formatCurrency(item.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex flex-col space-y-2">
                  {result.isBill ? (
                    <>
                      <button 
                        onClick={handleApproveBill}
                        className="w-full flex items-center justify-center py-2.5 px-3 bg-slate-900 text-white rounded font-bold text-xs hover:bg-slate-800 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Faturalara Ekle
                      </button>
                      <button 
                        onClick={handleApproveTransaction}
                        className="w-full flex items-center justify-center py-2 px-3 bg-slate-100 text-slate-700 rounded font-bold text-xs hover:bg-slate-200 transition"
                      >
                        İşlemlere (Fiş Olarak) Ekle
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleApproveTransaction}
                        className="w-full flex items-center justify-center py-2.5 px-3 bg-slate-900 text-white rounded font-bold text-xs hover:bg-slate-800 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        İşlemlere Ekle
                      </button>
                      <button 
                        onClick={handleApproveBill}
                        className="w-full flex items-center justify-center py-2 px-3 bg-slate-100 text-slate-700 rounded font-bold text-xs hover:bg-slate-200 transition"
                      >
                        Faturalara (Fatura Olarak) Ekle
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => { setImagePreview(null); setResult(null); setError(null); }}
                    className="w-full py-2 px-3 border border-slate-200 text-slate-500 rounded font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { X, Upload, Sparkles, Check, Trash2, ArrowRight, ShieldCheck, AlertCircle, CreditCard, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useFinance } from '../context/FinanceContext';
import { PREDEFINED_CATEGORIES, getCategoryColor } from '../lib/categories';
import toast from 'react-hot-toast';

interface ParsedTransaction {
  id: string;
  selected: boolean;
  date: string; // YYYY-MM-DD
  rawDate: string;
  merchant: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  accountTag: string;
  installmentInfo?: string;
  notes: string;
  isCC: boolean;
  dueDate: string;
}

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_STATEMENT = `ziraat kredi kartı
29.04.2026 52170615 FATURA ÖDEME 1223.58
29.04.2026 500104559231 FATURA ÖDEME 2675.00
29.04.2026 3621348549 FATURA ÖDEME 987.68
29.04.2026 0003322141 FATURA ÖDEME 880.43
30.04.2026 5467177928 VODAFONE FATURA ÖDEME 451.00
05.05.2026 BIM HASKOY BEYOGLU J ISTANBUL 1459.00
08.05.2026 HAPPY CENTER OKMEYDA İSTANBUL 2750.51
10.05.2026 Otomatik ödeme talimatı kampanyası kazan 0.00
13.05.2026 MODERN UN VE UNLU MA İSTANBUL 95.00
13.05.2026 HAPPY CENTER PİYALEP İSTANBUL 1539.05
13.05.2026 HAPPY CENTER PİYALEP İSTANBUL 714.01
14.05.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +10168.48
14.05.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +1893.13
15.05.2026 2652 şube-otomatik ödeme-teşekkür ederiz +10003.24
15.05.2026 2652 şube-otomatik ödeme-teşekkür ederiz +20.00
15.05.2026 HAPPY CENTER OKMEYDA İSTANBUL 1385.43
15.05.2026 KÜLÜNKOĞLU İSTANBUL 120.00
15.05.2026 IYZICO/RİOTGAMES İSTANBUL TR 620.00
15.05.2026 IYZICO/RİOTGAMES İSTANBUL TR 155.00
15.05.2026 52170615 İSTANBUL SU - İSKİ FATURA ÖDEME 927.00
15.05.2026 500104559231 İGDAŞ - İSTANBUL DOĞALGAZ F 2294.00
16.05.2026 NISA MARKET ISTANBUL 300.00
17.05.2026 GÜNDÜZ GIDA İSTANBUL 340.00
17.05.2026 HAPPY CENTER OKMEYDA İSTANBUL 1556.31
17.05.2026 Nakit Avans - ZB ATM 1000.00
18.05.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +600.00
18.05.2026 UMUT GIDA ISTANBUL 310.00
19.05.2026 BIN AVM ISTANBUL 700.00
19.05.2026 BIM A.S-J039-ZIRAAT ISTANBUL 889.88
19.05.2026 DÖRTYOL FIRIN İSTANBUL 80.00
19.05.2026 UMUT GIDA ISTANBUL 415.00
20.05.2026 BELBIM ELEKTRONIK PA ISTANBUL 414.00
22.05.2026 BIM ZIRAAT BEYOGLU J ISTANBUL 748.42
22.05.2026 ÖZLEM YUFKA İSTANBUL 160.00
22.05.2026 UMUT GIDA ISTANBUL 120.00
22.05.2026 HAPPY CENTER PİYALEP İSTANBUL 1904.99
23.05.2026 NKOLAY/ERSAN ALIŞVER İSTANBUL 90.54
23.05.2026 HAPPY CENTER OKMEYDA İSTANBUL 59.90
24.05.2026 OSMANLIOĞLU GIDA İSTANBUL 940.00
25.05.2026 MAVİ JEANS ŞİŞLİ 01.Tak 900.01
25.05.2026 S/TRENDYOL 01.Tak 1217.89
25.05.2026 HD CEVAHIR İSTANBUL 1920.00
25.05.2026 İKRA UNLU MAMÜLLERİ İSTANBUL 80.00
25.05.2026 5395518462 FATURA ÖDEME 655.25
25.05.2026 3621348549 CK BOĞAZİÇİ FATURA ÖDEME 1085.00
27.05.2026 CAN ODUN FIRIN İSTANBUL 120.00
27.05.2026 ŞOK-10493 OKMEYDANI İSTANBUL 712.67
28.05.2026 A101 9942 I960 ESER İSTANBUL 778.02
28.05.2026 KÜLÜNKOĞLU İSTANBUL 100.00
28.05.2026 SUR MARKET İSTANBUL 65.00
29.05.2026 Taksitli Nakit Avans 4165.77
29.05.2026 Taksitli Nakit Avans Faiz 167.94
29.05.2026 Taksitli Nakit Avans BSMV 25.19
29.05.2026 Taksitli Nakit Avans KKDF 25.19
30.05.2026 ŞOK-ÜSKÜDAR ÇARŞI Dİ İSTANBUL 508.45
31.05.2026 GÜNDÜZ GIDA İSTANBUL 350.00
01.06.2026 5356593027 VODAFONE FATURA ÖDEME 229.50
01.06.2026 5467177928 VODAFONE FATURA ÖDEME 450.50
01.06.2026 0003322141 TURKNET FATURA ÖDEME 877.66
01.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +1438.37
01.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +1000.00
02.06.2026 NISA MARKET ISTANBUL 355.00
02.06.2026 UMUT GIDA ISTANBUL 60.00
02.06.2026 SUR MARKET İSTANBUL 60.00
03.06.2026 SEYİT MANAV İSTANBUL 100.00
03.06.2026 ŞOK-10493 OKMEYDANI İSTANBUL 331.98
03.06.2026 UMUT GIDA ISTANBUL 100.00
04.06.2026 İKRA UNLU MAMÜLLERİ İSTANBUL 80.00
04.06.2026 Nakit avans ücreti 10.00
04.06.2026 BSMV (Faiz) 22.55
04.06.2026 BSMV (Komisyon) 1.50
04.06.2026 KKDF 22.55
04.06.2026 Kredi faizi 52.76
04.06.2026 Nakit avans faizi 22.70
04.06.2026 Tekil Fatura Faizi 26.76
04.06.2026 Otomatik Fatura Faizi 48.11
04.06.2026 DEPODAN ET TAVUK İSTANBUL 269.00
04.06.2026 BIM FATIH SULTAN BEY ISTANBUL 1063.89
05.06.2026 HAPPY CENTER OKMEYDA İSTANBUL 1021.92
05.06.2026 KÜLÜNKOĞLU İSTANBUL 120.00
08.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +1500.00
08.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +500.00
10.06.2026 DÖRTYOL FIRIN İSTANBUL 140.00
10.06.2026 SUR MARKET İSTANBUL 328.00
11.06.2026 HAPPY CENTER PİYALEP İSTANBUL 1150.00
15.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +2350.89
15.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +3067.28
15.06.2026 HAPPY CENTER OKMEYDA İSTANBUL 2372.72
18.06.2026 52170615 İSTANBUL SU - İSKİ FATURA ÖDEME 1501.00
18.06.2026 500104559231 İGDAŞ - İSTANBUL DOĞALGAZ F 942.00
19.06.2026 SUR MARKET İSTANBUL 539.00
23.06.2026 BANKO KURUYEMİŞ İSTANBUL 123.00
25.06.2026 MAVİ JEANS ŞİŞLİ 02.Tak 899.99
25.06.2026 S/TRENDYOL 02.Tak 1217.89
26.06.2026 0003322141 FATURA ÖDEME 874.90
26.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +1500.00
28.06.2026 UMUT GIDA ISTANBUL 120.00
28.06.2026 UMUT GIDA ISTANBUL 175.00
29.06.2026 Taksitli Nakit Avans 4273.51
29.06.2026 Taksitli Nakit Avans Faiz 85.04
29.06.2026 Taksitli Nakit Avans BSMV 12.76
29.06.2026 Taksitli Nakit Avans KKDF 12.76
29.06.2026 DAMAK TADI TURİZM GI İSTANBUL 205.00
29.06.2026 ŞOK-SİNANPAŞA BEŞİKT İSTANBUL 46.50
30.06.2026 3621348549 FATURA ÖDEME 1321.80
30.06.2026 5467177928 VODAFONE FATURA ÖDEME 450.25
30.06.2026 5356593027 VODAFONE FATURA ÖDEME 229.50
30.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +327.69
30.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +681.05
30.06.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +676.48
04.07.2026 KKDF 171.00
04.07.2026 Kredi faizi 1033.10
04.07.2026 Taksit faizi 56.17
04.07.2026 Otomatik Fatura Faizi 50.73
04.07.2026 BSMV (Faiz) 171.00
07.07.2026 Ödeme - Teşekkür Ederiz +9587.95
15.07.2026 NISA MARKET ISTANBUL 120.00
16.07.2026 5395518462 FATURA ÖDEME 743.00
16.07.2026 5395518462 FATURA ÖDEME 642.50
17.07.2026 52170615 İSTANBUL SU - İSKİ FATURA ÖDEME 1315.00
17.07.2026 500104559231 İGDAŞ - İSTANBUL DOĞALGAZ F 477.00
20.07.2026 5455980428 VODAFONE FATURA ÖDEME 391.75
24.07.2026 NISA MARKET ISTANBUL 180.00
25.07.2026 HAPPY CENTER OKMEYDA İSTANBUL TRTR 1870.98
25.07.2026 S/TRENDYOL 03.Tak 1217.89
25.07.2026 MAVİ JEANS ŞİŞLİ 03.Tak 899.99
25.07.2026 BIM FATIH SULTAN BEYOGLU-ISTANBUL TR 997.50

yapıkredi kk
25.05.2026 PIRILTI GIYIM ISTANBUL TR 3000.00
25.05.2026 BIM BIM FATIH SULTAN BEYO ISTANBUL TR 882.50
25.05.2026 BİN AVM İSTANBUL TR 730.00
01.06.2026 HAPPY CENTER OKMEYDANI İSTANBUL TR 1788.64
01.06.2026 SUR MARKET İSTANBUL TR 225.00
05.06.2026 BİM BİM FATİH SULTAN BEYO İSTANBUL TR 427.50
13.06.2026 ŞOK HASKÖY GÜR SOK MAĞAZA İSTANBUL TR 289.85
15.06.2026 A-101 9942 J089 A101 FETİ İSTANBUL TR 72.00
20.06.2026 ŞOK HASKÖY GÜR SOK MAĞAZA İSTANBUL TR 743.20
23.06.2026 UMUT GIDA ISTANBUL TR 205.00
05.07.2026 BELBIM AS. ULASIM ISTANBUL TR 60.00
05.07.2026 DÖNEM FAİZİ 246.32`;

// Smart Category Predictor
export function predictCategory(description: string, isIncome: boolean): string {
  if (isIncome) {
    if (description.includes('TEŞEKKÜR') || description.includes('ÖDEME') || description.includes('HESAPTAN')) {
      return 'Kredi Kartı Ödemesi';
    }
    return 'Maaş';
  }

  const descUpper = description.toLocaleUpperCase('tr-TR');

  // Market & Gıda
  const marketKeywords = [
    'BIM', 'BİM', 'A101', 'A-101', 'ŞOK', 'HAPPY CENTER', 'SUR MARKET', 'NISA MARKET', 'NİSA MARKET',
    'GÜNDÜZ GIDA', 'UMUT GIDA', 'MİGROS', 'CARREFOUR', 'BİN AVM', 'BIN AVM', 'OSMANLIOĞLU GIDA',
    'DEPODAN ET', 'BANKO KURUYEMİŞ', 'SEYİT MANAV', 'MARKET', 'TEKEL', 'GIDA', 'MANAV', 'KASAP', 'ŞARKÜTERİ'
  ];
  if (marketKeywords.some(k => descUpper.includes(k))) return 'Market';

  // Faturalar & Abonelikler
  const billKeywords = [
    'FATURA', 'VODAFONE', 'TURKNET', 'TÜRK TELEKOM', 'TURKCELL', 'İSKİ', 'ISKI', 'İGDAŞ', 'IGDAS',
    'CK BOĞAZİÇİ', 'ENERJİSA', 'BEDAŞ', 'AYEDAŞ', 'ELEKTRİK', 'SU', 'DOĞALGAZ', 'İNTERNET', 'INTERNET'
  ];
  if (billKeywords.some(k => descUpper.includes(k))) return 'Faturalar';

  // Yeme & İçme
  const foodKeywords = [
    'FIRIN', 'UNLU MAMÜL', 'CAN ODUN', 'ÖZLEM YUFKA', 'MODERN UN', 'KÜLÜNKOĞLU', 'DAMAK TADI',
    'HD CEVAHIR', 'PASTANE', 'CAFE', 'KAHVE', 'RESTORAN', 'LOKANTA', 'BURGER', 'DÖNER', 'PIZZA', 'TAVUK'
  ];
  if (foodKeywords.some(k => descUpper.includes(k))) return 'Yeme-İçme';

  // Giyim & Alışveriş
  const shoppingKeywords = [
    'MAVİ', 'MAVI', 'TRENDYOL', 'ZARA', 'MANGO', 'PIRILTI GIYIM', 'H&M', 'BOYNER', 'LCW', 'DEFACTO',
    'AMAZON', 'HEPSİBURADA', 'N11', 'ÇARŞI', 'GIYIM', 'GİYİM', 'AYAKKABI', 'ALIŞVER'
  ];
  if (shoppingKeywords.some(k => descUpper.includes(k))) return 'Giyim';

  // Eğlence & Dijital
  const entertainmentKeywords = [
    'RİOTGAMES', 'RIOTGAMES', 'IYZICO', 'NETFLIX', 'SPOTIFY', 'STEAM', 'GOOGLE', 'APPLE', 'PLAYSTATION', 'YOUTUBE'
  ];
  if (entertainmentKeywords.some(k => descUpper.includes(k))) return 'Eğlence';

  // Ulaşım
  const transportKeywords = [
    'BELBIM', 'BELBİM', 'İSTANBULKART', 'ULAŞIM', 'BENZİN', 'SHELL', 'OPET', 'BP', 'PETROL', 'TAKSİ', 'UBER', 'MARTI'
  ];
  if (transportKeywords.some(k => descUpper.includes(k))) return 'Ulaşım';

  // Banka Ücretleri & Finans
  const financeKeywords = [
    'FAİZ', 'FAIZ', 'BSMV', 'KKDF', 'NAKİT AVANS', 'KOMİSYON', 'DÖNEM FAİZİ', 'KREDİ FAİZİ', 'TAKSİT FAİZİ', 'MASRAF'
  ];
  if (financeKeywords.some(k => descUpper.includes(k))) return 'Finans / Faiz';

  return 'Diğer';
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose }) => {
  const { addTransaction } = useFinance();
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedTransaction[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [defaultAccount, setDefaultAccount] = useState('Kredi Kartı');
  const [filterZeroAmount, setFilterZeroAmount] = useState(true);

  if (!isOpen) return null;

  const handleLoadSample = () => {
    setInputText(SAMPLE_STATEMENT);
    toast.success('Ziraat & Yapı Kredi örnek extre yüklendi! Şimdi "Akıllı Analiz Et" butonuna tıklayın.');
  };

  const parseStatement = (text: string) => {
    const lines = text.split('\n');
    const items: ParsedTransaction[] = [];
    let currentAccount = defaultAccount;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for header / card name lines
      if (!line.match(/\d{2}[./-]\d{2}[./-]\d{4}/) && !line.match(/\b\d+[.,]\d{2}\b/)) {
        if (line.toLowerCase().includes('kart') || line.toLowerCase().includes('kk') || line.toLowerCase().includes('banka') || line.toLowerCase().includes('ziraat') || line.toLowerCase().includes('kredi')) {
          currentAccount = line;
          continue;
        }
      }

      // Regex to match date (e.g., 29.04.2026, 2026-04-29, 29/04/2026)
      const dateMatch = line.match(/(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}[./-]\d{2}[./-]\d{2})/);
      if (!dateMatch) continue;

      const rawDateStr = dateMatch[0];
      let formattedDate = '';
      try {
        if (rawDateStr.includes('.')) {
          const [d, m, y] = rawDateStr.split('.');
          formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (rawDateStr.includes('/')) {
          const [d, m, y] = rawDateStr.split('/');
          formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else {
          formattedDate = rawDateStr;
        }
      } catch (e) {
        formattedDate = format(new Date(), 'yyyy-MM-dd');
      }

      // Remaining line content after date
      let restOfLine = line.replace(rawDateStr, '').trim();

      // Extract amount (e.g. +10168.48, 1223.58, 2750.51, 0.00)
      const amountMatch = restOfLine.match(/([+-]?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\b\d+[.,]\d{2}\b|\b\d+\b)/g);
      if (!amountMatch) continue;

      // Amount is usually the last match
      const lastAmountStr = amountMatch[amountMatch.length - 1];
      let amountVal = parseFloat(lastAmountStr.replace('+', '').replace(/\s/g, '').replace(',', '.'));
      if (isNaN(amountVal)) continue;

      // Filter zero amount if requested
      if (filterZeroAmount && amountVal === 0) continue;

      // Determine income vs expense
      const isPositiveSign = restOfLine.includes('+');
      const isPaymentKeyword = restOfLine.toLowerCase().includes('teşekkür ederiz') || 
                               restOfLine.toLowerCase().includes('hesaptan ödeme') ||
                               restOfLine.toLowerCase().includes('otomatik ödeme-teşekkür') ||
                               restOfLine.toLowerCase().includes('ödeme - teşekkür');
      
      const isIncome = isPositiveSign || isPaymentKeyword;
      const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

      // Remove amount from description
      let desc = restOfLine.replace(lastAmountStr, '').replace('+', '').trim();

      // Detect installment info e.g. "01.Tak", "02.Tak"
      const taksitMatch = desc.match(/(\d{2}\.Tak|\d{1,2}\/\d{1,2}|Taksit\s*\d+)/i);
      let installmentInfo = '';
      if (taksitMatch) {
        installmentInfo = taksitMatch[0];
      }

      // Clean reference numbers or location suffixes
      desc = desc
        .replace(/ISTANBUL TRTR|İSTANBUL TRTR|İSTANBUL TR|ISTANBUL TR|İSTANBUL|ISTANBUL|ŞİŞLİ|BEYOĞLU J|OKMEYDANI|PİYALEP/gi, '')
        .replace(/\b\d{8,12}\b/g, '') // Remove long account/ref numbers
        .replace(/\b\d{4}\s*şube-/gi, '')
        .trim();

      if (!desc) desc = 'Ekstre İşlemi';

      // Smart category prediction
      const category = predictCategory(desc, isIncome);

      // Due date calculation for CC expenses
      const txDateObj = new Date(formattedDate);
      let calcDueDate = new Date(txDateObj.getFullYear(), txDateObj.getMonth(), 14);
      if (txDateObj.getDate() > 4) {
        calcDueDate = new Date(txDateObj.getFullYear(), txDateObj.getMonth() + 1, 14);
      }
      const dueDateStr = format(calcDueDate, 'yyyy-MM-dd');

      // Notes payload
      let finalNote = `Ekstre: ${currentAccount}`;
      if (installmentInfo) finalNote += ` (${installmentInfo})`;
      if (type === 'expense') {
        finalNote = `CC|${dueDateStr}|0|${finalNote}`;
      }

      items.push({
        id: `parsed-${i}-${Math.random().toString(36).substring(2, 7)}`,
        selected: true,
        date: formattedDate,
        rawDate: rawDateStr,
        merchant: desc.substring(0, 50),
        amount: Math.abs(amountVal),
        type,
        category,
        accountTag: currentAccount,
        installmentInfo,
        notes: finalNote,
        isCC: type === 'expense',
        dueDate: dueDateStr
      });
    }

    return items;
  };

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      toast.error('Lütfen önce ekstre metnini yapıştırın veya Örnek Yükle butonunu kullanın.');
      return;
    }

    const results = parseStatement(inputText);
    if (results.length === 0) {
      toast.error('Metinde uygun formatta işlem bulunamadı. Lütfen tarih ve tutar içeren hatları kontrol edin.');
      return;
    }

    setParsedItems(results);
    setStep('review');
    toast.success(`Akıllı analiz tamamlandı! ${results.length} adet işlem çözümlendi.`);
  };

  const handleToggleSelectAll = () => {
    const allSelected = parsedItems.every(i => i.selected);
    setParsedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
  };

  const handleToggleItem = (id: string) => {
    setParsedItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const handleUpdateItem = (id: string, fields: Partial<ParsedTransaction>) => {
    setParsedItems(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
  };

  const handleDeleteItem = (id: string) => {
    setParsedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleFinalImport = () => {
    const selectedItems = parsedItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast.error('Lütfen aktarmak için en az 1 işlem seçin.');
      return;
    }

    let successCount = 0;
    for (const item of selectedItems) {
      let finalNote = item.notes;
      if (item.type === 'expense' && item.isCC) {
        finalNote = `CC|${item.dueDate}|0|${item.accountTag ? `[${item.accountTag}] ` : ''}${item.installmentInfo ? `(${item.installmentInfo})` : ''}`;
      }

      addTransaction({
        type: item.type,
        amount: item.amount,
        category: item.category,
        merchant: item.merchant,
        date: item.date,
        notes: finalNote
      });
      successCount++;
    }

    toast.success(`🎉 ${successCount} adet işlem akıllı kategorileri ve kart bilgileriyle hesabınıza aktarıldı!`);
    onClose();
    setStep('input');
    setInputText('');
    setParsedItems([]);
  };

  const totalExpense = parsedItems.filter(i => i.selected && i.type === 'expense').reduce((s, i) => s + i.amount, 0);
  const totalIncome = parsedItems.filter(i => i.selected && i.type === 'income').reduce((s, i) => s + i.amount, 0);
  const selectedCount = parsedItems.filter(i => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Akıllı Banka / Kredi Kartı Ekstre Aktarıcısı</h3>
              <p className="text-xs text-slate-400">PDF veya kopyalanan ekstre metinlerini otomatik tarihlendirir, kategorize eder ve sisteme işler.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === 'input' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span className="text-xs text-indigo-950 font-medium">
                    Ziraat, Yapı Kredi, Garanti, Akbank vb. tüm banka ve kredi kartı ekstre kopyalarını doğrudan yapıştırabilirsiniz.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Örnek Ekstre Yükle
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ekstre Metnini Buraya Yapıştırın
                </label>
                <textarea
                  rows={14}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Örnek:
29.04.2026 FATURA ÖDEME 1223.58
05.05.2026 BIM HASKOY BEYOGLU ISTANBUL 1459.00
14.05.2026 2652 şube-hesaptan ödeme-teşekkür ederiz +10168.48
25.05.2026 MAVİ JEANS ŞİŞLİ 01.Tak 900.01"
                  className="w-full font-mono text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="filterZero"
                    checked={filterZeroAmount}
                    onChange={(e) => setFilterZeroAmount(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="filterZero" className="cursor-pointer">0.00 TL tutarındaki kampanya/bilgi satırlarını otomatik gizle</label>
                </div>
                <span className="text-slate-400">Türkçe Yapay Zeka Kategori Motoru Aktif</span>
              </div>
            </div>
          ) : (
            /* Review Step */
            <div className="space-y-4">
              {/* Summary Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">Seçilen İşlem</div>
                  <div className="text-lg font-bold text-slate-900">{selectedCount} / {parsedItems.length}</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <div className="text-[11px] font-medium text-rose-600">Toplam Harcama</div>
                  <div className="text-lg font-bold text-rose-700">₺{totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="text-[11px] font-medium text-emerald-600">Toplam Ödeme / Gelir</div>
                  <div className="text-lg font-bold text-emerald-700">₺{totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-xs font-semibold text-indigo-700 hover:underline"
                  >
                    {parsedItems.every(i => i.selected) ? 'Tüm Seçimleri Kaldır' : 'Tümünü Seç'}
                  </button>
                  <button
                    onClick={() => setStep('input')}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Metni Düzenle
                  </button>
                </div>
              </div>

              {/* Parsed Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[50vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 sticky top-0 z-10 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={parsedItems.length > 0 && parsedItems.every(i => i.selected)}
                          onChange={handleToggleSelectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="p-2.5 w-28">Tarih</th>
                      <th className="p-2.5">Açıklama / Mağaza</th>
                      <th className="p-2.5 w-36">Kategori</th>
                      <th className="p-2.5 w-24 text-center">Tip</th>
                      <th className="p-2.5 w-28 text-right">Tutar (₺)</th>
                      <th className="p-2.5 w-28">Hesap / Taksit</th>
                      <th className="p-2.5 w-10 text-center">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedItems.map((item) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition ${!item.selected ? 'opacity-40 bg-slate-50/50' : ''}`}>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(item.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => handleUpdateItem(item.id, { date: e.target.value })}
                            className="p-1 border border-slate-200 rounded text-xs bg-white w-full"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.merchant}
                            onChange={(e) => handleUpdateItem(item.id, { merchant: e.target.value })}
                            className="p-1 border border-slate-200 rounded text-xs bg-white w-full font-semibold text-slate-800"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(item.id, { category: e.target.value })}
                            className="p-1 border border-slate-200 rounded text-xs bg-white w-full font-medium"
                          >
                            {PREDEFINED_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Kredi Kartı Ödemesi">Kredi Kartı Ödemesi</option>
                            <option value="Finans / Faiz">Finans / Faiz</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { type: item.type === 'expense' ? 'income' : 'expense' })}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase transition ${
                              item.type === 'expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {item.type === 'expense' ? 'Gider' : 'Ödeme/Gelir'}
                          </button>
                        </td>
                        <td className="p-2.5 text-right font-bold">
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => handleUpdateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="p-1 border border-slate-200 rounded text-xs bg-white w-24 text-right font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">
                          <span className="truncate block max-w-[100px]" title={item.accountTag}>
                            {item.accountTag} {item.installmentInfo ? `(${item.installmentInfo})` : ''}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Vazgeç
          </button>

          {step === 'input' ? (
            <button
              type="button"
              onClick={handleAnalyze}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Akıllı Analiz Et</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition"
              >
                Geri Dön
              </button>
              <button
                type="button"
                onClick={handleFinalImport}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>İçeri Aktar ({selectedCount} İşlem)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

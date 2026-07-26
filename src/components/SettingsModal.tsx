import React, { useState } from 'react';
import { X, Save, Trash2, CloudUpload, RefreshCw } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
  const { appTitle, setAppTitle, syncLocalToCloud, recoverDataManual } = useFinance();
  const { user } = useAuth();
  const [title, setTitle] = useState(appTitle);
  const [syncing, setSyncing] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const handleSave = () => {
    setAppTitle(title);
    toast.success('Ayarlar kaydedildi');
    onClose();
  };

  const handleSync = async () => {
    if (!user) {
      toast.error('Buluta aktarmak için önce giriş yapmalısınız.');
      return;
    }
    setSyncing(true);
    await syncLocalToCloud();
    setSyncing(false);
  };

  const handleRecover = async () => {
    setRecovering(true);
    await recoverDataManual();
    setRecovering(false);
  };

  const clearData = () => {
    if (confirm('Tüm yerel verileriniz silinecektir. Eğer hesabınıza giriş yaptıysanız buluttaki verileriniz DOKUNULMAZ. Sadece yerel cihazdaki veriler temizlenir. Devam edilsin mi?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <h2 className="font-semibold text-slate-800">Uygulama Ayarları</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Uygulama İsmi</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm"
            />
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
            <div className="text-xs text-indigo-900 font-semibold flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Veri Kurtarma & Senkronizasyon
            </div>
            <p className="text-[11px] text-indigo-700">
              Giriş yapmadan önce girdiğiniz eski işlemleri tarayıcı hafızasından tarayıp hesabınıza aktarın.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleRecover}
                disabled={recovering}
                className="w-full bg-indigo-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recovering ? 'animate-spin' : ''}`} />
                {recovering ? 'Taranıyor...' : 'Eski / Kaybolan Verileri Tara ve Kurtar'}
              </button>
              {user && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full bg-emerald-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  {syncing ? 'Aktarılıyor...' : 'Yerel Verileri Buluta Yükle'}
                </button>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button 
              onClick={clearData}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1.5 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" /> Önbelleği Temizle
            </button>
            <button 
              onClick={handleSave}
              className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-700 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

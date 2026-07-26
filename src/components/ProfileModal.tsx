import React, { useState } from 'react';
import { X, UserCheck, Shield, ExternalLink, CloudUpload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';

export const ProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const { transactions, syncLocalToCloud } = useFinance();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await syncLocalToCloud();
    setSyncing(false);
  };

  const handleManageAccount = () => {
    alert("Profil düzenleme özelliği yakında eklenecektir.");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <h2 className="font-semibold text-slate-800">Profil Bilgileri</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-50">
              <UserCheck className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">
                {user?.user_metadata?.full_name || 'Kullanıcı'}
              </h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Hesap Durumu</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Shield className="w-3.5 h-3.5" /> Doğrulanmış
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-3">
              <span className="text-slate-500">Aktif İşlem Sayısı</span>
              <span className="font-medium text-slate-700">{transactions.length} adet</span>
            </div>
          </div>

          <button 
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
          >
            <CloudUpload className="w-4 h-4" />
            {syncing ? 'Aktarılıyor...' : 'Yerel Verileri Buluta Yükle'}
          </button>
          
          <button 
            onClick={handleManageAccount}
            className="w-full bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition"
          >
            Profil Ayarlarını Yönet <ExternalLink className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

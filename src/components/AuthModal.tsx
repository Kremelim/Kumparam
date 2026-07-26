import React, { useState } from 'react';
import { X, Mail, Lock, Loader2, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase, getConfig } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const currentConfig = getConfig();
  const initialUrl = (localStorage.getItem('custom_supabase_url') || import.meta.env.VITE_SUPABASE_URL || 'https://yoditrjvnncxiaakgtnf.supabase.co').replace('oaiqcswlhvjdcadhxijr', 'yoditrjvnncxiaakgtnf');
  const [customUrl, setCustomUrl] = useState(initialUrl);
  const [customKey, setCustomKey] = useState(localStorage.getItem('custom_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    localStorage.setItem('custom_supabase_url', customUrl.trim());
    localStorage.setItem('custom_supabase_key', customKey.trim());
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const cfg = getConfig();
      if (!cfg.isConfigured) {
        setShowConfig(true);
        throw new Error('Supabase URL veya Anon Key geçerli değil. Lütfen aşağıdaki Supabase bağlantı ayarlarını kontrol edin.');
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
        window.location.reload();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Kayıt başarılı! Lütfen e-postanızı kontrol edin.');
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError' || err.message?.includes('fetch')) {
        setError(
          `Supabase sunucusuna bağlanılamadı ("Failed to fetch"). Target URL: ${currentConfig.url}`
        );
        setShowConfig(true);
      } else {
        setError(err.message || 'Bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-rose-50 text-rose-700 text-sm p-3.5 rounded-xl border border-rose-200 mb-4 space-y-2">
              <div className="flex items-start gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes('Failed to fetch') && (
                <div className="text-xs text-rose-600 bg-rose-100/60 p-2.5 rounded-lg space-y-1">
                  <p className="font-semibold text-rose-800">Olası Sebepler & Çözümler:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><b>Supabase projeniz duraklatılmış (Paused) olabilir:</b> Supabase Dashboard'a girip projenizi "Restore" (Yeniden Başlat) edin.</li>
                    <li><b>Proje URL veya Key hatalı olabilir:</b> Aşağıdaki bağlantı ayarlarından URL'yi kontrol edin.</li>
                    <li><b>Tarayıcı Eklentisi / Reklam Engelleyici:</b> AdBlock veya VPN `supabase.co` adresini engelliyor olabilir.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          {message && (
            <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-lg border border-emerald-100 mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full rounded-xl border border-slate-300 py-2.5 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                  placeholder="ornek@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Şifre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full rounded-xl border border-slate-300 py-2.5 bg-white text-sm focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 mx-auto"
            >
              <Settings className="w-3.5 h-3.5" />
              Supabase Bağlantı Ayarlarını {showConfig ? 'Gizle' : 'Göster / Düzenle'}
            </button>

            {showConfig && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Supabase URL</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Supabase Anon Key</label>
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-[11px]"
                  />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-slate-400">Değişiklikler tarayıcıda kaydedilir</span>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Kaydet ve Yenile
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-center text-sm">
            <span className="text-slate-500">
              {isLogin ? 'Hesabınız yok mu?' : 'Zaten bir hesabınız var mı?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              {isLogin ? 'Hemen Kayıt Olun' : 'Giriş Yapın'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


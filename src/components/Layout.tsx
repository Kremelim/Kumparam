import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, FileText, PieChart, TrendingUp, ScanLine, Wallet, Edit2, Check, LineChart, User, Settings, LogOut, LogIn, Repeat, ShoppingCart, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AuthModal } from './AuthModal';

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Kontrol Paneli" },
  { to: "/transactions", icon: Receipt, label: "İşlemler" },
  { to: "/receipts", icon: ShoppingCart, label: "Fişler" },
  { to: "/regular-incomes", icon: Repeat, label: "Düzenli Gelirler" },
  { to: "/bills", icon: FileText, label: "Faturalar" },
  { to: "/budget", icon: PieChart, label: "Bütçeler" },
  { to: "/investments", icon: TrendingUp, label: "Yatırımlar" },
  { to: "/projection", icon: LineChart, label: "Strateji & Proje..." },
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const { appTitle, setAppTitle } = useFinance();
  const { user, isLoading } = useAuth();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(appTitle);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSidebarOpen(false); // Close sidebar on route change
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveTitle = () => {
    if (tempTitle.trim()) setAppTitle(tempTitle.trim());
    setIsEditingTitle(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsProfileMenuOpen(false);
  };

  const handleLoginClick = () => {
    setIsProfileMenuOpen(false);
    setIsAuthModalOpen(true);
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Finansal Özet';
      case '/transactions': return 'İşlemler';
      case '/receipts': return 'Fişler';
      case '/regular-incomes': return 'Düzenli Gelirler';
      case '/bills': return 'Faturalar';
      case '/budget': return 'Bütçeler';
      case '/investments': return 'Yatırımlar';
      case '/projection': return 'Akıllı Birikim Projeksiyonu';
      case '/scanner': return 'AI Fatura Oku';
      default: return 'Kontrol Paneli';
    }
  };

  const getUserInitials = () => {
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return 'G'; // G misafir için "Guest"
  };

  const displayName = user?.user_metadata?.full_name || 'Kullanıcı';
  const displayEmail = user?.email || 'Giriş yapılmadı';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Side Navigation */}
      <nav className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-60 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-800 mb-4 group relative flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-slate-900 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            {isEditingTitle ? (
              <div className="flex items-center bg-slate-800 rounded">
                <input 
                  type="text" 
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="bg-transparent text-white font-bold text-lg tracking-tight w-28 px-1 outline-none"
                />
                <button onClick={handleSaveTitle} className="text-emerald-400 p-1 hover:text-emerald-300">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-lg tracking-tight truncate mr-2" title={appTitle}>{appTitle}</span>
                <button 
                  onClick={() => { setTempTitle(appTitle); setIsEditingTitle(true); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-slate-800 text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-800 shrink-0">
          <NavLink to="/scanner" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all">
            <ScanLine className="w-4 h-4" />
            <span>Fatura Tara (AI)</span>
          </NavLink>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 truncate">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500">Son Güncelleme</p>
              <p className="text-sm font-semibold">Bugün</p>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border border-slate-300 text-slate-600 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
              >
                {isLoading ? '...' : getUserInitials()}
              </button>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-slate-100 mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                    {user && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                        Supabase ile Bağlı
                      </span>
                    )}
                  </div>
                  
                  {user ? (
                    <>
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition-colors">
                        <User className="w-4 h-4" /> Profil
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition-colors">
                        <Settings className="w-4 h-4" /> Ayarlar
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors">
                        <LogOut className="w-4 h-4" /> Çıkış Yap
                      </button>
                    </>
                  ) : (
                    <button onClick={handleLoginClick} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition-colors">
                      <LogIn className="w-4 h-4" /> Giriş Yap / Kayıt Ol
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Section */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

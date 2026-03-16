
import React, { useState } from 'react';
import { UserSession } from '../types';
import { Logo } from './Logo';
import { LogOut, Receipt, FileText, Users, BarChart3, Settings as SettingsIcon, Menu, ChevronRight, BookOpen, Archive } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  session: UserSession;
  currentView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'HISTORY', label: 'Histórico', icon: Receipt, adminOnly: false },
  { id: 'ARCHIVE', label: 'Arquivo', icon: Archive, adminOnly: false },
  { id: 'TRANSACTIONS', label: 'Livro Caixa', icon: BookOpen, adminOnly: false },
  { id: 'REPORT_NEW', label: 'Novo Relatório', icon: FileText, adminOnly: false },
  { id: 'DASHBOARD', label: 'Painel Geral', icon: BarChart3, adminOnly: true },
  { id: 'USERS', label: 'Equipe', icon: Users, adminOnly: true },
  { id: 'SETTINGS', label: 'Ajustes', icon: SettingsIcon, adminOnly: true },
];

export const Layout: React.FC<LayoutProps> = ({ children, session, currentView, onViewChange, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const filteredNav = navItems.filter(item => !item.adminOnly || session.role === 'ADMIN');

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#fdfdff]">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 bg-white border-r border-slate-100 p-6 flex flex-col transition-transform duration-500 ease-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-3xl' : '-translate-x-full'}`}>
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-indigo-100 shadow-xl">
            <Logo size="sm" className="w-5 h-5 brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">ADGU <span className="text-indigo-600">FINANÇAS</span></h1>
            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Gestão Ministerial</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 px-4">Menu Principal</p>
          {filteredNav.map(item => (
            <button
              key={item.id}
              onClick={() => { onViewChange(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group active-scale ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className={`p-2 rounded-xl transition-colors ${currentView === item.id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                <item.icon size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest flex-1 text-left">{item.label}</span>
              {currentView === item.id && <ChevronRight size={14} className="opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-50 space-y-4">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-rose-50 text-rose-600 font-black text-[9px] uppercase tracking-widest active-scale border border-rose-100 hover:bg-rose-100 transition-colors">
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="shrink-0 h-20 px-6 flex items-center justify-between lg:hidden z-40 bg-white/70 backdrop-blur-xl border-b border-slate-100">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-slate-900 text-white rounded-2xl active-scale shadow-lg"><Menu size={20} /></button>
          <div className="flex items-center gap-2"><Logo size="sm" className="w-6 h-6" /><span className="text-xs font-black uppercase tracking-widest text-slate-900">ADGU</span></div>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto scroll-container p-6 lg:p-10 pt-8 lg:pt-12">
          <div className="max-w-5xl mx-auto pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

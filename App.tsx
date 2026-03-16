
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ReportForm } from './components/ReportForm';
import { ReportHistory } from './components/ReportHistory';
import { AdminDashboard } from './components/AdminDashboard';
import { UserManagement } from './components/UserManagement';
import { TrashManager } from './components/TrashManager';
import { Settings } from './components/Settings';
import { TransactionManager } from './components/TransactionManager';
import { Logo } from './components/Logo';
import { UserSession, FinancialReport } from './types';
import { loginUser } from './services/storageService';
import { Lock, UserCircle, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

type ViewType = 'REPORT_NEW' | 'HISTORY' | 'DASHBOARD' | 'USERS' | 'TRASH' | 'SETTINGS' | 'TRANSACTIONS' | 'ARCHIVE';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('HISTORY');
  const [editingReport, setEditingReport] = useState<FinancialReport | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userLower = loginUsername.toLowerCase().trim();
    const passRaw = loginPassword.trim();

    if (!userLower || !passRaw) {
      setLoginError('Informe usuário e senha');
      return;
    }
    
    setLoginError('');
    setIsLoggingIn(true);
    
    if (userLower === 'adm' && passRaw === 'adm') {
      setSession({
        id: 'admin-master',
        name: 'Administrador Geral',
        role: 'ADMIN',
        institution: 'Sede Administrativa'
      });
      setCurrentView('DASHBOARD');
      setIsLoggingIn(false);
      return;
    }

    try {
      const user = await loginUser(userLower, passRaw);
      if (!user) {
        setLoginError('Usuário ou senha incorretos');
        setIsLoggingIn(false);
        return;
      }
      
      setSession({ 
        id: user.id, 
        name: user.name, 
        phone: user.phone,
        photo: user.photo,
        role: user.role, 
        institution: user.institution.trim()
      });
      
      setCurrentView(user.role === 'ADMIN' ? 'DASHBOARD' : 'HISTORY');
    } catch (err: any) {
      setLoginError('Erro de conexão');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenReport = (report: FinancialReport, readOnly: boolean = false) => {
    setEditingReport(report);
    setIsReadOnly(readOnly);
    setCurrentView('REPORT_NEW');
  };

  const renderContent = () => {
    if (!session) return null;
    switch (currentView) {
      case 'DASHBOARD': return <AdminDashboard session={session} />;
      case 'REPORT_NEW': return (
        <ReportForm 
          session={session} 
          initialData={editingReport || undefined}
          readOnly={isReadOnly}
          onFinished={() => { setEditingReport(null); setIsReadOnly(false); setCurrentView('HISTORY'); }} 
          onCancel={() => { setEditingReport(null); setIsReadOnly(false); setCurrentView('HISTORY'); }} 
        />
      );
      case 'HISTORY': return (
        <ReportHistory 
          session={session} 
          onEdit={(rep, ro) => handleOpenReport(rep, ro)}
          onBack={() => setCurrentView('HISTORY')} 
          onGoToTrash={() => setCurrentView('TRASH')}
        />
      );
      case 'TRANSACTIONS': return <TransactionManager session={session} onExportToReport={(rep) => handleOpenReport(rep)} />;
      case 'USERS': return <UserManagement session={session} />;
      case 'TRASH': return <TrashManager session={session} />;
      case 'ARCHIVE': return (
        <ReportHistory 
          session={session} 
          onEdit={(rep, ro) => handleOpenReport(rep, ro)}
          onBack={() => setCurrentView('HISTORY')} 
          showArchivedOnly={true}
        />
      );
      case 'SETTINGS': return <Settings />;
      default: return <ReportHistory session={session} onEdit={handleOpenReport} onBack={() => setCurrentView('HISTORY')} onGoToTrash={() => setCurrentView('TRASH')} />;
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 mesh-bg">
        <div className="max-w-xs w-full animate-in zoom-in-95 duration-700">
          <div className="bg-white/90 backdrop-blur-3xl p-8 rounded-[2.5rem] shadow-3xl border border-white flex flex-col items-center">
            <div className="mb-8 p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Logo size="sm" className="brightness-0 invert w-6 h-6" />
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Portal ADGU</h1>
              <p className="text-indigo-600 text-[8px] font-black uppercase tracking-[0.3em] mt-1">Gestão Ministerial</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 w-full">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Usuário</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-xs focus:ring-2 focus:ring-indigo-500/10 transition-all" placeholder="Seu login" autoCapitalize="none" disabled={isLoggingIn} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-xs focus:ring-2 focus:ring-indigo-500/10 transition-all" placeholder="••••" disabled={isLoggingIn} />
                </div>
              </div>
              {loginError && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-2 animate-in shake duration-300">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-rose-600 text-[8px] font-black uppercase leading-tight">{loginError}</p>
                </div>
              )}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-xl active-scale transition-all uppercase text-[9px] flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50">
                {isLoggingIn ? <RefreshCw className="animate-spin" size={14} /> : 'Acessar Painel'} <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout session={session} currentView={currentView} onViewChange={setCurrentView} onLogout={() => { setSession(null); setLoginUsername(''); setLoginPassword(''); setCurrentView('HISTORY'); }}>
      {renderContent()}
    </Layout>
  );
};

export default App;

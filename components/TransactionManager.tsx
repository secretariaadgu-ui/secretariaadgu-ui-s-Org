
import React, { useState, useEffect } from 'react';
import { DailyTransaction, UserSession, FinancialReport, MiscItem } from '../types';
import { getTransactions, saveTransaction, deleteTransaction } from '../services/storageService';
import { PlusCircle, Trash2, Edit3, ArrowUpRight, ArrowDownRight, X, Loader2, CheckCircle, DollarSign, Search, Filter, Save, Sparkles, Send, FileOutput, AlertCircle } from 'lucide-react';

interface TransactionManagerProps {
  session: UserSession;
  onExportToReport?: (report: FinancialReport) => void;
}

const REVENUE_CATEGORIES = ['Geral', 'Dízimo', 'Oferta', 'Oferta de Missões', 'Oferta Especial', 'Receita Financeira', 'Doação'];
const EXPENSE_CATEGORIES = ['Geral', 'Aluguel', 'Energia', 'Água', 'Internet', 'Limpeza', 'Manutenção', 'Prebenda', 'Sede', 'Social'];

export const TransactionManager: React.FC<TransactionManagerProps> = ({ session, onExportToReport }) => {
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Partial<DailyTransaction> | null>(null);
  const [manualDate, setManualDate] = useState('');

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('transactions-updated', handleUpdate);
    return () => window.removeEventListener('transactions-updated', handleUpdate);
  }, [session.institution]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getTransactions(session.role === 'ADMIN' ? undefined : session.institution);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      title: "Excluir Lançamento",
      message: "Deseja realmente excluir este lançamento?",
      onConfirm: async () => {
        try {
          await deleteTransaction(id);
          loadData();
          setStatusMessage({ type: 'success', text: "Lançamento excluído com sucesso." });
          setConfirmDialog(null);
        } catch (err) {
          setStatusMessage({ type: 'error', text: "Erro ao excluir lançamento." });
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleOpenModal = (tx?: DailyTransaction) => {
    const initialTx = tx || {
      type: 'RECEITA',
      date: new Date().toISOString().split('T')[0],
      status: 'PAGO',
      value: 0,
      description: '',
      category: 'Geral'
    };
    setEditingTx(initialTx);
    setManualDate(initialTx.date ? initialTx.date.split('-').reverse().join('/') : '');
    setShowModal(true);
  };

  const handleManualDateChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
    
    setManualDate(formatted);
    
    if (clean.length === 8) {
      const d = clean.slice(0, 2);
      const m = clean.slice(2, 4);
      const y = clean.slice(4, 8);
      setEditingTx(prev => prev ? {...prev, date: `${y}-${m}-${d}`} : null);
    }
  };

  const handleSave = async (stayOpen = false) => {
    if (!editingTx?.description || !editingTx?.value || !editingTx?.date) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSaving(true);
    
    // Feedback tátil para dispositivos móveis
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(15);
    }

    try {
      const tx: any = {
        ...editingTx,
        id: editingTx.id || crypto.randomUUID(),
        institutionName: session.institution,
        userId: session.id,
        createdAt: editingTx.createdAt || new Date().toISOString()
      };
      
      await saveTransaction(tx);
      setSuccessMessage("Lançamento Confirmado!");
      
      if (!stayOpen) {
        setShowModal(false);
      } else {
        // Reset para adicionar outro
        setEditingTx({
          ...editingTx,
          id: undefined,
          description: '',
          value: 0
        });
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar. Verifique sua conexão com o banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const filteredData = transactions
    .filter(tx => filterType === 'TODOS' || tx.type === filterType)
    .filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || tx.category.toLowerCase().includes(searchTerm.toLowerCase()));

  const totals = filteredData.reduce((acc, curr) => {
    if (curr.type === 'RECEITA') acc.receitas += curr.value;
    else acc.despesas += curr.value;
    return acc;
  }, { receitas: 0, despesas: 0 });

  const isFormValid = editingTx?.description && editingTx?.value && Number(editingTx.value) > 0;

  const handleExportToReport = () => {
    if (filteredData.length === 0) {
      setStatusMessage({ type: 'error', text: "Não há lançamentos no filtro atual para exportar." });
      return;
    }

    setConfirmDialog({
      title: "Exportar para Relatório",
      message: `Deseja exportar os ${filteredData.length} lançamentos filtrados para um novo relatório semanal?`,
      onConfirm: async () => {
        try {
          setConfirmDialog(null);
          const report: FinancialReport = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            institutionName: session.institution,
            reporterName: session.name,
            userId: session.id,
            locked: false,
            tithes: 0,
            offers: 0,
            specialOffers: 0,
            interestRevenue: 0,
            rentRevenue: 0,
            financialRevenue: 0,
            otherRevenues: [],
            rent: 0,
            water: 0,
            energy: 0,
            internet: 0,
            cleaning: 0,
            maintenance: 0,
            missions: 0,
            social: 0,
            otherExpenses: [],
            totalRevenue: 0,
            totalFixedExpenses: 0,
            sedeExpense: 0,
            prebendaExpense: 0,
            totalExpenses: 0,
            saldoGU: 0,
            currentBalance: 0,
            previousBalance: 0,
            attachments: [],
            createdAt: new Date().toISOString()
          };

          const otherRevenuesMap: Record<string, number> = {};
          const otherExpensesMap: Record<string, number> = {};

          filteredData.forEach(tx => {
            const val = Number(tx.value) || 0;
            if (tx.type === 'RECEITA') {
              if (tx.category === 'Dízimo') report.tithes += val;
              else if (tx.category === 'Oferta') report.offers += val;
              else if (tx.category === 'Oferta Especial') report.specialOffers += val;
              else if (tx.category === 'Receita Financeira') report.interestRevenue += val;
              else {
                otherRevenuesMap[tx.category] = (otherRevenuesMap[tx.category] || 0) + val;
              }
            } else {
              if (tx.category === 'Aluguel') report.rent += val;
              else if (tx.category === 'Energia') report.energy += val;
              else if (tx.category === 'Água') report.water += val;
              else if (tx.category === 'Internet') report.internet += val;
              else if (tx.category === 'Limpeza') report.cleaning += val;
              else if (tx.category === 'Manutenção') report.maintenance += val;
              else if (tx.category === 'Oferta de Missões') report.missions += val;
              else if (tx.category === 'Social') report.social += val;
              else {
                otherExpensesMap[tx.category] = (otherExpensesMap[tx.category] || 0) + val;
              }
            }
          });

          report.otherRevenues = Object.entries(otherRevenuesMap).map(([desc, val]) => ({
            id: crypto.randomUUID(),
            description: desc,
            value: val
          }));

          report.otherExpenses = Object.entries(otherExpensesMap).map(([desc, val]) => ({
            id: crypto.randomUUID(),
            description: desc,
            value: val
          }));

          // Recalculate totals
          const financialRevenueTotal = report.interestRevenue + report.rentRevenue;
          report.financialRevenue = financialRevenueTotal;
          const sumOtherRevenues = report.otherRevenues.reduce((acc, curr) => acc + curr.value, 0);
          report.totalRevenue = report.tithes + report.offers + report.specialOffers + financialRevenueTotal + sumOtherRevenues;

          const isCamposBelos = session.institution.toLowerCase().replace(/\s+/g, '').includes('camposbelos');
          report.sedeExpense = isCamposBelos ? 0 : report.totalRevenue * 0.20;
          report.prebendaExpense = isCamposBelos ? 0 : report.totalRevenue * 0.20;
          const revenue60 = isCamposBelos ? report.totalRevenue : report.totalRevenue * 0.60;

          const sumOtherExpenses = report.otherExpenses.reduce((acc, curr) => acc + curr.value, 0);
          report.totalFixedExpenses = report.rent + report.water + report.energy + report.internet + 
                                     report.cleaning + report.maintenance + report.missions + report.social + sumOtherExpenses;
          
          report.totalExpenses = report.sedeExpense + report.prebendaExpense + report.totalFixedExpenses;
          report.saldoGU = revenue60 - report.totalFixedExpenses;

          onExportToReport?.(report);
          setStatusMessage({ type: 'success', text: "Lançamentos exportados com sucesso!" });
        } catch (err) {
          setStatusMessage({ type: 'error', text: "Erro ao exportar lançamentos." });
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-white text-slate-900 px-8 py-4 rounded-[2rem] shadow-3xl border border-emerald-100 flex items-center gap-4 animate-in slide-in-from-top-10 duration-500">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <CheckCircle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Sucesso</span>
            <span className="text-xs font-bold text-slate-700">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-shadow">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entradas</p>
            <h3 className="text-xl font-black text-emerald-500">{formatBRL(totals.receitas)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
            <ArrowUpRight size={20}/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-slate-100 flex items-center justify-between group hover:shadow-lg transition-shadow">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Saídas</p>
            <h3 className="text-xl font-black text-rose-500">{formatBRL(totals.despesas)}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl group-hover:scale-110 transition-transform">
            <ArrowDownRight size={20}/>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200 flex items-center justify-between group overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">Saldo do Período</p>
            <h3 className="text-xl font-black">{formatBRL(totals.receitas - totals.despesas)}</h3>
          </div>
          <DollarSign size={80} className="absolute -right-4 -bottom-4 text-white opacity-5 group-hover:scale-110 transition-transform"/>
        </div>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          {['TODOS', 'RECEITA', 'DESPESA'].map((t: any) => (
            <button 
              key={t} 
              onClick={() => setFilterType(t)} 
              className={`px-4 md:px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterType === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative flex-1 w-full md:max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input 
            type="text" 
            placeholder="Filtrar lançamentos..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-slate-100 outline-none font-bold text-xs focus:ring-2 focus:ring-indigo-500/10 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportToReport} 
            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black text-[10px] uppercase tracking-widest active-scale hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
          >
            <FileOutput size={18}/> Exportar p/ Relatório
          </button>

          <button 
            onClick={() => handleOpenModal()} 
            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active-scale shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle size={18}/> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-soft overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px] border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-5">Descrição / Data</th>
              <th className="px-6 py-5">Categoria</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-right">Valor</th>
              <th className="px-6 py-5 text-center w-28">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={32}/></td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase text-[10px]">Nenhum lançamento encontrado</td></tr>
            ) : filteredData.map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px] group-hover:text-indigo-600 transition-colors">{tx.description}</h4>
                  <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-md uppercase ${tx.type === 'RECEITA' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {tx.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-md uppercase ${tx.status === 'PAGO' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    {tx.status}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-black text-xs ${tx.type === 'RECEITA' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {tx.type === 'RECEITA' ? '+' : '-'} {formatBRL(tx.value)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(tx)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors active-scale"><Edit3 size={16}/></button>
                    <button onClick={() => handleDelete(tx.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors active-scale"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Add/Edit Modal */}
      {showModal && editingTx && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isSaving && setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-3xl animate-in zoom-in-95 duration-500">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">{editingTx.id ? 'Editar Registro' : 'Novo Lançamento'}</h3>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Preencha os detalhes financeiros</p>
                </div>
                <button onClick={() => !isSaving && setShowModal(false)} className="p-2 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-xl transition-colors"><X size={20}/></button>
             </div>
             
             <div className="space-y-6">
                <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200/50">
                   <button 
                    onClick={() => setEditingTx({...editingTx, type: 'RECEITA'})} 
                    className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${editingTx.type === 'RECEITA' ? 'bg-white text-emerald-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600 scale-95'}`}
                   >Receita</button>
                   <button 
                    onClick={() => setEditingTx({...editingTx, type: 'DESPESA'})} 
                    className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${editingTx.type === 'DESPESA' ? 'bg-white text-rose-600 shadow-md scale-100' : 'text-slate-400 hover:text-slate-600 scale-95'}`}
                   >Despesa</button>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Descrição do Lançamento</label>
                      <input type="text" value={editingTx.description || ''} onChange={e => setEditingTx({...editingTx, description: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all" placeholder="Ex: Oferta de Domingo, Conta de Luz..." />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Valor (R$)</label>
                        <input type="number" step="0.01" value={editingTx.value ?? ''} onChange={e => setEditingTx({...editingTx, value: parseFloat(e.target.value)})} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all" placeholder="0,00" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Data (DD/MM/AAAA)</label>
                        <input 
                          type="text" 
                          value={manualDate} 
                          onChange={e => handleManualDateChange(e.target.value)} 
                          placeholder="00/00/0000"
                          className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all" 
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Categoria</label>
                        <select value={editingTx.category || 'Geral'} onChange={e => setEditingTx({...editingTx, category: e.target.value})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-xs outline-none cursor-pointer focus:bg-white transition-all">
                           {(editingTx.type === 'RECEITA' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Status Atual</label>
                        <select value={editingTx.status || 'PAGO'} onChange={e => setEditingTx({...editingTx, status: e.target.value as any})} className="w-full p-5 bg-slate-50 rounded-2xl font-bold text-xs outline-none cursor-pointer focus:bg-white transition-all">
                           <option value="PAGO">Pago</option>
                           <option value="PENDENTE">Pendente</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div className="pt-8 space-y-3">
                   {/* Botão de Destaque solicitado pelo usuário */}
                   <button 
                    onClick={() => handleSave(false)} 
                    disabled={isSaving} 
                    className={`w-full py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] active-scale shadow-2xl transition-all flex items-center justify-center gap-3 ${
                      isFormValid 
                        ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02]' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                    }`}
                   >
                     {isSaving ? (
                       <Loader2 className="animate-spin" size={20}/>
                     ) : (
                       <>
                        {isFormValid ? <Sparkles size={18} className="animate-pulse" /> : <Save size={18}/>}
                        {editingTx.id ? 'Atualizar Registro' : 'Confirmar e Salvar'}
                       </>
                     )}
                   </button>

                   {!editingTx.id && (
                     <button 
                      onClick={() => handleSave(true)} 
                      disabled={isSaving} 
                      className="w-full py-5 bg-white text-indigo-600 border-2 border-indigo-50 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] active-scale flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all"
                     >
                       <PlusCircle size={18}/> Salvar e Adicionar Outro
                     </button>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={confirmDialog.onCancel} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={confirmDialog.onCancel}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[400] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 ${
          statusMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
};

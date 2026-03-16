
import React, { useState, useEffect } from 'react';
import { FinancialReport, UserSession } from '../types';
import { 
  getReports, 
  restoreReport, 
  deleteReportPermanently 
} from '../services/storageService';
import { Trash2, RotateCcw, AlertCircle, FileText, User, Clock, CheckCircle } from 'lucide-react';

interface TrashManagerProps {
  session: UserSession;
}

export const TrashManager: React.FC<TrashManagerProps> = ({ session }) => {
  const [deletedReports, setDeletedReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setLoading(true);
    // Filtro de unidade: Se não for admin, passa a instituição do usuário
    const institutionFilter = session.role === 'ADMIN' ? undefined : session.institution;
    const reps = await getReports(institutionFilter, true);
    setDeletedReports(reps);
    setLoading(false);
  };

  const handleRestore = async (id: string) => {
    await restoreReport(id);
    loadTrash();
  };

  const handlePermanentDelete = async (id: string) => {
    setConfirmDialog({
      title: "Exclusão Permanente",
      message: "ATENÇÃO: Esta ação é definitiva e não pode ser desfeita. Deseja continuar?",
      onConfirm: async () => {
        try {
          await deleteReportPermanently(id);
          loadTrash();
          setStatusMessage({ type: 'success', text: "Relatório excluído permanentemente." });
          setConfirmDialog(null);
        } catch (err) {
          setStatusMessage({ type: 'error', text: "Erro ao excluir permanentemente." });
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Lixeira do Sistema</h2>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
            {session.role === 'ADMIN' ? 'Gerenciamento de relatórios excluídos (Todas as Unidades)' : `Itens excluídos: ${session.institution}`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-black uppercase text-[10px] animate-pulse">Carregando Lixeira...</div>
        ) : (
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="p-6 text-[8px] font-black text-slate-400 uppercase tracking-widest">Relatório Excluído</th>
                <th className="p-6 text-[8px] font-black text-slate-400 uppercase tracking-widest">Excluído Por</th>
                <th className="p-6 text-[8px] font-black text-slate-400 uppercase tracking-widest">Data Exclusão</th>
                <th className="p-6 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Bruto</th>
                <th className="p-6 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {deletedReports.map(rep => (
                <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors opacity-70">
                  <td className="p-6">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase">Fechamento: {rep.date ? rep.date.split('-').reverse().join('/') : 'N/A'}</h4>
                    <p className="text-[7px] font-bold text-slate-400 uppercase">{rep.institutionName}</p>
                  </td>
                  <td className="p-6">
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase">
                      <User size={12}/> {rep.deletedBy || 'Desconhecido'}
                    </div>
                  </td>
                  <td className="p-6">
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase">
                      <Clock size={12}/> {rep.deletedAt ? new Date(rep.deletedAt).toLocaleString('pt-BR') : 'N/A'}
                    </div>
                  </td>
                  <td className="p-6 text-right font-black text-xs text-slate-900">{formatBRL(rep.totalRevenue)}</td>
                  <td className="p-6">
                      <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleRestore(rep.id)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl active-scale" title="Restaurar"><RotateCcw size={16}/></button>
                      
                      {/* Apenas Admins ou o próprio criador podem excluir permanentemente se desejado, 
                          mas aqui manteremos habilitado para todos limparem seu lixo conforme solicitado */}
                      <button onClick={() => handlePermanentDelete(rep.id)} className="p-2 bg-rose-50 text-rose-500 rounded-xl active-scale" title="Excluir Permanente"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {deletedReports.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">A Lixeira está vazia</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all"
              >
                Excluir
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


import React, { useState, useEffect } from 'react';
import { FinancialReport, UserSession } from '../types';
import { getReports, getSettings, deleteReport, updateReportLockStatus, archiveReportsByMonth } from '../services/storageService';
import { Calendar, Search, RefreshCw, ImageIcon, X, Send, Eye, Download, FileDown, Edit3, Trash2, Lock, Unlock, AlertTriangle, Trash, TrendingUp, Wallet, CheckCircle, Building2, FileText, Archive, Receipt } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ReportHistoryProps {
  session: UserSession;
  onBack: () => void;
  onEdit?: (report: FinancialReport, readOnly?: boolean) => void;
  onGoToTrash?: () => void;
  showArchivedOnly?: boolean;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({ session, onBack, onEdit, onGoToTrash, showArchivedOnly = false }) => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<string>('ALL');
  const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveMonth, setArchiveMonth] = useState('');
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear().toString());
  const [isArchiving, setIsArchiving] = useState(false);
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
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const allReports = await getReports();
      const filtered = allReports.filter(r => 
        (session.role === 'ADMIN' || 
        r.institutionName.toLowerCase() === session.institution.toLowerCase()) &&
        (showArchivedOnly ? r.archived : !r.archived)
      );
      setReports(filtered);
    } catch (err) { 
      console.error("Erro ao buscar relatórios:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchReports();
    const handleUpdate = () => fetchReports();
    window.addEventListener('reports-updated', handleUpdate);
    return () => window.removeEventListener('reports-updated', handleUpdate);
  }, [session.institution]);

  const handleDeleteReport = async (id: string) => {
    setConfirmDialog({
      title: "Excluir Relatório",
      message: "Deseja realmente mover este relatório para a lixeira?",
      onConfirm: async () => {
        try {
          await deleteReport(id, session.name);
          setStatusMessage({ type: 'success', text: "Relatório movido para a lixeira." });
          setConfirmDialog(null);
        } catch (err) {
          setStatusMessage({ type: 'error', text: "Erro ao excluir. Verifique sua conexão ou permissões." });
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleToggleLock = async (report: FinancialReport) => {
    if (session.role !== 'ADMIN') return;
    const newStatus = !report.locked;
    
    setConfirmDialog({
      title: newStatus ? "Bloquear Período" : "Desbloquear Período",
      message: `Deseja ${newStatus ? 'FECHAR' : 'ABRIR'} este período para edições?`,
      onConfirm: async () => {
        try {
          await updateReportLockStatus(report.id, newStatus);
          setStatusMessage({ type: 'success', text: `Período ${newStatus ? 'bloqueado' : 'desbloqueado'} com sucesso.` });
          setConfirmDialog(null);
        } catch (err) {
          setStatusMessage({ type: 'error', text: "Erro ao alterar bloqueio." });
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const handleArchiveMonth = async () => {
    if (!archiveMonth || !archiveYear) {
      setStatusMessage({ type: 'error', text: "Selecione o mês e o ano para arquivar." });
      return;
    }
    
    setConfirmDialog({
      title: "Fechar Período Mensal",
      message: `Deseja realmente fechar e arquivar todos os relatórios de ${archiveMonth}/${archiveYear}? Eles sairão do histórico principal e serão bloqueados.`,
      onConfirm: async () => {
        try {
          setIsArchiving(true);
          setConfirmDialog(null);
          await archiveReportsByMonth(archiveMonth, archiveYear, selectedInstitution);
          setShowArchiveModal(false);
          setStatusMessage({ type: 'success', text: "Mês arquivado com sucesso!" });
        } catch (err) {
          setStatusMessage({ type: 'error', text: "Erro ao arquivar relatórios." });
        } finally {
          setIsArchiving(false);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const ReportCard: React.FC<{ report: FinancialReport }> = ({ report }) => (
    <div key={report.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row items-center justify-between group transition-all gap-6 relative overflow-hidden ${report.locked ? 'bg-slate-50/50 border-slate-100' : 'border-slate-50 hover:border-indigo-100 hover:shadow-xl hover:shadow-slate-200/50'}`}>
      {!report.locked && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
      
      <div className="flex items-center gap-6 w-full md:w-auto">
        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm ${report.locked ? 'bg-slate-200 text-slate-500' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white'}`}>
          {report.locked ? <Lock size={24} /> : <FileText size={24} />}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight">{report.date.split('-').reverse().join('/')}</h4>
            {report.locked && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest">{report.archived ? 'Arquivado' : 'Período Fechado'}</span>}
          </div>
          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">{report.institutionName}</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Receita</span>
              <span className="text-[10px] font-black text-slate-900">{formatBRL(report.totalRevenue)}</span>
            </div>
            <div className="w-px h-6 bg-slate-100"></div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Líquido</span>
              <span className="text-[10px] font-black text-emerald-600">{formatBRL(report.saldoGU)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center md:justify-end gap-3 w-full md:w-auto">
        <div className="flex gap-2 bg-slate-50 p-2 rounded-3xl border border-slate-100">
          {session.role === 'ADMIN' && (
            <button onClick={() => handleToggleLock(report)} className={`p-3 rounded-2xl active-scale transition-all ${report.locked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white text-amber-500 hover:bg-amber-500 hover:text-white shadow-sm'}`} title={report.locked ? "Abrir Edição" : "Trancar Período"}>
              {report.locked ? <Unlock size={18}/> : <Lock size={18}/>}
            </button>
          )}

          <button onClick={() => onEdit?.(report, true)} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-indigo-600 transition-all active-scale shadow-sm" title="Visualizar">
            <Eye size={18}/>
          </button>

          {canManage(report) && (
            <>
              <button onClick={() => onEdit?.(report, false)} className="p-3 bg-white text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active-scale shadow-sm" title="Editar">
                <Edit3 size={18}/>
              </button>
              <button onClick={() => handleDeleteReport(report.id)} className="p-3 bg-white text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active-scale shadow-sm" title="Excluir">
                <Trash2 size={18}/>
              </button>
            </>
          )}
        </div>
        
        <button 
          onClick={() => generatePDF(report)}
          className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active-scale shadow-lg"
          title="Baixar PDF"
        >
          <FileDown size={18}/>
        </button>
      </div>
    </div>
  );

  const handleManualDateChange = (val: string, type: 'start' | 'end') => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
    
    if (type === 'start') {
      setManualStart(formatted);
      if (clean.length === 8) {
        const d = clean.slice(0, 2);
        const m = clean.slice(2, 4);
        const y = clean.slice(4, 8);
        setStartDate(`${y}-${m}-${d}`);
      } else if (clean.length === 0) {
        setStartDate('');
      }
    } else {
      setManualEnd(formatted);
      if (clean.length === 8) {
        const d = clean.slice(0, 2);
        const m = clean.slice(2, 4);
        const y = clean.slice(4, 8);
        setEndDate(`${y}-${m}-${d}`);
      } else if (clean.length === 0) {
        setEndDate('');
      }
    }
  };

  const generatePDF = async (report: FinancialReport) => {
    const settings = await getSettings();
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // Background decoration
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(0, 40, pageWidth, 40);

    if (settings.logo) {
      try { 
        const logoWidth = 25;
        const logoHeight = 25;
        doc.addImage(settings.logo, 'PNG', 15, 8, logoWidth, logoHeight); 
      } catch (e) {
        console.error("Logo error", e);
      }
    }
    
    // Header Info
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
    doc.text(settings.institutionName.toUpperCase(), 45, 18);
    
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    doc.text(`RELATÓRIO DE FECHAMENTO FINANCEIRO`, 45, 24);
    doc.text(`UNIDADE: ${report.institutionName.toUpperCase()}`, 45, 28);
    doc.text(`DATA REF: ${report.date.split('-').reverse().join('/')}`, 45, 32);

    currentY = 50;

    const isCamposBelos = report.institutionName.toLowerCase().replace(/\s+/g, '').includes('camposbelos');
    const tableStyles = { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 };

    // Section 1: Entradas
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(79, 70, 229);
    doc.text("1. DESCRITIVO DE ENTRADAS", 15, currentY);
    currentY += 5;

    doc.autoTable({
      startY: currentY,
      head: [['CATEGORIA', 'VALOR']],
      body: [
        ['Dízimos', formatBRL(report.tithes)],
        ['Ofertas Gerais', formatBRL(report.offers)],
        ['Ofertas Especiais', formatBRL(report.specialOffers)],
        ['Receita Financeira', formatBRL(report.financialRevenue)],
        ...report.otherRevenues.map(r => [r.description || 'Outra Receita', formatBRL(r.value)]),
        [{ content: 'TOTAL BRUTO DE ENTRADAS', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: formatBRL(report.totalRevenue), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } }]
      ],
      theme: 'grid',
      styles: tableStyles,
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right', width: 40 } }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Section 2: Repasses (if not Campos Belos)
    if (!isCamposBelos) {
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
      doc.text("2. RESUMO DE REPASSES E DISTRIBUIÇÃO", 15, currentY);
      currentY += 5;

      doc.autoTable({
        startY: currentY,
        head: [['DESCRIÇÃO', 'PERCENTUAL', 'VALOR']],
        body: [
          ['Sede Administrativa', '20%', `- ${formatBRL(report.sedeExpense)}`],
          ['Prebenda Pastoral', '20%', `- ${formatBRL(report.prebendaExpense)}`],
          [{ content: 'VALOR LÍQUIDO DISPONÍVEL P/ UNIDADE', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: '60%', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: formatBRL(report.totalRevenue - report.sedeExpense - report.prebendaExpense), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } }]
        ],
        theme: 'grid',
        styles: tableStyles,
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        columnStyles: { 1: { halign: 'center', width: 30 }, 2: { halign: 'right', width: 40 } }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Section 3: Despesas
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(225, 29, 72);
    doc.text(`${isCamposBelos ? '2' : '3'}. DESCRITIVO DE DESPESAS OPERACIONAIS`, 15, currentY);
    currentY += 5;

    doc.autoTable({
      startY: currentY,
      head: [['CONTA / DESPESA', 'VALOR']],
      body: [
        ['Aluguel do Prédio', formatBRL(report.rent)],
        ['Energia Elétrica', formatBRL(report.energy)],
        ['Água / Saneamento', formatBRL(report.water)],
        ['Internet / Telefone', formatBRL(report.internet)],
        ['Limpeza / Produtos', formatBRL(report.cleaning)],
        ['Manutenção / Reparos', formatBRL(report.maintenance)],
        ['Oferta Missões', formatBRL(report.missions)],
        ['Assistência Social', formatBRL(report.social)],
        ...report.otherExpenses.map(e => [e.description || 'Outra Despesa', formatBRL(e.value)]),
        [{ content: 'TOTAL DE DESPESAS DA UNIDADE', styles: { fontStyle: 'bold', fillColor: [255, 241, 242] } }, { content: formatBRL(report.totalFixedExpenses), styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 241, 242] } }]
      ],
      theme: 'grid',
      styles: tableStyles,
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right', width: 40 } }
    });

    // Summary Box
    currentY = doc.lastAutoTable.finalY + 15;
    if (currentY > pageHeight - 50) { doc.addPage(); currentY = 20; }

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(15, currentY, pageWidth - 30, 35, 2, 2, 'F');
    
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text("RESUMO DE SALDOS", 25, currentY + 10);
    
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
    doc.text(`SALDO ANTERIOR:`, 25, currentY + 18);
    doc.text(`RESULTADO LÍQUIDO (GU):`, 25, currentY + 24);
    doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(`SALDO ATUAL EM CAIXA:`, 25, currentY + 31);

    doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text(formatBRL(report.previousBalance), pageWidth - 25, currentY + 18, { align: 'right' });
    doc.text(formatBRL(report.saldoGU), pageWidth - 25, currentY + 24, { align: 'right' });
    doc.setFontSize(11); doc.setTextColor(52, 211, 153);
    doc.text(formatBRL(report.currentBalance), pageWidth - 25, currentY + 31, { align: 'right' });

    // Footer
    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(148, 163, 184);
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Este relatório foi emitido por ${report.reporterName} em ${dateStr} às ${timeStr}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`ADGU_Relatorio_${report.institutionName.replace(/\s+/g, '_')}_${report.date}.pdf`);
  };

  const generateConsolidatedPDF = async () => {
    const settings = await getSettings();
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = 15;

    if (settings.logo) {
      try {
        const logoSize = 20;
        doc.addImage(settings.logo, 'PNG', (pageWidth / 2) - (logoSize / 2), currentY, logoSize, logoSize);
        currentY += logoSize + 6;
      } catch (e) { console.error(e); }
    }

    // Header Info
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
    doc.text(settings.institutionName.toUpperCase(), 45, 18);
    
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(79, 70, 229);
    const periodLabel = getPeriodLabel();
    doc.text(`RELATÓRIO CONSOLIDADO DE MOVIMENTAÇÃO`, 45, 24);
    doc.setFontSize(7); doc.setTextColor(100, 116, 139);
    doc.text(periodLabel.toUpperCase(), 45, 28);

    currentY = 45;

    const tableBody = filtered.map(r => [
      r.institutionName,
      r.date ? r.date.split('-').reverse().join('/') : 'N/A',
      formatBRL(r.totalRevenue || 0),
      formatBRL(r.totalExpenses || 0),
      formatBRL(r.saldoGU || 0)
    ]);

    doc.autoTable({
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['CONGREGAÇÃO', 'DATA REF.', 'RECEITA BRUTA', 'SAÍDAS TOTAIS', 'LÍQUIDO UNIDADE']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], halign: 'center', fontSize: 8, cellPadding: 3 },
      styles: { fontSize: 7, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } }
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const totals = filtered.reduce((acc, curr) => ({
      revenue: acc.revenue + (curr.totalRevenue || 0),
      expenses: acc.expenses + (curr.totalExpenses || 0),
      saldoGU: acc.saldoGU + (curr.saldoGU || 0),
    }), { revenue: 0, expenses: 0, saldoGU: 0 });

    currentY = doc.lastAutoTable.finalY + 15;
    if (currentY > pageHeight - 40) { doc.addPage(); currentY = 20; }

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 20, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 20, 'D');

    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
    doc.text("TOTAIS CONSOLIDADOS DO PERÍODO:", margin + 5, currentY + 8);
    
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    doc.text(`RECEITA TOTAL: ${formatBRL(totals.revenue)}`, margin + 5, currentY + 14);
    doc.text(`SAÍDAS TOTAIS: ${formatBRL(totals.expenses)}`, pageWidth / 2, currentY + 14, { align: 'center' });
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(5, 150, 105);
    doc.text(`SALDO LÍQUIDO: ${formatBRL(totals.saldoGU)}`, pageWidth - margin - 5, currentY + 14, { align: 'right' });

    doc.save(`Consolidado_Historico_${periodLabel.replace(/\s+/g, '_')}.pdf`);
  };

  const getPeriodLabel = () => {
    let periodLabel = "TODO O HISTÓRICO";
    if (startDate || endDate) {
      const start = startDate ? startDate.split('-').reverse().join('/') : '...';
      const end = endDate ? endDate.split('-').reverse().join('/') : '...';
      periodLabel = `PERÍODO DE ${start} ATÉ ${end}`;
    }
    if (selectedInstitution !== 'ALL') {
      periodLabel = `${selectedInstitution} - ${periodLabel}`;
    }
    return periodLabel;
  };

  const filtered = reports.filter(r => {
    const matchesSearch = r.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.date.split('-').reverse().join('/').includes(searchTerm);
    
    let matchesDate = true;
    if (startDate && endDate) {
      matchesDate = r.date >= startDate && r.date <= endDate;
    } else if (startDate) {
      matchesDate = r.date >= startDate;
    } else if (endDate) {
      matchesDate = r.date <= endDate;
    }

    const matchesInstitution = selectedInstitution === 'ALL' || r.institutionName === selectedInstitution;

    return matchesSearch && matchesDate && matchesInstitution;
  });

  const consolidatedTotals = filtered.reduce((acc, curr) => ({
    revenue: acc.revenue + (curr.totalRevenue || 0),
    expenses: acc.expenses + (curr.totalExpenses || 0),
    saldoGU: acc.saldoGU + (curr.saldoGU || 0),
  }), { revenue: 0, expenses: 0, saldoGU: 0 });

  const categoryTotals = filtered.reduce((acc, curr) => ({
    tithes: acc.tithes + (curr.tithes || 0),
    offers: acc.offers + (curr.offers || 0),
    specialOffers: acc.specialOffers + (curr.specialOffers || 0),
    financialRevenue: acc.financialRevenue + (curr.financialRevenue || 0),
    otherRevenues: acc.otherRevenues + (curr.otherRevenues?.reduce((sum, r) => sum + (r.value || 0), 0) || 0),
    sedeExpense: acc.sedeExpense + (curr.sedeExpense || 0),
    prebendaExpense: acc.prebendaExpense + (curr.prebendaExpense || 0),
    rent: acc.rent + (curr.rent || 0),
    energy: acc.energy + (curr.energy || 0),
    water: acc.water + (curr.water || 0),
    internet: acc.internet + (curr.internet || 0),
    cleaning: acc.cleaning + (curr.cleaning || 0),
    maintenance: acc.maintenance + (curr.maintenance || 0),
    missions: acc.missions + (curr.missions || 0),
    social: acc.social + (curr.social || 0),
    otherExpenses: acc.otherExpenses + (curr.otherExpenses?.reduce((sum, e) => sum + (e.value || 0), 0) || 0),
  }), {
    tithes: 0, offers: 0, specialOffers: 0, financialRevenue: 0, otherRevenues: 0,
    sedeExpense: 0, prebendaExpense: 0, rent: 0, energy: 0, water: 0,
    internet: 0, cleaning: 0, maintenance: 0, missions: 0, social: 0, otherExpenses: 0
  });

  const institutions = Array.from(new Set(reports.map(r => r.institutionName))).sort();

  const canManage = (report: FinancialReport) => {
    if (session.role === 'ADMIN') return true;
    const isSameUnit = report.institutionName.toLowerCase() === session.institution.toLowerCase();
    const isNotLocked = !report.locked;
    return isSameUnit && isNotLocked;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
              {showArchivedOnly ? <Archive size={18}/> : <Receipt size={18}/>}
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {showArchivedOnly ? 'Arquivo de Relatórios' : 'Histórico de Relatórios'}
            </h2>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
            {showArchivedOnly 
              ? 'Consulte prestações de contas de meses encerrados' 
              : 'Gerencie e visualize todas as prestações de contas enviadas'}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex-1 flex flex-col md:flex-row gap-6 items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
          
          {session.role === 'ADMIN' && (
            <div className="w-full md:w-auto flex flex-col gap-1.5 relative z-10">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Unidade</label>
              <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:border-indigo-100 transition-all shadow-inner">
                <Building2 size={14} className="text-indigo-400" />
                <select 
                  value={selectedInstitution}
                  onChange={e => setSelectedInstitution(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-900 min-w-[140px]"
                >
                  <option value="ALL">Todas Unidades</option>
                  {institutions.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="w-full flex-1 flex flex-col gap-1.5 relative z-10">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Pesquisa</label>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Nome ou data (DD/MM/AAAA)..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent outline-none font-bold text-xs focus:bg-white focus:border-indigo-100 transition-all shadow-inner" 
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col gap-1.5 relative z-10">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Período</label>
            <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:border-indigo-100 transition-all shadow-inner">
              <Calendar size={16} className="text-indigo-400" />
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={manualStart} 
                  onChange={e => handleManualDateChange(e.target.value, 'start')}
                  placeholder="Início"
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none w-[65px] placeholder:text-slate-300"
                />
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <input 
                  type="text" 
                  value={manualEnd} 
                  onChange={e => handleManualDateChange(e.target.value, 'end')}
                  placeholder="Fim"
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none w-[65px] placeholder:text-slate-300"
                />
              </div>
              {(manualStart || manualEnd) && (
                <button 
                  onClick={() => { setManualStart(''); setManualEnd(''); setStartDate(''); setEndDate(''); }}
                  className="p-1.5 bg-slate-200/50 hover:bg-rose-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-row lg:flex-col gap-4">
          {session.role === 'ADMIN' && !showArchivedOnly && (
            <button 
              onClick={() => setShowArchiveModal(true)}
              className="flex-1 lg:flex-none p-6 bg-amber-600 text-white rounded-[2rem] shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all flex items-center justify-center gap-3 active-scale group"
              title="Arquivar Mês / Fechar Prestação"
            >
              <Archive size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Arquivar</span>
            </button>
          )}

          {session.role === 'ADMIN' && filtered.length > 0 && (
            <button 
              onClick={() => setShowConsolidatedModal(true)}
              className="flex-1 lg:flex-none p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3 active-scale group"
              title="Visualizar Relatório Consolidado"
            >
              <TrendingUp size={20} className="group-hover:scale-110 transition-transform text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Totalizar</span>
            </button>
          )}

          <button 
            onClick={onGoToTrash}
            className="p-6 bg-white text-slate-400 border border-slate-100 rounded-[2rem] shadow-soft hover:text-rose-500 hover:border-rose-100 transition-all flex items-center justify-center gap-3 active-scale"
            title="Ver relatórios excluídos"
          >
            <Trash2 size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">Lixeira</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Summary */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
           <div className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Relatórios</p>
              <p className="text-sm font-black text-slate-900">{filtered.length}</p>
           </div>
           <div className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Total</p>
              <p className="text-sm font-black text-indigo-600">{formatBRL(consolidatedTotals.revenue)}</p>
           </div>
           <div className="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Saídas Totais</p>
              <p className="text-sm font-black text-rose-600">{formatBRL(consolidatedTotals.expenses)}</p>
           </div>
           <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm">
              <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1">Saldo Líquido</p>
              <p className="text-sm font-black text-emerald-700">{formatBRL(consolidatedTotals.saldoGU)}</p>
           </div>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="animate-spin text-indigo-500" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Banco de Dados...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <FileDown size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum relatório encontrado</p>
          </div>
        ) : showArchivedOnly ? (
          Object.entries(
            filtered.reduce((acc, report) => {
              const month = report.archiveMonth || 'Sem Mês';
              if (!acc[month]) acc[month] = [];
              acc[month].push(report);
              return acc;
            }, {} as Record<string, FinancialReport[]>)
          ).sort((a, b) => b[0].localeCompare(a[0])).map(([month, monthReports]) => (
            <div key={month} className="space-y-4 mb-8">
              <div className="flex items-center gap-4 px-4">
                <div className="h-px flex-1 bg-slate-100"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1 rounded-full border border-slate-100">
                  Arquivado em: {month}
                </span>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <div className="grid gap-4">
                {(monthReports as FinancialReport[]).map(report => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </div>
          ))
        ) : (
          filtered.map(report => (
            <ReportCard key={report.id} report={report} />
          ))
        )}
      </div>

      {/* Modal de Arquivamento */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Arquivar Mês</h3>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Fechar prestação de contas mensal</p>
              </div>
              <button onClick={() => setShowArchiveModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20}/></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Mês de Referência</label>
                <select 
                  value={archiveMonth} 
                  onChange={e => setArchiveMonth(e.target.value)}
                  className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all"
                >
                  <option value="">Selecione o Mês</option>
                  <option value="01">Janeiro</option>
                  <option value="02">Fevereiro</option>
                  <option value="03">Março</option>
                  <option value="04">Abril</option>
                  <option value="05">Maio</option>
                  <option value="06">Junho</option>
                  <option value="07">Julho</option>
                  <option value="08">Agosto</option>
                  <option value="09">Setembro</option>
                  <option value="10">Outubro</option>
                  <option value="11">Novembro</option>
                  <option value="12">Dezembro</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Ano</label>
                <input 
                  type="number" 
                  value={archiveYear} 
                  onChange={e => setArchiveYear(e.target.value)}
                  className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all"
                />
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleArchiveMonth}
                  disabled={isArchiving}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active-scale flex items-center justify-center gap-3"
                >
                  {isArchiving ? <RefreshCw className="animate-spin" size={18}/> : <><Archive size={18}/> Confirmar Arquivamento</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Relatório Consolidado */}
      {showConsolidatedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatório Consolidado</h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{getPeriodLabel()}</p>
              </div>
              <button 
                onClick={() => setShowConsolidatedModal(false)}
                className="p-3 hover:bg-slate-200 rounded-2xl text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50/30">
              {/* Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
                  <div>
                    <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
                      <TrendingUp size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Consolidada</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{formatBRL(consolidatedTotals.revenue)}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <p className="text-[8px] font-bold text-indigo-500 uppercase">Total Bruto das Unidades</p>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-rose-200 transition-all">
                  <div>
                    <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4 group-hover:scale-110 transition-transform">
                      <Wallet size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Despesas Totais</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{formatBRL(consolidatedTotals.expenses)}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <p className="text-[8px] font-bold text-rose-500 uppercase">Incluindo Repasses e Fixas</p>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 flex flex-col justify-between group">
                  <div>
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
                      <CheckCircle size={20} />
                    </div>
                    <p className="text-[10px] font-black text-indigo-300/50 uppercase tracking-widest mb-1">Saldo Líquido (GU)</p>
                    <p className="text-3xl font-black text-white tracking-tight">{formatBRL(consolidatedTotals.saldoGU)}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[8px] font-bold text-emerald-400 uppercase">Disponível para Investimento</p>
                  </div>
                </div>
              </div>

              {/* Detalhamento por Categoria */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    Detalhamento de Entradas
                  </h4>
                  <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Dízimos</span>
                        <span className="text-slate-900">{formatBRL(categoryTotals.tithes)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Ofertas Gerais</span>
                        <span className="text-slate-900">{formatBRL(categoryTotals.offers)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Ofertas Especiais</span>
                        <span className="text-slate-900">{formatBRL(categoryTotals.specialOffers)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Receita Financeira</span>
                        <span className="text-slate-900">{formatBRL(categoryTotals.financialRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1">
                        <span className="text-slate-500">Outras Receitas</span>
                        <span className="text-slate-900">{formatBRL(categoryTotals.otherRevenues)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                    Detalhamento de Saídas
                  </h4>
                  <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Repasse Sede</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.sedeExpense)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Prebenda</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.prebendaExpense)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Aluguel</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.rent)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Energia</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.energy)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Água</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.water)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Manutenção</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.maintenance)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-50">
                        <span className="text-slate-500">Missões</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.missions)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold py-1">
                        <span className="text-slate-500">Outras</span>
                        <span className="text-rose-600">{formatBRL(categoryTotals.otherExpenses)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalhamento de Outros Lançamentos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                    Outras Receitas Detalhadas
                  </h4>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase">Unidade</th>
                          <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase">Descrição</th>
                          <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.flatMap(r => r.otherRevenues.map((rev, idx) => (
                          <tr key={`${r.id}-rev-${idx}`}>
                            <td className="px-4 py-2 text-[9px] font-bold text-slate-400">{r.institutionName}</td>
                            <td className="px-4 py-2 text-[9px] font-bold text-slate-600">{rev.description || 'Sem descrição'}</td>
                            <td className="px-4 py-2 text-[9px] font-black text-slate-900 text-right">{formatBRL(rev.value)}</td>
                          </tr>
                        )))}
                        {filtered.every(r => r.otherRevenues.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-[9px] font-bold text-slate-300 italic">Nenhuma outra receita lançada</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-300"></div>
                    Outras Despesas Detalhadas
                  </h4>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase">Unidade</th>
                          <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase">Descrição</th>
                          <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.flatMap(r => r.otherExpenses.map((exp, idx) => (
                          <tr key={`${r.id}-exp-${idx}`}>
                            <td className="px-4 py-2 text-[9px] font-bold text-slate-400">{r.institutionName}</td>
                            <td className="px-4 py-2 text-[9px] font-bold text-slate-600">{exp.description || 'Sem descrição'}</td>
                            <td className="px-4 py-2 text-[9px] font-black text-rose-600 text-right">{formatBRL(exp.value)}</td>
                          </tr>
                        )))}
                        {filtered.every(r => r.otherExpenses.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-[9px] font-bold text-slate-300 italic">Nenhuma outra despesa lançada</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Tabela de Itens */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Listagem por Unidade ({filtered.length})
                </h4>
                <div className="border border-slate-100 rounded-[2rem] overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Congregação</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Receita</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Saídas</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-900">{r.institutionName}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-500">{r.date.split('-').reverse().join('/')}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-900 text-right">{formatBRL(r.totalRevenue)}</td>
                          <td className="px-6 py-4 text-[10px] font-bold text-rose-500 text-right">{formatBRL(r.totalExpenses)}</td>
                          <td className="px-6 py-4 text-[10px] font-black text-emerald-600 text-right">{formatBRL(r.saldoGU)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
              <button 
                onClick={() => setShowConsolidatedModal(false)}
                className="px-8 py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active-scale"
              >
                Fechar
              </button>
              <button 
                onClick={() => { generateConsolidatedPDF(); setShowConsolidatedModal(false); }}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active-scale flex items-center gap-2"
              >
                <Download size={16} />
                Baixar PDF Completo
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação Customizado */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{confirmDialog.title}</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button 
                onClick={confirmDialog.onCancel}
                className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active-scale"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagens de Status (Toast) */}
      {statusMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-10 duration-500">
          <div className={`flex items-center gap-4 px-8 py-4 rounded-full shadow-2xl border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500 border-emerald-400 text-white' 
              : 'bg-rose-500 border-rose-400 text-white'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

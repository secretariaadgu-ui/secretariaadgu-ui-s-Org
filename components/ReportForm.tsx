
import React, { useState, useEffect, useRef } from 'react';
import { FinancialReport, MiscItem, UserSession } from '../types';
import { CheckCircle, Calculator, Info, Plus, Trash2, ArrowRight, ArrowLeft, UploadCloud, RefreshCw, FileText, AlertCircle, Building2, TrendingUp, Wallet, Calendar, Download } from 'lucide-react';
import { saveReport, getSettings } from '../services/storageService';
import { sendReportEmailToAdmin } from '../services/emailService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ReportFormProps {
  session: UserSession;
  initialData?: FinancialReport;
  readOnly?: boolean;
  onFinished: () => void;
  onCancel: () => void;
}

type FormTab = 'RECEITAS' | 'DESPESAS' | 'ANEXOS' | 'RESUMO';

export const ReportForm: React.FC<ReportFormProps> = ({ session, initialData, readOnly = false, onFinished, onCancel }) => {
  const [activeTab, setActiveTab] = useState<FormTab>('RECEITAS');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  
  const [tithes, setTithes] = useState(initialData?.tithes || 0);
  const [offers, setOffers] = useState(initialData?.offers || 0);
  const [specialOffers, setSpecialOffers] = useState(initialData?.specialOffers || 0);
  const [interestRevenue, setInterestRevenue] = useState(initialData?.interestRevenue || 0);
  const [rentRevenue, setRentRevenue] = useState(initialData?.rentRevenue || 0);
  const [otherRevenues, setOtherRevenues] = useState<MiscItem[]>(initialData?.otherRevenues || []);
  
  const [rent, setRent] = useState(initialData?.rent || 0);
  const [water, setWater] = useState(initialData?.water || 0);
  const [energy, setEnergy] = useState(initialData?.energy || 0);
  const [internet, setInternet] = useState(initialData?.internet || 0);
  const [cleaning, setCleaning] = useState(initialData?.cleaning || 0);
  const [maintenance, setMaintenance] = useState(initialData?.maintenance || 0);
  const [missions, setMissions] = useState(initialData?.missions || 0);
  const [social, setSocial] = useState(initialData?.social || 0);
  const [otherExpenses, setOtherExpenses] = useState<MiscItem[]>(initialData?.otherExpenses || []);
  
  const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>(initialData?.attachments || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [previousBalance, setPreviousBalance] = useState(initialData?.previousBalance || 0);
  const [instLogo, setInstLogo] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(date.split('-').reverse().join('/'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(s => setInstLogo(s.logo || null));
  }, []);

  useEffect(() => {
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
        if (dateInput !== formatted) setDateInput(formatted);
      }
    }
  }, [date]);

  const handleDateInputChange = (val: string) => {
    if (readOnly) return;
    const clean = val.replace(/\D/g, '').slice(0, 8);
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
    
    setDateInput(formatted);
    
    if (clean.length === 8) {
      const d = clean.slice(0, 2);
      const m = clean.slice(2, 4);
      const y = clean.slice(4, 8);
      setDate(`${y}-${m}-${d}`);
    }
  };

  const isCamposBelos = (initialData?.institutionName || session.institution).toLowerCase().replace(/\s+/g, '').includes('camposbelos');

  const generatePDF = async () => {
    if (!initialData) return;
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
      } catch (e) { console.error(e); }
    }
    
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
    doc.text(settings.institutionName.toUpperCase(), 45, 18);
    
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    doc.text(`RELATÓRIO DE FECHAMENTO FINANCEIRO`, 45, 24);
    doc.text(`UNIDADE: ${initialData.institutionName.toUpperCase()}`, 45, 28);
    doc.text(`DATA REF: ${initialData.date.split('-').reverse().join('/')}`, 45, 32);

    currentY = 50;
    const tableStyles = { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.1 };

    // Section 1: Entradas
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(79, 70, 229);
    doc.text("1. DESCRITIVO DE ENTRADAS", 15, currentY);
    currentY += 5;

    doc.autoTable({
      startY: currentY,
      head: [['CATEGORIA', 'VALOR']],
      body: [
        ['Dízimos', formatBRL(tithes)],
        ['Ofertas Gerais', formatBRL(offers)],
        ['Ofertas Especiais', formatBRL(specialOffers)],
        ['Receita Financeira', formatBRL(financialRevenueTotal)],
        ...otherRevenues.map(r => [r.description || 'Outra Receita', formatBRL(r.value)]),
        [{ content: 'TOTAL BRUTO DE ENTRADAS', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: formatBRL(totalRevenue), styles: { fontStyle: 'bold', halign: 'right', fillColor: [248, 250, 252] } }]
      ],
      theme: 'grid',
      styles: tableStyles,
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right', width: 40 } }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    if (!isCamposBelos) {
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42);
      doc.text("2. RESUMO DE REPASSES E DISTRIBUIÇÃO", 15, currentY);
      currentY += 5;

      doc.autoTable({
        startY: currentY,
        head: [['DESCRIÇÃO', 'PERCENTUAL', 'VALOR']],
        body: [
          ['Sede Administrativa', '20%', `- ${formatBRL(sedeExpense)}`],
          ['Prebenda Pastoral', '20%', `- ${formatBRL(prebendaExpense)}`],
          [{ content: 'VALOR LÍQUIDO DISPONÍVEL P/ UNIDADE', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: '60%', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: formatBRL(revenue60), styles: { fontStyle: 'bold', halign: 'right', fillColor: [241, 245, 249] } }]
        ],
        theme: 'grid',
        styles: tableStyles,
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        columnStyles: { 1: { halign: 'center', width: 30 }, 2: { halign: 'right', width: 40 } }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }

    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(225, 29, 72);
    doc.text(`${isCamposBelos ? '2' : '3'}. DESCRITIVO DE DESPESAS OPERACIONAIS`, 15, currentY);
    currentY += 5;

    doc.autoTable({
      startY: currentY,
      head: [['CONTA / DESPESA', 'VALOR']],
      body: [
        ['Aluguel do Prédio', formatBRL(rent)],
        ['Energia Elétrica', formatBRL(energy)],
        ['Água / Saneamento', formatBRL(water)],
        ['Internet / Telefone', formatBRL(internet)],
        ['Limpeza / Produtos', formatBRL(cleaning)],
        ['Manutenção / Reparos', formatBRL(maintenance)],
        ['Oferta Missões', formatBRL(missions)],
        ['Assistência Social', formatBRL(social)],
        ...otherExpenses.map(e => [e.description || 'Outra Despesa', formatBRL(e.value)]),
        [{ content: 'TOTAL DE DESPESAS DA UNIDADE', styles: { fontStyle: 'bold', fillColor: [255, 241, 242] } }, { content: formatBRL(totalFixedExpenses), styles: { fontStyle: 'bold', halign: 'right', fillColor: [255, 241, 242] } }]
      ],
      theme: 'grid',
      styles: tableStyles,
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right', width: 40 } }
    });

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
    doc.text(formatBRL(previousBalance), pageWidth - 25, currentY + 18, { align: 'right' });
    doc.text(formatBRL(saldoGU), pageWidth - 25, currentY + 24, { align: 'right' });
    doc.setFontSize(11); doc.setTextColor(52, 211, 153);
    doc.text(formatBRL(currentBalance), pageWidth - 25, currentY + 31, { align: 'right' });

    // Footer
    doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(148, 163, 184);
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Este relatório foi emitido por ${initialData.reporterName} em ${dateStr} às ${timeStr}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    doc.save(`ADGU_Relatorio_${initialData.institutionName.replace(/\s+/g, '_')}_${initialData.date}.pdf`);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const files = e.target.files;
    if (!files) return;
    setIsCompressing(true);
    for (const file of Array.from(files) as File[]) {
      try {
        const base64: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const compressed = await compressImage(base64);
        setAttachments(prev => [...prev, { name: file.name, type: 'image/jpeg', data: compressed }]);
      } catch (err) { console.error(err); }
    }
    setIsCompressing(false);
  };

  const sumOtherRevenues = otherRevenues.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const financialRevenueTotal = interestRevenue + rentRevenue;
  const totalRevenue = (Number(tithes) || 0) + (Number(offers) || 0) + (Number(specialOffers) || 0) + financialRevenueTotal + sumOtherRevenues;
  
  const sedeExpense = isCamposBelos ? 0 : totalRevenue * 0.20;
  const prebendaExpense = isCamposBelos ? 0 : totalRevenue * 0.20;
  const revenue60 = isCamposBelos ? totalRevenue : totalRevenue * 0.60;
  
  const sumOtherExpenses = otherExpenses.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const totalFixedExpenses = (Number(rent) || 0) + (Number(water) || 0) + (Number(energy) || 0) + 
                            (Number(internet) || 0) + (Number(cleaning) || 0) + (Number(maintenance) || 0) + 
                            (Number(missions) || 0) + (Number(social) || 0) + sumOtherExpenses;
  
  const totalExpenses = sedeExpense + prebendaExpense + totalFixedExpenses;
  const saldoGU = revenue60 - totalFixedExpenses;
  const currentBalance = previousBalance + saldoGU;

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSubmit = async () => {
    if (readOnly && session.role !== 'ADMIN') { onFinished(); return; }
    setIsSaving(true);
    setSaveError(null);
    const report: FinancialReport = {
      id: initialData?.id || crypto.randomUUID(),
      date, 
      institutionName: initialData?.institutionName || session.institution,
      reporterName: initialData?.reporterName || session.name, 
      userId: initialData?.userId || session.id,
      locked: initialData?.locked || false, 
      
      tithes, offers, specialOffers, 
      interestRevenue, rentRevenue, 
      financialRevenue: financialRevenueTotal, 
      otherRevenues,
      
      rent, water, energy, internet, cleaning, maintenance, missions, social,
      otherExpenses, 
      
      totalRevenue, 
      totalFixedExpenses, 
      sedeExpense, 
      prebendaExpense, 
      totalExpenses, 
      saldoGU, 
      currentBalance, 
      previousBalance, 
      attachments, 
      createdAt: initialData?.createdAt || new Date().toISOString()
    };
    try {
      await saveReport(report);
      // Enviar e-mail automático para o administrador
      sendReportEmailToAdmin(report).catch(e => console.error("Falha no envio de e-mail:", e));
      onFinished();
    } catch (err: any) { 
      console.error(err);
      setSaveError(`Falha ao salvar: ${err.message || 'Erro de conexão'}`);
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-700 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-3 bg-white text-slate-400 rounded-xl shadow-sm hover:text-indigo-600 transition-colors active-scale"><ArrowLeft size={20}/></button>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{readOnly ? 'Visualização Detalhada' : initialData ? 'Ajustar Fechamento' : 'Novo Fechamento'}</h2>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{session.institution}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {readOnly && initialData && (
            <button 
              onClick={generatePDF}
              className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all active-scale shadow-sm"
            >
              <Download size={16}/>
              <span className="text-[8px] font-black uppercase tracking-widest">Exportar PDF</span>
            </button>
          )}
          {initialData?.locked && (
             <div className="bg-amber-50 text-amber-600 px-4 py-2.5 rounded-2xl border border-amber-100 flex items-center gap-2">
                <Calculator size={14}/>
                <span className="text-[8px] font-black uppercase tracking-widest">Apenas Leitura</span>
             </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-2 rounded-[1.5rem] shadow-soft border border-slate-50 overflow-x-auto no-scrollbar">
        {(['RECEITAS', 'DESPESAS', 'ANEXOS', 'RESUMO'] as FormTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[100px] py-4 px-6 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-8 md:p-12 shadow-xl shadow-slate-100/50 min-h-[500px] relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
        
        {saveError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in shake duration-300">
            <AlertCircle size={20} />
            <p className="text-[10px] font-black uppercase">{saveError}</p>
          </div>
        )}

        {activeTab === 'RECEITAS' && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-500 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4 mb-2 block">Data de Referência</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input 
                      type="text" 
                      disabled={readOnly} 
                      value={dateInput} 
                      onChange={e => handleDateInputChange(e.target.value)} 
                      placeholder="DD/MM/AAAA"
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-bold text-sm focus:bg-white focus:border-indigo-100 transition-all outline-none shadow-inner" 
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4 mb-2 block">Saldo Anterior em Caixa</label>
                  <div className="relative">
                    <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                    <input type="number" disabled={readOnly} value={previousBalance || ''} onChange={e => setPreviousBalance(Number(e.target.value))} className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.5rem] border-2 border-transparent font-black text-sm focus:bg-white focus:border-emerald-100 transition-all outline-none shadow-inner" placeholder="0,00" />
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <div className="flex items-center gap-3 border-b-2 border-indigo-50 pb-4">
                     <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                       <TrendingUp size={16}/>
                     </div>
                     <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Entradas Ministeriais {isCamposBelos ? '' : '(100%)'}</h4>
                   </div>
                   <div className="space-y-5">
                      {[
                        { label: 'Dízimos', val: tithes, set: setTithes, color: 'indigo' },
                        { label: 'Ofertas Gerais', val: offers, set: setOffers, color: 'indigo' },
                        { label: 'Ofertas Especiais', val: specialOffers, set: setSpecialOffers, color: 'indigo' }
                      ].map(item => (
                        <div key={item.label} className="group">
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">{item.label}</label>
                           <input type="number" disabled={readOnly} value={item.val || ''} onChange={e => item.set(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:bg-white focus:border-indigo-100 transition-all shadow-sm" placeholder="0,00" />
                        </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="flex items-center gap-3 border-b-2 border-emerald-50 pb-4">
                     <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                       <Wallet size={16}/>
                     </div>
                     <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Receitas Financeiras</h4>
                   </div>
                   <div className="space-y-5">
                      {[
                        { label: 'Rendimentos Bancários', val: interestRevenue, set: setInterestRevenue },
                        { label: 'Aluguéis / Cessão', val: rentRevenue, set: setRentRevenue }
                      ].map(item => (
                        <div key={item.label} className="group">
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">{item.label}</label>
                           <input type="number" disabled={readOnly} value={item.val || ''} onChange={e => item.set(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:bg-white focus:border-emerald-100 transition-all shadow-sm" placeholder="0,00" />
                        </div>
                      ))}
                      
                      <div className="pt-6">
                         <div className="flex justify-between items-center mb-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Outras Entradas</span>
                            {!readOnly && (
                              <button onClick={() => setOtherRevenues([...otherRevenues, { id: crypto.randomUUID(), description: '', value: 0 }])} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest">
                                <Plus size={12}/> Adicionar
                              </button>
                            )}
                         </div>
                         <div className="space-y-3">
                            {otherRevenues.map(item => (
                              <div key={item.id} className="flex gap-3 animate-in slide-in-from-top-2">
                                  <input type="text" disabled={readOnly} value={item.description} onChange={e => setOtherRevenues(otherRevenues.map(i => i.id === item.id ? {...i, description: e.target.value} : i))} className="flex-1 p-4 bg-slate-50 rounded-xl text-[11px] font-bold outline-none focus:bg-white border border-transparent focus:border-indigo-100" placeholder="Descrição" />
                                  <input type="number" disabled={readOnly} value={item.value || ''} onChange={e => setOtherRevenues(otherRevenues.map(i => i.id === item.id ? {...i, value: Number(e.target.value)} : i))} className="w-32 p-4 bg-slate-50 rounded-xl text-[11px] font-black outline-none focus:bg-white border border-transparent focus:border-indigo-100" placeholder="0,00" />
                                  {!readOnly && <button onClick={() => setOtherRevenues(otherRevenues.filter(i => i.id !== item.id))} className="p-3 text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>}
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'DESPESAS' && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-500 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <div className="flex items-center gap-3 border-b-2 border-rose-50 pb-4">
                     <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                       <Wallet size={16}/>
                     </div>
                     <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Manutenção e Utilidades</h4>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {[
                        { label: 'Aluguel', val: rent, set: setRent },
                        { label: 'Energia Elétrica', val: energy, set: setEnergy },
                        { label: 'Água / Saneamento', val: water, set: setWater },
                        { label: 'Internet', val: internet, set: setInternet },
                        { label: 'Limpeza', val: cleaning, set: setCleaning },
                        { label: 'Manutenção', val: maintenance, set: setMaintenance }
                      ].map(item => (
                        <div key={item.label} className="group">
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">{item.label}</label>
                           <input type="number" disabled={readOnly} value={item.val || ''} onChange={e => item.set(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:bg-white focus:border-rose-100 transition-all shadow-sm" placeholder="0,00" />
                        </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="flex items-center gap-3 border-b-2 border-indigo-50 pb-4">
                     <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                       <Info size={16}/>
                     </div>
                     <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Atividades e Fins Sociais</h4>
                   </div>
                   <div className="space-y-5">
                      {[
                        { label: 'Missões', val: missions, set: setMissions },
                        { label: 'Assistência Social', val: social, set: setSocial }
                      ].map(item => (
                        <div key={item.label} className="group">
                           <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">{item.label}</label>
                           <input type="number" disabled={readOnly} value={item.val || ''} onChange={e => item.set(Number(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:bg-white focus:border-indigo-100 transition-all shadow-sm" placeholder="0,00" />
                        </div>
                      ))}

                      <div className="pt-6">
                         <div className="flex justify-between items-center mb-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Outras Despesas Variáveis</span>
                            {!readOnly && (
                              <button onClick={() => setOtherExpenses([...otherExpenses, { id: crypto.randomUUID(), description: '', value: 0 }])} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all text-[8px] font-black uppercase tracking-widest">
                                <Plus size={12}/> Adicionar
                              </button>
                            )}
                         </div>
                         <div className="space-y-3">
                            {otherExpenses.map(item => (
                              <div key={item.id} className="flex gap-3 animate-in slide-in-from-top-2">
                                  <input type="text" disabled={readOnly} value={item.description} onChange={e => setOtherExpenses(otherExpenses.map(i => i.id === item.id ? {...i, description: e.target.value} : i))} className="flex-1 p-4 bg-slate-50 rounded-xl text-[11px] font-bold outline-none focus:bg-white border border-transparent focus:border-rose-100" placeholder="Descrição" />
                                  <input type="number" disabled={readOnly} value={item.value || ''} onChange={e => setOtherExpenses(otherExpenses.map(i => i.id === item.id ? {...i, value: Number(e.target.value)} : i))} className="w-32 p-4 bg-slate-50 rounded-xl text-[11px] font-black outline-none focus:bg-white border border-transparent focus:border-rose-100" placeholder="0,00" />
                                  {!readOnly && <button onClick={() => setOtherExpenses(otherExpenses.filter(i => i.id !== item.id))} className="p-3 text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>}
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'ANEXOS' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             {!readOnly && (
               <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:border-indigo-300 cursor-pointer group transition-all">
                 <UploadCloud size={48} className="mx-auto text-slate-300 group-hover:text-indigo-500 mb-4 transition-colors" />
                 <h4 className="text-[10px] font-black uppercase text-slate-500 group-hover:text-indigo-600">Comprovantes / Fotos</h4>
                 <p className="text-[7px] font-bold text-slate-400 uppercase mt-2">Clique para anexar</p>
                 <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={handleFileChange} />
               </div>
             )}
             {isCompressing && <div className="flex items-center justify-center gap-2 text-indigo-500 font-black text-[9px] uppercase"><RefreshCw size={14} className="animate-spin" /> Processando...</div>}
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attachments.map((at, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden aspect-square border group shadow-sm hover:shadow-md transition-all">
                    <img src={at.data} className="w-full h-full object-cover" />
                    {!readOnly && (
                      <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-2 bg-rose-600/80 backdrop-blur-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'RESUMO' && (
          <div className="space-y-10 animate-in slide-in-from-right-8 duration-500 relative z-10">
             <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-[2rem] p-4 shadow-xl shadow-slate-200/50 flex items-center justify-center border border-slate-50">
                    {instLogo ? <img src={instLogo} className="max-w-full max-h-full object-contain" /> : <Building2 className="text-slate-200" size={32} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{session.institution}</h3>
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Fechamento Ministerial Consolidado</p>
                  </div>
                </div>
                <div className="text-center sm:text-right bg-white px-6 py-4 rounded-3xl shadow-sm border border-slate-50">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Período de Referência</p>
                   <p className="text-sm font-black text-slate-900">{date.split('-').reverse().join('/')}</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {!isCamposBelos ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-4">
                       <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                         <TrendingUp size={16}/>
                       </div>
                       <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Distribuição de Receitas</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-400">Receita Bruta Total</span>
                            <span className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter">(Base 100%)</span>
                          </div>
                          <span className="text-sm font-black text-slate-900">{formatBRL(totalRevenue)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-amber-50/50 rounded-3xl border border-amber-100/50">
                            <span className="text-[9px] font-black uppercase text-amber-600 block mb-1">Sede (20%)</span>
                            <span className="text-xs font-black text-amber-700">- {formatBRL(sedeExpense)}</span>
                        </div>
                        <div className="p-5 bg-amber-50/50 rounded-3xl border border-amber-100/50">
                            <span className="text-[9px] font-black uppercase text-amber-600 block mb-1">Prebenda (20%)</span>
                            <span className="text-xs font-black text-amber-700">- {formatBRL(prebendaExpense)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between p-5 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
                          <span className="text-[10px] font-black uppercase text-emerald-600">Líquido Unidade (60%)</span>
                          <span className="text-sm font-black text-emerald-700">{formatBRL(revenue60)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-4">
                       <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                         <TrendingUp size={16}/>
                       </div>
                       <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Resumo de Entradas</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between p-6 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
                          <span className="text-[10px] font-black uppercase text-emerald-600">Total de Entradas</span>
                          <span className="text-lg font-black text-emerald-700">{formatBRL(totalRevenue)}</span>
                      </div>
                      <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 border-b border-slate-50 pb-2">
                          <span>Dízimos e Ofertas</span>
                          <span className="text-slate-900">{formatBRL(tithes + offers + specialOffers)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400 border-b border-slate-50 pb-2">
                          <span>Receitas Financeiras</span>
                          <span className="text-slate-900">{formatBRL(financialRevenueTotal)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold uppercase text-slate-400">
                          <span>Outras Entradas</span>
                          <span className="text-slate-900">{formatBRL(sumOtherRevenues)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                   <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                        <Wallet size={16}/>
                      </div>
                      <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Resultado do Período</h4>
                   </div>
                   <div className="space-y-4">
                    <div className="flex justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <span className="text-[9px] font-black uppercase text-slate-400">Despesas Operacionais</span>
                        <span className="text-sm font-black text-rose-600">- {formatBRL(totalFixedExpenses)}</span>
                    </div>
                    {!isCamposBelos && (
                      <div className="flex justify-between p-5 bg-rose-50/30 rounded-3xl border border-rose-100/50">
                          <span className="text-[9px] font-black uppercase text-rose-500">Total de Saídas (Geral)</span>
                          <span className="text-sm font-black text-rose-700">- {formatBRL(totalExpenses)}</span>
                      </div>
                    )}
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em] mb-2">{isCamposBelos ? 'Saldo Final' : 'Saldo GU'}</span>
                          <span className="text-4xl font-black text-emerald-400 tracking-tighter mb-4">{formatBRL(saldoGU)}</span>
                          <div className="w-full h-px bg-white/10 mb-4"></div>
                          <div className="flex justify-between w-full items-center">
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Caixa Disponível</span>
                            <span className="text-sm font-black text-white">{formatBRL(currentBalance)}</span>
                          </div>
                        </div>
                    </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 px-4 sm:px-0">
        {activeTab !== 'RESUMO' ? (
          <button onClick={() => { const tabs: FormTab[] = ['RECEITAS', 'DESPESAS', 'ANEXOS', 'RESUMO']; const idx = tabs.indexOf(activeTab); setActiveTab(tabs[idx + 1]); }} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active-scale shadow-xl shadow-slate-200">
            Próxima Etapa <ArrowRight size={18}/>
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isSaving || (readOnly && session.role !== 'ADMIN')} className={`flex-1 py-5 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active-scale shadow-xl ${(readOnly && session.role !== 'ADMIN') ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-indigo-600 shadow-indigo-200'}`}>
            {isSaving ? <RefreshCw className="animate-spin" size={20}/> : (readOnly && session.role !== 'ADMIN') ? 'Apenas Visualização' : <><CheckCircle size={20}/> Finalizar Relatório</>}
          </button>
        )}
      </div>
    </div>
  );
};

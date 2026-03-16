
import React, { useState, useEffect, useMemo } from 'react';
import { FinancialReport, UserSession } from '../types';
import { getReports, getSettings } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Activity, Home, MapPin, FileBarChart, RefreshCw, FileDown, ArrowDownCircle, ShieldCheck, HeartHandshake, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type FilterType = 'ALL' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

export const AdminDashboard: React.FC<{ session: UserSession }> = ({ session }) => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterValue, setFilterValue] = useState<string>('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('ALL');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const repData = await getReports();
    setReports(repData);
    setLoading(false);
  };

  const getMondayString = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const periods = useMemo(() => {
    const weeks = new Set<string>();
    const months = new Set<string>();
    const years = new Set<string>();
    const insts = new Set<string>();

    reports.forEach(r => {
      if (r.institutionName) insts.add(r.institutionName);
      if (!r.date) return;
      const [y, m] = r.date.split('-');
      
      weeks.add(getMondayString(r.date));
      months.add(`${y}-${m}`);
      years.add(y);
    });

    return {
      weeks: Array.from(weeks).sort().reverse(),
      months: Array.from(months).sort().reverse(),
      years: Array.from(years).sort().reverse(),
      institutions: Array.from(insts).sort()
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    let filtered = reports;

    if (institutionFilter !== 'ALL') {
      filtered = filtered.filter(r => r.institutionName === institutionFilter);
    }

    if (filterType === 'ALL') return filtered;

    if (filterType === 'CUSTOM') {
      return filtered.filter(r => {
        if (!r.date) return false;
        let matches = true;
        if (startDate) matches = matches && r.date >= startDate;
        if (endDate) matches = matches && r.date <= endDate;
        return matches;
      });
    }

    if (!filterValue) return filtered;

    return filtered.filter(r => {
      if (!r.date) return false;
      const [y, m] = r.date.split('-');

      if (filterType === 'WEEK') {
        return getMondayString(r.date) === filterValue;
      }
      if (filterType === 'MONTH') {
        return `${y}-${m}` === filterValue;
      }
      if (filterType === 'YEAR') {
        return y === filterValue;
      }
      return true;
    });
  }, [reports, filterType, filterValue, institutionFilter, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredReports.reduce((acc, curr) => ({
      revenue: acc.revenue + (curr.totalRevenue || 0),
      sede: acc.sede + (curr.sedeExpense || 0),
      prebenda: acc.prebenda + (curr.prebendaExpense || 0),
      expenses: acc.expenses + (curr.totalExpenses || 0),
      saldoGU: acc.saldoGU + (curr.saldoGU || 0),
      tithes: acc.tithes + (curr.tithes || 0),
      offers: acc.offers + (curr.offers || 0),
      special: acc.special + (curr.specialOffers || 0),
      financial: acc.financial + (curr.financialRevenue || 0),
      rent: acc.rent + (curr.rent || 0),
      water: acc.water + (curr.water || 0),
      energy: acc.energy + (curr.energy || 0),
      internet: acc.internet + (curr.internet || 0),
      cleaning: acc.cleaning + (curr.cleaning || 0),
      maintenance: acc.maintenance + (curr.maintenance || 0),
      missions: acc.missions + (curr.missions || 0),
      social: acc.social + (curr.social || 0),
      othersRev: acc.othersRev + (curr.otherRevenues?.reduce((s, i) => s + (i.value || 0), 0) || 0),
      othersExp: acc.othersExp + (curr.otherExpenses?.reduce((s, i) => s + (i.value || 0), 0) || 0),
    }), {
      revenue: 0, sede: 0, prebenda: 0, expenses: 0, saldoGU: 0,
      tithes: 0, offers: 0, special: 0, financial: 0,
      rent: 0, water: 0, energy: 0, 
      internet: 0, cleaning: 0, maintenance: 0, missions: 0, social: 0,
      othersRev: 0, othersExp: 0
    });
  }, [filteredReports]);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getFilterLabel = () => {
    let label = "";
    if (filterType === 'ALL') label = "HISTÓRICO TOTAL";
    else if (filterType === 'CUSTOM') {
      if (!startDate && !endDate) label = "PERÍODO PERSONALIZADO";
      else {
        const start = startDate ? startDate.split('-').reverse().join('/') : '...';
        const end = endDate ? endDate.split('-').reverse().join('/') : '...';
        label = `PERÍODO DE ${start} ATÉ ${end}`;
      }
    }
    else if (!filterValue) label = "PERÍODO NÃO SELECIONADO";
    else {
      try {
        if (filterType === 'WEEK') {
          const [y, m, d] = filterValue.split('-').map(Number);
          label = `SEMANA DE ${new Date(y, m-1, d).toLocaleDateString('pt-BR')}`;
        } else if (filterType === 'MONTH') {
          const [y, m] = filterValue.split('-').map(Number);
          const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
          const monthName = months[m - 1];
          label = monthName ? `${monthName.toUpperCase()} / ${y}` : filterValue;
        } else {
          label = `ANO DE ${filterValue}`;
        }
      } catch (e) {
        label = filterValue;
      }
    }

    if (institutionFilter !== 'ALL') {
      return `${institutionFilter} - ${label}`;
    }
    return label;
  };

  const exportConsolidatedPDF = async () => {
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

    // Título Institucional (Reduzido de 14 para 11)
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
    doc.text(settings.institutionName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    doc.setFontSize(9); doc.setTextColor(79, 70, 229);
    doc.text(`RELATÓRIO CONSOLIDADO DETALHADO`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
    doc.text(getFilterLabel(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    const tableBody = filteredReports.map(r => [
      r.institutionName,
      r.date ? r.date.split('-').reverse().join('/') : 'N/A',
      formatBRL(r.totalRevenue || 0),
      formatBRL(r.totalExpenses || 0),
      formatBRL(r.saldoGU || 0)
    ]);

    doc.autoTable({
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Congregação', 'Data Ref.', 'Receita Bruta', 'Saídas Totais', 'Líquido Unidade']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], halign: 'center', fontSize: 7.5 },
      styles: { fontSize: 6.5, cellPadding: 2 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } }
    });

    currentY = doc.lastAutoTable.finalY + 12;
    const colWidth = (pageWidth - (margin * 2) - 10) / 2;

    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
    doc.text("ENTRADAS CONSOLIDADAS", margin, currentY);
    doc.text("SAÍDAS CONSOLIDADAS", margin + colWidth + 10, currentY);

    const revRows = [
      ['Dízimos', formatBRL(totals.tithes)],
      ['Ofertas Gerais', formatBRL(totals.offers)],
      ['Ofertas Especiais', formatBRL(totals.special)],
      ['Receita Financeira', formatBRL(totals.financial)],
      ['Outras Entradas', formatBRL(totals.othersRev)],
      [{ content: 'TOTAL BRUTO', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: formatBRL(totals.revenue), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } }]
    ];

    const expRows = [
      ['Repasse Sede (20%)', formatBRL(totals.sede)],
      ['Prebenda (20%)', formatBRL(totals.prebenda)],
      ['Aluguéis', formatBRL(totals.rent)],
      ['Água / Energia', formatBRL(totals.water + totals.energy)],
      ['Internet / Tel.', formatBRL(totals.internet)],
      ['Limpeza / Manut.', formatBRL(totals.cleaning + totals.maintenance)],
      ['Missões / Social', formatBRL(totals.missions + totals.social)],
      ['Outras Despesas', formatBRL(totals.othersExp)],
      [{ content: 'TOTAL SAÍDAS', styles: { fontStyle: 'bold', fillColor: [254, 242, 242] } }, { content: formatBRL(totals.expenses), styles: { fontStyle: 'bold', fillColor: [254, 242, 242], halign: 'right' } }]
    ];

    doc.autoTable({ startY: currentY + 4, margin: { left: margin }, tableWidth: colWidth, body: revRows, theme: 'grid', styles: { fontSize: 6.5 } });
    doc.autoTable({ startY: currentY + 4, margin: { left: margin + colWidth + 10 }, tableWidth: colWidth, body: expRows, theme: 'grid', styles: { fontSize: 6.5 } });

    currentY = Math.max(doc.lastAutoTable.finalY + 15, currentY + 60);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'F');
    doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
    doc.text("SALDO LÍQUIDO ACUMULADO NO PERÍODO:", margin + 8, currentY + 10);
    doc.text(formatBRL(totals.saldoGU), pageWidth - margin - 8, currentY + 10, { align: 'right' });

    doc.save(`Consolidado_${getFilterLabel().replace(/\s+/g, '_')}.pdf`);
  };

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

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Análise Consolidada</h2>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Histórico Preservado de Todo o Período</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100">
            <Home size={14} className="text-slate-400" />
            <select 
              value={institutionFilter} 
              onChange={e => setInstitutionFilter(e.target.value)}
              className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-600 max-w-[150px]"
            >
              <option value="ALL">Todas Congregações</option>
              {periods.institutions.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 border-r border-slate-100">
            <Filter size={14} className="text-slate-400" />
            <select 
              value={filterType} 
              onChange={e => { 
                setFilterType(e.target.value as FilterType); 
                setFilterValue('');
                if (e.target.value !== 'CUSTOM') {
                  setStartDate(''); setEndDate(''); setManualStart(''); setManualEnd('');
                }
              }}
              className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-600"
            >
              <option value="ALL">Todo o Histórico</option>
              <option value="WEEK">Por Semana</option>
              <option value="MONTH">Por Mês</option>
              <option value="YEAR">Por Ano</option>
              <option value="CUSTOM">Período Personalizado</option>
            </select>
          </div>

          {filterType === 'CUSTOM' && (
            <div className="flex items-center gap-2 px-3 animate-in slide-in-from-left-2 border-r border-slate-100">
              <CalendarIcon size={14} className="text-indigo-500" />
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={manualStart} 
                  onChange={e => handleManualDateChange(e.target.value, 'start')}
                  placeholder="Início"
                  className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none w-[70px] text-slate-900"
                />
                <span className="text-[8px] font-black text-slate-300">A</span>
                <input 
                  type="text" 
                  value={manualEnd} 
                  onChange={e => handleManualDateChange(e.target.value, 'end')}
                  placeholder="Fim"
                  className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none w-[70px] text-slate-900"
                />
              </div>
            </div>
          )}

          {filterType !== 'ALL' && filterType !== 'CUSTOM' && (
            <div className="flex items-center gap-2 px-3 animate-in slide-in-from-left-2">
              <CalendarIcon size={14} className="text-indigo-500" />
              <select 
                value={filterValue} 
                onChange={e => setFilterValue(e.target.value)}
                className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-900"
              >
                <option value="">Selecionar Período...</option>
                {filterType === 'WEEK' && periods.weeks.map(w => {
                  const [y, m, d] = w.split('-').map(Number);
                  return <option key={w} value={w}>Semana de {new Date(y, m-1, d).toLocaleDateString('pt-BR')}</option>
                })}
                {filterType === 'MONTH' && periods.months.map(m => {
                  const [y, mm] = m.split('-');
                  const monthName = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][parseInt(mm)-1];
                  return <option key={m} value={m}>{monthName} / {y}</option>
                })}
                {filterType === 'YEAR' && periods.years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          <button 
            onClick={exportConsolidatedPDF}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active-scale ml-auto"
          >
            <FileDown size={16}/> Gerar PDF Consolidado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-6 rounded-[2rem] text-white shadow-xl flex flex-col justify-between h-[160px] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingUp size={64}/></div>
          <div>
            <p className="text-[7px] font-black uppercase tracking-widest text-indigo-400">{getFilterLabel()}</p>
            <p className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">Receita Bruta Total</p>
          </div>
          <h3 className="text-2xl font-black">{formatBRL(totals.revenue)}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-[160px]">
          <ShieldCheck className="text-amber-500" size={24}/>
          <div>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Total Repasses (Sede+Preb.)</p>
            <h3 className="text-xl font-black text-amber-600">{formatBRL(totals.sede + totals.prebenda)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-[160px]">
          <ArrowDownCircle className="text-rose-500" size={24}/>
          <div>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Total de Saídas / Despesas</p>
            <h3 className="text-xl font-black text-rose-600">{formatBRL(totals.expenses)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-[160px]">
          <HeartHandshake className="text-indigo-500" size={24}/>
          <div>
            <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Saldo Líquido Período</p>
            <h3 className="text-xl font-black text-emerald-600">{formatBRL(totals.saldoGU)}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center gap-2">
            <FileBarChart size={16} className="text-indigo-500" /> Comparativo de Lançamentos ({filteredReports.length})
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredReports.slice(0, 15).reverse().map(r => ({
                name: r.institutionName.split(' ')[0],
                receita: r.totalRevenue || 0,
                despesas: r.totalExpenses || 0,
                saldo: r.saldoGU || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 800}} />
                <Bar dataKey="receita" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={15} name="Receita" />
                <Bar dataKey="despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={15} name="Saídas" />
                <Bar dataKey="saldo" fill="#10b981" radius={[6, 6, 0, 0]} barSize={15} name="Líquido" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <MapPin size={16} className="text-indigo-500" /> Histórico Localizado
            </h3>
            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[7px] font-black">{filteredReports.length} ITENS</span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {filteredReports.map(r => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-900">{r.institutionName}</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase">{r.date ? r.date.split('-').reverse().join('/') : 'N/A'}</span>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-emerald-600">{formatBRL(r.totalRevenue)}</p>
                </div>
              </div>
            ))}
            {filteredReports.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <FileBarChart className="mx-auto" size={32}/>
                <p className="text-[8px] font-black uppercase mt-2">Nenhum dado encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

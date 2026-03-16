
import { FinancialReport, UserAccount, DailyTransaction } from '../types';
import { supabase } from './supabaseClient';

export interface SystemSettings {
  logo?: string;
  institutionName: string;
  cnpj: string;
  address: string;
  email: string;
  president: string;
  closingDay: number;
}

const notifyUpdate = (event: string) => {
  window.dispatchEvent(new Event(event));
};

const safeNum = (val: any): number => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

export const loginUser = async (username: string, password: string): Promise<UserAccount | null> => {
  const userClean = username.toLowerCase().trim();
  try {
    const { data, error } = await supabase.rpc('check_user_login', {
      p_username: userClean,
      p_password: password
    });

    if (error || !data || data.length === 0) return null;

    const user = data[0];
    return {
      id: user.id,
      username: user.username,
      password: '', // Não retornamos a senha por segurança
      name: user.name,
      role: user.role as any,
      institution: user.institution || '',
      active: user.active
    };
  } catch {
    return null;
  }
};

export const getUserByUsername = async (username: string): Promise<UserAccount | null> => {
  const userClean = username.toLowerCase().trim();
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, email, phone, photo, role, institution, active')
      .eq('username', userClean)
      .eq('active', true) 
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      username: data.username,
      password: '', // Senha protegida
      name: data.name,
      email: data.email,
      phone: data.phone,
      photo: data.photo,
      role: data.role as any,
      institution: data.institution || '', 
      active: data.active ?? true
    };
  } catch {
    return null;
  }
};

export const getSettings = async (): Promise<SystemSettings> => {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (error || !data) throw error;
    return {
      institutionName: data.institutionname,
      cnpj: data.cnpj,
      address: data.address,
      email: data.email,
      president: data.president,
      logo: data.logo,
      closingDay: data.closingday || 1
    };
  } catch {
    return { 
      institutionName: 'Assembleia de Deus Geração Unida',
      cnpj: '49.386.673/0001-10',
      address: 'Rua Doze de Outubro 779, Parque Tijuca, Maracanaú - CE',
      email: 'ADGUgeracaounida@gmail.com',
      president: 'Pr. Presidente Antônio Chaves Crus',
      closingDay: 1 
    };
  }
};

export const saveSettings = async (settings: SystemSettings) => {
  const { error } = await supabase.from('settings').upsert({
    id: 1,
    institutionname: settings.institutionName,
    cnpj: settings.cnpj,
    address: settings.address,
    email: settings.email,
    president: settings.president,
    logo: settings.logo,
    closingday: settings.closingDay
  });
  if (error) throw error;
  notifyUpdate('settings-updated');
};

export const getReports = async (institution?: string, includeDeleted = false): Promise<FinancialReport[]> => {
  try {
    let query = supabase.from('reports').select('*');
    if (institution) query = query.eq('institutionname', institution);
    
    if (includeDeleted) {
      query = query.not('deletedat', 'is', null);
    } else {
      query = query.is('deletedat', null);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;

    return (data || []).map(r => ({
      id: r.id,
      date: r.date,
      institutionName: r.institutionname,
      reporterName: r.reportername,
      userId: r.userid,
      locked: r.locked,
      offers: safeNum(r.offers),
      specialOffers: safeNum(r.specialoffers),
      tithes: safeNum(r.tithes),
      financialRevenue: safeNum(r.financialrevenue),
      interestRevenue: safeNum(r.interestrevenue),
      rentRevenue: safeNum(r.rentrevenue),
      otherRevenues: r.otherrevenues || [],
      energy: safeNum(r.energy),
      water: safeNum(r.water),
      rent: safeNum(r.rent),
      internet: safeNum(r.internet),
      cleaning: safeNum(r.cleaning),
      maintenance: safeNum(r.maintenance),
      missions: safeNum(r.missions),
      social: safeNum(r.social),
      otherExpenses: r.otherexpenses || [],
      totalRevenue: safeNum(r.totalrevenue),
      totalFixedExpenses: safeNum(r.totalfixedexpenses),
      sedeExpense: safeNum(r.sedeexpense),
      prebendaExpense: safeNum(r.prebendaexpense),
      totalExpenses: safeNum(r.totalexpenses),
      saldoGU: safeNum(r.saldogu),
      currentBalance: safeNum(r.currentbalance),
      previousBalance: safeNum(r.previousbalance),
      attachments: r.attachments || [],
      createdAt: r.createdat,
      archived: !!r.archived,
      archiveMonth: r.archivemonth,
      deletedAt: r.deletedat,
      deletedBy: r.deletedby
    }));
  } catch (err) { 
    console.error("Erro ao buscar relatórios:", err);
    return []; 
  }
};

export const saveReport = async (report: FinancialReport) => {
  // MAPEAMENTO EXPLICITO DOS CAMPOS PARA O SUPABASE (NOMES EM MINÚSCULO)
  const reportData = {
    id: report.id,
    date: report.date,
    institutionname: report.institutionName,
    reportername: report.reporterName,
    userid: report.userId,
    locked: !!report.locked,
    offers: safeNum(report.offers),
    specialoffers: safeNum(report.specialOffers),
    tithes: safeNum(report.tithes),
    financialrevenue: safeNum(report.financialRevenue),
    interestrevenue: safeNum(report.interestRevenue),
    rentrevenue: safeNum(report.rentRevenue),
    otherrevenues: report.otherRevenues,
    energy: safeNum(report.energy),
    water: safeNum(report.water),
    rent: safeNum(report.rent),
    internet: safeNum(report.internet),
    cleaning: safeNum(report.cleaning),
    maintenance: safeNum(report.maintenance),
    missions: safeNum(report.missions),
    social: safeNum(report.social),
    otherexpenses: report.otherExpenses,
    totalrevenue: safeNum(report.totalRevenue),
    totalfixedexpenses: safeNum(report.totalFixedExpenses),
    sedeexpense: safeNum(report.sedeExpense),
    prebendaexpense: safeNum(report.prebendaExpense),
    totalexpenses: safeNum(report.totalExpenses),
    saldogu: safeNum(report.saldoGU),
    currentbalance: safeNum(report.currentBalance),
    previousbalance: safeNum(report.previousBalance),
    attachments: report.attachments || [],
    createdat: report.createdAt || new Date().toISOString(),
    archived: !!report.archived,
    archivemonth: report.archiveMonth || null,
    deletedat: report.deletedAt || null,
    deletedby: report.deletedBy || null
  };

  const { error } = await supabase.from('reports').upsert(reportData);
  if (error) {
    console.error("Erro ao salvar relatório:", error);
    throw error;
  }
  notifyUpdate('reports-updated');
};

export const updateReportLockStatus = async (id: string, locked: boolean) => {
  const { error } = await supabase.from('reports').update({ locked }).eq('id', id);
  if (error) throw error;
  notifyUpdate('reports-updated');
};

export const deleteReport = async (id: string, userId: string) => {
  const { error } = await supabase
    .from('reports')
    .update({ 
      deletedat: new Date().toISOString(), 
      deletedby: userId 
    })
    .eq('id', id);
  
  if (error) {
    console.error("Erro ao excluir relatório:", error);
    throw error;
  }
  notifyUpdate('reports-updated');
};

export const restoreReport = async (id: string) => {
  const { error } = await supabase.from('reports').update({ deletedat: null, deletedby: null }).eq('id', id);
  if (error) throw error;
  notifyUpdate('reports-updated');
};

export const deleteReportPermanently = async (id: string) => {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) throw error;
  notifyUpdate('reports-updated');
};

export const archiveReportsByMonth = async (month: string, year: string, institutionName?: string) => {
  const archiveLabel = `${month}/${year}`;
  const startDate = `${year}-${month}-01`;
  
  // Calculate the first day of the next month
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
  const nextMonthPadded = nextMonth.toString().padStart(2, '0');
  const nextMonthDate = `${nextYear}-${nextMonthPadded}-01`;

  let query = supabase
    .from('reports')
    .update({ 
      archived: true, 
      archivemonth: archiveLabel,
      locked: true 
    })
    .gte('date', startDate)
    .lt('date', nextMonthDate)
    .is('deletedat', null);

  if (institutionName && institutionName !== 'ALL') {
    query = query.eq('institutionname', institutionName);
  }

  const { error } = await query;

  if (error) {
    console.error("Erro ao arquivar relatórios:", error);
    throw error;
  }
  notifyUpdate('reports-updated');
};

export const getUsers = async (): Promise<UserAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, email, phone, photo, role, institution, active')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(u => ({
      id: u.id,
      username: u.username,
      password: '', // Protegido
      name: u.name,
      email: u.email,
      phone: u.phone,
      photo: u.photo,
      role: u.role as any,
      institution: u.institution,
      active: u.active
    }));
  } catch {
    return [];
  }
};

export const saveUser = async (user: Partial<UserAccount>) => {
  const { error } = await supabase.from('users').upsert({
    id: user.id || crypto.randomUUID(),
    username: user.username,
    password: user.password,
    name: user.name,
    email: user.email || '',
    phone: user.phone || '',
    photo: user.photo || '',
    role: user.role || 'USER',
    institution: user.institution,
    active: user.active ?? true
  });
  if (error) throw error;
  notifyUpdate('users-updated');
};

export const updateUserStatus = async (id: string, active: boolean) => {
  const { error } = await supabase.from('users').update({ active }).eq('id', id);
  if (error) throw error;
  notifyUpdate('users-updated');
};

export const getTransactions = async (institution?: string): Promise<DailyTransaction[]> => {
  try {
    let query = supabase.from('transactions').select('*').is('deletedat', null);
    if (institution) query = query.eq('institutionname', institution);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      type: t.type,
      date: t.date,
      status: t.status,
      value: safeNum(t.value),
      description: t.description,
      category: t.category,
      institutionName: t.institutionname,
      userId: t.userid,
      createdAt: t.createdat
    }));
  } catch (err) {
    console.error("Erro ao buscar transações:", err);
    return [];
  }
};

export const saveTransaction = async (tx: DailyTransaction) => {
  const { error } = await supabase.from('transactions').upsert({
    id: tx.id,
    type: tx.type,
    date: tx.date,
    status: tx.status,
    value: safeNum(tx.value),
    description: tx.description,
    category: tx.category,
    institutionname: tx.institutionName,
    userid: tx.userId,
    createdat: tx.createdAt
  });
  if (error) throw error;
  notifyUpdate('transactions-updated');
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase
    .from('transactions')
    .update({ deletedat: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  notifyUpdate('transactions-updated');
};

export const isCompetenceLocked = (reportDate: string, closingDay: number): boolean => {
  return false; 
};

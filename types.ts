
export interface MiscItem {
  id: string;
  description: string;
  value: number;
}

export interface DailyTransaction {
  id: string;
  type: 'RECEITA' | 'DESPESA';
  date: string;
  status: 'PAGO' | 'PENDENTE';
  value: number;
  description: string;
  category: string;
  institutionName: string;
  userId: string;
  createdAt: string;
}

export interface FinancialReport {
  id: string;
  date: string;
  institutionName: string;
  reporterName: string;
  userId: string;
  locked: boolean;
  
  // Revenues
  offers: number;
  specialOffers: number;
  tithes: number;
  financialRevenue: number; // Consolidated total
  interestRevenue: number;  // New: Juros/Rendimentos
  rentRevenue: number;      // New: Aluguéis Recebidos
  otherRevenues: MiscItem[];
  
  // Expenses
  energy: number;
  water: number; 
  rent: number;
  internet: number;         // New
  cleaning: number;         // New
  maintenance: number;      // New
  missions: number;         // New
  social: number;           // New
  otherExpenses: MiscItem[];
  
  // Calculated Fields
  totalRevenue: number;
  totalFixedExpenses: number;
  sedeExpense: number; 
  prebendaExpense: number; 
  totalExpenses: number;
  saldoGU: number; 
  currentBalance: number;
  previousBalance: number;
  
  attachments: { name: string; type: string; data: string }[];
  createdAt: string;
  archived?: boolean;
  archiveMonth?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export type UserRole = 'ADMIN' | 'USER';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  email?: string;
  phone?: string;
  photo?: string;
  role: UserRole;
  institution: string;
  active: boolean;
}

export interface UserSession {
  id: string;
  name: string;
  phone?: string;
  photo?: string;
  role: UserRole;
  institution: string;
}

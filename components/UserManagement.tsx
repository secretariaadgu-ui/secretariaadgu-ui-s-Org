
import React, { useState, useEffect } from 'react';
import { UserAccount, UserSession } from '../types';
import { getUsers, updateUserStatus, saveUser } from '../services/storageService';
import { UserCheck, UserX, ShieldCheck, Mail, Phone, MapPin, PlusCircle, X, Loader2, CheckCircle, Shield, Key, UserCircle, Edit3 } from 'lucide-react';

export const UserManagement: React.FC<{ session: UserSession }> = ({ session }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<UserAccount>>({
    name: '',
    username: '',
    password: '',
    email: '',
    institution: '',
    phone: '',
    role: 'USER',
    active: true
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadUsers();
    const handleUpdate = () => loadUsers();
    window.addEventListener('users-updated', handleUpdate);
    return () => window.removeEventListener('users-updated', handleUpdate);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await updateUserStatus(id, !current);
      setSuccessMessage(current ? "Usuário bloqueado" : "Usuário ativado");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert("Erro ao alterar status.");
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      institution: '',
      phone: '',
      role: 'USER',
      active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setIsEditing(true);
    setFormData({ ...user });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password || !formData.institution) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSaving(true);
    try {
      await saveUser(formData);
      setSuccessMessage(isEditing ? "Dados atualizados com sucesso!" : "Tesoureiro cadastrado com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowModal(false);
    } catch (err) {
      alert("Erro ao salvar usuário. O login pode já estar em uso.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {successMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-500">
          <CheckCircle size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">{successMessage}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestão da Equipe</h2>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Controle total de acessos e unidades</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active-scale shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <PlusCircle size={18}/> Adicionar Novo Membro
        </button>
      </div>

      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center space-y-4">
           <Loader2 className="animate-spin text-indigo-500" size={32} />
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sincronizando usuários...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(u => (
            <div key={u.id} className={`bg-white p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden flex flex-col items-center text-center group transition-all ${u.active ? 'border-slate-50 hover:border-indigo-100' : 'border-rose-100 bg-rose-50/20'}`}>
              
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleOpenEdit(u)}
                  className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active-scale"
                  title="Editar dados"
                >
                  <Edit3 size={16} />
                </button>
                <div className={`p-2.5 rounded-xl ${u.active ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                  {u.role === 'ADMIN' ? <Shield size={16} /> : <UserCircle size={16} />}
                </div>
              </div>
              
              <div className="w-24 h-24 bg-slate-900 rounded-[2rem] mb-6 flex items-center justify-center text-white font-black text-2xl uppercase border-4 border-white shadow-xl overflow-hidden group-hover:scale-105 transition-transform">
                {u.photo ? <img src={u.photo} className="w-full h-full object-cover" /> : u.name.charAt(0)}
              </div>
              
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{u.name}</h3>
              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-1 mb-6">{u.institution}</p>
              
              <div className="w-full space-y-2 mb-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-400 uppercase">
                  <UserCircle size={12} className="text-indigo-300"/> @{u.username}
                </div>
                <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-400 uppercase">
                  <Mail size={12} className="text-indigo-300"/> {u.email || 'Sem Email'}
                </div>
                <div className="flex items-center justify-center gap-2 text-[8px] font-black text-slate-400 uppercase">
                  <Phone size={12} className="text-indigo-300"/> {u.phone || 'Sem Telefone'}
                </div>
              </div>

              {u.id !== session.id && (
                <button 
                  onClick={() => toggleStatus(u.id, u.active)}
                  className={`w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest active-scale flex items-center justify-center gap-2 border transition-all ${
                    u.active 
                      ? 'bg-white text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white' 
                      : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700'
                  }`}
                >
                  {u.active ? <UserX size={16}/> : <UserCheck size={16}/>}
                  {u.active ? 'Bloquear Acesso' : 'Ativar Usuário'}
                </button>
              )}
              
              {u.id === session.id && (
                <div className="w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200">
                  Sua Conta (Logado)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição de Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isSaving && setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-3xl animate-in zoom-in-95 duration-500">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                    {isEditing ? 'Atualizar Membro' : 'Novo Tesoureiro'}
                  </h3>
                  <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                    {isEditing ? 'Modificando credenciais existentes' : 'Cadastro de Acesso Ministerial'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-xl transition-colors"><X size={20}/></button>
             </div>
             
             <form onSubmit={handleSaveUser} className="space-y-6">
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Nome Completo</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all" 
                        placeholder="Ex: João da Silva" 
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Usuário (Login)</label>
                        <input 
                          type="text" 
                          required 
                          disabled={isEditing}
                          value={formData.username} 
                          onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().trim()})} 
                          className={`w-full p-4 rounded-2xl font-black text-xs border border-transparent focus:bg-white focus:border-indigo-100 outline-none ${isEditing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50'}`} 
                          placeholder="joao.silva" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Senha</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                          <input 
                            type="password" 
                            required 
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                            className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 outline-none" 
                            placeholder="••••" 
                          />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Congregação / Unidade</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.institution} 
                        onChange={e => setFormData({...formData, institution: e.target.value})} 
                        className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all" 
                        placeholder="Ex: Congregação Parque Tijuca" 
                      />
                   </div>

                   <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">E-mail (Para Notificações)</label>
                      <input 
                        type="email" 
                        value={formData.email || ''} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                        className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 transition-all" 
                        placeholder="exemplo@email.com" 
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Telefone (Opcional)</label>
                        <input 
                          type="text" 
                          value={formData.phone || ''} 
                          onChange={e => setFormData({...formData, phone: e.target.value})} 
                          className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border border-transparent focus:bg-white focus:border-indigo-100 outline-none" 
                          placeholder="(85) 9...." 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Nível de Acesso</label>
                        <select 
                          value={formData.role} 
                          onChange={e => setFormData({...formData, role: e.target.value as any})} 
                          className="w-full p-4 bg-slate-50 rounded-2xl font-black text-[9px] uppercase tracking-widest outline-none cursor-pointer focus:bg-white"
                        >
                           <option value="USER">Tesoureiro (Padrão)</option>
                           <option value="ADMIN">Administrador Geral</option>
                        </select>
                      </div>
                   </div>
                </div>

                <div className="pt-6">
                   <button 
                    type="submit"
                    disabled={isSaving} 
                    className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] active-scale shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                   >
                     {isSaving ? (
                       <Loader2 className="animate-spin" size={20}/>
                     ) : (
                       isEditing ? 'Salvar Alterações' : 'Criar Conta de Acesso'
                     )}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

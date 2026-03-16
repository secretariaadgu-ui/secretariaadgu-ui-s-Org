
import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings, SystemSettings } from '../services/storageService';
import { Camera, Save, Loader2, CheckCircle, Building2, User, Mail, MapPin, Hash, Clock } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    institutionName: '',
    cnpj: '',
    address: '',
    email: '',
    president: '',
    logo: '',
    closingDay: 1
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const data = await getSettings();
    setSettings(data);
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSettings(settings);
      setSuccessMessage("Configurações salvas!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {successMessage && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">{successMessage}</span>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Configurações Gerais</h2>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Perfil da Instituição e Identidade Visual</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-soft border border-slate-50 flex flex-col md:flex-row gap-12">
          {/* Logo Upload Section */}
          <div className="flex flex-col items-center space-y-4 shrink-0">
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-300">
                {settings.logo ? (
                  <img src={settings.logo} className="w-full h-full object-contain" alt="Logo preview" />
                ) : (
                  <Building2 size={48} className="text-slate-200" />
                )}
              </div>
              <label className="absolute bottom-[-12px] right-[-12px] p-3 bg-indigo-600 text-white rounded-2xl shadow-lg cursor-pointer active-scale hover:bg-indigo-700 transition-all">
                <Camera size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logo da Instituição</p>
              <p className="text-[6px] font-bold text-slate-300 uppercase tracking-widest mt-1">Recomendado: PNG/SVG Fundo Transparente</p>
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Nome da Instituição</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" required value={settings.institutionName} onChange={e => setSettings({...settings, institutionName: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl font-bold text-xs border border-transparent focus:border-indigo-100 outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">CNPJ</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" value={settings.cnpj} onChange={e => setSettings({...settings, cnpj: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl font-bold text-xs border border-transparent focus:border-indigo-100 outline-none transition-all" placeholder="00.000.000/0001-00" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Política de Bloqueio</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <div className="w-full pl-11 pr-4 py-4 bg-slate-100/50 rounded-2xl font-black text-[10px] uppercase text-slate-500 border border-slate-100">
                  Fechamento Semanal: Segundas-feiras
                </div>
              </div>
              <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest ml-3 mt-1">* Competência é semanal. Relatórios de semanas anteriores são bloqueados às Terças-feiras.</p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Presidente / Diretor Responsável</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" value={settings.president} onChange={e => setSettings({...settings, president: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl font-bold text-xs border border-transparent focus:border-indigo-100 outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3">Endereço Sede</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl font-bold text-xs border border-transparent focus:border-indigo-100 outline-none transition-all" />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active-scale flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
          {isSaving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Alterações</>}
        </button>
      </form>
    </div>
  );
};

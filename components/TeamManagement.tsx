
import React, { useState, useEffect } from 'react';
import { TeamMember, AbsenceEntry, AbsenceType } from '../types';

interface TeamManagementProps {
  member: TeamMember;
  onSave: (updatedMember: TeamMember) => void;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ member, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'hr' | 'bank'>('profile');
  
  // State HR Fields
  const [name, setName] = useState(member.name);
  const [role, setRole] = useState(member.role);
  const [vacationDays, setVacationDays] = useState(member.total_vacation_days_per_year || 25);
  const [contractHours, setContractHours] = useState(member.hours_per_day_contract || 8.5);
  const [overtimeBalance, setOvertimeBalance] = useState(member.overtime_balance_hours || 0);
  
  // Working Hours & Breaks
  const [workStart, setWorkStart] = useState(member.work_start_time || '08:30');
  const [workEnd, setWorkEnd] = useState(member.work_end_time || '18:30');
  const [breakStart, setBreakStart] = useState(member.break_start_time || '13:00');
  const [breakEnd, setBreakEnd] = useState(member.break_end_time || '14:00');
  
  // Extra fields for info
  const [address, setAddress] = useState(member.address || '');
  const [avs, setAvs] = useState(member.avs_number || '');
  const [iban, setIban] = useState(member.iban || '');

  // Bank Adjustment Local State
  const [otAdjustment, setOtAdjustment] = useState<number | ''>('');
  const [otNotes, setOtNotes] = useState('');
  const [showApplySuccess, setShowApplySuccess] = useState(false);

  const handleApplyAdjustment = () => {
    if (otAdjustment === '' || otAdjustment === 0) return;
    setOvertimeBalance(prev => prev + Number(otAdjustment));
    setOtAdjustment('');
    setOtNotes('');
    setShowApplySuccess(true);
    setTimeout(() => setShowApplySuccess(false), 2000);
  };

  const handleSave = () => {
    onSave({
      ...member,
      name,
      role,
      address,
      avs_number: avs,
      iban,
      work_start_time: workStart,
      work_end_time: workEnd,
      break_start_time: breakStart,
      break_end_time: breakEnd,
      total_vacation_days_per_year: vacationDays,
      hours_per_day_contract: contractHours,
      overtime_balance_hours: overtimeBalance,
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <header className="flex items-center gap-8 mb-12">
        <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=000&color=fff`} className="w-24 h-24 rounded-[2.5rem] object-cover border-4 border-white shadow-2xl" />
        <div>
          <h3 className="text-4xl font-luxury font-bold text-gray-900">{member.name}</h3>
          <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em]">{member.role}</p>
        </div>
      </header>

      <nav className="flex gap-10 border-b border-gray-100 mb-12 overflow-x-auto scrollbar-hide">
        {[
          { id: 'profile', label: 'Anagrafica', icon: 'fa-id-card' },
          { id: 'hr', label: 'Contratto & Orari', icon: 'fa-file-signature' },
          { id: 'bank', label: 'Banca Ore', icon: 'fa-history' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'text-black border-black scale-105' : 'text-gray-300 border-transparent hover:text-gray-600'}`}
          >
            <i className={`fas ${tab.icon} text-[10px]`}></i>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide">
        {activeTab === 'profile' && (
          <div className="space-y-10 animate-in slide-in-from-right-4">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Nome d'Arte</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Ruolo Atelier</label>
                <input value={role} onChange={e => setRole(e.target.value)} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Indirizzo Residenza</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Numero AVS</label>
                <input value={avs} onChange={e => setAvs(e.target.value)} placeholder="756.xxxx.xxxx.xx" className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">IBAN Accreditamento</label>
                <input value={iban} onChange={e => setIban(e.target.value)} placeholder="CHxx xxxx xxxx xxxx x" className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hr' && (
          <div className="space-y-10 animate-in slide-in-from-right-4">
            {/* Sezione Orari e Pause */}
            <div className="bg-gray-50 p-10 rounded-[3.5rem] border border-gray-100 space-y-8">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600">Disponibilità & Turni</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Orario di Lavoro</label>
                    <div className="flex items-center gap-3">
                       <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="flex-1 p-4 rounded-2xl bg-white border-none text-xs font-bold shadow-sm" />
                       <span className="text-gray-300 font-bold">al</span>
                       <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="flex-1 p-4 rounded-2xl bg-white border-none text-xs font-bold shadow-sm" />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-bold text-amber-600 uppercase ml-2 tracking-widest">Pausa Pranzo (Sincronizzata)</label>
                    <div className="flex items-center gap-3">
                       <input type="time" value={breakStart} onChange={e => setBreakStart(e.target.value)} className="flex-1 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-xs font-bold shadow-sm" />
                       <span className="text-amber-200 font-bold">al</span>
                       <input type="time" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} className="flex-1 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-xs font-bold shadow-sm" />
                    </div>
                    <p className="text-[9px] text-amber-500 italic px-2">L'agenda bloccherà automaticamente questi slot.</p>
                 </div>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm space-y-8">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900">Parametri Contrattuali Annuali</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Diritto Ferie (Giorni/Anno)</label>
                    <input type="number" value={vacationDays} onChange={e => setVacationDays(Number(e.target.value))} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-lg shadow-inner" />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Ore Contrattuali Giornaliere</label>
                    <input type="number" step="0.5" value={contractHours} onChange={e => setContractHours(Number(e.target.value))} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-lg shadow-inner" />
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-10 animate-in slide-in-from-right-4">
             <div className="bg-gradient-to-br from-black to-gray-800 text-white p-12 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center justify-between group overflow-hidden relative gap-6">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 transition-transform duration-1000"><i className="fas fa-piggy-bank text-8xl"></i></div>
                <div className="relative z-10 w-full md:w-auto">
                   <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Saldo Banca Ore Attuale</p>
                   <div className="flex items-center gap-2">
                     <input 
                        type="number" 
                        value={overtimeBalance} 
                        onChange={e => setOvertimeBalance(Number(e.target.value))}
                        className="text-6xl font-luxury font-bold bg-transparent border-none text-white outline-none w-48 focus:border-b focus:border-amber-500"
                     />
                     <span className="text-xl">h</span>
                   </div>
                   <p className="text-[8px] text-gray-500 mt-2">Modificabile direttamente o tramite rettifica sotto</p>
                </div>
                <div className="text-right relative z-10 w-full md:w-auto">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Equivalente Congedo</p>
                   <p className="text-3xl font-luxury font-bold">{(overtimeBalance / contractHours).toFixed(1)} <span className="text-[11px]">gg</span></p>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="flex justify-between items-center">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-l-4 border-amber-600 pl-6">Rettifica Manuale</h4>
                   {showApplySuccess && <span className="text-green-600 text-[10px] font-bold uppercase animate-pulse"><i className="fas fa-check"></i> Applicato</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="flex gap-4">
                      <input 
                        type="number" 
                        placeholder="Ore (+/-)" 
                        value={otAdjustment} 
                        onChange={e => setOtAdjustment(e.target.value === '' ? '' : Number(e.target.value))}
                        className="flex-1 p-5 rounded-3xl bg-gray-50 border-none font-bold text-lg shadow-inner outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button 
                        onClick={handleApplyAdjustment}
                        disabled={otAdjustment === '' || otAdjustment === 0}
                        className="shrink-0 px-8 py-5 bg-black text-white rounded-3xl text-[11px] font-bold uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Applica
                      </button>
                   </div>
                   <textarea 
                     placeholder="Causale rettifica (es. Supporto extra sfilata Lugano, Apertura serale...)" 
                     value={otNotes}
                     onChange={e => setOtNotes(e.target.value)}
                     className="w-full p-5 rounded-3xl bg-gray-50 border-none text-xs font-medium shadow-inner resize-none"
                     rows={2}
                   />
                </div>
                <p className="text-[9px] text-gray-400 italic px-2">Nota: Inserire un valore positivo per aggiungere ore, negativo per sottrarle. Premere "Applica" per aggiornare il saldo visualizzato sopra.</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex gap-6 pt-10 mt-8 border-t border-gray-50">
        <button onClick={onClose} className="flex-1 py-6 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-black transition-colors">Chiudi</button>
        <button onClick={handleSave} className="flex-[2.5] py-6 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-widest shadow-2xl hover:bg-amber-700 transition-all transform active:scale-95">Salva Configurazione Professionale</button>
      </div>
    </div>
  );
};

export default TeamManagement;

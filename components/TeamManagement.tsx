
import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember, Appointment, Service, AbsenceEntry, AbsenceType } from '../types';

interface TeamManagementProps {
  member: TeamMember;
  appointments: Appointment[];
  services: Service[];
  profiles: any[];
  onSave: (updatedMember: TeamMember) => void;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ member, appointments, services, profiles, onSave, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'hr_analysis' | 'schedule' | 'overtime' | 'admin'>('analytics');
  
  // Local States
  const [name, setName] = useState(member.name || '');
  const [role, setRole] = useState(member.role || '');
  const [totalVacationDays, setTotalVacationDays] = useState(member.total_vacation_days || 25);
  const [overtimeHours, setOvertimeHours] = useState(member.overtime_balance_hours || 0);
  const [contractHoursPerDay, setContractHoursPerDay] = useState(member.hours_per_day_contract || 8);
  const [workStartTime, setWorkStartTime] = useState(member.work_start_time || '08:30');
  const [workEndTime, setWorkEndTime] = useState(member.work_end_time || '18:30');
  const [breakStartTime, setBreakStartTime] = useState(member.break_start_time || '13:00');
  const [breakEndTime, setBreakEndTime] = useState(member.break_end_time || '14:00');
  const [weeklyClosures, setWeeklyClosures] = useState<number[]>(member.weekly_closures || []);
  const [address, setAddress] = useState(member.address || '');
  const [avsNumber, setAvsNumber] = useState(member.avs_number || '');
  const [iban, setIban] = useState(member.iban || '');
  const [avatar, setAvatar] = useState<string | null>(member.avatar || null);

  const [overtimeAdjust, setOvertimeAdjust] = useState<number>(0);
  const [overtimeNotes, setOvertimeNotes] = useState('');

  // Sincronizzazione al cambio membro
  useEffect(() => {
    setName(member.name);
    setRole(member.role);
    setTotalVacationDays(member.total_vacation_days || 25);
    setOvertimeHours(member.overtime_balance_hours || 0);
    setContractHoursPerDay(member.hours_per_day_contract || 8);
    setWeeklyClosures(member.weekly_closures || []);
    setAvatar(member.avatar || null);
  }, [member]);

  // Analisi HR avanzata
  const hrStats = useMemo(() => {
    const absences = member.absences_json || [];
    
    const countByType = (type: AbsenceType) => {
      return absences
        .filter(a => a.type === type)
        .reduce((acc, a) => {
          if (a.isFullDay) return acc + 1;
          // Se parziale, calcoliamo la frazione di giorno basata sulle ore contrattuali
          return acc + ((a.hoursCount || 0) / contractHoursPerDay);
        }, 0);
    };

    const vacationUsed = countByType('vacation');
    const sickDays = countByType('sick');
    const injuryDays = countByType('injury');
    const trainingDays = countByType('training');
    const overtimeUsedAsDays = countByType('overtime');

    return {
      vacationUsed: parseFloat(vacationUsed.toFixed(1)),
      vacationRemaining: parseFloat((totalVacationDays - vacationUsed).toFixed(1)),
      sickDays: parseFloat(sickDays.toFixed(1)),
      injuryDays: parseFloat(injuryDays.toFixed(1)),
      trainingDays: parseFloat(trainingDays.toFixed(1)),
      overtimeUsedAsDays: parseFloat(overtimeUsedAsDays.toFixed(1)),
      totalAbsenceRate: ((vacationUsed + sickDays + injuryDays) / 260 * 100).toFixed(1) // Stima su 260 gg lavorativi
    };
  }, [member.absences_json, totalVacationDays, contractHoursPerDay]);

  const handleUpdate = () => {
    onSave({ 
      ...member, 
      name, role, avatar: avatar || undefined,
      total_vacation_days: totalVacationDays,
      overtime_balance_hours: overtimeHours,
      hours_per_day_contract: contractHoursPerDay,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      break_start_time: breakStartTime,
      break_end_time: breakEndTime,
      weekly_closures: weeklyClosures,
      address, avs_number: avsNumber, iban
    });
  };

  const handleAdjustOvertime = () => {
    setOvertimeHours(prev => prev + overtimeAdjust);
    setOvertimeAdjust(0);
    setOvertimeNotes('');
    // Il salvataggio reale avverrà alla pressione di "Salva Modifiche Globali" o possiamo chiamare handleUpdate()
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-8">
          <img src={avatar || `https://ui-avatars.com/api/?name=${name}&background=000&color=fff`} className="w-20 h-20 rounded-[2rem] object-cover shadow-2xl border-4 border-white" />
          <div>
            <h3 className="text-3xl font-luxury font-bold text-gray-900">{name}</h3>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{role}</p>
          </div>
        </div>
        <div className="text-right">
           <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Saldo Ore Straordinarie</p>
           <p className={`text-2xl font-luxury font-bold ${overtimeHours >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
             {overtimeHours} h
           </p>
        </div>
      </header>

      <div className="flex gap-8 border-b border-gray-100 mb-10 overflow-x-auto scrollbar-hide">
        {[
          {id: 'analytics', label: 'Performance'},
          {id: 'hr_analysis', label: 'Analisi Assenze'},
          {id: 'overtime', label: 'Straordinari'},
          {id: 'schedule', label: 'Orari & Contratti'},
          {id: 'admin', label: 'Dati Privati'}
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveSubTab(t.id as any)} 
            className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === t.id ? 'text-black border-b-2 border-black' : 'text-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[450px]">
        {/* TAB ANALISI HR */}
        {activeSubTab === 'hr_analysis' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 text-center space-y-2">
                   <p className="text-[8px] font-bold text-gray-400 uppercase">Ferie Godute</p>
                   <p className="text-3xl font-luxury font-bold">{hrStats.vacationUsed}</p>
                   <p className="text-[8px] text-gray-300">di {totalVacationDays} gg totali</p>
                </div>
                <div className="bg-black text-white p-6 rounded-[2.5rem] shadow-xl text-center space-y-2">
                   <p className="text-[8px] font-bold text-amber-500 uppercase">Ferie Residue</p>
                   <p className="text-3xl font-luxury font-bold">{hrStats.vacationRemaining}</p>
                   <p className="text-[8px] text-gray-400 font-bold uppercase">Disponibili</p>
                </div>
                <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 text-center space-y-2">
                   <p className="text-[8px] font-bold text-rose-400 uppercase">Malattia</p>
                   <p className="text-3xl font-luxury font-bold text-rose-700">{hrStats.sickDays} gg</p>
                </div>
                <div className="bg-orange-50 p-6 rounded-[2.5rem] border border-orange-100 text-center space-y-2">
                   <p className="text-[8px] font-bold text-orange-400 uppercase">Infortuni</p>
                   <p className="text-3xl font-luxury font-bold text-orange-700">{hrStats.injuryDays} gg</p>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm space-y-8">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-900 border-b pb-4">Dettaglio Assenze per l'anno corrente</h4>
                <div className="grid gap-4">
                   <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                         <span className="text-xs font-bold text-gray-600">Formazione e Aggiornamento</span>
                      </div>
                      <span className="font-luxury font-bold text-lg">{hrStats.trainingDays} gg</span>
                   </div>
                   <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                         <span className="text-xs font-bold text-gray-600">Recupero tramite Straordinari</span>
                      </div>
                      <span className="font-luxury font-bold text-lg">{hrStats.overtimeUsedAsDays} gg</span>
                   </div>
                   <div className="pt-6 mt-4 border-t border-gray-100 flex items-center justify-between px-4">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tasso di assenteismo stimato</p>
                      <p className="text-xl font-luxury font-bold">{hrStats.totalAbsenceRate}%</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB STRAORDINARI */}
        {activeSubTab === 'overtime' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="bg-amber-50 p-10 rounded-[4rem] border border-amber-100/50 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-2 text-center md:text-left">
                   <h4 className="text-xl font-luxury font-bold text-amber-900">Gestione Banca Ore</h4>
                   <p className="text-xs text-amber-700 leading-relaxed max-w-md">Qui puoi aggiungere ore extra lavorate o sottrarle manualmente. Gli straordinari possono essere usati dallo staff per richiedere giorni di recupero (1 gg = {contractHoursPerDay}h).</p>
                </div>
                <div className="bg-white p-8 rounded-[3rem] shadow-xl text-center min-w-[150px]">
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bilancio Attuale</p>
                   <p className="text-4xl font-luxury font-bold text-gray-900">{overtimeHours} h</p>
                </div>
             </div>

             <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="grid md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Regolazione Manuale</p>
                      <div className="flex gap-4">
                         <input 
                           type="number" 
                           placeholder="Ore (+/-)" 
                           value={overtimeAdjust} 
                           onChange={e => setOvertimeAdjust(parseFloat(e.target.value))}
                           className="flex-1 p-5 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner"
                         />
                         <button 
                           onClick={handleAdjustOvertime}
                           className="px-10 py-5 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all"
                         >
                           Applica
                         </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Motivazione (es. Evento Sfilata, Apertura Straordinaria...)" 
                        value={overtimeNotes}
                        onChange={e => setOvertimeNotes(e.target.value)}
                        className="w-full p-4 rounded-xl bg-gray-50 border-none text-xs"
                      />
                   </div>
                   <div className="bg-gray-50 p-8 rounded-[3rem] flex flex-col justify-center text-center space-y-4">
                      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Conversione Tempo Libero</p>
                      <h5 className="text-lg font-bold text-gray-900">Il collaboratore ha maturato</h5>
                      <div className="text-3xl font-luxury font-bold text-amber-600">
                         {Math.floor(overtimeHours / contractHoursPerDay)} giorni
                      </div>
                      <p className="text-[9px] text-gray-400 uppercase font-bold">di riposo compensativo</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB PERFORMANCE (Esistente ma aggiornata) */}
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-2 gap-8 animate-in fade-in">
            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm text-center space-y-4 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-lg"><i className="fas fa-coins text-xl"></i></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produzione Confermata</p>
              <h4 className="text-4xl font-luxury font-bold">CHF {appointments.filter(a => a.team_member_name === member.name && a.status === 'confirmed').reduce((acc, a) => acc + (a.services?.price || 0), 0)}</h4>
            </div>
            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm text-center space-y-4 hover:shadow-xl transition-all">
              <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg"><i className="fas fa-magic text-xl"></i></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rituali Eseguiti</p>
              <h4 className="text-4xl font-luxury font-bold">{appointments.filter(a => a.team_member_name === member.name && a.status === 'confirmed').length}</h4>
            </div>
          </div>
        )}

        {/* TAB PIANIFICAZIONE & CONTRATTI */}
        {activeSubTab === 'schedule' && (
          <div className="space-y-12 animate-in fade-in">
             <div className="bg-gray-50 p-10 rounded-[4rem] border border-gray-100 space-y-8">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600 mb-6">Parametri Contrattuali</h4>
                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Diritto Annuale Ferie (Giorni)</label>
                      <input type="number" value={totalVacationDays} onChange={e => setTotalVacationDays(parseInt(e.target.value))} className="w-full p-5 rounded-2xl bg-white border-none font-bold text-sm shadow-sm" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Ore Lavorative per Giorno</label>
                      <input type="number" value={contractHoursPerDay} onChange={e => setContractHoursPerDay(parseFloat(e.target.value))} className="w-full p-5 rounded-2xl bg-white border-none font-bold text-sm shadow-sm" />
                   </div>
                </div>
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                  <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Turno di Servizio</p>
                  <div className="flex items-center gap-4">
                    <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} className="flex-1 p-4 rounded-xl border-none font-bold text-xs shadow-inner" />
                    <span className="text-gray-300">al</span>
                    <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} className="flex-1 p-4 rounded-xl border-none font-bold text-xs shadow-inner" />
                  </div>
                </div>
                <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                  <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Chiusura Settimanale</p>
                  <div className="flex flex-wrap gap-2">
                    {[1,2,3,4,5,6,0].map(d => (
                       <button 
                         key={d} 
                         onClick={() => setWeeklyClosures(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                         className={`w-10 h-10 rounded-xl text-[10px] font-bold uppercase transition-all ${weeklyClosures.includes(d) ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-300 border border-gray-50'}`}
                       >
                         {['D','L','M','M','G','V','S'][d]}
                       </button>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB ANAGRAFICA */}
        {activeSubTab === 'admin' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Nome Completo</label>
                   <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Ruolo Atelier</label>
                   <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Indirizzo Residenza</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
             </div>
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Numero AVS</label>
                   <input type="text" value={avsNumber} onChange={e => setAvsNumber(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">IBAN Accreditamento</label>
                   <input type="text" value={iban} onChange={e => setIban(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-10 mt-10 border-t border-gray-100">
        <button onClick={onClose} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-black transition-colors">Chiudi senza salvare</button>
        <button onClick={handleUpdate} className="flex-[2] py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl hover:bg-amber-700 transition-all transform active:scale-95">Salva Modifiche Globali</button>
      </div>
    </div>
  );
};

export default TeamManagement;

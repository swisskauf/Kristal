
import React, { useMemo, useState } from 'react';
import { TeamMember, AbsenceEntry, AbsenceType } from '../types';

interface HRManagementProps {
  team: TeamMember[];
  onEditMember: (member: TeamMember) => void;
  onAddMember: () => void;
  onUpdateMember: (member: TeamMember) => void;
}

const HRManagement: React.FC<HRManagementProps> = ({ team, onEditMember, onAddMember, onUpdateMember }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  
  // State for adding new absence
  const [isAddAbsenceModalOpen, setIsAddAbsenceModalOpen] = useState(false);
  const [newAbsenceData, setNewAbsenceData] = useState<{
    memberId: string; // Using name as ID based on current structure
    type: AbsenceType;
    startDate: string;
    endDate: string;
    isFullDay: boolean;
    hours: number;
    notes: string;
  }>({
    memberId: '',
    type: 'vacation',
    startDate: '',
    endDate: '',
    isFullDay: true,
    hours: 8.5,
    notes: ''
  });

  const getMemberHRStats = (member: TeamMember) => {
    const absences = member.absences_json || [];
    const hoursPerDay = member.hours_per_day_contract || 8.5;
    
    const calculateDays = (type: AbsenceType) => {
      const hours = absences
        .filter(a => a.type === type)
        .reduce((acc, a) => acc + (a.hoursCount || 0), 0);
      return parseFloat((hours / hoursPerDay).toFixed(1));
    };

    const vacationUsed = calculateDays('vacation');
    const sickDays = calculateDays('sick');
    const injuryDays = calculateDays('injury');
    const trainingDays = calculateDays('training');
    const recoveryUsed = calculateDays('overtime_recovery');

    return {
      vacationUsed,
      vacationRemaining: parseFloat((member.total_vacation_days_per_year - vacationUsed).toFixed(1)),
      sickDays,
      injuryDays,
      trainingDays,
      recoveryUsed,
      overtimeBalance: member.overtime_balance_hours || 0,
      potentialRecoveryDays: Math.floor((member.overtime_balance_hours || 0) / hoursPerDay)
    };
  };

  const allAbsences = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Appiattisce tutte le assenze di tutti i membri in un unico array
    const entries = team.flatMap(m => 
      (m.absences_json || []).map(a => ({
        ...a, 
        memberName: m.name, 
        memberAvatar: m.avatar,
        role: m.role
      }))
    );

    // Ordina per data
    return entries.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [team]);

  // Raggruppa le assenze per mese (es. "Ottobre 2023")
  const groupedAbsences = useMemo(() => {
    const groups: Record<string, typeof allAbsences> = {};
    allAbsences.forEach(abs => {
      const date = new Date(abs.startDate);
      const key = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      const capitalKey = key.charAt(0).toUpperCase() + key.slice(1);
      if (!groups[capitalKey]) groups[capitalKey] = [];
      groups[capitalKey].push(abs);
    });
    return groups;
  }, [allAbsences]);

  const getTypeLabel = (type: string) => {
    const map: any = { vacation: 'Ferie', sick: 'Malattia', training: 'Formazione', unpaid: 'Non Retribuito', overtime_recovery: 'Recupero', injury: 'Infortunio', overtime: 'Straordinario' };
    return map[type] || type;
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'vacation': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'sick': return 'bg-red-100 text-red-800 border-red-200';
      case 'training': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'overtime_recovery': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overtime': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDeleteAbsence = (memberName: string, absenceId: string) => {
    const member = team.find(m => m.name === memberName);
    if (!member) return;

    const absenceToDelete = member.absences_json?.find(a => a.id === absenceId);
    if (!absenceToDelete) return;

    // Calcolo impatto su banca ore
    let updatedOvertime = member.overtime_balance_hours || 0;
    if (absenceToDelete.type === 'overtime') {
      updatedOvertime -= absenceToDelete.hoursCount; // Rimuovo ore extra accreditate
    } else if (absenceToDelete.type === 'overtime_recovery') {
      updatedOvertime += absenceToDelete.hoursCount; // Restituisco ore scalate
    }

    const updatedAbsences = member.absences_json?.filter(a => a.id !== absenceId) || [];

    onUpdateMember({
      ...member,
      absences_json: updatedAbsences,
      overtime_balance_hours: updatedOvertime
    });
  };

  const handleSaveNewAbsence = () => {
    if (!newAbsenceData.memberId || !newAbsenceData.startDate) return;

    const member = team.find(m => m.name === newAbsenceData.memberId);
    if (!member) return;

    const startDateISO = new Date(newAbsenceData.startDate).toISOString();
    const endDateISO = newAbsenceData.endDate ? new Date(newAbsenceData.endDate).toISOString() : startDateISO;

    const newEntry: AbsenceEntry = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: startDateISO,
      endDate: endDateISO,
      type: newAbsenceData.type,
      isFullDay: newAbsenceData.isFullDay,
      hoursCount: newAbsenceData.isFullDay ? (member.hours_per_day_contract || 8.5) : Number(newAbsenceData.hours),
      notes: newAbsenceData.notes
    };

    // Calcolo impatto su banca ore
    let updatedOvertime = member.overtime_balance_hours || 0;
    if (newEntry.type === 'overtime') {
      updatedOvertime += newEntry.hoursCount;
    } else if (newEntry.type === 'overtime_recovery') {
      updatedOvertime -= newEntry.hoursCount;
    }

    onUpdateMember({
      ...member,
      absences_json: [...(member.absences_json || []), newEntry],
      overtime_balance_hours: updatedOvertime
    });

    setIsAddAbsenceModalOpen(false);
    // Reset form defaults
    setNewAbsenceData({
      memberId: '',
      type: 'vacation',
      startDate: '',
      endDate: '',
      isFullDay: true,
      hours: 8.5,
      notes: ''
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end border-b border-gray-100 pb-8 gap-6">
        <div>
          <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">HR & Talent</h2>
          <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Analisi Capitale Umano Kristal</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-gray-100 p-1 rounded-2xl flex">
              <button onClick={() => setViewMode('cards')} className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${viewMode === 'cards' ? 'bg-white shadow-md text-black' : 'text-gray-400'}`}>Cards</button>
              <button onClick={() => setViewMode('calendar')} className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${viewMode === 'calendar' ? 'bg-white shadow-md text-black' : 'text-gray-400'}`}>Registro</button>
           </div>
           <button 
             onClick={onAddMember}
             className="px-6 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all flex items-center gap-2"
           >
             <i className="fas fa-plus"></i> <span className="hidden md:inline">Nuovo Staff</span>
           </button>
        </div>
      </header>

      {viewMode === 'calendar' ? (
        <div className="space-y-10 animate-in slide-in-from-bottom-4">
           <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm relative">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-luxury font-bold">Registro Assenze & Chiusure</h3>
                <button 
                  onClick={() => setIsAddAbsenceModalOpen(true)}
                  className="px-6 py-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-amber-100 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-calendar-plus"></i> Registra Assenza
                </button>
              </div>
              
              {Object.keys(groupedAbsences).length === 0 ? (
                <div className="text-center py-20 text-gray-300 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[3rem]">
                  Nessuna assenza programmata
                </div>
              ) : (
                <div className="space-y-12">
                   {Object.entries(groupedAbsences).map(([month, absences]) => (
                     <div key={month} className="space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="h-px bg-gray-100 flex-1"></div>
                           <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600 bg-amber-50 px-6 py-2 rounded-full">{month}</h4>
                           <div className="h-px bg-gray-100 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {absences.map((abs) => (
                             <div key={abs.id} className="group bg-white border border-gray-100 p-6 rounded-[2.5rem] hover:shadow-lg transition-all hover:border-amber-100 relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 rounded-full opacity-20 transition-all group-hover:scale-150 ${getTypeColor(abs.type).split(' ')[0]}`}></div>
                                
                                <button 
                                  onClick={() => handleDeleteAbsence(abs.memberName, abs.id)}
                                  className="absolute top-4 right-4 text-gray-300 hover:text-red-500 z-20 transition-colors bg-white/50 backdrop-blur-sm p-2 rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                >
                                  <i className="fas fa-trash-alt text-xs"></i>
                                </button>

                                <div className="flex items-start gap-4 relative z-10">
                                   <img src={abs.memberAvatar || `https://ui-avatars.com/api/?name=${abs.memberName}`} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                                   <div>
                                      <h5 className="font-bold text-sm text-gray-900">{abs.memberName}</h5>
                                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-2">{abs.role}</p>
                                      <div className={`inline-block px-3 py-1 rounded-lg border text-[8px] font-bold uppercase tracking-wide ${getTypeColor(abs.type)}`}>
                                         {getTypeLabel(abs.type)}
                                      </div>
                                   </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-end relative z-10">
                                   <div>
                                      <p className="text-[9px] font-bold text-gray-300 uppercase">Durata</p>
                                      <p className="text-xs font-bold text-gray-900">
                                        {new Date(abs.startDate).getDate()} - {new Date(abs.endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long'})}
                                      </p>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[9px] font-bold text-gray-300 uppercase">Giorni</p>
                                      <p className="text-xs font-bold text-gray-900">{(abs.hoursCount / 8.5).toFixed(1)}</p>
                                   </div>
                                </div>
                                {abs.notes && (
                                  <p className="mt-4 text-[9px] text-gray-400 italic bg-gray-50 p-3 rounded-xl">"{abs.notes}"</p>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 animate-in slide-in-from-bottom-4">
          {team.map((member, idx) => {
            const stats = getMemberHRStats(member);
            const vacationPercent = (stats.vacationUsed / member.total_vacation_days_per_year) * 100;

            return (
              <div 
                key={member.name}
                className="bg-white rounded-[4rem] border border-gray-50 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="p-10 flex flex-col xl:flex-row gap-12 items-center">
                  <div className="flex flex-col items-center text-center space-y-4 min-w-[220px]">
                    <div className="relative">
                      <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=000&color=fff`} className="w-28 h-28 rounded-[3rem] object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-500" />
                      <button 
                        onClick={() => onEditMember(member)}
                        className="absolute -bottom-2 -right-2 w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-amber-600 transition-all active:scale-90"
                      >
                        <i className="fas fa-user-edit text-sm"></i>
                      </button>
                    </div>
                    <div>
                      <h4 className="text-2xl font-luxury font-bold text-gray-900">{member.name}</h4>
                      <p className="text-[9px] text-amber-600 font-bold uppercase tracking-[0.2em]">{member.role}</p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ferie Residue</p>
                        <p className={`text-xl font-luxury font-bold ${stats.vacationRemaining < 5 ? 'text-red-500' : 'text-gray-900'}`}>{stats.vacationRemaining} <span className="text-[10px] text-gray-300">gg</span></p>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${vacationPercent > 85 ? 'bg-amber-500' : 'bg-black'}`}
                          style={{ width: `${Math.min(vacationPercent, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[7px] text-gray-300 font-bold uppercase">Utilizzate: {stats.vacationUsed} / {member.total_vacation_days_per_year}</p>
                    </div>

                    <div className="bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100/50 flex flex-col justify-between group/ot transition-all hover:bg-amber-100/50 min-h-[140px]">
                      <div className="flex justify-between items-start">
                         <p className="text-[8px] font-bold text-amber-700 uppercase tracking-widest">Banca Ore</p>
                         <i className="fas fa-history text-[10px] text-amber-300"></i>
                      </div>
                      <div className="flex items-baseline gap-1 py-2">
                        <p className={`text-3xl font-luxury font-bold ${stats.overtimeBalance < 0 ? 'text-red-500' : 'text-gray-900'}`}>{stats.overtimeBalance}</p>
                        <p className="text-[11px] font-bold text-amber-600">h</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[7px] text-amber-800/60 font-bold uppercase">
                          ≈ {stats.potentialRecoveryDays} giorni di recupero
                        </p>
                      </div>
                    </div>

                    <div className="p-6 rounded-[2.5rem] border border-gray-50 flex flex-col justify-between bg-white shadow-inner min-h-[140px]">
                      <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">Salute</p>
                      <div className="py-2">
                         <p className="text-2xl font-luxury font-bold text-gray-900">{stats.sickDays + stats.injuryDays} <span className="text-[10px] text-gray-300">gg</span></p>
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 h-1 rounded-full bg-rose-100">
                           <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min((stats.sickDays / 15) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                      <p className="text-[7px] text-gray-300 font-bold uppercase mt-1">
                        Malattia: {stats.sickDays} | Inf: {stats.injuryDays}
                      </p>
                    </div>

                    <div className="p-6 rounded-[2.5rem] border border-gray-50 flex flex-col justify-between bg-white shadow-inner min-h-[140px]">
                      <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Formazione</p>
                      <div className="py-2">
                         <p className="text-2xl font-luxury font-bold text-gray-900">{stats.trainingDays} <span className="text-[10px] text-gray-300">gg</span></p>
                      </div>
                      <p className="text-[7px] text-gray-400 font-bold uppercase">Aggiornamento</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="bg-black text-white p-12 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 mt-12">
         <div className="space-y-2 text-center md:text-left">
            <h4 className="text-3xl font-luxury font-bold">Policy Straordinari</h4>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed">Il sistema calcola automaticamente la conversione del tempo extra lavorato in giornate di congedo compensativo.</p>
         </div>
         <div className="flex gap-4">
            <button className="px-10 py-5 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">Esporta PDF Registro</button>
         </div>
      </div>

      {isAddAbsenceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl space-y-6 relative animate-in zoom-in-95">
             <button onClick={() => setIsAddAbsenceModalOpen(false)} className="absolute top-8 right-8 text-gray-300 hover:text-black transition-colors"><i className="fas fa-times text-xl"></i></button>
             <h3 className="text-2xl font-luxury font-bold">Registra Assenza</h3>
             
             <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Membro Staff</label>
                 <select 
                   value={newAbsenceData.memberId} 
                   onChange={e => setNewAbsenceData({...newAbsenceData, memberId: e.target.value})}
                   className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs font-bold outline-none"
                 >
                   <option value="" disabled>Seleziona collaboratore...</option>
                   {team.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                 </select>
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Tipologia</label>
                 <select 
                   value={newAbsenceData.type} 
                   onChange={e => setNewAbsenceData({...newAbsenceData, type: e.target.value as AbsenceType})}
                   className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs font-bold outline-none"
                 >
                   <option value="vacation">Ferie / Vacanza</option>
                   <option value="sick">Malattia</option>
                   <option value="training">Formazione</option>
                   <option value="overtime_recovery">Recupero Ore</option>
                   <option value="unpaid">Non Retribuito</option>
                   <option value="injury">Infortunio</option>
                 </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Dal</label>
                   <input type="date" value={newAbsenceData.startDate} onChange={e => setNewAbsenceData({...newAbsenceData, startDate: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs font-bold outline-none" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Al</label>
                   <input type="date" value={newAbsenceData.endDate} onChange={e => setNewAbsenceData({...newAbsenceData, endDate: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs font-bold outline-none" />
                 </div>
               </div>

               <div className="flex items-center gap-4 py-2">
                 <button 
                    onClick={() => setNewAbsenceData({...newAbsenceData, isFullDay: true})}
                    className={`flex-1 py-3 text-[9px] font-bold uppercase rounded-xl border ${newAbsenceData.isFullDay ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}
                 >
                    Giorno Intero
                 </button>
                 <button 
                    onClick={() => setNewAbsenceData({...newAbsenceData, isFullDay: false})}
                    className={`flex-1 py-3 text-[9px] font-bold uppercase rounded-xl border ${!newAbsenceData.isFullDay ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-100'}`}
                 >
                    A Ore
                 </button>
               </div>

               {!newAbsenceData.isFullDay && (
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Ore Totali</label>
                   <input type="number" step="0.5" value={newAbsenceData.hours} onChange={e => setNewAbsenceData({...newAbsenceData, hours: Number(e.target.value)})} className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs font-bold outline-none" />
                 </div>
               )}

               <div className="space-y-1">
                 <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Note</label>
                 <textarea value={newAbsenceData.notes} onChange={e => setNewAbsenceData({...newAbsenceData, notes: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs font-bold outline-none resize-none" rows={2} />
               </div>
             </div>

             <button onClick={handleSaveNewAbsence} className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all shadow-xl">Conferma Inserimento</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRManagement;

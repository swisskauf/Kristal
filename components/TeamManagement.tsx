
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, Service, AbsenceEntry, AbsenceType } from '../types';

interface TeamManagementProps {
  member: TeamMember;
  appointments: Appointment[];
  services: Service[];
  onSave: (updatedMember: TeamMember) => void;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ member, appointments, services, onSave, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'schedule' | 'vacations'>('analytics');
  
  // Orari precisi in formato HH:mm
  const [workStartTime, setWorkStartTime] = useState(member.work_start_time || '08:30');
  const [workEndTime, setWorkEndTime] = useState(member.work_end_time || '18:30');
  const [totalVacationDays, setTotalVacationDays] = useState(member.total_vacation_days || 25);
  const [avatarUrl, setAvatarUrl] = useState(member.avatar || '');
  
  const [newAbsence, setNewAbsence] = useState<{start: string, end: string, type: AbsenceType, notes: string}>({
    start: '',
    end: '',
    type: 'vacation',
    notes: ''
  });

  const absences = useMemo(() => member.absences_json || [], [member.absences_json]);

  const usedVacationDays = useMemo(() => {
    return absences
      .filter(a => a.type === 'vacation')
      .reduce((acc, a) => {
        const start = new Date(a.startDate);
        const end = new Date(a.endDate);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return acc + diff;
      }, 0);
  }, [absences]);

  const stats = useMemo(() => {
    const memberAppts = appointments.filter(a => a.team_member_name === member.name);
    const revenue = memberAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return { revenue, count: memberAppts.length };
  }, [appointments, member.name]);

  const handleUpdateProfile = () => {
    onSave({ 
      ...member, 
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      total_vacation_days: Number(totalVacationDays),
      avatar: avatarUrl
    });
  };

  const addAbsence = () => {
    if (!newAbsence.start || !newAbsence.end) return;
    
    const entry: AbsenceEntry = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: newAbsence.start,
      endDate: newAbsence.end,
      type: newAbsence.type,
      notes: newAbsence.notes
    };

    const updatedAbsences = [...absences, entry].sort((a, b) => b.startDate.localeCompare(a.startDate));
    
    // Generiamo anche l'array legacy per il planning visivo
    const legacyDates: string[] = [];
    let curr = new Date(entry.startDate);
    const stop = new Date(entry.endDate);
    while(curr <= stop) {
      legacyDates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    onSave({ 
      ...member, 
      absences_json: updatedAbsences,
      unavailable_dates: Array.from(new Set([...(member.unavailable_dates || []), ...legacyDates]))
    });
    
    setNewAbsence({ start: '', end: '', type: 'vacation', notes: '' });
  };

  const removeAbsence = (id: string) => {
    const updatedAbsences = absences.filter(a => a.id !== id);
    onSave({ ...member, absences_json: updatedAbsences });
  };

  const getAbsenceBadge = (type: AbsenceType) => {
    const config: Record<string, {label: string, color: string}> = {
      vacation: { label: 'Ferie', color: 'bg-blue-50 text-blue-600' },
      sick: { label: 'Malattia', color: 'bg-red-50 text-red-600' },
      injury: { label: 'Infortunio', color: 'bg-orange-50 text-orange-600' },
      maternity: { label: 'Maternità', color: 'bg-pink-50 text-pink-600' },
      paternity: { label: 'Paternità', color: 'bg-indigo-50 text-indigo-600' },
      training: { label: 'Formazione', color: 'bg-green-50 text-green-600' },
      bereavement: { label: 'Lutto', color: 'bg-gray-800 text-white' },
      unpaid: { label: 'Non Pagato', color: 'bg-gray-100 text-gray-500' },
      overtime: { label: 'Straordinario', color: 'bg-amber-100 text-amber-700' }
    };
    const c = config[type] || config.unpaid;
    return <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase ${c.color}`}>{c.label}</span>;
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-h-[85vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} className="w-20 h-20 rounded-full shadow-lg border-2 border-white object-cover" />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <i className="fas fa-camera text-white text-xs"></i>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-luxury font-bold text-gray-900">{member.name}</h3>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{member.role}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-black"><i className="fas fa-times text-xl"></i></button>
      </div>

      <div className="flex gap-6 border-b border-gray-100 mb-8 overflow-x-auto scrollbar-hide">
        {[
          { id: 'analytics', label: 'Performance', icon: 'fa-chart-line' },
          { id: 'schedule', label: 'Orari e Profilo', icon: 'fa-user-cog' },
          { id: 'vacations', label: 'Congedi e Assenze', icon: 'fa-calendar-alt' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex items-center gap-2 pb-3 text-[9px] font-bold uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-300'}`}>
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {activeSubTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-6 rounded-3xl">
                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Fatturato Personale</p>
                <h4 className="text-2xl font-luxury font-bold">CHF {stats.revenue}</h4>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl">
                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Rituali Eseguiti</p>
                <h4 className="text-2xl font-luxury font-bold">{stats.count}</h4>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-8 rounded-[2.5rem] space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Inizio Turno (Preciso)</label>
                    <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Fine Turno (Preciso)</label>
                    <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold text-sm" />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">URL Foto Profilo</label>
                  <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs" />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Budget Ferie Annuo</label>
                  <input type="number" value={totalVacationDays} onChange={e => setTotalVacationDays(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold" />
               </div>
               <button onClick={handleUpdateProfile} className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl hover:bg-amber-600 transition-all">Salva Profilo Artista</button>
            </div>
          </div>
        )}

        {activeSubTab === 'vacations' && (
          <div className="space-y-8 pb-10">
            {/* BILANCIO FERIE */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 text-center">
                <p className="text-[8px] font-bold text-blue-600 uppercase mb-1">Contratto</p>
                <p className="text-2xl font-luxury font-bold">{totalVacationDays}</p>
              </div>
              <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 text-center">
                <p className="text-[8px] font-bold text-amber-600 uppercase mb-1">Godute</p>
                <p className="text-2xl font-luxury font-bold">{usedVacationDays}</p>
              </div>
              <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 text-center">
                <p className="text-[8px] font-bold text-green-600 uppercase mb-1">Residuo</p>
                <p className="text-2xl font-luxury font-bold">{totalVacationDays - usedVacationDays}</p>
              </div>
            </div>

            {/* NUOVA REGISTRAZIONE */}
            <div className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100 space-y-6">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Registra Assenza o Congedo</h5>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={newAbsence.start} onChange={e => setNewAbsence({...newAbsence, start: e.target.value})} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs font-bold" />
                <input type="date" value={newAbsence.end} onChange={e => setNewAbsence({...newAbsence, end: e.target.value})} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs font-bold" />
              </div>
              <select value={newAbsence.type} onChange={e => setNewAbsence({...newAbsence, type: e.target.value as AbsenceType})} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs font-bold">
                <option value="vacation">Ferie / Vacanza</option>
                <option value="sick">Malattia</option>
                <option value="injury">Infortunio</option>
                <option value="maternity">Maternità</option>
                <option value="paternity">Paternità</option>
                <option value="training">Formazione</option>
                <option value="bereavement">Lutto</option>
                <option value="unpaid">Congedo non pagato</option>
                <option value="overtime">Compensazione Straordinario</option>
              </select>
              <textarea placeholder="Note interne..." value={newAbsence.notes} onChange={e => setNewAbsence({...newAbsence, notes: e.target.value})} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs resize-none" rows={2} />
              <button onClick={addAbsence} className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Conferma Registrazione</button>
            </div>

            {/* LISTA PERIODI */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Storico Congedi</h5>
              <div className="space-y-3">
                {absences.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-6 bg-white border border-gray-50 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-6">
                       <div className="text-center min-w-[50px] border-r border-gray-50 pr-6">
                          <p className="text-lg font-luxury font-bold">
                            {Math.ceil((new Date(a.endDate).getTime() - new Date(a.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                          </p>
                          <p className="text-[7px] text-gray-400 font-bold uppercase">Giorni</p>
                       </div>
                       <div>
                          <div className="mb-1">{getAbsenceBadge(a.type)}</div>
                          <p className="text-[10px] font-bold text-gray-900">
                            {new Date(a.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} 
                            <span className="mx-2 text-gray-300">→</span>
                            {new Date(a.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          </p>
                          {a.notes && <p className="text-[9px] text-gray-400 italic mt-1">"{a.notes}"</p>}
                       </div>
                    </div>
                    <button onClick={() => removeAbsence(a.id)} className="text-gray-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt text-[10px]"></i></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;

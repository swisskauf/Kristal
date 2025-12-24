
import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember, Appointment, Service, AbsenceEntry, AbsenceType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TeamManagementProps {
  member: TeamMember;
  appointments: Appointment[];
  services: Service[];
  onSave: (updatedMember: TeamMember) => void;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ member, appointments, services, onSave, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'schedule' | 'vacations'>('analytics');
  const [startHour, setStartHour] = useState(member.start_hour || 8);
  const [endHour, setEndHour] = useState(member.end_hour || 19);
  const [totalVacationDays, setTotalVacationDays] = useState(member.total_vacation_days || 25);
  
  const [newAbsence, setNewAbsence] = useState<{start: string, end: string, type: AbsenceType}>({
    start: '',
    end: '',
    type: 'vacation'
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

  const handleUpdateHours = () => {
    onSave({ 
      ...member, 
      start_hour: Number(startHour), 
      end_hour: Number(endHour),
      total_vacation_days: Number(totalVacationDays)
    });
  };

  const addAbsence = () => {
    if (!newAbsence.start || !newAbsence.end) return;
    
    const entry: AbsenceEntry = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: newAbsence.start,
      endDate: newAbsence.end,
      type: newAbsence.type
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
    
    setNewAbsence({ start: '', end: '', type: 'vacation' });
  };

  const removeAbsence = (id: string) => {
    const entryToRemove = absences.find(a => a.id === id);
    if (!entryToRemove) return;

    const updatedAbsences = absences.filter(a => a.id !== id);
    
    // Ricalcoliamo le date legacy rimosse
    let datesToRemove: string[] = [];
    let curr = new Date(entryToRemove.startDate);
    const stop = new Date(entryToRemove.endDate);
    while(curr <= stop) {
      datesToRemove.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const updatedLegacy = (member.unavailable_dates || []).filter(d => !datesToRemove.includes(d));

    onSave({ 
      ...member, 
      absences_json: updatedAbsences,
      unavailable_dates: updatedLegacy
    });
  };

  const getAbsenceBadge = (type: AbsenceType) => {
    switch(type) {
      case 'vacation': return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-bold uppercase">Ferie</span>;
      case 'sick': return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[8px] font-bold uppercase">Malattia</span>;
      case 'injury': return <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[8px] font-bold uppercase">Infortunio</span>;
      default: return <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-[8px] font-bold uppercase">Altro</span>;
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-h-[85vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <img src={member.avatar} className="w-16 h-16 rounded-full shadow-lg border-2 border-white object-cover" />
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
          { id: 'schedule', label: 'Gestione Orari', icon: 'fa-clock' },
          { id: 'vacations', label: 'Assenze e Bilancio', icon: 'fa-calendar-alt' }
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
                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Fatturato</p>
                <h4 className="text-2xl font-luxury font-bold">CHF {stats.revenue}</h4>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl">
                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Servizi</p>
                <h4 className="text-2xl font-luxury font-bold">{stats.count}</h4>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'schedule' && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-8 rounded-[2.5rem] space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">Inizio Turno</label>
                    <input type="number" value={startHour} onChange={e => setStartHour(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">Fine Turno</label>
                    <input type="number" value={endHour} onChange={e => setStartHour(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold" />
                  </div>
               </div>
               <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase mb-2 block">Budget Ferie Annuo (Giorni)</label>
                  <input type="number" value={totalVacationDays} onChange={e => setTotalVacationDays(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold" />
               </div>
               <button onClick={handleUpdateHours} className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Salva Impostazioni</button>
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
                <p className="text-[7px] text-blue-400 uppercase font-bold">Giorni</p>
              </div>
              <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 text-center">
                <p className="text-[8px] font-bold text-amber-600 uppercase mb-1">Godute</p>
                <p className="text-2xl font-luxury font-bold">{usedVacationDays}</p>
                <p className="text-[7px] text-amber-400 uppercase font-bold">Giorni</p>
              </div>
              <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 text-center">
                <p className="text-[8px] font-bold text-green-600 uppercase mb-1">Residuo</p>
                <p className="text-2xl font-luxury font-bold">{totalVacationDays - usedVacationDays}</p>
                <p className="text-[7px] text-green-400 uppercase font-bold">Giorni</p>
              </div>
            </div>

            {/* NUOVA ASSENZA */}
            <div className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100 space-y-6">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Registra Nuovo Periodo</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Dal</label>
                  <input type="date" value={newAbsence.start} onChange={e => setNewAbsence({...newAbsence, start: e.target.value})} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Al</label>
                  <input type="date" value={newAbsence.end} onChange={e => setNewAbsence({...newAbsence, end: e.target.value})} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Tipologia</label>
                <select value={newAbsence.type} onChange={e => setNewAbsence({...newAbsence, type: e.target.value as AbsenceType})} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs font-bold">
                  <option value="vacation">Vacanza / Ferie</option>
                  <option value="sick">Malattia</option>
                  <option value="injury">Infortunio</option>
                  <option value="other">Altro</option>
                </select>
              </div>
              <button onClick={addAbsence} className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Conferma Registrazione</button>
            </div>

            {/* LISTA PERIODI */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Assenze Registrate</h5>
              {absences.length > 0 ? (
                <div className="space-y-3">
                  {absences.map(a => {
                    const start = new Date(a.startDate);
                    const end = new Date(a.endDate);
                    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return (
                      <div key={a.id} className="flex items-center justify-between p-6 bg-white border border-gray-50 rounded-3xl shadow-sm group">
                        <div className="flex items-center gap-6">
                           <div className="text-center min-w-[50px]">
                              <p className="text-lg font-luxury font-bold">{diff}</p>
                              <p className="text-[7px] text-gray-400 font-bold uppercase">Giorni</p>
                           </div>
                           <div className="border-l border-gray-100 pl-6">
                              <div className="mb-1">{getAbsenceBadge(a.type)}</div>
                              <p className="text-[11px] font-bold text-gray-900">
                                {start.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} 
                                <span className="mx-2 text-gray-300">→</span>
                                {end.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                           </div>
                        </div>
                        <button onClick={() => removeAbsence(a.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all">
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Nessuna assenza nello storico.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;


import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, AbsenceType } from '../types';

interface TeamPlanningProps {
  team: TeamMember[];
  appointments: Appointment[];
  onToggleVacation: (memberName: string, date: string) => void;
  currentUserMemberName?: string;
  requests?: any[];
}

const TeamPlanning: React.FC<TeamPlanningProps> = ({ team, appointments, onToggleVacation, currentUserMemberName, requests = [] }) => {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(team.map(m => m.name));
  const [viewDate, setViewDate] = useState(new Date());

  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(viewDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [viewDate]);

  const moveWeek = (offset: number) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + (offset * 7));
    setViewDate(d);
  };

  const typeStyles: Record<string, { bg: string, text: string, icon: string, label: string }> = {
    vacation: { bg: 'bg-blue-500', text: 'text-white', icon: 'fa-umbrella-beach', label: 'Ferie' },
    sick: { bg: 'bg-red-500', text: 'text-white', icon: 'fa-briefcase-medical', label: 'Malattia' },
    injury: { bg: 'bg-orange-500', text: 'text-white', icon: 'fa-crutch', label: 'Infortunio' },
    training: { bg: 'bg-emerald-600', text: 'text-white', icon: 'fa-graduation-cap', label: 'Formazione' },
    unpaid: { bg: 'bg-gray-400', text: 'text-white', icon: 'fa-leaf', label: 'Libero' },
    permit: { bg: 'bg-purple-500', text: 'text-white', icon: 'fa-clock', label: 'Permesso' },
    overtime: { bg: 'bg-amber-600', text: 'text-white', icon: 'fa-history', label: 'Recupero' },
    default: { bg: 'bg-gray-900', text: 'text-white', icon: 'fa-plane', label: 'Congedo' }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => moveWeek(-1)} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <div className="text-center min-w-[200px]">
            <h4 className="font-luxury font-bold text-xl uppercase tracking-tighter">Pianificazione Atelier</h4>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
              {new Date(weekDays[0]).getDate()} - {new Date(weekDays[6]).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={() => moveWeek(1)} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {team.map(m => (
            <button 
              key={m.name}
              onClick={() => setSelectedMembers(prev => prev.includes(m.name) ? prev.filter(n => n !== m.name) : [...prev, m.name])}
              className={`px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedMembers.includes(m.name) ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-100 hover:border-amber-200'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${selectedMembers.includes(m.name) ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="p-6 text-left text-[9px] font-bold text-gray-300 uppercase tracking-widest min-w-[120px]">Data</th>
                {team.filter(m => selectedMembers.includes(m.name)).map(m => (
                  <th key={m.name} className={`p-6 text-center min-w-[180px] ${m.name === currentUserMemberName ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex flex-col items-center gap-2">
                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-10 h-10 rounded-full shadow-md object-cover border-2 border-white" alt={m.name} />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${m.name === currentUserMemberName ? 'text-amber-600' : ''}`}>
                        {m.name === currentUserMemberName ? 'Il Mio Workspace' : m.name}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDays.map(date => {
                const d = new Date(date);
                const isToday = date === new Date().toISOString().split('T')[0];
                return (
                  <tr key={date} className={`border-b border-gray-50 hover:bg-gray-50/20 transition-colors ${isToday ? 'bg-amber-50/10' : ''}`}>
                    <td className="p-6">
                      <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                      <p className="text-xl font-luxury font-bold text-gray-900">{d.getDate()}</p>
                    </td>
                    {team.filter(m => selectedMembers.includes(m.name)).map(m => {
                      const isMe = m.name === currentUserMemberName;
                      const dayAppts = appointments.filter(a => a.team_member_name === m.name && a.date.includes(date));
                      const approvedAbsence = m.absences_json?.find(a => a.startDate === date);
                      const pendingReq = requests?.find(r => r.member_name === m.name && r.start_date === date && r.status === 'pending');

                      const style = typeStyles[approvedAbsence?.type || pendingReq?.type || 'default'];

                      return (
                        <td key={m.name} className={`p-3 ${isMe ? 'bg-amber-50/5' : ''}`}>
                          <button 
                            onClick={() => onToggleVacation(m.name, date)}
                            className={`w-full min-h-[70px] p-4 rounded-2xl border transition-all text-left relative group overflow-hidden ${
                              approvedAbsence 
                                ? `${style.bg} border-transparent ${style.text} shadow-lg` 
                                : pendingReq 
                                  ? 'bg-white border-amber-500 border-dashed animate-pulse text-amber-600'
                                  : dayAppts.length > 0 
                                    ? 'bg-white border-amber-100 shadow-sm' 
                                    : 'bg-white border-gray-50 hover:border-amber-500 border-dashed'
                            }`}
                          >
                            {approvedAbsence ? (
                              <div className="flex flex-col justify-center h-full">
                                <div className="flex items-center gap-2 mb-1">
                                  <i className={`fas ${style.icon} text-[10px]`}></i>
                                  <span className="text-[9px] font-bold uppercase tracking-widest">{style.label}</span>
                                </div>
                                {!approvedAbsence.isFullDay && (
                                  <p className="text-[8px] opacity-80 font-bold">{approvedAbsence.startTime} - {approvedAbsence.endTime}</p>
                                )}
                              </div>
                            ) : pendingReq ? (
                              <div className="flex flex-col justify-center h-full">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
                                  <span className="text-[9px] font-bold uppercase tracking-widest">PENDING</span>
                                </div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">{style.label}</p>
                                {!pendingReq.is_full_day && (
                                  <p className="text-[7px] text-gray-400 mt-0.5">{pendingReq.start_time}-{pendingReq.end_time}</p>
                                )}
                              </div>
                            ) : dayAppts.length > 0 ? (
                              <div className="flex flex-col justify-center h-full">
                                <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">{dayAppts.length} RITUALI</span>
                                <div className="mt-2 h-1 w-full bg-amber-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(dayAppts.length * 20, 100)}%` }}></div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <i className="fas fa-plus text-[10px] text-amber-600 mb-1"></i>
                                <span className="text-[8px] text-amber-600 uppercase font-bold tracking-widest">
                                  {isMe ? 'MODIFICA' : 'VEDI'}
                                </span>
                              </div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 py-6 bg-gray-50 rounded-[2.5rem] border border-gray-100">
        <div className="flex items-center gap-3">
           <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
           <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Ferie</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-3 h-3 bg-red-500 rounded-full"></div>
           <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Malattia</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
           <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Formazione</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-3 h-3 border-2 border-amber-500 border-dashed rounded-full"></div>
           <span className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">In Attesa</span>
        </div>
      </div>
    </div>
  );
};

export default TeamPlanning;

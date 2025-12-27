
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
    vacation: { bg: 'bg-blue-600', text: 'text-white', icon: 'fa-umbrella-beach', label: 'Ferie' },
    sick: { bg: 'bg-red-600', text: 'text-white', icon: 'fa-briefcase-medical', label: 'Malattia' },
    injury: { bg: 'bg-orange-600', text: 'text-white', icon: 'fa-crutch', label: 'Infortunio' },
    training: { bg: 'bg-emerald-600', text: 'text-white', icon: 'fa-graduation-cap', label: 'Formazione' },
    unpaid: { bg: 'bg-gray-500', text: 'text-white', icon: 'fa-leaf', label: 'Libero' },
    permit: { bg: 'bg-purple-600', text: 'text-white', icon: 'fa-clock', label: 'Permesso' },
    overtime: { bg: 'bg-amber-600', text: 'text-white', icon: 'fa-history', label: 'Recupero' },
    bereavement: { bg: 'bg-slate-900', text: 'text-white', icon: 'fa-ribbon', label: 'Lutto' },
    availability_change: { bg: 'bg-amber-500', text: 'text-white', icon: 'fa-exchange-alt', label: 'Revoca' },
    default: { bg: 'bg-gray-800', text: 'text-white', icon: 'fa-plane', label: 'Assenza' }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <style>{`
        @keyframes pulse-amber {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .animate-pulse-amber {
          animation: pulse-amber 2s infinite;
        }
      `}</style>
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
              {m.name === currentUserMemberName ? 'Io' : m.name}
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
                        {m.name === currentUserMemberName ? 'Mio Workspace' : m.name}
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
                      const isRevocation = pendingReq?.type === 'availability_change';

                      return (
                        <td key={m.name} className={`p-3 ${isMe ? 'bg-amber-50/5' : ''}`}>
                          <button 
                            onClick={() => onToggleVacation(m.name, date)}
                            className={`w-full min-h-[80px] p-4 rounded-2xl border transition-all text-left relative group overflow-hidden ${
                              approvedAbsence 
                                ? `${style.bg} border-transparent ${style.text} shadow-lg scale-[1.02]` 
                                : pendingReq 
                                  ? `bg-white border-amber-500 border-dashed ${isRevocation ? 'animate-pulse-amber border-2' : 'animate-pulse'} text-amber-600`
                                  : dayAppts.length > 0 
                                    ? 'bg-white border-amber-100 shadow-sm' 
                                    : 'bg-white border-gray-50 hover:border-amber-500 border-dashed'
                            }`}
                          >
                            {approvedAbsence ? (
                              <div className="flex flex-col justify-center h-full">
                                <div className="flex items-center gap-2 mb-1">
                                  <i className={`fas ${style.icon} text-[11px]`}></i>
                                  <span className="text-[10px] font-bold uppercase tracking-widest">{style.label}</span>
                                </div>
                                {!approvedAbsence.isFullDay && (
                                  <div className="mt-1 px-2 py-0.5 bg-black/20 rounded-md inline-block">
                                    <p className="text-[8px] font-bold uppercase">{approvedAbsence.startTime} - {approvedAbsence.endTime}</p>
                                  </div>
                                )}
                              </div>
                            ) : pendingReq ? (
                              <div className="flex flex-col justify-center h-full">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-1.5 h-1.5 ${isRevocation ? 'bg-amber-600' : 'bg-amber-500'} rounded-full animate-ping`}></div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest">{isRevocation ? 'REVOCA' : 'IN ATTESA'}</span>
                                </div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase italic">{style.label}</p>
                              </div>
                            ) : dayAppts.length > 0 ? (
                              <div className="flex flex-col justify-center h-full">
                                <div className="flex items-center gap-2 mb-1">
                                  <i className="fas fa-calendar-check text-amber-600 text-[10px]"></i>
                                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{dayAppts.length} RITUALI</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <i className="fas fa-plus text-[10px] text-amber-600 mb-1"></i>
                                <span className="text-[8px] text-amber-600 uppercase font-bold tracking-widest">
                                  {isMe ? 'Gestisci' : 'Disponibile'}
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
    </div>
  );
};

export default TeamPlanning;

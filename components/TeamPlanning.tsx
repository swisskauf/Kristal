
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, AbsenceType } from '../types';

interface TeamPlanningProps {
  team: TeamMember[];
  appointments: Appointment[];
  onToggleVacation: (memberName: string, date: string) => void;
  currentUserMemberName?: string;
  requests?: any[];
  isCollaborator?: boolean;
}

const TeamPlanning: React.FC<TeamPlanningProps> = ({ team, appointments, onToggleVacation, currentUserMemberName, requests = [], isCollaborator = false }) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>(isCollaborator ? 'daily' : 'weekly');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(isCollaborator && currentUserMemberName ? [currentUserMemberName] : team.map(m => m.name));
  const [viewDate, setViewDate] = useState(new Date());

  const filteredTeam = useMemo(() => {
    if (isCollaborator && currentUserMemberName) {
      return team.filter(m => m.name === currentUserMemberName);
    }
    return team;
  }, [team, isCollaborator, currentUserMemberName]);

  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(viewDate);
    if (viewMode === 'weekly') {
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
      }
    } else {
      days.push(viewDate.toISOString().split('T')[0]);
    }
    return days;
  }, [viewDate, viewMode]);

  const hours = useMemo(() => {
    const hrs = [];
    for (let i = 8; i <= 20; i++) {
      hrs.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return hrs;
  }, []);

  const moveTime = (offset: number) => {
    const d = new Date(viewDate);
    if (viewMode === 'weekly') {
      d.setDate(d.getDate() + (offset * 7));
    } else {
      d.setDate(d.getDate() + offset);
    }
    setViewDate(d);
  };

  const typeStyles: Record<string, { bg: string, text: string, icon: string, label: string }> = {
    vacation: { bg: 'bg-blue-600', text: 'text-white', icon: 'fa-umbrella-beach', label: 'Ferie' },
    sick: { bg: 'bg-red-600', text: 'text-white', icon: 'fa-briefcase-medical', label: 'Malattia' },
    injury: { bg: 'bg-orange-600', text: 'text-white', icon: 'fa-crutch', label: 'Infortunio' },
    training: { bg: 'bg-emerald-600', text: 'text-white', icon: 'fa-graduation-cap', label: 'Formazione' },
    availability_change: { bg: 'bg-amber-500', text: 'text-white', icon: 'fa-undo-alt', label: 'Revoca' },
    default: { bg: 'bg-gray-800', text: 'text-white', icon: 'fa-calendar', label: 'Assenza' }
  };

  const isWorkingHour = (member: TeamMember, hourStr: string) => {
    const start = member.work_start_time || '08:30';
    const end = member.work_end_time || '18:30';
    return hourStr >= start && hourStr <= end;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <style>{`
        @keyframes pulse-revocation {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); transform: scale(1.02); }
          50% { box-shadow: 0 0 25px 10px rgba(245, 158, 11, 0.3); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); transform: scale(1.02); }
        }
        .revocation-glow {
          animation: pulse-revocation 2s infinite ease-in-out;
          border: 2px solid #f59e0b !important;
          z-index: 10;
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => moveTime(-1)} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <div className="text-center min-w-[200px]">
            <h4 className="font-luxury font-bold text-xl uppercase tracking-tighter">Agenda {isCollaborator ? 'Personale' : 'Atelier'}</h4>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
              {viewMode === 'weekly' 
                ? `${new Date(weekDays[0]).getDate()} - ${new Date(weekDays[6]).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`
                : new Date(weekDays[0]).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
              }
            </p>
          </div>
          <button onClick={() => moveTime(1)} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
              <button onClick={() => setViewMode('weekly')} className={`px-5 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'weekly' ? 'bg-black text-white' : 'text-gray-400'}`}>Settimanale</button>
              <button onClick={() => setViewMode('daily')} className={`px-5 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'daily' ? 'bg-black text-white' : 'text-gray-400'}`}>Giornaliera</button>
           </div>
           {!isCollaborator && (
             <div className="flex gap-2">
                {team.map(m => (
                  <button 
                    key={m.name}
                    onClick={() => setSelectedMembers(prev => prev.includes(m.name) ? prev.filter(n => n !== m.name) : [...prev, m.name])}
                    className={`px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest border transition-all ${
                      selectedMembers.includes(m.name) ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-100'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
             </div>
           )}
        </div>
      </div>

      {viewMode === 'weekly' ? (
        <div className="bg-white rounded-[3rem] border border-gray-50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  <th className="p-6 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest min-w-[100px]">Giorno</th>
                  {filteredTeam.filter(m => selectedMembers.includes(m.name)).map(m => (
                    <th key={m.name} className="p-6 text-center min-w-[180px]">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-900">{m.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDays.map(date => {
                  const d = new Date(date);
                  return (
                    <tr key={date} className="border-b border-gray-50 hover:bg-gray-50/20 transition-colors">
                      <td className="p-6">
                        <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                        <p className="text-xl font-luxury font-bold text-gray-900">{d.getDate()}</p>
                      </td>
                      {filteredTeam.filter(m => selectedMembers.includes(m.name)).map(m => {
                        const dayAppts = appointments.filter(a => a.team_member_name === m.name && a.date.includes(date));
                        const approvedAbsence = m.absences_json?.find(a => a.startDate === date);
                        const pendingReq = requests?.find(r => r.member_name === m.name && r.start_date === date && r.status === 'pending');
                        const isRevocation = pendingReq?.type === 'availability_change';
                        const style = typeStyles[approvedAbsence?.type || pendingReq?.type || 'default'];

                        return (
                          <td key={m.name} className="p-2">
                            <button 
                              onClick={() => onToggleVacation(m.name, date)}
                              className={`w-full min-h-[80px] p-4 rounded-2xl border transition-all text-left relative group ${
                                approvedAbsence 
                                  ? `${style.bg} border-transparent text-white shadow-lg` 
                                  : pendingReq 
                                    ? `bg-white border-amber-500 border-dashed ${isRevocation ? 'revocation-glow shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'animate-pulse'} text-amber-600`
                                    : dayAppts.length > 0 
                                      ? 'bg-amber-50/40 border-amber-100 shadow-inner' 
                                      : 'bg-white border-gray-100 hover:border-amber-200 border-dashed'
                              }`}
                            >
                              {approvedAbsence ? (
                                <div className="flex flex-col gap-1">
                                  <i className={`fas ${style.icon} text-[10px]`}></i>
                                  <span className="text-[8px] font-bold uppercase tracking-widest">{style.label}</span>
                                </div>
                              ) : pendingReq ? (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-bold uppercase">{isRevocation ? 'REVOCA' : 'ATTESA'}</span>
                                  <span className="text-[7px] opacity-70 italic">{style.label}</span>
                                </div>
                              ) : dayAppts.length > 0 ? (
                                <div className="flex items-center gap-2 text-amber-700">
                                  <i className="fas fa-calendar-check text-[10px]"></i>
                                  <span className="text-[9px] font-bold">{dayAppts.length} RITUALI</span>
                                </div>
                              ) : (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                  <i className="fas fa-plus text-[10px] text-amber-500"></i>
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
      ) : (
        <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm p-8 space-y-8">
           {filteredTeam.filter(m => selectedMembers.includes(m.name)).map(m => (
             <div key={m.name} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                   <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-12 h-12 rounded-full object-cover" />
                   <div>
                      <h5 className="font-luxury font-bold text-lg">{m.name}</h5>
                      <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">Rituale Giornaliero</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-13 gap-1 relative">
                  {hours.map(hour => {
                    const isWork = isWorkingHour(m, hour);
                    const dateStr = weekDays[0];
                    const appt = appointments.find(a => a.team_member_name === m.name && a.date.startsWith(`${dateStr}T${hour}`));
                    const absence = m.absences_json?.find(a => a.startDate === dateStr && (!a.isFullDay ? (a.startTime && hour >= a.startTime && hour <= (a.endTime || '')) : true));
                    
                    return (
                      <div key={hour} className="flex md:flex-col items-center gap-2 md:gap-0">
                        <span className="text-[8px] font-bold text-gray-300 w-10 md:w-auto md:mb-2">{hour}</span>
                        <div className={`w-full h-12 md:h-20 rounded-xl md:rounded-3xl border transition-all flex items-center justify-center ${
                          appt ? 'bg-black border-black text-white shadow-lg' : 
                          absence ? 'bg-red-500 border-red-500 text-white shadow-lg' :
                          isWork ? 'bg-amber-50 border-amber-100 hover:bg-amber-100' : 'bg-gray-50 border-gray-100 opacity-40'
                        }`}>
                           {appt && <i className="fas fa-clock text-[8px] animate-pulse"></i>}
                           {absence && <i className="fas fa-minus-circle text-[8px]"></i>}
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default TeamPlanning;

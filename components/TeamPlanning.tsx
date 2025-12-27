
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, AbsenceType } from '../types';

interface TeamPlanningProps {
  team: TeamMember[];
  appointments: Appointment[];
  onToggleVacation: (memberName: string, date: string) => void;
  onSlotClick?: (memberName: string, date: string, hour: string) => void;
  currentUserMemberName?: string;
  requests?: any[];
  isCollaborator?: boolean;
}

const TeamPlanning: React.FC<TeamPlanningProps> = ({ 
  team, 
  appointments, 
  onToggleVacation, 
  onSlotClick,
  currentUserMemberName, 
  requests = [], 
  isCollaborator = false 
}) => {
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
    const baseDate = new Date(viewDate);
    if (viewMode === 'weekly') {
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      baseDate.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        days.push(d.toISOString().split('T')[0]);
      }
    } else {
      days.push(baseDate.toISOString().split('T')[0]);
    }
    return days;
  }, [viewDate, viewMode]);

  const hours = useMemo(() => {
    const hrs = [];
    for (let i = 8; i <= 20; i++) {
      hrs.push(`${i.toString().padStart(2, '0')}:00`);
      hrs.push(`${i.toString().padStart(2, '0')}:30`);
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

  const isWorkingHour = (member: TeamMember, hourStr: string) => {
    const start = member.work_start_time || '08:30';
    const end = member.work_end_time || '18:30';
    return hourStr >= start && hourStr <= end;
  };

  const isBreakHour = (member: TeamMember, hourStr: string) => {
    if (!member.break_start_time || !member.break_end_time) return false;
    return hourStr >= member.break_start_time && hourStr < member.break_end_time;
  };

  const getAppointmentAt = (memberName: string, date: string, hour: string) => {
    const target = new Date(`${date}T${hour}:00.000Z`);
    return appointments.find(a => {
      if (a.team_member_name !== memberName) return false;
      const appStart = new Date(a.date);
      const appEnd = new Date(appStart.getTime() + (a.services?.duration || 30) * 60000);
      return target >= appStart && target < appEnd;
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <style>{`
        .non-work-pattern {
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px);
        }
        .break-pattern {
          background-image: repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(251, 191, 36, 0.1) 8px, rgba(251, 191, 36, 0.1) 16px);
          background-color: #fffbeb;
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
           <div className="flex bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
              <button onClick={() => setViewMode('weekly')} className={`px-5 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'weekly' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>Settimanale</button>
              <button onClick={() => setViewMode('daily')} className={`px-5 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'daily' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>Giornaliera</button>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm p-4 md:p-10 overflow-x-auto scrollbar-hide">
         <div className="min-w-[800px]">
           <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(180px,1fr))] gap-4">
              <div className="sticky left-0 bg-white z-20"></div>
              {filteredTeam.filter(m => selectedMembers.includes(m.name)).map(m => (
                <div key={m.name} className="flex items-center gap-3 pb-6 border-b border-gray-50">
                   <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-10 h-10 rounded-full object-cover shadow-md" />
                   <div>
                      <h5 className="font-luxury font-bold text-sm text-gray-900">{m.name}</h5>
                      <p className="text-[7px] font-bold text-amber-600 uppercase tracking-widest">{m.role}</p>
                   </div>
                </div>
              ))}

              {hours.map(hour => {
                const dateStr = weekDays[0];
                return (
                  <React.Fragment key={hour}>
                    <div className="sticky left-0 bg-white z-20 flex items-center justify-end pr-6 h-16">
                       <span className="text-[9px] font-bold text-gray-300 uppercase">{hour}</span>
                    </div>
                    {filteredTeam.filter(m => selectedMembers.includes(m.name)).map(m => {
                      const isWork = isWorkingHour(m, hour);
                      const isBreak = isBreakHour(m, hour);
                      const appt = getAppointmentAt(m.name, dateStr, hour);
                      
                      const isStartOfAppt = appt && new Date(appt.date).toISOString().substring(11, 16) === hour;

                      return (
                        <div 
                          key={`${m.name}-${hour}`} 
                          onClick={() => !appt && !isBreak && isWork && onSlotClick && onSlotClick(m.name, dateStr, hour)}
                          className={`h-16 rounded-2xl border transition-all flex flex-col items-center justify-center relative ${
                            appt ? 'bg-gray-900 border-black text-white shadow-md z-10' : 
                            isBreak ? 'break-pattern border-amber-100 opacity-80 cursor-not-allowed' :
                            isWork ? 'bg-white border-gray-100 hover:border-amber-200 hover:bg-amber-50/20 cursor-pointer' : 'bg-gray-50 border-gray-50 opacity-40 non-work-pattern cursor-not-allowed'
                          }`}
                        >
                           {appt ? (
                             <div className="text-center p-1 w-full truncate">
                                {isStartOfAppt && (
                                  <>
                                    <p className="text-[8px] font-bold uppercase truncate">{appt.profiles?.full_name || 'Ospite'}</p>
                                    <p className="text-[6px] opacity-60 uppercase">{appt.services?.name}</p>
                                  </>
                                )}
                             </div>
                           ) : isBreak ? (
                             <span className="text-[7px] font-bold text-amber-600 uppercase tracking-widest">Pausa</span>
                           ) : isWork ? (
                             <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center">
                               <i className="fas fa-plus text-[8px] text-amber-300"></i>
                             </div>
                           ) : null}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
           </div>
         </div>
      </div>
    </div>
  );
};

export default TeamPlanning;

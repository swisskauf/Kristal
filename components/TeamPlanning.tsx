
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

  const getAppointmentStatus = (memberName: string, date: string, hour: string) => {
    const target = new Date(`${date}T${hour}:00.000Z`);
    const appt = appointments.find(a => {
      if (a.team_member_name !== memberName) return false;
      const appStart = new Date(a.date);
      const appDuration = a.services?.duration || 30;
      const appEnd = new Date(appStart.getTime() + appDuration * 60000);
      return target >= appStart && target < appEnd;
    });

    if (!appt) return null;

    const appStartTime = new Date(appt.date).toISOString().substring(11, 16);
    return {
      appt,
      isStart: appStartTime === hour
    };
  };

  const isBreakHour = (member: TeamMember, hourStr: string) => {
    if (!member.break_start_time || !member.break_end_time) return false;
    return hourStr >= member.break_start_time && hourStr < member.break_end_time;
  };

  const isWorkingHour = (member: TeamMember, hourStr: string) => {
    const start = member.work_start_time || '08:30';
    const end = member.work_end_time || '18:30';
    return hourStr >= start && hourStr < end;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <style>{`
        .non-work-pattern {
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px);
        }
        .break-pattern {
          background-image: repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(251, 191, 36, 0.05) 8px, rgba(251, 191, 36, 0.05) 16px);
          background-color: #fffbeb;
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => moveTime(-1)} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <div className="text-center min-w-[200px]">
            <h4 className="font-luxury font-bold text-xl uppercase tracking-tighter">Planning Atelier</h4>
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

        <div className="flex bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
          <button onClick={() => setViewMode('weekly')} className={`px-5 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'weekly' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>Settimanale</button>
          <button onClick={() => setViewMode('daily')} className={`px-5 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'daily' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>Giornaliera</button>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm p-4 md:p-10 overflow-x-auto scrollbar-hide">
         <div className="min-w-[900px]">
           <div className={`grid gap-3 ${viewMode === 'daily' ? `grid-cols-[80px_repeat(${filteredTeam.length},1fr)]` : 'grid-cols-[80px_repeat(7,1fr)]'}`}>
              <div className="sticky left-0 bg-white z-20"></div>
              {viewMode === 'daily' ? filteredTeam.map(m => (
                <div key={m.name} className="flex items-center gap-3 pb-6 border-b border-gray-50 justify-center">
                   <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-white" />
                   <div>
                      <h5 className="font-luxury font-bold text-sm text-gray-900">{m.name}</h5>
                      <p className="text-[7px] font-bold text-amber-600 uppercase tracking-widest">{m.role}</p>
                   </div>
                </div>
              )) : weekDays.map(date => (
                <div key={date} className="text-center pb-6 border-b border-gray-50">
                  <p className="text-[9px] font-bold text-amber-600 uppercase">{new Date(date).toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                  <p className="text-lg font-luxury font-bold text-gray-900">{new Date(date).getDate()}</p>
                </div>
              ))}

              {hours.map(hour => {
                const dateStr = weekDays[0];
                return (
                  <React.Fragment key={hour}>
                    <div className="sticky left-0 bg-white z-20 flex items-center justify-end pr-6 h-14">
                       <span className="text-[8px] font-bold text-gray-300 uppercase">{hour}</span>
                    </div>
                    {viewMode === 'daily' ? filteredTeam.map(m => {
                      // Fix: renamed undefined getAppointmentAt to getAppointmentStatus
                      const status = getAppointmentStatus(m.name, dateStr, hour);
                      const isWork = isWorkingHour(m, hour);
                      const isBreak = isBreakHour(m, hour);

                      return (
                        <div 
                          key={`${m.name}-${hour}`}
                          onClick={() => !status && !isBreak && isWork && onSlotClick && onSlotClick(m.name, dateStr, hour)}
                          className={`h-14 rounded-2xl border transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                            status ? 'bg-black border-black text-white shadow-md z-10' : 
                            isBreak ? 'break-pattern border-amber-50 opacity-60' :
                            isWork ? 'bg-white border-gray-50 hover:border-amber-200 hover:bg-amber-50/20' : 'bg-gray-50 border-gray-50 opacity-30 non-work-pattern'
                          }`}
                        >
                           {status?.isStart && (
                             <div className="text-center p-1 w-full truncate px-4">
                                <p className="text-[8px] font-bold uppercase truncate">{status.appt.profiles?.full_name || 'Ospite'}</p>
                                <p className="text-[6px] opacity-60 uppercase">{status.appt.services?.name}</p>
                             </div>
                           )}
                           {isBreak && !status && <span className="text-[7px] font-bold text-amber-400 uppercase">Break</span>}
                        </div>
                      );
                    }) : weekDays.map(date => {
                      const appts = appointments.filter(a => a.date.includes(`${date}T${hour}`));
                      return (
                        <div key={`${date}-${hour}`} className="h-14 rounded-2xl border border-gray-50 bg-gray-50/20 flex items-center justify-center">
                          {appts.length > 0 && <span className="text-[10px] font-bold text-amber-600">{appts.length} R.</span>}
                        </div>
                      )
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

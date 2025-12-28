import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment } from '../types';

interface TeamPlanningProps {
  team: TeamMember[];
  appointments: Appointment[];
  onToggleVacation: (memberName: string, date: string) => void;
  onSlotClick?: (memberName: string, date: string, hour: string) => void;
  currentUserMemberName?: string;
  requests?: any[];
  isCollaborator?: boolean;
}

const toDateKeyLocal = (d: Date) =>
  `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;

const TeamPlanning: React.FC<TeamPlanningProps> = ({ 
  team, 
  appointments, 
  onToggleVacation, 
  onSlotClick,
  currentUserMemberName, 
  requests = [], 
  isCollaborator = false 
}) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('daily');
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
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    baseDate.setDate(diff);
    
    if (viewMode === 'weekly') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        days.push(toDateKeyLocal(d));
      }
    } else {
      days.push(toDateKeyLocal(viewDate));
    }
    return days;
  }, [viewDate, viewMode]);

  const hours = useMemo(() => {
    const hrs = [];
    for (let i = 8; i <= 19; i++) {
      hrs.push(`${i.toString().padStart(2, '0')}:00`);
      hrs.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return hrs;
  }, []);

  const moveTime = (offset: number) => {
    const d = new Date(viewDate);
    if (viewMode === 'weekly') d.setDate(d.getDate() + (offset * 7));
    else d.setDate(d.getDate() + offset);
    setViewDate(d);
  };

  const getSlotStatus = (memberName: string, dateStr: string, hour: string) => {
    const [h, m] = hour.split(':').map(Number);
    const targetMin = h * 60 + m;

    const appt = appointments.find(a => {
      if (a.team_member_name !== memberName || a.status === 'cancelled') return false;
      const appDate = new Date(a.date);
      if (toDateKeyLocal(appDate) !== dateStr) return false;

      const appStart = appDate.getHours() * 60 + appDate.getMinutes();
      const duration = a.services?.duration || (a as any)?.duration || 30;
      const appEnd = appStart + duration;

      return targetMin >= appStart && targetMin < appEnd;
    });

    if (appt) {
      const appDate = new Date(appt.date);
      const isStart = appDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) === hour;
      return { type: 'APPOINTMENT', appt, isStart };
    }

    const member = team.find(t => t.name === memberName);
    if (!member) return null;

    const weekly = Array.isArray(member.weekly_closures) ? member.weekly_closures.map(Number) : [];
    const d = new Date(dateStr + 'T12:00:00');
    if (weekly.includes(d.getDay())) return { type: 'CLOSURE' };

    const hasFullDayAbsence = member.absences_json?.some(a => {
      const start = a.startDate || a.start_date;
      const full = a.isFullDay || a.is_full_day;
      return start === dateStr && full;
    });
    if (member.unavailable_dates?.includes(dateStr) || hasFullDayAbsence) {
      return { type: 'VACATION' };
    }

    if (member.break_start_time && member.break_end_time && 
        hour >= member.break_start_time && hour < member.break_end_time) {
      return { type: 'BREAK' };
    }

    if (hour < (member.work_start_time || '08:30') || hour >= (member.work_end_time || '19:00')) {
      return { type: 'NON_WORKING' };
    }

    return null;
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
        .closure-pattern {
          background-image: repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 10px, #e5e7eb 10px, #e5e7eb 20px);
          background-color: #f9fafb;
        }
        .vacation-pattern {
          background-image: repeating-linear-gradient(45deg, #fef3c7, #fef3c7 10px, #fde68a 10px, #fde68a 20px);
          background-color: #fffbeb;
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => moveTime(-1)} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-left text-[10px]"></i>
          </button>
          <div className="text-center min-w-[180px]">
            <h4 className="font-luxury font-bold text-lg uppercase tracking-tight">Atelier Planning</h4>
            <p className="text-[8px] font-bold text-amber-600 uppercase tracking-[0.2em]">
              {viewMode === 'weekly' 
                ? `${new Date(weekDays[0]).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${new Date(weekDays[6]).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                : new Date(weekDays[0] + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
              }
            </p>
          </div>
          <button onClick={() => moveTime(1)} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>
        </div>

        <div className="flex bg-gray-50/80 p-1 rounded-2xl border border-gray-100">
          <button onClick={() => setViewMode('weekly')} className={`px-4 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'weekly' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>
            Settimana
          </button>
          <button onClick={() => setViewMode('daily')} className={`px-4 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'daily' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>
            Giorno
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-50 shadow-sm p-4 md:p-8 overflow-x-auto scrollbar-hide">
         <div className="min-w-[800px]">
           <div className={`grid gap-2 ${viewMode === 'daily' ? `grid-cols-[70px_repeat(${filteredTeam.length},1fr)]` : 'grid-cols-[70px_repeat(7,1fr)]'}`}>
              <div className="sticky left-0 bg-white z-20"></div>
              {viewMode === 'daily' ? filteredTeam.map(m => (
                <div key={m.name} className="flex flex-col items-center gap-2 pb-4 border-b border-gray-50">
                   <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-10 h-10 rounded-full object-cover shadow-sm border-2 border-white" />
                   <div className="text-center">
                      <h5 className="font-luxury font-bold text-[11px] text-gray-900">{m.name}</h5>
                      <p className="text-[6px] font-bold text-amber-600 uppercase tracking-widest">{m.role}</p>
                   </div>
                </div>
              )) : weekDays.map(date => (
                <div key={date} className="text-center pb-4 border-b border-gray-50">
                  <p className="text-[8px] font-bold text-amber-600 uppercase">{new Date(date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                  <p className="text-sm font-luxury font-bold text-gray-900">{new Date(date + 'T12:00:00').getDate()}</p>
                </div>
              ))}

              {hours.map(hour => {
                const dateForSlot = viewMode === 'daily' ? weekDays[0] : null;
                return (
                  <React.Fragment key={hour}>
                    <div className="sticky left-0 bg-white z-20 flex items-center justify-end pr-4 h-12">
                       <span className="text-[7px] font-bold text-gray-300 uppercase">{hour}</span>
                    </div>
                    {viewMode === 'daily' ? filteredTeam.map(m => {
                      const status = getSlotStatus(m.name, dateForSlot!, hour);
                      
                      const baseClass = "h-12 rounded-xl border transition-all flex flex-col items-center justify-center relative cursor-pointer ";
                      let content = null;
                      let extraClass = "";

                      if (status?.type === 'APPOINTMENT') {
                        extraClass = "bg-black border-black text-white shadow-md z-10";
                        if (status.isStart) {
                          content = (
                            <div className="text-center p-1 w-full truncate px-2">
                               <p className="text-[7px] font-bold uppercase truncate">{status.appt.profiles?.full_name || 'Ospite'}</p>
                               <p className="text-[5px] opacity-60 uppercase truncate">{status.appt.services?.name}</p>
                            </div>
                          );
                        }
                      } else if (status?.type === 'CLOSURE') {
                        extraClass = "closure-pattern border-gray-100 opacity-60";
                        content = <span className="text-[5px] font-bold text-gray-400 uppercase">CHIUSO</span>;
                      } else if (status?.type === 'VACATION') {
                        extraClass = "vacation-pattern border-amber-100";
                        content = <span className="text-[5px] font-bold text-amber-600 uppercase">ASSENTE</span>;
                      } else if (status?.type === 'BREAK') {
                        extraClass = "break-pattern border-amber-50";
                        content = <span className="text-[6px] font-bold text-amber-300 uppercase">PAUSA</span>;
                      } else if (status?.type === 'NON_WORKING') {
                        extraClass = "bg-gray-50 border-gray-50 opacity-30 non-work-pattern";
                      } else {
                        extraClass = "bg-white border-gray-50 hover:border-amber-200 hover:bg-amber-50/10";
                      }

                      return (
                        <div 
                          key={`${m.name}-${hour}`}
                          onClick={() => !status && onSlotClick && onSlotClick(m.name, dateForSlot!, hour)}
                          className={baseClass + extraClass}
                        >
                           {content}
                        </div>
                      );
                    }) : weekDays.map(date => {
                      const apptsAtHour = appointments.filter(a => {
                        const dKey = toDateKeyLocal(new Date(a.date));
                        const h = new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        return dKey === date && h === hour && a.status !== 'cancelled';
                      });
                      
                      return (
                        <div key={`${date}-${hour}`} className="h-12 rounded-xl border border-gray-50 flex items-center justify-center bg-white">
                          {apptsAtHour.length > 0 && (
                            <div className="flex -space-x-1">
                              {apptsAtHour.slice(0, 3).map((a, idx) => (
                                <div key={idx} className="w-4 h-4 rounded-full bg-black border border-white flex itemscenter justify-center">
                                  <span className="text-[5px] text-white font-bold">{a.team_member_name[0]}</span>
                                </div>
                              ))}
                            </div>
                          )}
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

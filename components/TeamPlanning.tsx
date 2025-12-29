
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment } from '../types';

interface TeamPlanningProps {
  team: TeamMember[];
  appointments: Appointment[];
  onToggleVacation: (memberName: string, date: string) => void;
  onSlotClick?: (memberName: string, date: string, hour: string) => void;
  onAppointmentClick?: (appt: Appointment) => void;
  currentUserMemberName?: string;
  requests?: any[];
  isCollaborator?: boolean;
  salonClosures?: string[]; 
}

const TeamPlanning: React.FC<TeamPlanningProps> = ({ 
  team, 
  appointments, 
  onToggleVacation, 
  onSlotClick,
  onAppointmentClick,
  currentUserMemberName, 
  isCollaborator = false,
  salonClosures = []
}) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>(isCollaborator ? 'daily' : 'weekly');
  const [viewDate, setViewDate] = useState(new Date());

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
        days.push(d.toISOString().split('T')[0]);
      }
    } else {
      days.push(viewDate.toISOString().split('T')[0]);
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
    if (salonClosures.includes(dateStr)) return { type: 'SALON_CLOSURE' };

    const [h, m] = hour.split(':').map(Number);
    const targetMin = h * 60 + m;

    const appts = appointments.filter(a => {
      if (a.team_member_name !== memberName || a.status === 'cancelled') return false;
      const appDate = new Date(a.date);
      if (appDate.toISOString().split('T')[0] !== dateStr) return false;

      const appStart = appDate.getHours() * 60 + appDate.getMinutes();
      const duration = (a as any).services?.duration || (a as any).duration || 30;
      const appEnd = appStart + duration;

      return targetMin >= appStart && targetMin < appEnd;
    });

    if (appts.length > 0) {
      const isStart = new Date(appts[0].date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) === hour;
      return { type: 'APPOINTMENT', appt: appts[0], count: appts.length, isStart };
    }

    const member = team.find(t => t.name === memberName);
    if (!member) return null;

    const d = new Date(`${dateStr}T12:00:00`);
    if ((member.weekly_closures || []).includes(d.getDay())) return { type: 'CLOSURE' };
    if (member.unavailable_dates?.includes(dateStr)) return { type: 'VACATION' };

    if (member.break_start_time && member.break_end_time && hour >= member.break_start_time && hour < member.break_end_time) {
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
        .salon-closure-pattern { background-image: repeating-linear-gradient(45deg, #fee2e2, #fee2e2 10px, #fecaca 10px, #fecaca 20px); }
        .appointment-dot { transition: all 0.2s ease; }
        .appointment-dot:hover { transform: scale(1.3); filter: brightness(1.1); }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => moveTime(-1)} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-400"><i className="fas fa-chevron-left text-[10px]"></i></button>
          <div className="text-center min-w-[180px]">
            <h4 className="font-luxury font-bold text-lg uppercase tracking-tight">Planning Atelier</h4>
            <p className="text-[8px] font-bold text-amber-600 uppercase tracking-[0.2em]">{viewMode === 'weekly' ? 'Vista Settimana' : 'Vista Giorno'}</p>
          </div>
          <button onClick={() => moveTime(1)} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-400"><i className="fas fa-chevron-right text-[10px]"></i></button>
        </div>
        <div className="flex bg-gray-50/80 p-1 rounded-2xl border border-gray-100">
          <button onClick={() => setViewMode('weekly')} className={`px-4 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'weekly' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>Settimana</button>
          <button onClick={() => setViewMode('daily')} className={`px-4 py-2 text-[8px] font-bold uppercase rounded-xl transition-all ${viewMode === 'daily' ? 'bg-black text-white shadow-md' : 'text-gray-400'}`}>Giorno</button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-50 shadow-sm p-4 md:p-8 overflow-x-auto scrollbar-hide">
         <div className="min-w-[800px]">
           <div className={`grid gap-2 ${viewMode === 'daily' ? `grid-cols-[70px_repeat(${team.length},1fr)]` : 'grid-cols-[70px_repeat(7,1fr)]'}`}>
              <div className="sticky left-0 bg-white z-20"></div>
              {viewMode === 'daily' ? team.map(m => (
                <div key={m.name} className="flex flex-col items-center gap-2 pb-4 border-b border-gray-50">
                   <img src={m.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                   <h5 className="font-luxury font-bold text-[11px] text-gray-900">{m.name}</h5>
                </div>
              )) : weekDays.map(date => (
                <div key={date} className="text-center pb-4 border-b border-gray-50">
                  <p className="text-[8px] font-bold text-amber-600 uppercase">{new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                  <p className="text-sm font-luxury font-bold text-gray-900">{new Date(`${date}T12:00:00`).getDate()}</p>
                </div>
              ))}

              {hours.map(hour => (
                <React.Fragment key={hour}>
                  <div className="sticky left-0 bg-white z-20 flex items-center justify-end pr-4 h-12">
                     <span className="text-[7px] font-bold text-gray-300 uppercase">{hour}</span>
                  </div>
                  {viewMode === 'daily' ? team.map(m => {
                    const status = getSlotStatus(m.name, weekDays[0], hour);
                    return (
                      <div 
                        key={`${m.name}-${hour}`} 
                        onClick={() => status?.type === 'APPOINTMENT' ? onAppointmentClick?.(status.appt) : onSlotClick?.(m.name, weekDays[0], hour)}
                        className={`h-12 rounded-xl border border-gray-50 flex items-center justify-center cursor-pointer transition-all ${status?.type === 'APPOINTMENT' ? 'bg-black text-white' : 'hover:bg-amber-50/10'}`}
                      >
                         {status?.type === 'APPOINTMENT' && status.isStart && (
                           <div className="text-[6px] font-bold uppercase truncate px-2">{status.appt.profiles?.full_name}</div>
                         )}
                         {status?.type === 'SALON_CLOSURE' && <div className="w-full h-full salon-closure-pattern opacity-30 rounded-xl"></div>}
                      </div>
                    );
                  }) : weekDays.map(date => {
                    // Vista settimanale: mostra punti interattivi
                    const apptsAtHour = appointments.filter(a => {
                       const d = new Date(a.date).toISOString().split('T')[0];
                       const h = new Date(a.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false});
                       return d === date && h === hour && a.status !== 'cancelled';
                    });
                    const isSalonClosure = salonClosures.includes(date);

                    return (
                      <div 
                        key={`${date}-${hour}`} 
                        className={`h-12 rounded-xl border border-gray-50 flex items-center justify-center transition-all ${isSalonClosure ? 'salon-closure-pattern opacity-20' : 'hover:bg-amber-50/10'}`}
                      >
                         {apptsAtHour.map((a, i) => (
                           <button 
                             key={a.id}
                             onClick={() => onAppointmentClick?.(a)}
                             className="appointment-dot w-3 h-3 rounded-full bg-black border-2 border-white shadow-sm -mx-1"
                             title={`${a.team_member_name}: ${a.services?.name}`}
                           />
                         ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
           </div>
         </div>
      </div>
    </div>
  );
};

export default TeamPlanning;

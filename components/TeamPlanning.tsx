
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

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Donna': return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'Uomo': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'Colore': return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'Trattamenti': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'Estetica': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getCategoryDot = (category?: string) => {
    switch (category) {
      case 'Donna': return 'bg-rose-500';
      case 'Uomo': return 'bg-blue-500';
      case 'Colore': return 'bg-purple-500';
      case 'Trattamenti': return 'bg-emerald-500';
      case 'Estetica': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

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
    if (salonClosures && salonClosures.includes(dateStr)) return { type: 'SALON_CLOSURE' };

    const member = team.find(t => t.name === memberName);
    if (!member) return null;

    const [h, m] = hour.split(':').map(Number);
    const targetMin = h * 60 + m;

    const appts = appointments.filter(a => {
      if (a.team_member_name !== memberName || a.status === 'cancelled') return false;
      const appDate = new Date(a.date);
      if (appDate.toISOString().split('T')[0] !== dateStr) return false;

      const appStart = appDate.getHours() * 60 + appDate.getMinutes();
      const duration = a.services?.duration || (a as any).duration || 30;
      const appEnd = appStart + duration;

      return targetMin >= appStart && targetMin < appEnd;
    });

    if (appts.length > 0) {
      const isStart = new Date(appts[0].date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) === hour;
      return { type: 'APPOINTMENT', appt: appts[0], count: appts.length, isStart };
    }

    const activeAbsence = (member.absences_json || []).find(abs => {
      const absStart = new Date(abs.startDate).toISOString().split('T')[0];
      const absEnd = new Date(abs.endDate).toISOString().split('T')[0];
      if (dateStr >= absStart && dateStr <= absEnd) {
        if (abs.isFullDay) return true;
        if (abs.startTime && abs.endTime) {
          return hour >= abs.startTime && hour < abs.endTime;
        }
      }
      return false;
    });
    if (activeAbsence) return { type: 'VACATION', label: activeAbsence.type };

    const dObj = new Date(`${dateStr}T12:00:00`);
    if ((member.weekly_closures || []).includes(dObj.getDay())) return { type: 'CLOSURE' };
    
    if ((member.unavailable_dates || []).includes(dateStr)) return { type: 'VACATION', label: 'Indisponibile' };

    if (member.break_start_time && member.break_end_time && hour >= member.break_start_time && hour < member.break_end_time) {
      return { type: 'BREAK' };
    }

    if (hour < (member.work_start_time || '08:30') || hour >= (member.work_end_time || '18:30')) {
      return { type: 'NON_WORKING' };
    }

    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <style>{`
        .salon-closure-pattern { 
          background-color: #fee2e2;
          background-image: repeating-linear-gradient(45deg, #fee2e2, #fee2e2 10px, #fecaca 10px, #fecaca 20px); 
          position: relative;
        }
        .salon-closure-pattern::after {
          content: 'ATELIER CHIUSO';
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 900;
          color: #ef4444;
          letter-spacing: 0.1em;
          opacity: 0.6;
        }
        .vacation-pattern { 
          background-color: #f3f4f6;
          background-image: repeating-linear-gradient(135deg, #f3f4f6, #f3f4f6 10px, #e5e7eb 10px, #e5e7eb 20px); 
          opacity: 0.6; 
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <button onClick={() => moveTime(-1)} className="w-12 h-12 rounded-[1.5rem] border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-400 transition-all"><i className="fas fa-chevron-left text-xs"></i></button>
          <div className="text-center min-w-[280px]">
            <h4 className="font-luxury font-bold text-2xl uppercase tracking-tight text-gray-900">Agenda Kristal</h4>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.3em] mt-1">
               {viewMode === 'weekly' 
                 ? `Settimana ${weekDays[0].split('-')[2]} - ${weekDays[6].split('-')[2]} ${new Date(weekDays[0]).toLocaleDateString('it-IT', { month: 'short' })}` 
                 : viewDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={() => moveTime(1)} className="w-12 h-12 rounded-[1.5rem] border border-gray-100 flex items-center justify-center hover:bg-gray-50 text-gray-400 transition-all"><i className="fas fa-chevron-right text-xs"></i></button>
        </div>
        <div className="flex bg-gray-50/80 p-1.5 rounded-[1.8rem] border border-gray-100">
          <button onClick={() => setViewMode('weekly')} className={`px-6 py-3 text-[10px] font-bold uppercase rounded-[1.2rem] transition-all ${viewMode === 'weekly' ? 'bg-black text-white shadow-xl' : 'text-gray-400'}`}>Settimana</button>
          <button onClick={() => setViewMode('daily')} className={`px-6 py-3 text-[10px] font-bold uppercase rounded-[1.2rem] transition-all ${viewMode === 'daily' ? 'bg-black text-white shadow-xl' : 'text-gray-400'}`}>Giorno</button>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm p-6 md:p-10 overflow-x-auto scrollbar-hide">
         <div className="min-w-[900px]">
           <div className={`grid gap-3 ${viewMode === 'daily' ? `grid-cols-[80px_repeat(${team.length},1fr)]` : 'grid-cols-[80px_repeat(7,1fr)]'}`}>
              <div className="sticky left-0 bg-white z-20"></div>
              {viewMode === 'daily' ? team.map(m => (
                <div key={m.name} className="flex flex-col items-center gap-3 pb-6 border-b border-gray-50">
                   <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-14 h-14 rounded-[1.5rem] object-cover border-4 border-white shadow-sm" />
                   <h5 className="font-luxury font-bold text-sm text-gray-900">{m.name}</h5>
                   <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">Artista</p>
                </div>
              )) : weekDays.map(date => (
                <div key={date} className="text-center pb-6 border-b border-gray-50">
                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{new Date(`${date}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                  <p className="text-xl font-luxury font-bold text-gray-900 mt-1">{new Date(`${date}T12:00:00`).getDate()}</p>
                </div>
              ))}

              {hours.map(hour => (
                <React.Fragment key={hour}>
                  <div className="sticky left-0 bg-white z-20 flex items-center justify-end pr-6 h-14">
                     <span className="text-[8px] font-bold text-gray-300 uppercase">{hour}</span>
                  </div>
                  {viewMode === 'daily' ? team.map(m => {
                    const dateStr = weekDays[0];
                    const status = getSlotStatus(m.name, dateStr, hour);
                    const isGlobalClosure = salonClosures && salonClosures.includes(dateStr);
                    
                    let appointmentClasses = "";
                    if (status?.type === 'APPOINTMENT') {
                      appointmentClasses = getCategoryColor(status.appt.services?.category);
                    }

                    return (
                      <div 
                        key={`${m.name}-${hour}`} 
                        onClick={() => {
                          if (status?.type === 'APPOINTMENT') onAppointmentClick?.(status.appt);
                          else if (!isGlobalClosure && status?.type !== 'VACATION' && status?.type !== 'CLOSURE' && onSlotClick) onSlotClick(m.name, dateStr, hour);
                        }}
                        className={`h-14 rounded-2xl border border-gray-50 flex items-center justify-center cursor-pointer transition-all ${
                          status?.type === 'APPOINTMENT' ? `${appointmentClasses} shadow-md scale-[0.98] border-opacity-50` : 'hover:bg-amber-50/10'
                        } ${isGlobalClosure ? 'salon-closure-pattern cursor-not-allowed opacity-40' : ''}`}
                      >
                         {status?.type === 'APPOINTMENT' && status.isStart && (
                           <div className="flex flex-col items-center justify-center overflow-hidden w-full px-2">
                             <div className="text-[7px] font-black uppercase truncate leading-none mb-0.5">{status.appt.profiles?.full_name || 'Ospite'}</div>
                             <div className="text-[6px] font-bold opacity-70 uppercase truncate">{status.appt.services?.name}</div>
                           </div>
                         )}
                         {status?.type === 'VACATION' && !isGlobalClosure && (
                           <div className="w-full h-full vacation-pattern flex flex-col items-center justify-center rounded-2xl">
                             <span className="text-[7px] font-bold text-gray-400 uppercase">{status.label || 'Assente'}</span>
                           </div>
                         )}
                         {status?.type === 'CLOSURE' && !isGlobalClosure && (
                           <div className="w-full h-full bg-gray-50 rounded-2xl flex items-center justify-center opacity-50">
                             <i className="fas fa-lock text-[9px] text-gray-300"></i>
                           </div>
                         )}
                         {status?.type === 'BREAK' && !isGlobalClosure && (
                           <div className="w-full h-full bg-amber-50/10 rounded-2xl flex items-center justify-center">
                             <i className="fas fa-coffee text-[10px] text-amber-200"></i>
                           </div>
                         )}
                      </div>
                    );
                  }) : weekDays.map(date => {
                    const isGlobalClosure = salonClosures && salonClosures.includes(date);
                    const apptsAtHour = appointments.filter(a => {
                       const d = new Date(a.date).toISOString().split('T')[0];
                       const h = new Date(a.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false});
                       return d === date && h === hour && a.status !== 'cancelled';
                    });

                    return (
                      <div 
                        key={`${date}-${hour}`} 
                        className={`h-14 rounded-2xl border border-gray-50 flex items-center justify-center gap-1 transition-all ${isGlobalClosure ? 'salon-closure-pattern opacity-40' : 'hover:bg-amber-50/10'}`}
                      >
                         {!isGlobalClosure && apptsAtHour.map(a => (
                           <button 
                             key={a.id} 
                             onClick={() => onAppointmentClick?.(a)} 
                             className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform ${getCategoryDot(a.services?.category)}`} 
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

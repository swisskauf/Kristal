
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment } from '../types';

interface TeamPlanningProps {
  team: TeamMember[];
  appointments: Appointment[];
  onToggleVacation: (memberName: string, date: string) => void;
  onSlotClick?: (memberName: string, date: string, hour: string) => void;
  onAppointmentClick?: (appt: Appointment) => void;
  currentUserMemberName?: string;
  isCollaborator?: boolean;
  salonClosures?: string[]; 
}

const TeamPlanning: React.FC<TeamPlanningProps> = ({ 
  team, 
  appointments, 
  onSlotClick,
  onAppointmentClick,
  isCollaborator = false,
  salonClosures = []
}) => {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>(isCollaborator ? 'daily' : 'weekly');
  const [viewDate, setViewDate] = useState(new Date());

  const getCategoryStyles = (category?: string) => {
    switch (category) {
      case 'Donna': return 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100';
      case 'Uomo': return 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100';
      case 'Colore': return 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100';
      case 'Trattamenti': return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
      case 'Estetica': return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
      default: return 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
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

  const getSlotStatus = (memberName: string, dateStr: string, hour: string) => {
    if (salonClosures && salonClosures.includes(dateStr)) return { type: 'SALON_CLOSURE' };

    const member = team.find(t => t.name === memberName);
    if (!member) return null;

    const [h, m] = hour.split(':').map(Number);
    const targetMin = h * 60 + m;

    const appts = appointments.filter(a => {
      if (a.team_member_name !== memberName || a.status === 'cancelled') return false;
      if (new Date(a.date).toISOString().split('T')[0] !== dateStr) return false;
      const appStart = new Date(a.date).getHours() * 60 + new Date(a.date).getMinutes();
      const duration = a.services?.duration || 30;
      return targetMin >= appStart && targetMin < appStart + duration;
    });

    if (appts.length > 0) {
      const isStart = new Date(appts[0].date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false }) === hour;
      return { type: 'APPOINTMENT', appt: appts[0], isStart };
    }

    const dObj = new Date(`${dateStr}T12:00:00`);
    if ((member.weekly_closures || []).includes(dObj.getDay())) return { type: 'CLOSURE' };
    
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <style>{`
        .salon-closure-pattern { 
          background-color: #fef2f2;
          background-image: repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fee2e2 10px, #fee2e2 20px); 
          border: 1px solid #fecaca !important;
        }
      `}</style>

      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => {
            const d = new Date(viewDate);
            d.setDate(d.getDate() - (viewMode === 'weekly' ? 7 : 1));
            setViewDate(d);
          }} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50"><i className="fas fa-chevron-left text-xs text-gray-400"></i></button>
          <h4 className="font-luxury font-bold text-xl">{viewDate.toLocaleDateString('it-IT', { month:'long', year:'numeric', day: viewMode==='daily'?'numeric':undefined })}</h4>
          <button onClick={() => {
            const d = new Date(viewDate);
            d.setDate(d.getDate() + (viewMode === 'weekly' ? 7 : 1));
            setViewDate(d);
          }} className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50"><i className="fas fa-chevron-right text-xs text-gray-400"></i></button>
        </div>
        <div className="flex bg-gray-50 p-1 rounded-xl">
           <button onClick={() => setViewMode('weekly')} className={`px-4 py-2 text-[9px] font-bold uppercase rounded-lg ${viewMode === 'weekly' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Settimana</button>
           <button onClick={() => setViewMode('daily')} className={`px-4 py-2 text-[9px] font-bold uppercase rounded-lg ${viewMode === 'daily' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Giorno</button>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm p-6 overflow-x-auto scrollbar-hide">
         <div className="min-w-[800px]">
           <div className={`grid gap-2 ${viewMode === 'daily' ? `grid-cols-[80px_repeat(${team.length},1fr)]` : 'grid-cols-[80px_repeat(7,1fr)]'}`}>
              <div className="h-10"></div>
              {viewMode === 'daily' ? team.map(m => (
                <div key={m.name} className="text-center font-luxury font-bold text-sm border-b pb-2">{m.name}</div>
              )) : weekDays.map(d => (
                <div key={d} className="text-center">
                   <p className="text-[8px] font-bold uppercase text-amber-600">{new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday:'short' })}</p>
                   <p className="font-luxury font-bold text-lg">{new Date(`${d}T12:00:00`).getDate()}</p>
                </div>
              ))}

              {hours.map(hour => (
                <React.Fragment key={hour}>
                  <div className="flex items-center justify-end pr-4 text-[8px] font-bold text-gray-300 uppercase">{hour}</div>
                  {viewMode === 'daily' ? team.map(m => {
                    const status = getSlotStatus(m.name, weekDays[0], hour);
                    const isGlobal = status?.type === 'SALON_CLOSURE';
                    return (
                      <div 
                        key={`${m.name}-${hour}`}
                        onClick={() => {
                          if (status?.type === 'APPOINTMENT') onAppointmentClick?.(status.appt);
                          else if (!isGlobal && status?.type !== 'CLOSURE') onSlotClick?.(m.name, weekDays[0], hour);
                        }}
                        className={`h-12 rounded-xl border border-gray-50 flex items-center justify-center transition-all ${
                          status?.type === 'APPOINTMENT' ? getCategoryStyles(status.appt.services?.category) : 'hover:bg-amber-50/20'
                        } ${isGlobal ? 'salon-closure-pattern opacity-60' : ''} ${status?.type === 'CLOSURE' ? 'bg-gray-50 opacity-40' : ''}`}
                      >
                         {status?.type === 'APPOINTMENT' && status.isStart && (
                           <div className="text-[7px] font-bold uppercase truncate px-1">{status.appt.profiles?.full_name}</div>
                         )}
                      </div>
                    );
                  }) : weekDays.map(d => {
                    const isGlobal = salonClosures?.includes(d);
                    const atHour = appointments.filter(a => {
                       const ad = new Date(a.date).toISOString().split('T')[0];
                       const ah = new Date(a.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false});
                       return ad === d && ah === hour && a.status !== 'cancelled';
                    });
                    return (
                      <div key={`${d}-${hour}`} className={`h-12 border border-gray-50 flex gap-0.5 items-center justify-center rounded-xl ${isGlobal ? 'salon-closure-pattern' : ''}`}>
                         {!isGlobal && atHour.map(a => (
                            <div key={a.id} onClick={() => onAppointmentClick?.(a)} className={`w-2 h-2 rounded-full cursor-pointer ${a.services?.category === 'Donna' ? 'bg-rose-400' : 'bg-amber-400'}`}></div>
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

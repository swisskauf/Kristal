
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
      case 'Donna': return 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100';
      case 'Uomo': return 'bg-sky-50 border-sky-100 text-sky-700 hover:bg-sky-100';
      case 'Colore': return 'bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100';
      case 'Trattamenti': return 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100';
      case 'Estetica': return 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100';
      default: return 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100';
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
    // 0. Chiusura Globale Salone (Festività)
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
          position: relative;
        }
        .salon-closure-pattern::after {
          content: 'CHIUSO';
          position: absolute;
          font-size: 8px;
          font-weight: 900;
          color: #ef4444;
          letter-spacing: 0.1em;
          opacity: 0.5;
        }
      `}</style>

      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={() => {
            const d = new Date(viewDate);
            d.setDate(d.getDate() - (viewMode === 'weekly' ? 7 : 1));
            setViewDate(d);
          }} className="w-12 h-12 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all"><i className="fas fa-chevron-left text-xs text-gray-400"></i></button>
          <div className="text-center">
             <h4 className="font-luxury font-bold text-2xl tracking-tighter">{viewDate.toLocaleDateString('it-IT', { month:'long', year:'numeric' })}</h4>
             {viewMode === 'daily' && <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{viewDate.toLocaleDateString('it-IT', { day:'numeric', weekday:'long' })}</p>}
          </div>
          <button onClick={() => {
            const d = new Date(viewDate);
            d.setDate(d.getDate() + (viewMode === 'weekly' ? 7 : 1));
            setViewDate(d);
          }} className="w-12 h-12 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all"><i className="fas fa-chevron-right text-xs text-gray-400"></i></button>
        </div>
        <div className="flex bg-gray-50 p-1.5 rounded-2xl">
           <button onClick={() => setViewMode('weekly')} className={`px-6 py-2.5 text-[10px] font-bold uppercase rounded-xl transition-all ${viewMode === 'weekly' ? 'bg-white text-black shadow-lg' : 'text-gray-400'}`}>Settimana</button>
           <button onClick={() => setViewMode('daily')} className={`px-6 py-2.5 text-[10px] font-bold uppercase rounded-xl transition-all ${viewMode === 'daily' ? 'bg-white text-black shadow-lg' : 'text-gray-400'}`}>Giorno</button>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm p-8 overflow-x-auto scrollbar-hide">
         <div className="min-w-[900px]">
           <div className={`grid gap-2 ${viewMode === 'daily' ? `grid-cols-[80px_repeat(${team.length},1fr)]` : 'grid-cols-[80px_repeat(7,1fr)]'}`}>
              <div className="sticky left-0 bg-white z-10"></div>
              {viewMode === 'daily' ? team.map(m => (
                <div key={m.name} className="flex flex-col items-center gap-2 pb-6 border-b border-gray-50">
                   <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md" />
                   <h5 className="font-luxury font-bold text-sm tracking-tight">{m.name}</h5>
                </div>
              )) : weekDays.map(d => (
                <div key={d} className="text-center pb-6 border-b border-gray-50">
                   <p className="text-[8px] font-bold uppercase text-amber-600 tracking-widest">{new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { weekday:'short' })}</p>
                   <p className="font-luxury font-bold text-xl">{new Date(`${d}T12:00:00`).getDate()}</p>
                </div>
              ))}

              {hours.map(hour => (
                <React.Fragment key={hour}>
                  <div className="sticky left-0 bg-white z-10 flex items-center justify-end pr-6 text-[9px] font-bold text-gray-300 uppercase h-12">{hour}</div>
                  {viewMode === 'daily' ? team.map(m => {
                    const status = getSlotStatus(m.name, weekDays[0], hour);
                    const isGlobal = status?.type === 'SALON_CLOSURE';
                    const isClosing = status?.type === 'CLOSURE';
                    
                    return (
                      <div 
                        key={`${m.name}-${hour}`}
                        onClick={() => {
                          if (status?.type === 'APPOINTMENT') onAppointmentClick?.(status.appt);
                          else if (!isGlobal && !isClosing) onSlotClick?.(m.name, weekDays[0], hour);
                        }}
                        className={`h-12 rounded-2xl border border-gray-50 flex items-center justify-center transition-all ${
                          status?.type === 'APPOINTMENT' ? getCategoryStyles(status.appt.services?.category) : 'hover:bg-amber-50/10'
                        } ${isGlobal ? 'salon-closure-pattern cursor-not-allowed opacity-60' : ''} ${isClosing ? 'bg-gray-50 opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                         {status?.type === 'APPOINTMENT' && status.isStart && (
                           <div className="flex flex-col items-center justify-center overflow-hidden w-full px-2">
                             <span className="text-[8px] font-black uppercase truncate leading-none mb-0.5">{status.appt.profiles?.full_name}</span>
                             <span className="text-[7px] font-bold opacity-50 uppercase truncate">{status.appt.services?.name}</span>
                           </div>
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
                      <div key={`${d}-${hour}`} className={`h-12 border border-gray-50 flex gap-1 items-center justify-center rounded-2xl ${isGlobal ? 'salon-closure-pattern' : 'hover:bg-amber-50/5'}`}>
                         {!isGlobal && atHour.map(a => (
                            <button 
                              key={a.id} 
                              onClick={() => onAppointmentClick?.(a)} 
                              title={`${a.profiles?.full_name}: ${a.services?.name}`}
                              className={`w-3 h-3 rounded-full border border-white shadow-sm hover:scale-125 transition-transform ${a.services?.category === 'Donna' ? 'bg-rose-400' : 'bg-amber-400'}`} 
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

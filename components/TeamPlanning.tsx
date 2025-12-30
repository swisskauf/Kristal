
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
      case 'Donna': return 'bg-rose-50 border-l-[6px] border-l-rose-400 text-rose-900 border-y border-r border-rose-100 shadow-sm';
      case 'Uomo': return 'bg-blue-50 border-l-[6px] border-l-blue-400 text-blue-900 border-y border-r border-blue-100 shadow-sm';
      case 'Colore': return 'bg-purple-50 border-l-[6px] border-l-purple-400 text-purple-900 border-y border-r border-purple-100 shadow-sm';
      case 'Trattamenti': return 'bg-emerald-50 border-l-[6px] border-l-emerald-400 text-emerald-900 border-y border-r border-emerald-100 shadow-sm';
      case 'Estetica': return 'bg-amber-50 border-l-[6px] border-l-amber-400 text-amber-900 border-y border-r border-amber-100 shadow-sm';
      default: return 'bg-gray-50 border-l-[6px] border-l-gray-400 text-gray-900 border-y border-r border-gray-100 shadow-sm';
    }
  };

  const getAbsenceStyles = (type: string) => {
     const stripePattern = "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)";
     switch(type) {
        case 'vacation': return { className: 'bg-amber-50 border border-amber-200 text-amber-800', style: { backgroundImage: stripePattern } };
        case 'sick': 
        case 'injury': return { className: 'bg-red-50 border border-red-200 text-red-800', style: { backgroundImage: stripePattern } };
        case 'training': return { className: 'bg-emerald-50 border border-emerald-200 text-emerald-800', style: { backgroundImage: stripePattern } };
        case 'unpaid': return { className: 'bg-gray-100 border border-gray-200 text-gray-500', style: { backgroundImage: stripePattern } };
        default: return { className: 'bg-gray-50 border border-gray-200 text-gray-400', style: { backgroundImage: stripePattern } };
     }
  };

  const getAbsenceLabel = (type: string) => {
    const labels: Record<string, string> = { 
      vacation: 'Ferie', sick: 'Malattia', training: 'Formazione', injury: 'Infortunio', unpaid: 'Permesso', overtime_recovery: 'Recupero' 
    };
    return labels[type] || 'Assente';
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
    // 1. Chiusura Globale Salone (Festività)
    if (salonClosures && salonClosures.includes(dateStr)) return { type: 'SALON_CLOSURE' };

    const member = team.find(t => t.name === memberName);
    if (!member) return null;

    const [h, m] = hour.split(':').map(Number);
    const targetMin = h * 60 + m;

    // 2. Appuntamenti
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

    // 3. Chiusure Settimanali Staff
    const dObj = new Date(`${dateStr}T12:00:00`);
    if ((member.weekly_closures || []).includes(dObj.getDay())) return { type: 'STAFF_OFF' };

    // 4. Assenze Registrate (Congedi/Vacanze)
    const activeAbsence = (member.absences_json || []).find(abs => {
      const absStart = new Date(abs.startDate).toISOString().split('T')[0];
      const absEnd = new Date(abs.endDate).toISOString().split('T')[0];
      if (dateStr >= absStart && dateStr <= absEnd) {
        if (abs.isFullDay) return true;
        if (abs.startTime && abs.endTime) {
          const [asH, asM] = abs.startTime.split(':').map(Number);
          const [aeH, aeM] = abs.endTime.split(':').map(Number);
          const absS = asH * 60 + asM;
          const absE = aeH * 60 + aeM;
          return targetMin >= absS && targetMin < absE;
        }
      }
      return false;
    });
    if (activeAbsence) return { type: 'STAFF_ABSENT', absence: activeAbsence };

    // 5. Pausa Pranzo (Sincronizzata con i parametri HR)
    const [breakS, breakSM] = (member.break_start_time || '13:00').split(':').map(Number);
    const [breakE, breakEM] = (member.break_end_time || '14:00').split(':').map(Number);
    const bStart = breakS * 60 + breakSM;
    const bEnd = breakE * 60 + breakEM;
    if (targetMin >= bStart && targetMin < bEnd) return { type: 'BREAK' };

    // 6. Fuori Orario di Lavoro
    const [workSH, workSM] = (member.work_start_time || '08:30').split(':').map(Number);
    const [workEH, workEM] = (member.work_end_time || '18:30').split(':').map(Number);
    const wStart = workSH * 60 + workSM;
    const wEnd = workEH * 60 + workEM;
    if (targetMin < wStart || targetMin >= wEnd) return { type: 'OUT_OF_HOURS' };
    
    return { type: 'AVAILABLE' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <style>{`
        .salon-holiday-pattern {
          background-color: #fffbeb;
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(217, 119, 6, 0.05) 10px, rgba(217, 119, 6, 0.05) 20px);
          border-color: #fef3c7 !important;
          cursor: not-allowed;
        }
        .blocked-pattern { 
          background-color: #f9fafb;
          background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px); 
          cursor: not-allowed;
          opacity: 0.7;
        }
        .break-pattern {
          background-color: #fffaf0;
          border-color: #feebc8 !important;
          cursor: not-allowed;
        }
        .slot-hover:hover {
          transform: scale(1.01);
          z-index: 20;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
              const d = new Date(viewDate);
              d.setDate(d.getDate() - (viewMode === 'weekly' ? 7 : 1));
              setViewDate(d);
            }} 
            className="w-14 h-14 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300"
          >
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <div className="text-center min-w-[200px]">
             <h4 className="font-luxury font-bold text-3xl tracking-tighter text-gray-900">
               {viewDate.toLocaleDateString('it-IT', { month:'long', year:'numeric' }).toUpperCase()}
             </h4>
             <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.3em] mt-1">
               {viewMode === 'daily' ? viewDate.toLocaleDateString('it-IT', { day:'numeric', weekday:'long' }) : `Settimana ${Math.ceil(viewDate.getDate() / 7)}`}
             </p>
          </div>
          <button 
            onClick={() => {
              const d = new Date(viewDate);
              d.setDate(d.getDate() + (viewMode === 'weekly' ? 7 : 1));
              setViewDate(d);
            }} 
            className="w-14 h-14 rounded-2xl border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300"
          >
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>
        
        <div className="flex bg-gray-100 p-1.5 rounded-2xl">
           <button 
             onClick={() => setViewMode('weekly')} 
             className={`px-8 py-3 text-[10px] font-bold uppercase rounded-xl transition-all duration-500 ${viewMode === 'weekly' ? 'bg-white text-black shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}
           >
             Settimana
           </button>
           <button 
             onClick={() => setViewMode('daily')} 
             className={`px-8 py-3 text-[10px] font-bold uppercase rounded-xl transition-all duration-500 ${viewMode === 'daily' ? 'bg-white text-black shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}
           >
             Giorno
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-50 shadow-2xl p-8 md:p-12 overflow-x-auto scrollbar-hide relative">
         <div className="min-w-[1000px] mb-8">
           <div className={`grid gap-3 ${viewMode === 'daily' ? `grid-cols-[100px_repeat(${team.length},1fr)]` : 'grid-cols-[100px_repeat(7,1fr)]'}`}>
              <div className="sticky left-0 bg-white/90 backdrop-blur-md z-30"></div>
              
              {/* Header: Artisti (Giorno) o Date (Settimana) */}
              {viewMode === 'daily' ? team.map((m, idx) => (
                <div key={m.name} className="flex flex-col items-center gap-4 pb-8 border-b border-gray-100 animate-in fade-in slide-in-from-top-4" style={{animationDelay: `${idx * 100}ms`}}>
                   <div className="relative">
                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}&background=000&color=fff`} className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white shadow-xl" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                   </div>
                   <div className="text-center">
                      <h5 className="font-luxury font-bold text-lg tracking-tight text-gray-900">{m.name}</h5>
                      <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">{m.role}</p>
                   </div>
                </div>
              )) : weekDays.map((d, idx) => {
                const dateObj = new Date(`${d}T12:00:00`);
                const isToday = d === new Date().toISOString().split('T')[0];
                return (
                  <div key={d} className={`text-center pb-8 border-b transition-all duration-500 ${isToday ? 'border-amber-500 scale-105' : 'border-gray-100'} animate-in fade-in slide-in-from-top-4`} style={{animationDelay: `${idx * 100}ms`}}>
                     <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1 ${isToday ? 'text-amber-600' : 'text-gray-400'}`}>
                       {dateObj.toLocaleDateString('it-IT', { weekday:'short' })}
                     </p>
                     <p className={`font-luxury font-bold text-3xl ${isToday ? 'text-gray-900' : 'text-gray-300'}`}>
                       {dateObj.getDate()}
                     </p>
                  </div>
                );
              })}

              {/* Corpo dell'agenda */}
              {hours.map((hour, hIdx) => (
                <React.Fragment key={hour}>
                  <div className="sticky left-0 bg-white/90 backdrop-blur-md z-30 flex items-center justify-end pr-8 text-[11px] font-bold text-gray-300 uppercase h-16 transition-all group-hover:text-black">
                    {hour}
                  </div>
                  
                  {viewMode === 'daily' ? team.map((m, mIdx) => {
                    const status = getSlotStatus(m.name, weekDays[0], hour);
                    const isHoliday = status?.type === 'SALON_CLOSURE';
                    const isOff = status?.type === 'STAFF_OFF';
                    const isAbsent = status?.type === 'STAFF_ABSENT';
                    const isBreak = status?.type === 'BREAK';
                    const isAppt = status?.type === 'APPOINTMENT';
                    const isOutOfHours = status?.type === 'OUT_OF_HOURS';
                    
                    const absenceStyle = isAbsent ? getAbsenceStyles(status.absence.type) : { className: '', style: {} };

                    return (
                      <div 
                        key={`${m.name}-${hour}`}
                        onClick={() => {
                          if (isAppt) onAppointmentClick?.(status.appt);
                          else if (status?.type === 'AVAILABLE') onSlotClick?.(m.name, weekDays[0], hour);
                        }}
                        style={isAbsent ? absenceStyle.style : {}}
                        className={`h-16 rounded-2xl border transition-all duration-300 slot-hover relative overflow-hidden ${
                          isAppt ? getCategoryStyles(status.appt.services?.category) : 
                          isHoliday ? 'salon-holiday-pattern border-amber-100' :
                          isAbsent ? absenceStyle.className :
                          isBreak ? 'break-pattern border-amber-100 flex items-center justify-center' :
                          isOutOfHours ? 'bg-gray-100/50 border-gray-100 cursor-not-allowed' :
                          isOff ? 'blocked-pattern border-gray-50' :
                          'bg-white border-gray-50 hover:border-amber-200 cursor-pointer shadow-sm hover:shadow-md'
                        } animate-in fade-in zoom-in-95`}
                      >
                         {isAppt && status.isStart && (
                           <div className="flex flex-col items-start justify-center h-full w-full px-4 py-2">
                             <div className="flex items-center gap-2 mb-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-pulse"></div>
                               <span className="text-[10px] font-black uppercase truncate leading-none">
                                 {status.appt.profiles?.full_name}
                               </span>
                             </div>
                             <span className="text-[8px] font-bold opacity-70 uppercase truncate tracking-tighter">
                               {status.appt.services?.name}
                             </span>
                           </div>
                         )}
                         {isBreak && (
                           <div className="flex flex-col items-center justify-center gap-1">
                              <i className="fas fa-mug-hot text-amber-300 text-[10px]"></i>
                              <span className="text-[7px] font-bold text-amber-400 uppercase tracking-widest">Pausa</span>
                           </div>
                         )}
                         {isAbsent && (
                           <div className="flex flex-col items-center justify-center h-full gap-1 opacity-80">
                              <span className="text-[8px] font-black uppercase tracking-widest bg-white/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
                                {getAbsenceLabel(status.absence.type)}
                              </span>
                           </div>
                         )}
                         {isHoliday && <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-amber-900/20 tracking-[0.3em] uppercase rotate-[-15deg]">Atelier Chiuso</span>}
                         {isOff && <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-gray-300 tracking-[0.2em] uppercase">Riposo</span>}
                         {isOutOfHours && !isOff && !isHoliday && <div className="absolute inset-0 bg-gray-900/5"></div>}
                      </div>
                    );
                  }) : weekDays.map((d, dIdx) => {
                    const isGlobalHoliday = salonClosures?.includes(d);
                    const dayAppts = appointments.filter(a => {
                       const ad = new Date(a.date).toISOString().split('T')[0];
                       const ah = new Date(a.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false});
                       return ad === d && ah === hour && a.status !== 'cancelled';
                    });

                    return (
                      <div 
                        key={`${d}-${hour}`} 
                        className={`h-16 border flex gap-1.5 items-center justify-center rounded-2xl transition-all duration-300 slot-hover ${
                          isGlobalHoliday ? 'salon-holiday-pattern border-amber-100' : 'bg-white border-gray-50 hover:border-gray-200'
                        }`}
                        style={{animationDelay: `${(hIdx + dIdx) * 20}ms`}}
                      >
                         {!isGlobalHoliday && dayAppts.map(a => (
                            <button 
                              key={a.id} 
                              onClick={() => onAppointmentClick?.(a)} 
                              title={`${a.profiles?.full_name}: ${a.services?.name}`}
                              className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all hover:scale-150 active:scale-95 ${
                                a.services?.category === 'Donna' ? 'bg-rose-400' : 
                                a.services?.category === 'Uomo' ? 'bg-blue-400' :
                                a.services?.category === 'Colore' ? 'bg-purple-400' :
                                a.services?.category === 'Estetica' ? 'bg-amber-400' :
                                'bg-emerald-400'
                              }`} 
                            />
                         ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
           </div>
         </div>

         {/* Legenda Agenda */}
         <div className="border-t border-gray-100 pt-8 flex flex-wrap gap-8 items-center justify-center">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
               <span className="text-[9px] font-bold uppercase text-gray-500">Donna</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
               <span className="text-[9px] font-bold uppercase text-gray-500">Uomo</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
               <span className="text-[9px] font-bold uppercase text-gray-500">Colore</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
               <span className="text-[9px] font-bold uppercase text-gray-500">Trattamenti</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
               <span className="text-[9px] font-bold uppercase text-gray-500">Estetica</span>
            </div>
            <div className="h-4 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 border border-amber-200 bg-amber-50"></div>
               <span className="text-[9px] font-bold uppercase text-gray-500">Ferie</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 border border-red-200 bg-red-50"></div>
               <span className="text-[9px] font-bold uppercase text-gray-500">Malattia</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TeamPlanning;

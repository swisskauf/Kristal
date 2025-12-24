
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment } from '../types';

interface TeamPlanningProps {
  team: TeamMember[];
  appointments: Appointment[];
  onToggleVacation: (memberName: string, date: string) => void;
}

const TeamPlanning: React.FC<TeamPlanningProps> = ({ team, appointments, onToggleVacation }) => {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(team.map(m => m.name));
  const [viewDate, setViewDate] = useState(new Date());

  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(viewDate);
    startOfWeek.setDate(viewDate.getDate() - viewDate.getDay() + 1); // Lunedì
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [viewDate]);

  const toggleMemberFilter = (name: string) => {
    setSelectedMembers(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const moveWeek = (offset: number) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + (offset * 7));
    setViewDate(d);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => moveWeek(-1)} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <div className="text-center min-w-[200px]">
            <h4 className="font-luxury font-bold text-xl uppercase tracking-tighter">Pianificazione Team</h4>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Settimana {new Date(weekDays[0]).getDate()} - {new Date(weekDays[6]).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={() => moveWeek(1)} className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400">
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {team.map(m => (
            <button 
              key={m.name}
              onClick={() => toggleMemberFilter(m.name)}
              className={`px-4 py-2 rounded-full text-[8px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedMembers.includes(m.name) ? 'bg-black text-white border-black' : 'bg-white text-gray-300 border-gray-100 hover:border-amber-200'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${selectedMembers.includes(m.name) ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
              {m.name}
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
                  <th key={m.name} className="p-6 text-center min-w-[160px]">
                    <div className="flex flex-col items-center gap-2">
                      <img src={m.avatar} className="w-8 h-8 rounded-full shadow-md" alt={m.name} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{m.name}</span>
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
                  <tr key={date} className={`border-b border-gray-50 hover:bg-gray-50/30 transition-colors ${isToday ? 'bg-amber-50/20' : ''}`}>
                    <td className="p-6">
                      <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                      <p className="text-xl font-luxury font-bold text-gray-900">{d.getDate()}</p>
                    </td>
                    {team.filter(m => selectedMembers.includes(m.name)).map(m => {
                      const isOff = m.unavailable_dates?.includes(date);
                      const dayAppts = appointments.filter(a => a.team_member_name === m.name && a.date.includes(date));
                      
                      return (
                        <td key={m.name} className="p-4">
                          <button 
                            onClick={() => onToggleVacation(m.name, date)}
                            className={`w-full p-4 rounded-2xl border transition-all text-left relative group ${
                              isOff 
                                ? 'bg-gray-900 border-gray-900 text-gray-500' 
                                : dayAppts.length > 0 
                                  ? 'bg-white border-amber-100' 
                                  : 'bg-white border-gray-50 hover:border-amber-500 border-dashed'
                            }`}
                          >
                            {isOff ? (
                              <div className="flex items-center gap-2">
                                <i className="fas fa-plane text-[8px]"></i>
                                <span className="text-[8px] font-bold uppercase tracking-widest">Ferie</span>
                              </div>
                            ) : dayAppts.length > 0 ? (
                              <div>
                                <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">{dayAppts.length} APPUNT.</span>
                                <div className="mt-1 h-1 w-full bg-amber-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500" style={{ width: `${Math.min(dayAppts.length * 15, 100)}%` }}></div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Disponibile</span>
                                <span className="text-[7px] text-amber-600 uppercase">Segna Assenza</span>
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
      
      <div className="flex justify-center gap-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded bg-gray-900"></div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Assenza / Ferie</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded border border-amber-100 bg-white shadow-sm"></div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Impegni fissati</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded border border-gray-50 border-dashed bg-white"></div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Disponibile</span>
        </div>
      </div>
    </div>
  );
};

export default TeamPlanning;

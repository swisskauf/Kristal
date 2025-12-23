
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, Service } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface TeamManagementProps {
  member: TeamMember;
  appointments: Appointment[];
  services: Service[];
  onSave: (updatedMember: TeamMember) => void;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ member, appointments, services, onSave, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'schedule' | 'vacations'>('analytics');
  const [startHour, setStartHour] = useState(member.start_hour || 8);
  const [endHour, setEndHour] = useState(member.end_hour || 19);
  const [newVacationDate, setNewVacationDate] = useState('');

  // Calcolo statistiche membro
  const memberStats = useMemo(() => {
    const memberAppointments = appointments.filter(a => a.team_member_name === member.name);
    const totalRevenue = memberAppointments.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    const serviceCount = memberAppointments.length;
    
    // Distribuzione per categoria
    const categories: Record<string, number> = {};
    memberAppointments.forEach(a => {
      const cat = services.find(s => s.id === a.service_id)?.category || 'Altro';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const pieData = Object.entries(categories).map(([name, value]) => ({ name, value }));

    return { totalRevenue, serviceCount, pieData, memberAppointments };
  }, [appointments, member.name, services]);

  const COLORS = ['#d97706', '#111827', '#4b5563', '#9ca3af'];

  const handleUpdateHours = () => {
    onSave({ ...member, start_hour: startHour, end_hour: endHour });
  };

  const addVacation = () => {
    if (!newVacationDate) return;
    const updatedDates = [...(member.unavailable_dates || []), newVacationDate];
    onSave({ ...member, unavailable_dates: updatedDates });
    setNewVacationDate('');
  };

  const removeVacation = (date: string) => {
    const updatedDates = (member.unavailable_dates || []).filter(d => d !== date);
    onSave({ ...member, unavailable_dates: updatedDates });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-6">
          <img src={member.avatar} className="w-20 h-20 rounded-full shadow-2xl border-4 border-white" alt={member.name} />
          <div>
            <h3 className="text-3xl font-luxury font-bold text-gray-900">{member.name}</h3>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{member.role}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-black transition-colors">
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="flex gap-8 border-b border-gray-100 mb-10 overflow-x-auto scrollbar-hide">
        {[
          { id: 'analytics', label: 'Performance', icon: 'fa-chart-line' },
          { id: 'schedule', label: 'Orari e Turni', icon: 'fa-clock' },
          { id: 'vacations', label: 'Vacanze e Assenze', icon: 'fa-calendar-times' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-3 pb-4 text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-300 hover:text-gray-600'}`}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {activeSubTab === 'analytics' && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Valore Generato</p>
                <h4 className="text-3xl font-luxury font-bold text-gray-900">CHF {memberStats.totalRevenue}</h4>
              </div>
              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Rituali Eseguiti</p>
                <h4 className="text-3xl font-luxury font-bold text-gray-900">{memberStats.serviceCount}</h4>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm h-64">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-6">Specializzazione Artistica</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={memberStats.pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {memberStats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeSubTab === 'schedule' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-300">
            <div className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100">
              <h5 className="text-[10px] font-bold uppercase tracking-widest mb-8 text-amber-600">Configurazione Disponibilità Giornaliera</h5>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Inizio Mattina</label>
                  <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="w-full p-5 rounded-2xl bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-amber-500 font-bold">
                    {[7,8,9,10,11].map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Chiusura</label>
                  <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="w-full p-5 rounded-2xl bg-white border border-gray-200 outline-none focus:ring-2 focus:ring-amber-500 font-bold">
                    {[17,18,19,20,21,22].map(h => <option key={h} value={h}>{h}:00</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleUpdateHours} className="w-full mt-8 py-5 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-amber-700 transition-all">Salva Orari</button>
            </div>
            <p className="text-[9px] text-gray-400 italic text-center px-10">L'aggiornamento degli orari influenzerà immediatamente la disponibilità visibile agli ospiti per le nuove prenotazioni.</p>
          </div>
        )}

        {activeSubTab === 'vacations' && (
          <div className="space-y-8 animate-in slide-in-from-right-5 duration-300">
            <div className="flex gap-4">
              <input 
                type="date" 
                value={newVacationDate} 
                onChange={(e) => setNewVacationDate(e.target.value)}
                className="flex-1 p-5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
              <button onClick={addVacation} className="px-8 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest">Aggiungi</button>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-amber-600">Date di Assenza Pianificate</h5>
              {(member.unavailable_dates || []).length > 0 ? (
                <div className="grid gap-3">
                  {(member.unavailable_dates || []).sort().map(date => (
                    <div key={date} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl">
                      <span className="font-bold text-sm">{new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <button onClick={() => removeVacation(date)} className="text-red-300 hover:text-red-500 transition-colors">
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200 text-center">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Nessuna assenza registrata.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;


import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Service, TeamMember } from '../types';

interface AppointmentFormProps {
  onSave: (app: Partial<Appointment>) => void;
  onCancel: () => void;
  initialData?: any;
  services: Service[];
  team: TeamMember[];
  existingAppointments: any[];
  isAdmin?: boolean;
  profiles?: any[];
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
  onSave, 
  onCancel, 
  initialData, 
  services, 
  team, 
  existingAppointments,
  isAdmin = false,
  profiles = [] 
}) => {
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [serviceId, setServiceId] = useState(initialData?.service_id || '');
  const [teamMemberName, setTeamMemberName] = useState(initialData?.team_member_name || '');
  
  const [selectedDate, setSelectedDate] = useState<string>(
    initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    initialData?.date ? new Date(initialData.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : ''
  );

  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0].id);
    if (!teamMemberName && team.length > 0) setTeamMemberName(team[0].name);
  }, [services, team]);

  const selectedService = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const selectedMember = useMemo(() => team.find(t => t.name === teamMemberName), [team, teamMemberName]);

  const next14Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const availableSlots = useMemo(() => {
    if (!selectedMember || !selectedDate) return [];
    if (selectedMember.unavailable_dates?.includes(selectedDate)) return [];

    const start = selectedMember.start_hour ?? 8;
    const end = selectedMember.end_hour ?? 19;
    const slots = [];
    
    for (let h = start; h < end; h++) {
      for (let m of ['00', '30']) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m}`;
        const isOccupied = existingAppointments.some(app => {
          if (app.id === initialData?.id) return false;
          const appDate = new Date(app.date).toISOString();
          return app.team_member_name === teamMemberName && appDate.includes(`${selectedDate}T${timeStr}`);
        });
        if (!isOccupied) slots.push(timeStr);
      }
    }
    return slots;
  }, [selectedMember, selectedDate, teamMemberName, existingAppointments, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !clientId) { alert("Per favore, seleziona l'ospite."); return; }
    if (!selectedTime) { alert("Scegli un orario per l'appuntamento."); return; }

    const finalDate = `${selectedDate}T${selectedTime}:00Z`;
    onSave({
      client_id: isAdmin ? clientId : undefined,
      service_id: serviceId,
      team_member_name: teamMemberName,
      date: finalDate,
      status: 'confirmed'
    });
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ospite</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 font-medium">
                <option value="">Seleziona un ospite...</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Servizio Desiderato</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 font-medium">
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — CHF {s.price}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Il tuo Professionista</label>
              <select value={teamMemberName} onChange={(e) => { setTeamMemberName(e.target.value); setSelectedTime(''); }} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 font-medium">
                {team.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Quando desideri venire a trovarci?</label>
            <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
              {next14Days.map(day => {
                const d = new Date(day);
                const isSelected = selectedDate === day;
                const isOff = selectedMember?.unavailable_dates?.includes(day);
                return (
                  <button key={day} type="button" disabled={isOff} onClick={() => { setSelectedDate(day); setSelectedTime(''); }} className={`flex-shrink-0 w-20 h-24 rounded-3xl border-2 flex flex-col items-center justify-center transition-all ${isSelected ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-100' : isOff ? 'border-gray-50 bg-gray-50 opacity-20 cursor-not-allowed' : 'border-gray-50 bg-gray-50 hover:border-amber-200'}`}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                    <span className="text-2xl font-luxury font-bold text-gray-900">{d.getDate()}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">{d.toLocaleDateString('it-IT', { month: 'short' })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Orari disponibili per {selectedMember?.name}</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {availableSlots.length > 0 ? availableSlots.map(slot => (
                <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`py-3 rounded-2xl text-xs font-bold transition-all border-2 ${selectedTime === slot ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200 scale-105' : 'bg-white border-gray-100 text-gray-600 hover:border-amber-300'}`}>
                  {slot}
                </button>
              )) : (
                <div className="col-span-full py-10 bg-gray-50 rounded-3xl text-center text-gray-400 text-xs font-medium">
                  {selectedMember?.name} non è disponibile in questa data.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-4 pt-10">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[11px] tracking-widest hover:text-gray-900 transition-colors">Annulla</button>
          <button type="submit" className="flex-1 py-5 bg-black text-white font-bold rounded-2xl shadow-2xl hover:bg-gray-900 transition-all uppercase text-[11px] tracking-widest">
            {initialData?.id ? 'Aggiorna Appuntamento' : 'Conferma Prenotazione'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;

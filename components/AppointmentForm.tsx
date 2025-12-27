
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Service, TeamMember } from '../types';

interface AppointmentFormProps {
  onSave: (app: Partial<Appointment>) => void;
  onCancel: () => void;
  initialData?: any;
  services: Service[];
  team: TeamMember[];
  existingAppointments: any[];
  isAdminOrStaff?: boolean;
  profiles?: any[];
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
  onSave, 
  onCancel, 
  initialData, 
  services, 
  team, 
  existingAppointments,
  isAdminOrStaff = false,
  profiles = [] 
}) => {
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [clientSearch, setClientSearch] = useState('');
  const [serviceId, setServiceId] = useState(initialData?.service_id || services[0]?.id || '');
  const [teamMemberName, setTeamMemberName] = useState(initialData?.team_member_name || team[0]?.name || '');
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const [selectedDate, setSelectedDate] = useState<string>(
    initialData?.date ? initialData.date.split('T')[0] : todayStr
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    initialData?.date ? new Date(initialData.date).toISOString().substring(11, 16) : ''
  );

  useEffect(() => {
    if (initialData?.team_member_name) setTeamMemberName(initialData.team_member_name);
    if (initialData?.date) {
      setSelectedDate(initialData.date.split('T')[0]);
      setSelectedTime(new Date(initialData.date).toISOString().substring(11, 16));
    }
  }, [initialData]);

  const selectedService = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const selectedMember = useMemo(() => team.find(t => t.name === teamMemberName), [team, teamMemberName]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      p.phone?.includes(clientSearch)
    ).sort((a,b) => a.full_name.localeCompare(b.full_name));
  }, [profiles, clientSearch]);

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
    if (!selectedMember || !selectedDate || !selectedService) return [];
    
    const startHour = selectedMember.work_start_time ? parseInt(selectedMember.work_start_time.split(':')[0], 10) : 8;
    const endHour = selectedMember.work_end_time ? parseInt(selectedMember.work_end_time.split(':')[0], 10) : 20;
    
    const slots = [];
    const durationMinutes = selectedService.duration;

    const isIntervalFree = (timeStr: string) => {
      const slotStart = new Date(`${selectedDate}T${timeStr}:00.000Z`);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Check current time
      if (selectedDate === todayStr && slotStart <= new Date()) return false;
      
      // Check break time
      if (selectedMember.break_start_time && selectedMember.break_end_time) {
        const bStart = new Date(`${selectedDate}T${selectedMember.break_start_time}:00.000Z`);
        const bEnd = new Date(`${selectedDate}T${selectedMember.break_end_time}:00.000Z`);
        if (slotStart < bEnd && slotEnd > bStart) return false;
      }

      // Check working hours
      const workEnd = new Date(`${selectedDate}T${selectedMember.work_end_time || '19:00'}:00.000Z`);
      if (slotEnd > workEnd) return false;

      return !existingAppointments.some(app => {
        if (app.id === initialData?.id) return false;
        if (app.team_member_name !== teamMemberName) return false;
        
        const appStart = new Date(app.date);
        const appDuration = app.services?.duration || 30;
        const appEnd = new Date(appStart.getTime() + appDuration * 60000);

        return slotStart < appEnd && slotEnd > appStart;
      });
    };

    for (let h = startHour; h <= endHour; h++) {
      for (let m of ['00', '30']) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m}`;
        if (isIntervalFree(timeStr)) slots.push(timeStr);
      }
    }
    return slots;
  }, [selectedMember, selectedDate, teamMemberName, existingAppointments, initialData, selectedService, todayStr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminOrStaff && !clientId) { alert("Per favore, selezionate un Destinatario Ritual."); return; }
    if (!selectedTime) { alert("Scegliete un orario."); return; }

    const finalDate = new Date(`${selectedDate}T${selectedTime}:00.000Z`).toISOString();
    onSave({
      client_id: isAdminOrStaff ? clientId : undefined,
      service_id: serviceId,
      team_member_name: teamMemberName,
      date: finalDate,
      status: 'confirmed'
    });
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <form onSubmit={handleSubmit} className="space-y-10">
        <header className="mb-6">
          <h3 className="text-2xl font-luxury font-bold text-gray-900">Rituale Manuale</h3>
          <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-1">Configurazione Esperienza</p>
        </header>

        <div className="space-y-8">
          {isAdminOrStaff && (
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cerca Destinatario Ritual</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cerca per nome, email o telefono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all mb-2"
                />
                <select 
                  size={5}
                  value={clientId} 
                  onChange={(e) => setClientId(e.target.value)} 
                  required
                  className="w-full p-4 rounded-3xl bg-white border border-gray-100 outline-none font-medium text-sm shadow-sm transition-all scrollbar-hide"
                >
                  <option value="" disabled>Seleziona tra i risultati...</option>
                  {filteredProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Esperienza</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all">
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — {s.duration} min</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Artista</label>
              <select value={teamMemberName} onChange={(e) => setTeamMemberName(e.target.value)} className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all">
                {team.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Calendario</label>
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
              {next14Days.map(day => {
                const d = new Date(day);
                const isSelected = selectedDate === day;
                return (
                  <button key={day} type="button" onClick={() => setSelectedDate(day)} className={`flex-shrink-0 w-20 h-24 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all duration-300 ${isSelected ? 'border-black bg-black text-white shadow-lg' : 'border-gray-50 bg-white hover:border-amber-200'}`}>
                    <span className={`text-[8px] font-bold uppercase mb-1 ${isSelected ? 'text-amber-500' : 'text-gray-400'}`}>{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                    <span className="text-2xl font-luxury font-bold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Fascia Oraria: <span className="text-gray-900">{selectedTime || 'Seleziona'}</span></label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {availableSlots.length > 0 ? availableSlots.map(slot => (
                <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`py-4 rounded-2xl text-[11px] font-bold transition-all border-2 ${selectedTime === slot ? 'bg-amber-600 text-white border-amber-600 shadow-xl' : 'bg-white border-gray-50 text-gray-500 hover:border-black hover:text-black'}`}>
                  {slot}
                </button>
              )) : (
                <div className="col-span-full py-10 bg-gray-50 rounded-[2rem] text-center border border-dashed border-gray-200">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Nessuna disponibilità.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-900 transition-colors">Annulla</button>
          <button type="submit" className="flex-[2] py-5 bg-black text-white font-bold rounded-3xl shadow-2xl hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest">
            {initialData?.id ? 'Aggiorna Ritual' : 'Conferma'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;

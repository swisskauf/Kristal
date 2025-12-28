
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
  // Garantiamo che ci sia sempre un servizio e un membro del team selezionati
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [clientSearch, setClientSearch] = useState('');
  const [serviceId, setServiceId] = useState(initialData?.service_id || services[0]?.id || '');
  const [teamMemberName, setTeamMemberName] = useState(initialData?.team_member_name || team[0]?.name || '');
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(initialData?.date ? initialData.date.split('T')[0] : todayStr);
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    if (initialData?.service_id) setServiceId(initialData.service_id);
    if (initialData?.team_member_name) setTeamMemberName(initialData.team_member_name);
    if (initialData?.date) {
      const d = new Date(initialData.date);
      setSelectedTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
  }, [initialData]);

  const selectedService = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  const selectedMember = useMemo(() => team.find(t => t.name === teamMemberName), [team, teamMemberName]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => 
      p.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
      (p.phone && p.phone.includes(clientSearch))
    ).sort((a,b) => a.full_name.localeCompare(b.full_name));
  }, [profiles, clientSearch]);

  const next21Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const availableSlots = useMemo(() => {
    if (!selectedMember || !selectedDate || !selectedService) return [];
    
    // Check Chiusura Settimanale con parsing sicuro
    const d = new Date(selectedDate + 'T12:00:00');
    const dayOfWeek = d.getDay();
    if (selectedMember.weekly_closures && selectedMember.weekly_closures.includes(dayOfWeek)) return [];

    // Check Ferie
    const isOff = selectedMember.unavailable_dates?.includes(selectedDate);
    if (isOff) return [];

    const startH = parseInt((selectedMember.work_start_time || '08:30').split(':')[0]);
    const endH = parseInt((selectedMember.work_end_time || '19:00').split(':')[0]);
    
    const slots = [];
    const duration = selectedService.duration;

    const isSlotAvailable = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const slotStart = h * 60 + m;
      const slotEnd = slotStart + duration;

      if (selectedDate === todayStr) {
        const now = new Date();
        if (slotStart <= now.getHours() * 60 + now.getMinutes() + 15) return false;
      }

      if (selectedMember.break_start_time && selectedMember.break_end_time) {
        const [bsH, bsM] = selectedMember.break_start_time.split(':').map(Number);
        const [beH, beM] = selectedMember.break_end_time.split(':').map(Number);
        const bStart = bsH * 60 + bsM;
        const bEnd = beH * 60 + beM;
        if (slotStart < bEnd && slotEnd > bStart) return false;
      }

      const [whE, wmE] = (selectedMember.work_end_time || '19:00').split(':').map(Number);
      if (slotEnd > (whE * 60 + wmE)) return false;

      const hasConflict = existingAppointments.some(app => {
        if (app.id === initialData?.id || app.status === 'cancelled') return false;
        if (app.team_member_name !== teamMemberName) return false;
        
        const appD = new Date(app.date);
        if (appD.toISOString().split('T')[0] !== selectedDate) return false;

        const appStart = appD.getHours() * 60 + appD.getMinutes();
        const appDuration = app.services?.duration || 30;
        const appEnd = appStart + appDuration;

        return slotStart < appEnd && slotEnd > appStart;
      });

      return !hasConflict;
    };

    for (let h = startH; h <= endH; h++) {
      for (let m of ['00', '30']) {
        const t = `${h.toString().padStart(2, '0')}:${m}`;
        if (isSlotAvailable(t)) slots.push(t);
      }
    }
    return slots;
  }, [selectedMember, selectedDate, teamMemberName, existingAppointments, initialData, selectedService, todayStr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) { alert("Scegli un Ritual."); return; }
    if (isAdminOrStaff && !clientId) { alert("Scegli un Ospite."); return; }
    if (!selectedTime) { alert("Scegli un orario."); return; }

    const finalDate = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
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
          <h3 className="text-2xl font-luxury font-bold text-gray-900">Configurazione Ritual</h3>
          <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-1">Prenotazione Diretta</p>
        </header>

        <div className="space-y-8">
          {isAdminOrStaff && (
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ospite</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cerca per nome o telefono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all mb-2"
                />
                <select 
                  size={4}
                  value={clientId} 
                  onChange={(e) => setClientId(e.target.value)} 
                  required
                  className="w-full p-4 rounded-3xl bg-white border border-gray-100 outline-none font-medium text-sm shadow-sm transition-all scrollbar-hide"
                >
                  <option value="" disabled>Seleziona Ospite...</option>
                  {filteredProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} — {p.phone || p.email}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ritual</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all">
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>)}
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
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Data</label>
            <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
              {next21Days.map(day => {
                const d = new Date(day + 'T12:00:00');
                const isSelected = selectedDate === day;
                const isClosed = selectedMember?.weekly_closures?.includes(d.getDay());
                return (
                  <button 
                    key={day} 
                    type="button" 
                    onClick={() => !isClosed && setSelectedDate(day)} 
                    disabled={isClosed}
                    className={`flex-shrink-0 w-16 h-20 rounded-[1.5rem] border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                      isClosed ? 'opacity-20 bg-gray-100 border-transparent cursor-not-allowed' :
                      isSelected ? 'border-black bg-black text-white shadow-lg' : 
                      'border-gray-50 bg-white hover:border-amber-200'
                    }`}
                  >
                    <span className={`text-[7px] font-bold uppercase mb-1 ${isSelected ? 'text-amber-500' : 'text-gray-400'}`}>{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                    <span className="text-xl font-luxury font-bold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Orario</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSlots.length > 0 ? availableSlots.map(slot => (
                <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`py-3 rounded-xl text-[10px] font-bold transition-all border-2 ${selectedTime === slot ? 'bg-amber-600 text-white border-amber-600 shadow-xl' : 'bg-white border-gray-50 text-gray-500 hover:border-black hover:text-black'}`}>
                  {slot}
                </button>
              )) : (
                <div className="col-span-full py-8 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Nessuna disponibilità o giorno di chiusura.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[9px] tracking-widest">Annulla</button>
          <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">
            Conferma Ritual
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;

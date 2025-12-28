
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
    initialData?.date ? new Date(initialData.date).toTimeString().substring(0, 5) : ''
  );

  useEffect(() => {
    if (initialData?.team_member_name) setTeamMemberName(initialData.team_member_name);
    if (initialData?.date) {
      const d = new Date(initialData.date);
      setSelectedDate(d.toISOString().split('T')[0]);
      setSelectedTime(d.toTimeString().substring(0, 5));
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
    for (let i = 0; i < 21; i++) { // Esteso a 21 giorni per miglior visione
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const availableSlots = useMemo(() => {
    if (!selectedMember || !selectedDate || !selectedService) return [];
    
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay();

    // 1. Controllo Chiusura Settimanale
    if (selectedMember.weekly_closures?.includes(dayOfWeek)) return [];

    // 2. Controllo Assenze specifiche (Ferie/Congedi)
    const isOff = selectedMember.unavailable_dates?.includes(selectedDate) || 
                  selectedMember.absences_json?.some(a => a.startDate === selectedDate && a.isFullDay);
    if (isOff) return [];

    const startHour = selectedMember.work_start_time ? parseInt(selectedMember.work_start_time.split(':')[0], 10) : 8;
    const endHour = selectedMember.work_end_time ? parseInt(selectedMember.work_end_time.split(':')[0], 10) : 19;
    
    const slots = [];
    const durationMinutes = selectedService.duration;

    const isIntervalFree = (timeStr: string) => {
      // Usiamo una base date per i calcoli dei minuti per evitare problemi di fuso orario nel confronto locale
      const [h, m] = timeStr.split(':').map(Number);
      const slotStartMinutes = h * 60 + m;
      const slotEndMinutes = slotStartMinutes + durationMinutes;

      // Controllo ora attuale se oggi
      if (selectedDate === todayStr) {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (slotStartMinutes <= nowMinutes + 15) return false; // Almeno 15 min di preavviso
      }
      
      // 3. Controllo Pausa Pranzo
      if (selectedMember.break_start_time && selectedMember.break_end_time) {
        const [bhS, bmS] = selectedMember.break_start_time.split(':').map(Number);
        const [bhE, bmE] = selectedMember.break_end_time.split(':').map(Number);
        const bStart = bhS * 60 + bmS;
        const bEnd = bhE * 60 + bmE;
        if (slotStartMinutes < bEnd && slotEndMinutes > bStart) return false;
      }

      // 4. Controllo Fine Orario
      const [whE, wmE] = (selectedMember.work_end_time || '19:00').split(':').map(Number);
      const workEnd = whE * 60 + wmE;
      if (slotEndMinutes > workEnd) return false;

      // 5. Controllo Collisione Appuntamenti (Esatto)
      return !existingAppointments.some(app => {
        if (app.id === initialData?.id || app.status === 'cancelled') return false;
        if (app.team_member_name !== teamMemberName) return false;
        
        const appDate = new Date(app.date);
        const appDateISO = appDate.toISOString().split('T')[0];
        if (appDateISO !== selectedDate) return false;

        const appStartMinutes = appDate.getHours() * 60 + appDate.getMinutes();
        const appDuration = app.services?.duration || 30;
        const appEndMinutes = appStartMinutes + appDuration;

        return slotStartMinutes < appEndMinutes && slotEndMinutes > appStartMinutes;
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
    if (isAdminOrStaff && !clientId) { alert("Selezionate un Ospite."); return; }
    if (!selectedTime) { alert("Scegliete un orario."); return; }

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
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cerca Ospite</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Nome, email o telefono..."
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
                    <option key={p.id} value={p.id}>{p.full_name} ({p.phone || p.email})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ritual</label>
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
            <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
              {next14Days.map(day => {
                const d = new Date(day);
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
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Orario disponibile</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSlots.length > 0 ? availableSlots.map(slot => (
                <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`py-3 rounded-xl text-[10px] font-bold transition-all border-2 ${selectedTime === slot ? 'bg-amber-600 text-white border-amber-600 shadow-xl' : 'bg-white border-gray-50 text-gray-500 hover:border-black hover:text-black'}`}>
                  {slot}
                </button>
              )) : (
                <div className="col-span-full py-8 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Nessuna disponibilità per questa data.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[9px] tracking-widest">Annulla</button>
          <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">
            {initialData?.id ? 'Aggiorna Ritual' : 'Conferma Prenotazione'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;

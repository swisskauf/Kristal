
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
  const [serviceId, setServiceId] = useState(initialData?.service_id || services[0]?.id || '');
  const [teamMemberName, setTeamMemberName] = useState(initialData?.team_member_name || team[0]?.name || '');
  
  const [selectedDate, setSelectedDate] = useState<string>(
    initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    initialData?.date ? new Date(initialData.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : ''
  );

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
    if (!selectedMember || !selectedDate || !selectedService) return [];
    if (selectedMember.unavailable_dates?.includes(selectedDate)) return [];

    const startHour = selectedMember.start_hour ?? 8;
    const endHour = selectedMember.end_hour ?? 19;
    const slots = [];
    const durationMinutes = selectedService.duration;

    // Helper per verificare se un intervallo è libero
    const isIntervalFree = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const slotStart = new Date(`${selectedDate}T${timeStr}:00`);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Fuori orario lavorativo
      if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) return false;

      return !existingAppointments.some(app => {
        if (app.id === initialData?.id) return false;
        if (app.team_member_name !== teamMemberName) return false;
        
        const appStart = new Date(app.date);
        const appDuration = app.services?.duration || 30; // Default 30 min se manca
        const appEnd = new Date(appStart.getTime() + appDuration * 60000);

        // Verifica sovrapposizione: (StartA < EndB) && (EndA > StartB)
        return slotStart < appEnd && slotEnd > appStart;
      });
    };

    for (let h = startHour; h < endHour; h++) {
      for (let m of ['00', '30']) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m}`;
        if (isIntervalFree(timeStr)) slots.push(timeStr);
      }
    }
    return slots;
  }, [selectedMember, selectedDate, teamMemberName, existingAppointments, initialData, selectedService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !clientId) { alert("Per favore, seleziona l'ospite."); return; }
    if (!selectedTime) { alert("Scegli un orario per il tuo momento Kristal."); return; }

    // Costruiamo la data in formato ISO corretto locale
    const finalDate = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
    onSave({
      client_id: isAdmin ? clientId : undefined,
      service_id: serviceId,
      team_member_name: teamMemberName,
      date: finalDate,
      status: 'confirmed'
    });
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="space-y-8">
          {isAdmin && (
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-2">Destinatario dell'Eccellenza</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-5 rounded-[2rem] bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all">
                <option value="">Seleziona un ospite...</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-2">Esperienza Desiderata</label>
              <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSelectedTime(''); }} className="w-full p-5 rounded-[2rem] bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all">
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — {s.duration} min</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-2">Il Tuo Artista</label>
              <select value={teamMemberName} onChange={(e) => { setTeamMemberName(e.target.value); setSelectedTime(''); }} className="w-full p-5 rounded-[2rem] bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all">
                {team.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-2">Scegli il tuo giorno</label>
            <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-hide">
              {next14Days.map(day => {
                const d = new Date(day);
                const isSelected = selectedDate === day;
                const isOff = selectedMember?.unavailable_dates?.includes(day);
                return (
                  <button key={day} type="button" disabled={isOff} onClick={() => { setSelectedDate(day); setSelectedTime(''); }} className={`flex-shrink-0 w-24 h-28 rounded-[2.5rem] border-2 flex flex-col items-center justify-center transition-all duration-500 ${isSelected ? 'border-amber-600 bg-amber-50 shadow-xl shadow-amber-100 scale-105' : isOff ? 'border-gray-50 bg-gray-50 opacity-20 cursor-not-allowed' : 'border-gray-50 bg-white hover:border-amber-200'}`}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-tighter">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                    <span className="text-3xl font-luxury font-bold text-gray-900">{d.getDate()}</span>
                    <span className="text-[9px] font-bold text-amber-600 uppercase mt-2 tracking-widest">{d.toLocaleDateString('it-IT', { month: 'short' })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-2">Orari Disponibili per {selectedMember?.name}</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {availableSlots.length > 0 ? availableSlots.map(slot => (
                <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`py-4 rounded-2xl text-[12px] font-bold transition-all duration-300 border-2 ${selectedTime === slot ? 'bg-black text-white border-black shadow-2xl scale-105' : 'bg-white border-gray-100 text-gray-600 hover:border-amber-500 hover:text-amber-600'}`}>
                  {slot}
                </button>
              )) : (
                <div className="col-span-full py-16 bg-gray-50 rounded-[3rem] text-center">
                  <i className="fas fa-calendar-day text-gray-200 text-4xl mb-4"></i>
                  <p className="text-gray-400 text-[11px] font-bold uppercase tracking-[0.3em] px-6">Non abbiamo disponibilità per questa combinazione. Prova un altro giorno o artista.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 pt-12 border-t border-gray-50">
          <button type="button" onClick={onCancel} className="flex-1 py-6 text-gray-400 font-bold uppercase text-[11px] tracking-[0.4em] hover:text-gray-900 transition-colors">Ripensaci</button>
          <button type="submit" className="flex-1 py-6 bg-black text-white font-bold rounded-[2rem] shadow-2xl hover:bg-amber-700 hover:scale-[1.02] transition-all uppercase text-[11px] tracking-[0.4em]">
            {initialData?.id ? 'Aggiorna Ritual' : 'Conferma ed Entra nel Mondo Kristal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;

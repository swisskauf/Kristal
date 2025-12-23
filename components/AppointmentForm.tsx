
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

  const selectedMember = useMemo(() => team.find(t => t.name === teamMemberName), [team, teamMemberName]);
  const selectedService = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);

  // Genera i prossimi 14 giorni
  const next14Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  // Genera gli slot orari disponibili per il giorno selezionato
  const availableSlots = useMemo(() => {
    if (!selectedMember || !selectedDate) return [];
    
    // Controlla se il giorno è "off"
    if (selectedMember.unavailable_dates?.includes(selectedDate)) return [];

    const start = selectedMember.start_hour ?? 8;
    const end = selectedMember.end_hour ?? 18;
    const slots = [];
    
    for (let h = start; h < end; h++) {
      for (let m of ['00', '30']) {
        const timeStr = `${h.toString().padStart(2, '0')}:${m}`;
        const fullDateStr = `${selectedDate}T${timeStr}:00`;
        
        // Controlla se lo slot è già occupato
        const isOccupied = existingAppointments.some(app => {
          if (app.id === initialData?.id) return false; // Ignora se stesso in modifica
          const appDate = new Date(app.date).toISOString();
          return app.team_member_name === teamMemberName && appDate.startsWith(`${selectedDate}T${timeStr}`);
        });

        if (!isOccupied) {
          slots.push(timeStr);
        }
      }
    }
    return slots;
  }, [selectedMember, selectedDate, teamMemberName, existingAppointments, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !clientId) { alert("Seleziona un cliente."); return; }
    if (!serviceId) { alert("Seleziona un servizio."); return; }
    if (!teamMemberName) { alert("Seleziona un professionista."); return; }
    if (!selectedTime) { alert("Seleziona un orario."); return; }

    const finalDate = new Date(`${selectedDate}T${selectedTime}:00`);
    onSave({
      clientId: isAdmin ? clientId : undefined,
      serviceId,
      teamMember: teamMemberName,
      date: finalDate.toISOString(),
      status: 'confirmed'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {isAdmin && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Assegna a Cliente</label>
            <select 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold"
            >
              <option value="">Seleziona un cliente...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Trattamento</label>
            <select 
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold"
            >
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} (CHF {s.price})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Professionista</label>
            <select 
              value={teamMemberName}
              onChange={(e) => { setTeamMemberName(e.target.value); setSelectedTime(''); }}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold"
            >
              {team.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selettore Giorno (2 settimane) */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Seleziona Giorno (Prossime 2 settimane)</label>
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {next14Days.map(day => {
              const d = new Date(day);
              const isSelected = selectedDate === day;
              const isOff = selectedMember?.unavailable_dates?.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isOff}
                  onClick={() => { setSelectedDate(day); setSelectedTime(''); }}
                  className={`flex-shrink-0 w-16 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                    isSelected ? 'border-amber-500 bg-amber-50' : isOff ? 'border-gray-100 bg-gray-50 opacity-30 cursor-not-allowed' : 'border-gray-50 bg-gray-50 hover:border-amber-200'
                  }`}
                >
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                  <span className="text-xl font-bold text-gray-900">{d.getDate()}</span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase">{d.toLocaleDateString('it-IT', { month: 'short' })}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selettore Orario */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Orari Disponibili</label>
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSlots.map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  className={`py-3 rounded-xl text-xs font-bold transition-all border-2 ${
                    selectedTime === slot ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200' : 'bg-white border-gray-50 text-gray-600 hover:border-amber-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-gray-50 rounded-2xl text-center">
              <p className="text-xs font-bold text-gray-400 uppercase">Nessuna disponibilità per questo giorno</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-3 pt-6">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all uppercase text-[10px] tracking-widest">Annulla</button>
        <button type="submit" className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black shadow-xl transition-all uppercase text-[10px] tracking-widest">
          {initialData?.id ? 'Aggiorna' : 'Conferma Prenotazione'}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;


import React, { useState, useEffect } from 'react';
import { Appointment, Service, TeamMember } from '../types';

interface AppointmentFormProps {
  onSave: (app: Partial<Appointment>) => void;
  onCancel: () => void;
  initialData?: any;
  services: Service[];
  team: TeamMember[];
  isAdmin?: boolean;
  profiles?: any[];
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ 
  onSave, 
  onCancel, 
  initialData, 
  services, 
  team, 
  isAdmin = false,
  profiles = [] 
}) => {
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [serviceId, setServiceId] = useState(initialData?.service_id || services[0]?.id || '');
  const [teamMemberName, setTeamMemberName] = useState(initialData?.team_member_name || team[0]?.name || '');
  const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.date ? new Date(initialData.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : '10:00');

  useEffect(() => {
    if (initialData?.service_id) setServiceId(initialData.service_id);
    if (initialData?.team_member_name) setTeamMemberName(initialData.team_member_name);
    if (initialData?.client_id) setClientId(initialData.client_id);
  }, [initialData, services]);

  const selectedMember = team.find(t => t.name === teamMemberName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin && !clientId) {
      alert("Seleziona un cliente.");
      return;
    }
    if (!serviceId) {
      alert("Seleziona un servizio.");
      return;
    }
    if (!teamMemberName) {
      alert("Seleziona un professionista.");
      return;
    }

    // Verifica non disponibilità
    if (selectedMember?.unavailable_dates?.includes(date)) {
      alert(`${teamMemberName} non è disponibile nella data selezionata.`);
      return;
    }
    
    const selectedDate = new Date(`${date}T${time}:00`);
    onSave({
      clientId: isAdmin ? clientId : undefined,
      serviceId,
      teamMember: teamMemberName as any,
      date: selectedDate.toISOString(),
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
                <option key={p.id} value={p.id}>{p.full_name} ({p.phone || 'No tel'})</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Trattamento</label>
          <select 
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold appearance-none"
          >
            <option value="" disabled>Scegli un servizio...</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} - CHF {s.price}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Professionista</label>
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {team.length > 0 ? (
              team.map(t => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setTeamMemberName(t.name)}
                  className={`flex-shrink-0 p-4 rounded-2xl border-2 transition-all flex flex-col items-center min-w-[110px] ${
                    teamMemberName === t.name ? 'border-amber-500 bg-amber-50' : 'border-gray-50 bg-gray-50 grayscale hover:grayscale-0'
                  }`}
                >
                  <img src={t.avatar || `https://ui-avatars.com/api/?name=${t.name}&background=fef3c7&color=d97706`} className="w-10 h-10 rounded-full mb-2 object-cover border-2 border-white shadow-sm" />
                  <span className="text-[10px] font-bold text-gray-900">{t.name}</span>
                </button>
              ))
            ) : (
              <div className="p-4 bg-gray-50 rounded-2xl w-full text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Nessun collaboratore disponibile
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Giorno</label>
            <input 
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 transition-all text-sm font-bold ${
                selectedMember?.unavailable_dates?.includes(date) ? 'ring-2 ring-red-400 text-red-500' : 'focus:ring-amber-500'
              }`}
            />
            {selectedMember?.unavailable_dates?.includes(date) && (
              <p className="text-[9px] text-red-500 font-bold mt-1 uppercase">Non disponibile oggi</p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Orario</label>
            <input 
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold"
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-6">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all uppercase text-[10px] tracking-widest"
        >
          Annulla
        </button>
        <button 
          type="submit"
          className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black shadow-xl transition-all uppercase text-[10px] tracking-widest"
        >
          {initialData?.id ? 'Aggiorna' : 'Conferma'}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;

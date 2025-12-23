
import React, { useState, useEffect } from 'react';
import { Appointment, Service } from '../types';

interface AppointmentFormProps {
  onSave: (app: Partial<Appointment>) => void;
  onCancel: () => void;
  initialData?: any;
  services: Service[];
  team: any[];
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSave, onCancel, initialData, services, team }) => {
  const [serviceId, setServiceId] = useState(initialData?.service_id || services[0]?.id || '');
  const [teamMember, setTeamMember] = useState(initialData?.team_member_name || team[0]?.name || '');
  const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.date ? new Date(initialData.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}) : '10:00');

  useEffect(() => {
    if (initialData?.service_id) setServiceId(initialData.service_id);
    if (initialData?.team_member_name) setTeamMember(initialData.team_member_name);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      alert("Seleziona un servizio per procedere.");
      return;
    }
    if (!teamMember) {
      alert("Seleziona un professionista.");
      return;
    }
    // Creiamo una data ISO corretta
    const selectedDate = new Date(`${date}T${time}:00`);
    onSave({
      serviceId,
      teamMember,
      date: selectedDate.toISOString(),
      status: 'confirmed'
    });
  };

  if (services.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-exclamation-circle text-2xl"></i>
        </div>
        <h4 className="font-bold text-gray-900 mb-2">Catalogo vuoto</h4>
        <p className="text-sm text-gray-500 mb-6">Non sono stati ancora inseriti servizi nel listino Kristal. Contatta il salone per maggiori informazioni.</p>
        <button onClick={onCancel} className="text-xs font-bold uppercase tracking-widest text-gray-400">Torna indietro</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Servizio Desiderato</label>
          <select 
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold appearance-none"
          >
            <option value="" disabled>Scegli un trattamento...</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} - €{s.price}</option>
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
                  onClick={() => setTeamMember(t.name)}
                  className={`flex-shrink-0 p-4 rounded-2xl border-2 transition-all flex flex-col items-center min-w-[110px] ${
                    teamMember === t.name ? 'border-amber-500 bg-amber-50' : 'border-gray-50 bg-gray-50 grayscale hover:grayscale-0'
                  }`}
                >
                  <img src={t.avatar || `https://ui-avatars.com/api/?name=${t.name}&background=fef3c7&color=d97706`} className="w-10 h-10 rounded-full mb-2 object-cover border-2 border-white shadow-sm" />
                  <span className="text-[10px] font-bold text-gray-900">{t.name}</span>
                </button>
              ))
            ) : (
              <div className="p-4 bg-gray-50 rounded-2xl w-full text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Nessun membro del team configurato
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Giorno</label>
            <input 
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm font-bold"
            />
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

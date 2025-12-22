
import React, { useState } from 'react';
import { Appointment, Service } from '../types';

interface AppointmentFormProps {
  onSave: (app: Partial<Appointment>) => void;
  onCancel: () => void;
  initialData?: Appointment;
  services: Service[];
  team: any[];
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSave, onCancel, initialData, services, team }) => {
  const [serviceId, setServiceId] = useState(initialData?.serviceId || services[0]?.id);
  const [teamMember, setTeamMember] = useState(initialData?.teamMember || team[0]?.name);
  const [date, setDate] = useState(initialData?.date.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialData?.date.split('T')[1]?.substring(0, 5) || '10:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      serviceId,
      teamMember,
      date: `${date}T${time}:00Z`,
      status: 'confirmed'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Servizio</label>
          <select 
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all font-semibold"
          >
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} (€{s.price})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Professionista</label>
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {team.map(t => (
              <button
                key={t.name}
                type="button"
                onClick={() => setTeamMember(t.name)}
                className={`flex-shrink-0 p-4 rounded-2xl border-2 transition-all flex flex-col items-center min-w-[100px] ${
                  teamMember === t.name ? 'border-amber-500 bg-amber-50' : 'border-gray-50 bg-gray-50 grayscale'
                }`}
              >
                <img src={t.avatar} className="w-10 h-10 rounded-full mb-2 object-cover" />
                <span className="text-[10px] font-bold text-gray-900">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Giorno</label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Orario</label>
            <input 
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold"
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-6">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all"
        >
          Annulla
        </button>
        <button 
          type="submit"
          className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black shadow-xl transition-all"
        >
          {initialData?.id ? 'Aggiorna' : 'Conferma'}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;

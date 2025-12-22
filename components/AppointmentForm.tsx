
import React, { useState } from 'react';
import { SERVICES, TEAM } from '../constants';
import { Appointment, Service, TeamMember } from '../types';

interface AppointmentFormProps {
  onSave: (app: Partial<Appointment>) => void;
  onCancel: () => void;
  initialData?: Appointment;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSave, onCancel, initialData }) => {
  const [serviceId, setServiceId] = useState(initialData?.serviceId || SERVICES[0].id);
  const [teamMember, setTeamMember] = useState<TeamMember>(initialData?.teamMember || 'Melk');
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Servizio</label>
          <select 
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {SERVICES.map(s => (
              <option key={s.id} value={s.id}>{s.name} (€{s.price})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Professionista</label>
          <select 
            value={teamMember}
            onChange={(e) => setTeamMember(e.target.value as TeamMember)}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {TEAM.map(t => (
              <option key={t.name} value={t.name}>{t.name} - {t.role}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orario</label>
          <input 
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      <div className="flex space-x-3 pt-4 border-t border-gray-50">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-100 rounded-xl transition-colors"
        >
          Annulla
        </button>
        <button 
          type="submit"
          className="flex-1 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 shadow-md shadow-amber-200 transition-all"
        >
          Prenota
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;

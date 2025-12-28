import React, { useState } from 'react';
import { Service, TeamMember, Appointment } from '../types';

interface AppointmentFormProps {
  services: Service[];
  team: TeamMember[];
  existingAppointments: Appointment[];
  onSave: (appointment: Appointment) => void;
  onCancel: () => void;
  initialData?: Appointment;
  isAdminOrStaff?: boolean;
  profiles: any[];
}

const toDateKeyLocal = (d: Date) =>
  `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate()
    .toString()
    .padStart(2, '0')}`;

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  services,
  team,
  existingAppointments,
  onSave,
  onCancel,
  initialData,
  isAdminOrStaff,
  profiles,
}) => {
  const [serviceId, setServiceId] = useState(initialData?.service_id || '');
  const [teamMemberId, setTeamMemberId] = useState(initialData?.team_member_id || '');
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [date, setDate] = useState(initialData?.date?.split('T')[0] || '');
  const [time, setTime] = useState(initialData?.date?.split('T')[1]?.substring(0, 5) || '');

  const isSlotAvailable = (timeStr: string) => {
    const dateKey = `${date}T${timeStr}`;
    return !existingAppointments.some((a) => a.date === dateKey && a.team_member_id === teamMemberId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDate = `${date}T${time}:00`;

    if (!isSlotAvailable(time)) {
      alert('Il slot selezionato non è disponibile. Si prega di scegliere un orario diverso.');
      return;
    }

    onSave({
      id: initialData?.id || undefined,
      service_id: serviceId,
      team_member_id: teamMemberId,
      client_id: clientId || undefined,
      date: finalDate,
      status: initialData?.status || 'confirmed',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full p-4 border rounded"
        >
          <option value="" disabled>
            Seleziona un Servizio
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - CHF {service.price}
            </option>
          ))}
        </select>
        <select
          required
          value={teamMemberId}
          onChange={(e) => setTeamMemberId(e.target.value)}
          className="w-full p-4 border rounded"
        >
          <option value="" disabled>
            Seleziona un membro del team
          </option>
          {team.map((member) => (
            <option key={member.profile_id} value={member.profile_id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <input
          required
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-4 border rounded"
        />
        <input
          required
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full p-4 border rounded"
        />
      </div>

      {isAdminOrStaff && (
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full p-4 border rounded"
        >
          <option value="" disabled>
            Seleziona un cliente
          </option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name}
            </option>
          ))}
        </select>
      )}

      <div className="flex justify-end gap-4">
        <button type="button" onClick={onCancel} className="px-6 py-3 bg-gray-200 rounded">
          Annulla
        </button>
        <button type="submit" className="px-6 py-3 bg-blue-500 text-white rounded">
          {initialData ? 'Aggiorna' : 'Crea'}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;

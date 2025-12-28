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

  const isSlotAvailable = (time: string) =>
    !existingAppointments.some((a) => a.date === `${date}T${time}` && a.team_member_id === teamMemberId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSlotAvailable(time)) {
      alert('Il slot non è disponibile.');
      return;
    }
    onSave({
      id: initialData?.id,
      service_id: serviceId,
      team_member_id: teamMemberId,
      client_id: clientId,
      date: `${date}T${time}:00`,
      status: 'confirmed',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <select required value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </select>
      <select required value={teamMemberId} onChange={(e) => setTeamMemberId(e.target.value)}>
        {team.map((member) => (
          <option key={member.profile_id} value={member.profile_id}>
            {member.name}
          </option>
        ))}
      </select>
      {isAdminOrStaff && (
        <select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name}
            </option>
          ))}
        </select>
      )}
      <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <button type="submit">Salva</button>
      <button type="button" onClick={onCancel}>
        Annulla
      </button>
    </form>
  );
};

export default AppointmentForm;

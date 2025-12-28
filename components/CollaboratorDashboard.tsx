import React from 'react';
import { Appointment } from '../types';

interface CollaboratorDashboardProps {
  appointments: Appointment[];
  onAddManualAppointment: (appointment: Appointment) => void;
}

const CollaboratorDashboard: React.FC<CollaboratorDashboardProps> = ({ appointments, onAddManualAppointment }) => {
  const handleAddAppointment = () => {
    const newAppointment: Appointment = {
      id: undefined,
      date: new Date().toISOString(),
      team_member_id: "example-member-id",
      client_id: "example-client-id",
      service_id: "example-service-id",
      status: "confirmed",
    };  
    onAddManualAppointment(newAppointment);
  };

  return (
    <div>
      <h1>Collaborator Dashboard</h1>
      <button onClick={handleAddAppointment}>Aggiungi Appuntamento</button>
      {/* Renders appointments */}
    </div>
  );
};

export default CollaboratorDashboard;

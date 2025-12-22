
export type TeamMember = 'Melk' | 'Romina' | 'Maurizio';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category: 'Capelli' | 'Viso' | 'Corpo' | 'Unghie';
  description: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  teamMember: TeamMember;
  date: string; // ISO string
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'client' | 'admin';
  avatar?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

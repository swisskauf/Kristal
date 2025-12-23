
import { Service, TeamMember } from './types';

export const SERVICES: Service[] = [
  { id: '1', name: 'Taglio Donna & Piega', price: 65, duration: 60, category: 'Capelli', description: 'Taglio personalizzato seguito da una piega impeccabile.' },
  { id: '2', name: 'Colore Luxury', price: 80, duration: 90, category: 'Capelli', description: 'Colorazione professionale con prodotti biologici ad alta resa.' },
  { id: '3', name: 'Trattamento Viso Gold', price: 120, duration: 45, category: 'Viso', description: 'Massaggio viso rivitalizzante con micro-particelle di oro.' },
  { id: '4', name: 'Manicure Kristal', price: 45, duration: 45, category: 'Unghie', description: 'Trattamento unghie completo con smalto semipermanente.' },
  { id: '5', name: 'Massaggio Decontratturante', price: 90, duration: 60, category: 'Corpo', description: 'Rilassamento profondo per sciogliere le tensioni muscolari.' },
  { id: '6', name: 'Balayage d\'Autore', price: 150, duration: 180, category: 'Capelli', description: 'Schiariture naturali effetto baciato dal sole.' }
];

// Fix: Typing the TEAM array as TeamMember[] to match the object structure and avoid the 'string' to 'TeamMember' assignment error on the name property.
export const TEAM: TeamMember[] = [
  { 
    name: 'Melk', 
    role: 'Creative Director', 
    bio: 'Specialista in tagli geometrici e colori d\'avanguardia.',
    avatar: 'https://picsum.photos/seed/melk/200'
  },
  { 
    name: 'Romina', 
    role: 'Senior Esthetician', 
    bio: 'Esperta in trattamenti viso avanzati e dermocosmesi.',
    avatar: 'https://picsum.photos/seed/romina/200'
  },
  { 
    name: 'Maurizio', 
    role: 'Master Stylist', 
    bio: 'Anni di esperienza nei migliori saloni europei, maestro della piega.',
    avatar: 'https://picsum.photos/seed/maurizio/200'
  }
];

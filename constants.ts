
import { Service, TeamMember } from './types';

export const SERVICES: Service[] = [
  // CAPELLI - DONNA
  { id: 'h1', name: 'Taglio Donna & Piega', price: 75, duration: 60, category: 'Capelli', description: 'Taglio stilistico personalizzato con shampoo specifico e piega finale.' },
  { id: 'h2', name: 'Piega Luxury', price: 45, duration: 45, category: 'Capelli', description: 'Shampoo curativo, massaggio cutaneo e piega glamour.' },
  { id: 'h3', name: 'Colore Radici', price: 85, duration: 90, category: 'Capelli', description: 'Ritocco colore radici con prodotti professionali ipoallergenici.' },
  { id: 'h4', name: 'Balayage d\'Autore', price: 195, duration: 180, category: 'Capelli', description: 'Schiariture naturali ad effetto "sun-kissed" con tonalizzazione inclusa.' },
  { id: 'h5', name: 'Trattamento Cheratina', price: 250, duration: 150, category: 'Capelli', description: 'Trattamento lisciante e ristrutturante profondo alla cheratina.' },
  
  // CAPELLI - UOMO
  { id: 'm1', name: 'Taglio Uomo Classic', price: 45, duration: 30, category: 'Capelli', description: 'Taglio a forbice o macchinetta con rifinitura barba inclusa.' },
  
  // ESTETICA - VISO
  { id: 'v1', name: 'Pulizia Viso Profonda', price: 110, duration: 60, category: 'Viso', description: 'Trattamento rigenerante con vaporizzazione e maschera specifica.' },
  { id: 'v2', name: 'Trattamento Anti-Age Gold', price: 160, duration: 75, category: 'Viso', description: 'Massaggio liftante con siero all\'acido ialuronico e oro 24k.' },
  
  // ESTETICA - CORPO
  { id: 'c1', name: 'Massaggio Rilassante', price: 120, duration: 60, category: 'Corpo', description: 'Massaggio total body con oli essenziali riscaldati.' },
  { id: 'c2', name: 'Drenaggio Linfatico', price: 130, duration: 60, category: 'Corpo', description: 'Trattamento manuale per favorire la circolazione e ridurre il gonfiore.' },
  
  // UNGHIE
  { id: 'u1', name: 'Manicure Semipermanente', price: 65, duration: 45, category: 'Unghie', description: 'Manicure completa con applicazione di smalto a lunga durata.' },
  { id: 'u2', name: 'Pedicure Medicale', price: 85, duration: 60, category: 'Unghie', description: 'Trattamento podologico curativo ed estetico dei piedi.' }
];

export const TEAM: TeamMember[] = [
  { 
    name: 'Melk', 
    role: 'Creative Director & Hair Stylist', 
    bio: 'Specialista in colorazioni d\'avanguardia e tagli tecnici.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&auto=format&fit=crop',
    unavailable_dates: []
  },
  { 
    name: 'Romina', 
    role: 'Master Esthetician', 
    bio: 'Esperta in dermocosmesi e trattamenti benessere avanzati.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop',
    unavailable_dates: []
  },
  { 
    name: 'Maurizio', 
    role: 'Senior Stylist', 
    bio: 'Specialista nel taglio maschile e nelle acconciature da gran galà.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop',
    unavailable_dates: []
  }
];

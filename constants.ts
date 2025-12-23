
import { Service, TeamMember } from './types';

export const SERVICES: Service[] = [
  // DONNA - TAGLIO E PIEGA
  { id: 'd1', name: 'Shampoo & Piega (S)', price: 42, duration: 45, category: 'Donna', description: 'Lavaggio con massaggio e piega per capelli corti.' },
  { id: 'd2', name: 'Shampoo & Piega (M)', price: 48, duration: 45, category: 'Donna', description: 'Lavaggio con massaggio e piega per capelli medi.' },
  { id: 'd3', name: 'Shampoo & Piega (L)', price: 55, duration: 60, category: 'Donna', description: 'Lavaggio con massaggio e piega per capelli lunghi.' },
  { id: 'd4', name: 'Taglio Donna & Piega', price: 85, duration: 75, category: 'Donna', description: 'Consulenza d\'immagine, taglio stilistico e piega.' },
  
  // UOMO
  { id: 'u1', name: 'Taglio Uomo', price: 45, duration: 30, category: 'Uomo', description: 'Taglio classico o moderno con rifinitura dettagli.' },
  { id: 'u2', name: 'Taglio & Barba', price: 65, duration: 45, category: 'Uomo', description: 'Servizio completo grooming capelli e modellatura barba.' },
  
  // COLORE E SCHIARITURE
  { id: 'c1', name: 'Colore Radici', price: 72, duration: 90, category: 'Colore', description: 'Copertura ricrescita con prodotti di alta gamma.' },
  { id: 'c2', name: 'Tonalizzazione Gloss', price: 45, duration: 45, category: 'Colore', description: 'Bagno di luce per ravvivare il riflesso e la lucentezza.' },
  { id: 'c3', name: 'Balayage / Meches (Parziale)', price: 125, duration: 150, category: 'Colore', description: 'Schiariture localizzate effetto luce naturale.' },
  { id: 'c4', name: 'Balayage Luxury (Full)', price: 195, duration: 210, category: 'Colore', description: 'Schiaritura totale ad alta definizione con tonalizzazione.' },
  
  // TRATTAMENTI CURATIVI
  { id: 't1', name: 'Trattamento Cheratina', price: 250, duration: 180, category: 'Trattamenti', description: 'Lisciante disciplinante e ristrutturante a lunga durata.' },
  { id: 't2', name: 'Botox Capillare', price: 85, duration: 60, category: 'Trattamenti', description: 'Effetto rimpolpante e anti-crespo immediato.' },
  { id: 't3', name: 'Rituale Spa Capelli', price: 35, duration: 30, category: 'Trattamenti', description: 'Maschera intensiva con massaggio cuoio capelluto.' },
  
  // ESTETICA
  { id: 'e1', name: 'Manicure Semipermanente', price: 65, duration: 45, category: 'Estetica', description: 'Cura delle unghie e smalto a lunga durata.' },
  { id: 'e2', name: 'Pedicure Medicale', price: 85, duration: 60, category: 'Estetica', description: 'Trattamento curativo ed estetico del piede.' },
  { id: 'e3', name: 'Pulizia Viso Profonda', price: 110, duration: 75, category: 'Estetica', description: 'Detersione profonda, vaporizzazione e maschera specifica.' }
];

export const TEAM: TeamMember[] = [
  { 
    name: 'Melk', 
    role: 'Creative Director', 
    bio: 'Specialista in colorazioni d\'avanguardia e tagli tecnici donna.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&auto=format&fit=crop',
    unavailable_dates: []
  },
  { 
    name: 'Romina', 
    role: 'Master Esthetician', 
    bio: 'Esperta in dermocosmesi, trattamenti viso e benessere corpo.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop',
    unavailable_dates: []
  },
  { 
    name: 'Maurizio', 
    role: 'Senior Stylist', 
    bio: 'Maestro del taglio maschile e acconciature moda.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop',
    unavailable_dates: []
  }
];

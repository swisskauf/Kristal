
import React, { useState, useMemo } from 'react';
import { Appointment, User } from '../types';
import { db } from '../services/supabase';

interface GuestManagementProps {
  profiles: any[];
  appointments: Appointment[];
  onRefresh: () => void;
  onEditGuest?: (guest: any) => void;
  onAddGuest?: () => void;
}

const GuestManagement: React.FC<GuestManagementProps> = ({ profiles, appointments, onRefresh, onEditGuest, onAddGuest }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'history' | 'technical'>('info');
  const [newNote, setNewNote] = useState({ category: 'Colore', content: '' });

  const filteredGuests = useMemo(() => {
    return profiles.filter(p => p.role === 'client' && (
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.phone && p.phone.includes(searchTerm))
    )).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [profiles, searchTerm]);

  const guestAppointments = useMemo(() => {
    if (!selectedGuest) return [];
    return appointments.filter(a => a.client_id === selectedGuest.id).sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedGuest, appointments]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedGuest) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await db.profiles.upsert({ ...selectedGuest, avatar: base64 });
        onRefresh();
        setSelectedGuest({ ...selectedGuest, avatar: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNote = async () => {
    if (!selectedGuest || !newNote.content.trim()) return;
    const technical_sheets = [...(selectedGuest.technical_sheets || []), {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      category: newNote.category,
      content: newNote.content,
      author: 'Staff Kristal'
    }];
    await db.profiles.upsert({ ...selectedGuest, technical_sheets });
    setNewNote({ category: 'Colore', content: '' });
    onRefresh();
    setSelectedGuest({ ...selectedGuest, technical_sheets });
  };

  return (
    <div className="space-y-10 animate-in fade-in">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">Archivio Ospiti</h2>
          <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Patrimonio Esperienziale Kristal</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group w-full md:w-auto">
             <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-amber-600 transition-colors"></i>
             <input 
               type="text" 
               placeholder="Ricerca ospite..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="pl-14 pr-8 py-5 bg-white border border-gray-100 rounded-[2rem] w-full md:w-80 text-xs font-bold shadow-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
             />
          </div>
          <button onClick={onAddGuest} className="w-full md:w-auto px-8 py-5 bg-black text-white rounded-[2rem] text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all">
            Nuovo Ospite
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-10">
        <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm overflow-hidden h-fit">
           <div className="max-h-[650px] overflow-y-auto scrollbar-hide">
              {filteredGuests.length > 0 ? filteredGuests.map(g => (
                <div 
                  key={g.id} 
                  onClick={() => setSelectedGuest(g)}
                  className={`p-8 flex items-center gap-6 cursor-pointer border-b border-gray-50 transition-all ${selectedGuest?.id === g.id ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                >
                  <img src={g.avatar || `https://ui-avatars.com/api/?name=${g.full_name}`} className="w-12 h-12 rounded-2xl object-cover border border-gray-100" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-sm truncate uppercase tracking-tighter">{g.full_name}</p>
                    <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${selectedGuest?.id === g.id ? 'text-amber-500' : 'text-gray-400'}`}>{g.phone || 'Nessun telefono'}</p>
                  </div>
                  <i className="fas fa-chevron-right text-[10px] opacity-20"></i>
                </div>
              )) : (
                <div className="p-20 text-center text-gray-300 italic text-[10px] uppercase tracking-widest">Nessun ospite trovato</div>
              )}
           </div>
        </div>

        <div className="min-h-[650px]">
          {selectedGuest ? (
            <div className="bg-white rounded-[4rem] border border-gray-50 shadow-sm p-12 space-y-12 animate-in slide-in-from-right-4">
               <header className="flex items-start justify-between">
                  <div className="flex items-center gap-8">
                    <div className="relative group cursor-pointer w-24 h-24">
                      <img 
                        src={selectedGuest.avatar || `https://ui-avatars.com/api/?name=${selectedGuest.full_name}`} 
                        className="w-full h-full rounded-[2.5rem] object-cover border-4 border-white shadow-xl transition-all group-hover:opacity-80" 
                      />
                      <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20 rounded-[2.5rem]">
                        <i className="fas fa-camera text-xl text-white"></i>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                    <div>
                       <h3 className="text-4xl font-luxury font-bold text-gray-900">{selectedGuest.full_name}</h3>
                       <p className="text-amber-600 text-[9px] font-bold uppercase tracking-widest mt-1">Ospite d'onore dal {new Date(selectedGuest.created_at || Date.now()).getFullYear()}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => onEditGuest?.(selectedGuest)} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-black transition-colors" title="Modifica Profilo"><i className="fas fa-edit"></i></button>
                     <a href={`tel:${selectedGuest.phone}`} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-black transition-colors"><i className="fas fa-phone-alt"></i></a>
                     <a href={`mailto:${selectedGuest.email}`} className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-black transition-colors"><i className="fas fa-envelope"></i></a>
                  </div>
               </header>

               <nav className="flex gap-10 border-b border-gray-50">
                  {['info', 'history', 'technical'].map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveSubTab(tab as any)}
                      className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === tab ? 'text-black border-b-2 border-black' : 'text-gray-300 hover:text-gray-500'}`}
                    >
                      {tab === 'info' ? 'Anagrafica' : tab === 'history' ? 'Cronologia' : 'Scheda Tecnica'}
                    </button>
                  ))}
               </nav>

               <div className="min-h-[350px]">
                  {activeSubTab === 'info' && (
                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="bg-gray-50 p-6 rounded-[2rem]">
                             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                             <p className="text-sm font-bold">{selectedGuest.email || 'Nessuna email'}</p>
                          </div>
                          <div className="bg-gray-50 p-6 rounded-[2rem]">
                             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Data Nascita</p>
                             <p className="text-sm font-bold">{selectedGuest.dob ? new Date(selectedGuest.dob).toLocaleDateString() : 'Non dichiarata'}</p>
                          </div>
                          <div className="bg-gray-50 p-6 rounded-[2rem]">
                             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Telefono</p>
                             <p className="text-sm font-bold">{selectedGuest.phone || 'Nessun numero'}</p>
                          </div>
                       </div>
                       <div className="bg-black text-white p-8 rounded-[3rem] shadow-xl flex flex-col justify-between h-full">
                          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Totale Rituali</p>
                          <h4 className="text-5xl font-luxury font-bold">{guestAppointments.length}</h4>
                          <p className="text-[8px] text-gray-400 uppercase mt-4">Esperienza Atelier Kristal</p>
                       </div>
                    </div>
                  )}

                  {activeSubTab === 'history' && (
                    <div className="space-y-4">
                       {guestAppointments.length > 0 ? guestAppointments.map(a => (
                         <div key={a.id} className="p-6 bg-gray-50 rounded-3xl flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                            <div>
                               <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">{new Date(a.date).toLocaleDateString()}</p>
                               <h5 className="font-bold text-sm text-gray-900">{a.services?.name || 'Rituale Speciale'}</h5>
                               <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{a.team_member_name}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-sm font-bold">CHF {a.services?.price || 0}</p>
                               <span className={`text-[8px] font-bold uppercase tracking-widest ${a.status === 'confirmed' ? 'text-green-600' : 'text-red-400'}`}>{a.status}</span>
                            </div>
                         </div>
                       )) : (
                         <p className="py-20 text-center text-gray-300 text-[10px] font-bold uppercase">Nessuna sessione passata</p>
                       )}
                    </div>
                  )}

                  {activeSubTab === 'technical' && (
                    <div className="space-y-10">
                       <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 space-y-6">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Nuova Annotazione Tecnica</p>
                          <div className="flex gap-4">
                             <select value={newNote.category} onChange={e => setNewNote({...newNote, category: e.target.value})} className="p-4 rounded-2xl bg-white border-none text-[10px] font-bold outline-none shadow-sm">
                                {['Colore', 'Taglio', 'Dermocosmesi', 'Allergie', 'Altro'].map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                             <textarea 
                               placeholder="Inserisci formula colore, riflessioni o note stilistiche..."
                               value={newNote.content}
                               onChange={e => setNewNote({...newNote, content: e.target.value})}
                               className="flex-1 p-5 rounded-3xl bg-white border-none text-xs font-bold outline-none shadow-sm resize-none"
                               rows={2}
                             />
                             <button onClick={handleAddNote} className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center hover:bg-amber-600 transition-colors shadow-lg"><i className="fas fa-plus"></i></button>
                          </div>
                       </div>

                       <div className="space-y-6">
                          {selectedGuest.technical_sheets?.length > 0 ? [...selectedGuest.technical_sheets].reverse().map((sheet: any) => (
                            <div key={sheet.id} className="p-8 bg-white border border-gray-50 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                               <div className="absolute top-0 right-0 px-6 py-2 bg-gray-900 text-white text-[7px] font-bold uppercase tracking-widest">{sheet.category}</div>
                               <div className="flex justify-between items-start mb-4">
                                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{new Date(sheet.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                  <p className="text-[8px] text-gray-300 font-bold uppercase">Redatto da: {sheet.author}</p>
                               </div>
                               <p className="text-xs font-medium leading-relaxed text-gray-700 italic">"{sheet.content}"</p>
                            </div>
                          )) : (
                            <div className="py-16 text-center text-gray-300 text-[9px] font-bold uppercase tracking-[0.3em] border-2 border-dashed border-gray-50 rounded-[3rem]">Nessuna scheda tecnica presente</div>
                          )}
                       </div>
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[4rem] border border-gray-50 border-dashed flex flex-col items-center justify-center p-20 text-center space-y-6">
               <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                  <i className="fas fa-address-book text-4xl"></i>
               </div>
               <div>
                  <h4 className="text-2xl font-luxury font-bold text-gray-900">Seleziona un Ospite</h4>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Per visualizzare dettagli, cronologia e formule tecniche</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestManagement;

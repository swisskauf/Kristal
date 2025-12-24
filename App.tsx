
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, TreatmentRecord, Appointment, TechnicalSheet } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingGuest, setViewingGuest] = useState<any | null>(null);

  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [selectedService, setSelectedService] = useState<Service | undefined>();
  const [teamViewMode, setTeamViewMode] = useState<'planning' | 'grid'>('planning');
  
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');
  const [clientSearch, setClientSearch] = useState('');
  
  const [newSheet, setNewSheet] = useState({ category: 'Colore', content: '' });

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  const adminStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.date?.startsWith(todayStr));
    const todayRevenue = todayAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    const totalPending = appointments.filter(a => new Date(a.date) >= now).length;
    return { todayCount: todayAppts.length, todayRevenue, totalPending };
  }, [appointments]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = await handleSessionUser(session.user);
          if (u?.role === 'collaborator') setActiveTab('collab_dashboard');
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = await handleSessionUser(session.user);
        setIsAuthOpen(false);
        if (u?.role === 'collaborator') setActiveTab('collab_dashboard');
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSessionUser = async (supabaseUser: any) => {
    try {
      let profile = await db.profiles.get(supabaseUser.id);
      if (!profile) {
        const metadata = supabaseUser.user_metadata || {};
        profile = await db.profiles.upsert({
          id: supabaseUser.id,
          full_name: metadata.full_name || metadata.name || 'Ospite Kristal',
          phone: metadata.phone || '',
          role: 'client',
          avatar: metadata.avatar_url || '',
          technical_sheets: []
        });
      }
      const mappedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: profile?.full_name || 'Utente',
        phone: profile?.phone || '',
        role: profile?.role || 'client',
        avatar: profile?.avatar || '',
        technical_sheets: profile?.technical_sheets || []
      };
      setUser(mappedUser);
      return mappedUser;
    } catch (err) {
      console.error("Errore profilo:", err);
      return null;
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const refreshData = async () => {
    try {
      const [appts, svcs, teamData] = await Promise.all([
        db.appointments.getAll(),
        db.services.getAll(),
        db.team.getAll()
      ]);
      setAppointments(appts || []);
      if(svcs?.length) setServices(svcs);
      if(teamData?.length) setTeam(teamData);
      
      if (user?.role === 'admin') {
        const profs = await db.profiles.getAll();
        setProfiles(profs || []);
      }
    } catch (err) {
      console.error("Errore refresh dati:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleUpdateRole = async (profileId: string, newRole: any) => {
    const p = profiles.find(p => p.id === profileId);
    if (!p) return;
    try {
      // Garantiamo che tutti i campi obbligatori siano presenti
      const updatedProfile = { 
        ...p, 
        role: newRole 
      };
      await db.profiles.upsert(updatedProfile);
      await refreshData();
      
      // Se stiamo visualizzando i dettagli del cliente, aggiorniamo la modale
      if (viewingGuest && viewingGuest.id === profileId) {
        setViewingGuest(updatedProfile);
      }
    } catch (e: any) {
      console.error("Errore ruolo:", e);
      alert("Impossibile aggiornare il ruolo: " + e.message);
    }
  };

  const handleAddTechnicalSheet = async () => {
    if (!viewingGuest || !newSheet.content) return;
    const sheet: TechnicalSheet = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      category: newSheet.category,
      content: newSheet.content
    };
    const updatedSheets = [sheet, ...(viewingGuest.technical_sheets || [])];
    try {
      const updatedProfile = { ...viewingGuest, technical_sheets: updatedSheets };
      await db.profiles.upsert(updatedProfile);
      setViewingGuest(updatedProfile);
      setNewSheet({ category: 'Colore', content: '' });
      refreshData();
    } catch (e) {
      alert("Errore salvataggio scheda tecnica");
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const guest = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      role: 'client',
      technical_sheets: [],
      treatment_history: []
    };
    try {
      await db.profiles.upsert(guest);
      setIsAddingGuest(false);
      await refreshData();
    } catch (e) {
      alert("Errore aggiunta nuovo ospite");
    }
  };

  const getGuestStats = (clientId: string) => {
    const now = new Date();
    const guestAppts = appointments.filter(a => a.client_id === clientId);
    
    const monthAppts = guestAppts.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const yearAppts = guestAppts.filter(a => new Date(a.date).getFullYear() === now.getFullYear());
    
    const noShows = guestAppts.filter(a => a.status === 'noshow').length;
    
    return { 
      total: guestAppts.length, 
      month: monthAppts.length, 
      year: yearAppts.length, 
      noShows 
    };
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-amber-600">Kristal</p>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {isAuthOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[900] animate-in fade-in duration-500 overflow-y-auto">
          <button onClick={() => setIsAuthOpen(false)} className="absolute top-10 right-10 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 z-10"><i className="fas fa-times"></i></button>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-20 pb-20">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-4">
              <span className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] block border-l-2 border-amber-600 pl-4">Atelier di Bellezza</span>
              <h2 className="text-6xl font-luxury font-bold text-gray-900 tracking-tight">
                {user ? `${timeGreeting}, ${user.fullName.split(' ')[0]}` : "Benvenuti in Kristal"}
              </h2>
            </div>
            {!isAdmin && !isCollaborator && (
              <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-10 py-6 rounded-3xl font-bold shadow-2xl hover:bg-amber-700 hover:scale-105 transition-all uppercase tracking-widest text-[10px]">
                Riserva un Istante
              </button>
            )}
          </header>

          <section className="space-y-12">
            <h3 className="text-3xl font-luxury font-bold text-gray-900 border-b border-gray-100 pb-8">I Nostri Ritual</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {services.filter(s => filterCategory === 'Tutti' || s.category === filterCategory).map(s => (
                <button key={s.id} onClick={() => { if(!user) setIsAuthOpen(true); else { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); } }} className="bg-white p-10 rounded-[3.5rem] border border-gray-50 flex justify-between items-center hover:shadow-xl hover:border-amber-200 transition-all group text-left">
                  <div className="flex-1 pr-6">
                    <p className="text-[9px] font-bold text-amber-600 uppercase mb-2">{s.category}</p>
                    <h4 className="font-bold text-2xl mb-2">{s.name}</h4>
                    <p className="text-xs text-gray-400 italic line-clamp-2">{s.description}</p>
                  </div>
                  <div className="text-right border-l border-gray-50 pl-6 min-w-[100px]">
                     <p className="font-luxury font-bold text-2xl">CHF {s.price}</p>
                     <p className="text-[9px] text-gray-300 font-bold uppercase mt-2">{s.duration} MIN</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'clients' && isAdmin && (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <h2 className="text-5xl font-luxury font-bold">I Nostri Ospiti</h2>
            <div className="flex gap-4">
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input type="text" placeholder="Ricerca ospite..." className="pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm min-w-[250px] shadow-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
              </div>
              <button onClick={() => setIsAddingGuest(true)} className="bg-black text-white px-8 py-4 rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl hover:bg-amber-600 transition-all">Nuovo Ospite</button>
            </div>
          </div>

          <div className="grid gap-6">
            {profiles.filter(p => p.full_name?.toLowerCase().includes(clientSearch.toLowerCase())).map(p => {
              const stats = getGuestStats(p.id);
              return (
                <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex flex-col md:flex-row items-center justify-between hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-6 flex-1">
                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}&background=f8f8f8&color=999`} className="w-20 h-20 rounded-full border-2 border-white shadow-sm object-cover" />
                    <div>
                      <div className="flex items-center gap-3">
                        <h5 className="font-bold text-2xl text-gray-900">{p.full_name}</h5>
                        <span className={`px-2 py-0.5 rounded-lg text-[7px] font-bold uppercase ${p.role === 'admin' ? 'bg-black text-white' : p.role === 'collaborator' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{p.role}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        <i className="fas fa-envelope mr-2"></i>{p.email} 
                        <span className="mx-3 text-gray-200">|</span> 
                        <i className="fas fa-phone mr-2"></i>{p.phone || 'Non fornito'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12 mt-6 md:mt-0">
                    <div className="text-center">
                       <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Mese / Anno</p>
                       <p className="text-xl font-luxury font-bold text-gray-900">{stats.month} <span className="text-gray-200 text-sm">/</span> {stats.year}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[8px] font-bold text-red-400 uppercase mb-1">No-Show</p>
                       <p className={`text-xl font-luxury font-bold ${stats.noShows > 0 ? 'text-red-500' : 'text-gray-300'}`}>{stats.noShows}</p>
                    </div>
                    <button onClick={() => setViewingGuest(p)} className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl text-[9px] font-bold uppercase tracking-widest group-hover:bg-black group-hover:text-white transition-all">CRM Dettagli</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GUEST CRM MODAL */}
      {viewingGuest && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[800] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
           <div className="w-full max-w-5xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative max-h-[90vh] flex flex-col">
              <button onClick={() => setViewingGuest(null)} className="absolute top-10 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-xl"></i></button>
              
              <div className="flex items-center gap-10 mb-12 border-b border-gray-50 pb-10">
                 <img src={viewingGuest.avatar || `https://ui-avatars.com/api/?name=${viewingGuest.full_name}`} className="w-32 h-32 rounded-full shadow-xl object-cover" />
                 <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                       <h3 className="text-4xl font-luxury font-bold text-gray-900">{viewingGuest.full_name}</h3>
                       <div className="flex items-center bg-gray-50 p-1 rounded-xl">
                          <span className="text-[7px] font-bold uppercase text-gray-400 px-2">Ruolo:</span>
                          <select 
                             value={viewingGuest.role} 
                             onChange={(e) => handleUpdateRole(viewingGuest.id, e.target.value)}
                             className="bg-white border border-gray-100 text-[9px] font-bold uppercase px-3 py-1 rounded-lg outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                             <option value="client">Ospite</option>
                             <option value="collaborator">Collaboratore</option>
                             <option value="admin">Direzione</option>
                          </select>
                       </div>
                    </div>
                    <div className="flex gap-4">
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest"><i className="fas fa-envelope mr-2"></i>{viewingGuest.email}</p>
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest"><i className="fas fa-phone mr-2"></i>{viewingGuest.phone || 'Cellulare non impostato'}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="bg-amber-50 p-6 rounded-3xl text-center border border-amber-100">
                       <p className="text-[8px] font-bold text-amber-600 uppercase mb-1">Mese Corrente</p>
                       <p className="text-2xl font-luxury font-bold text-gray-900">{getGuestStats(viewingGuest.id).month}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-3xl text-center border border-gray-100">
                       <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Totale Anno</p>
                       <p className="text-2xl font-luxury font-bold text-gray-900">{getGuestStats(viewingGuest.id).year}</p>
                    </div>
                    <div className="bg-red-50 p-6 rounded-3xl text-center border border-red-100">
                       <p className="text-[8px] font-bold text-red-600 uppercase mb-1">No-Show</p>
                       <p className="text-2xl font-luxury font-bold text-red-600">{getGuestStats(viewingGuest.id).noShows}</p>
                    </div>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-12 pr-4 scrollbar-hide">
                 <div className="space-y-8">
                    <h4 className="text-xl font-luxury font-bold border-l-4 border-amber-600 pl-4">Schede Tecniche</h4>
                    <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 space-y-4">
                       <div className="space-y-2">
                         <label className="text-[8px] font-bold uppercase text-gray-400 ml-1">Categoria</label>
                         <select value={newSheet.category} onChange={(e) => setNewSheet({...newSheet, category: e.target.value})} className="w-full p-4 rounded-2xl bg-white border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500">
                            <option>Colore</option>
                            <option>Taglio</option>
                            <option>Trattamento Viso</option>
                            <option>Nails</option>
                            <option>Dermocosmesi</option>
                         </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-bold uppercase text-gray-400 ml-1">Formulazione e Note</label>
                          <textarea 
                             placeholder="Inserisci formula colore, tempi di posa, sensibilità o note tecniche..." 
                             className="w-full p-6 rounded-3xl bg-white border border-gray-100 text-xs resize-none outline-none focus:ring-1 focus:ring-amber-500" 
                             rows={4}
                             value={newSheet.content}
                             onChange={(e) => setNewSheet({...newSheet, content: e.target.value})}
                          />
                       </div>
                       <button onClick={handleAddTechnicalSheet} className="w-full py-4 bg-black text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all">Salva Scheda Tecnica</button>
                    </div>

                    <div className="space-y-4">
                       {(viewingGuest.technical_sheets || []).length > 0 ? viewingGuest.technical_sheets.map((s: any) => (
                         <div key={s.id} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:border-amber-200 transition-all">
                            <div className="flex justify-between items-center mb-3">
                               <span className="text-[8px] font-bold text-amber-600 uppercase bg-amber-50 px-3 py-1 rounded-full">{s.category}</span>
                               <span className="text-[9px] text-gray-300 font-bold"><i className="fas fa-calendar-alt mr-2"></i>{new Date(s.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">{s.content}</p>
                         </div>
                       )) : (
                         <div className="text-center py-10 text-gray-300 uppercase text-[9px] font-bold tracking-widest">Nessuna scheda tecnica registrata.</div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-8">
                    <h4 className="text-xl font-luxury font-bold border-l-4 border-gray-900 pl-4">Storico Appuntamenti</h4>
                    <div className="space-y-4">
                       {appointments.filter(a => a.client_id === viewingGuest.id).length > 0 ? (
                         appointments.filter(a => a.client_id === viewingGuest.id)
                          .sort((a,b) => b.date.localeCompare(a.date))
                          .map(app => (
                            <div key={app.id} className="flex items-center justify-between p-6 bg-white border border-gray-50 rounded-3xl group hover:border-gray-200 transition-all">
                                <div>
                                  <p className="text-[10px] font-bold text-gray-900">{app.services?.name}</p>
                                  <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">{new Date(app.date).toLocaleDateString()} • Artist: {app.team_member_name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-[7px] font-bold uppercase px-3 py-1 rounded-full ${app.status === 'noshow' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                      {app.status === 'noshow' ? 'No-Show' : 'Eseguito'}
                                  </span>
                                  {app.status !== 'noshow' && (
                                    <button onClick={async () => {
                                        await db.appointments.upsert({...app, status: 'noshow'});
                                        refreshData();
                                    }} className="text-red-300 opacity-0 group-hover:opacity-100 transition-all text-[8px] font-bold uppercase hover:text-red-600">Segna No-Show</button>
                                  )}
                                </div>
                            </div>
                          ))
                       ) : (
                         <div className="text-center py-10 text-gray-300 uppercase text-[9px] font-bold tracking-widest">Nessun appuntamento passato.</div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ADD GUEST MODAL */}
      {isAddingGuest && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[850] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
           <div className="w-full max-w-xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
              <button onClick={() => setIsAddingGuest(false)} className="absolute top-10 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-xl"></i></button>
              <h3 className="text-3xl font-luxury font-bold mb-10 text-center">Registra Nuovo Ospite</h3>
              <form onSubmit={handleAddGuest} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Nome e Cognome</label>
                    <input name="fullName" required className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 font-bold outline-none focus:ring-2 focus:ring-amber-500" placeholder="es. Maria Rossi" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Email</label>
                       <input name="email" type="email" required className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 font-bold outline-none focus:ring-2 focus:ring-amber-500" placeholder="mail@esempio.com" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Cellulare</label>
                       <input name="phone" required className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 font-bold outline-none focus:ring-2 focus:ring-amber-500" placeholder="+41..." />
                    </div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-black text-white font-bold rounded-3xl shadow-2xl uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all">Sincronizza Ospite nel Database</button>
              </form>
           </div>
        </div>
      )}

      <AIAssistant user={user} />
    </Layout>
  );
};

export default App;

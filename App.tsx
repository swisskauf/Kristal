
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, TreatmentRecord, Appointment } from './types';
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
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingHistory, setViewingHistory] = useState<User | null>(null);

  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [selectedService, setSelectedService] = useState<Service | undefined>();
  const [teamViewMode, setTeamViewMode] = useState<'planning' | 'grid'>('planning');
  
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');
  const [clientSearch, setClientSearch] = useState('');
  const [editingTreatmentIndex, setEditingTreatmentIndex] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';

  const [newTreatment, setNewTreatment] = useState<TreatmentRecord>({ 
    date: new Date().toISOString().split('T')[0], 
    service: '', 
    notes: '' 
  });

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  // Calculation of statistics for the administrative dashboard
  const adminStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.date?.startsWith(todayStr));
    const todayRevenue = todayAppts.reduce((acc, a) => {
      // Accessing service price via nested property from join query
      const price = a.services?.price || 0;
      return acc + price;
    }, 0);
    const totalPending = appointments.filter(a => new Date(a.date) >= now).length;
    
    return {
      todayCount: todayAppts.length,
      todayRevenue,
      totalPending
    };
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
          treatment_history: []
        });
      }
      const mappedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: profile?.full_name || 'Utente',
        phone: profile?.phone || '',
        role: profile?.role || 'client',
        avatar: profile?.avatar || '',
        treatment_history: profile?.treatment_history || []
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
      db.appointments.getAll().then(data => setAppointments(data || [])).catch(e => console.warn("Appts load fail", e));
      db.services.getAll().then(data => { if(data?.length) setServices(data); }).catch(e => console.warn("Svcs load fail", e));
      db.team.getAll().then(data => { if(data?.length) setTeam(data); }).catch(e => console.warn("Team load fail", e));
      
      if (user?.role === 'admin') {
        db.profiles.getAll().then(data => setProfiles(data || [])).catch(e => console.warn("Profiles load fail", e));
      }
    } catch (err) {
      console.error("Errore generico refresh:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const collaboratorData = useMemo(() => {
    if (!isCollaborator || !user) return null;
    const member = team.find(m => m.name.toLowerCase().includes(user.fullName.toLowerCase().split(' ')[0].toLowerCase()));
    const myAppts = appointments.filter(a => a.team_member_name === member?.name);
    return { member, myAppts };
  }, [isCollaborator, user, team, appointments]);

  const handleSaveTeamMember = async (updatedMember: TeamMember) => {
    try {
      await db.team.upsert(updatedMember);
      await refreshData();
      setEditingMember(null);
      setIsAddingMember(false);
    } catch (e: any) {
      alert("Errore nel salvataggio.");
    }
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

      {/* DASHBOARD COLLABORATORE */}
      {activeTab === 'collab_dashboard' && isCollaborator && collaboratorData && (
        <div className="space-y-12 pb-20 animate-in fade-in duration-700">
           <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <span className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] block border-l-2 border-amber-600 pl-4 mb-4">Mio Pannello Artista</span>
                <h2 className="text-5xl font-luxury font-bold text-gray-900">Ciao, {user?.fullName.split(' ')[0]}</h2>
              </div>
              <div className="flex bg-gray-50 p-6 rounded-[2.5rem] gap-10">
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Turno</p>
                    <p className="text-sm font-bold">{collaboratorData.member?.work_start_time} - {collaboratorData.member?.work_end_time}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Ferie Residue</p>
                    <p className="text-sm font-bold">{(collaboratorData.member?.total_vacation_days || 0) - (collaboratorData.member?.absences_json?.filter(a => a.type === 'vacation').length || 0)} Giorni</p>
                 </div>
              </div>
           </header>

           <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 bg-white p-10 rounded-[4rem] border border-gray-50 shadow-sm">
                 <h3 className="text-2xl font-luxury font-bold mb-8">Agenda del Giorno</h3>
                 <div className="space-y-6">
                    {collaboratorData.myAppts.length > 0 ? collaboratorData.myAppts.map(app => (
                      <div key={app.id} className="flex items-center justify-between py-6 border-b border-gray-50 last:border-0 group">
                         <div className="flex items-center gap-6">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex flex-col items-center justify-center font-bold">
                               <span className="text-xs">{new Date(app.date).getHours()}:{new Date(app.date).getMinutes().toString().padStart(2, '0')}</span>
                            </div>
                            <div>
                               <p className="text-sm font-bold text-gray-900">{app.profiles?.full_name}</p>
                               <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest">{app.services?.name} • {app.services?.duration} min</p>
                            </div>
                         </div>
                         <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-check"></i></button>
                      </div>
                    )) : (
                      <div className="py-20 text-center text-gray-300 uppercase text-[10px] font-bold tracking-widest italic">Nessun rituale previsto oggi.</div>
                    )}
                 </div>
              </div>
              
              <div className="space-y-8">
                 <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-xl">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-4">Obiettivi Mensili</p>
                    <div className="space-y-6">
                       <div>
                          <div className="flex justify-between text-[10px] font-bold mb-2"><span>Produttività</span><span>75%</span></div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-[75%]"></div></div>
                       </div>
                       <div>
                          <div className="flex justify-between text-[10px] font-bold mb-2"><span>Ritenzione Clienti</span><span>92%</span></div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-[92%]"></div></div>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setActiveTab('collab_absences')} className="w-full py-6 bg-white border border-gray-100 rounded-[2.5rem] text-[10px] font-bold uppercase tracking-widest hover:border-amber-500 transition-all">Richiedi Congedo</button>
              </div>
           </div>
        </div>
      )}

      {/* DASHBOARD COLLABORATORE - CONGEDI */}
      {activeTab === 'collab_absences' && isCollaborator && collaboratorData && (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
          <h2 className="text-5xl font-luxury font-bold">Miei Congedi</h2>
          <div className="grid md:grid-cols-2 gap-10">
             <div className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm space-y-8">
                <h3 className="text-2xl font-luxury font-bold">Richiesta Ferie</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <input type="date" className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 text-sm font-bold" />
                     <input type="date" className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 text-sm font-bold" />
                  </div>
                  <select className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 text-sm font-bold">
                     <option value="vacation">Ferie</option>
                     <option value="training">Formazione</option>
                     <option value="unpaid">Congedo Non Pagato</option>
                  </select>
                  <button className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-xl">Invia Richiesta</button>
                </div>
             </div>
             <div className="space-y-4">
                <h3 className="text-xl font-luxury font-bold mb-6">Stato Richieste</h3>
                {(collaboratorData.member?.absences_json || []).map(a => (
                  <div key={a.id} className="p-6 bg-white border border-gray-50 rounded-3xl flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-bold uppercase text-amber-600 mb-1">{a.type}</p>
                        <p className="text-sm font-bold">{new Date(a.startDate).toLocaleDateString()}</p>
                     </div>
                     <span className="text-[8px] font-bold uppercase px-3 py-1 bg-green-50 text-green-600 rounded-full">Approvato</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* VISIONE ATELIER (ADMIN) */}
      {activeTab === 'admin_dashboard' && isAdmin && (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
          <h2 className="text-5xl font-luxury font-bold text-gray-900">Visione Atelier</h2>
          <div className="grid md:grid-cols-3 gap-8">
             <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-50">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Rituali Oggi</p>
                <p className="text-5xl font-luxury font-bold text-gray-900">{adminStats.todayCount}</p>
             </div>
             <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-50">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Ricavo Stimato</p>
                <p className="text-5xl font-luxury font-bold text-gray-900">CHF {adminStats.todayRevenue}</p>
             </div>
             <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-50">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">In Agenda</p>
                <p className="text-5xl font-luxury font-bold text-gray-900">{adminStats.totalPending}</p>
             </div>
          </div>
          
          <div className="bg-white p-10 rounded-[4rem] border border-gray-50">
             <h3 className="text-2xl font-luxury font-bold mb-8">Prossimi Appuntamenti</h3>
             <div className="space-y-6">
                {appointments.filter(a => new Date(a.date) >= new Date()).slice(0, 5).map(app => (
                  <div key={app.id} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{app.profiles?.full_name}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {app.services?.name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase">{app.team_member_name}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* GESTIONE TEAM (ADMIN) */}
      {activeTab === 'team_schedule' && isAdmin && (
        <div className="space-y-16 animate-in fade-in duration-500 pb-20">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h2 className="text-5xl font-luxury font-bold">Il Team</h2>
              <div className="flex gap-4">
                <button onClick={() => setIsAddingMember(true)} className="bg-black text-white px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg">Nuovo Artista</button>
                <div className="flex bg-gray-50 p-1 rounded-2xl">
                   <button onClick={() => setTeamViewMode('planning')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${teamViewMode === 'planning' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Planning</button>
                   <button onClick={() => setTeamViewMode('grid')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${teamViewMode === 'grid' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Artisti</button>
                </div>
              </div>
           </div>

           {teamViewMode === 'planning' ? (
             <TeamPlanning team={team} appointments={appointments} onToggleVacation={() => {}} />
           ) : (
             <div className="grid md:grid-cols-3 gap-8">
               {team.map(m => (
                 <div key={m.name} className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm space-y-6 text-center group hover:border-amber-200 transition-all relative">
                   <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-32 h-32 rounded-full mx-auto shadow-xl group-hover:scale-105 transition-transform object-cover" />
                   <div>
                     <h4 className="text-2xl font-luxury font-bold">{m.name}</h4>
                     <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{m.role}</p>
                   </div>
                   <button onClick={() => setEditingMember(m)} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[9px] font-bold uppercase tracking-widest group-hover:bg-black group-hover:text-white transition-all">Gestisci</button>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {/* GESTIONE SERVIZI (ADMIN) */}
      {activeTab === 'services_management' && isAdmin && (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
          <header className="flex items-center justify-between">
            <h2 className="text-5xl font-luxury font-bold text-gray-900">Catalogo Ritual</h2>
            <button onClick={() => { setSelectedService(undefined); setIsServiceFormOpen(true); }} className="bg-black text-white px-8 py-4 rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl hover:bg-amber-600 transition-all">Nuovo Servizio</button>
          </header>
          <div className="grid gap-4">
            {services.map(s => (
              <div key={s.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex items-center justify-between group hover:border-amber-200 transition-all shadow-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest px-2 py-1 bg-amber-50 rounded-lg">{s.category}</span>
                    <h4 className="font-bold text-xl text-gray-900">{s.name}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-10">
                   <p className="font-luxury font-bold text-xl text-gray-900">CHF {s.price}</p>
                   <button onClick={() => { setSelectedService(s); setIsServiceFormOpen(true); }} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-amber-600 transition-all"><i className="fas fa-edit text-xs"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLIENTI (ADMIN) */}
      {activeTab === 'clients' && isAdmin && (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
          <div className="flex items-center justify-between gap-8">
            <h2 className="text-5xl font-luxury font-bold">I Nostri Ospiti</h2>
            <input type="text" placeholder="Ricerca..." className="p-4 bg-white border border-gray-50 rounded-2xl text-sm" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
          </div>
          <div className="grid gap-6">
            {profiles.filter(p => p.full_name?.toLowerCase().includes(clientSearch.toLowerCase())).map(p => (
              <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-16 h-16 rounded-full" />
                  <div>
                    <h5 className="font-bold text-xl">{p.full_name}</h5>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </div>
                </div>
                <button onClick={() => setViewingHistory(p)} className="px-8 py-4 bg-black text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest">Dettagli</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALENDARIO */}
      {activeTab === 'calendar' && (
        <div className="space-y-12 pb-20 animate-in fade-in duration-500">
          <h2 className="text-5xl font-luxury font-bold">{isAdmin ? 'Agenda Atelier' : 'I Vostri Ritual'}</h2>
          <div className="grid gap-6">
            {(isAdmin ? appointments : appointments.filter(a => a.client_id === user?.id)).map(app => (
              <div key={app.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex items-center justify-between">
                <div className="flex gap-6 items-center">
                  <div className="bg-gray-50 p-6 rounded-2xl text-center min-w-[80px]">
                    <p className="text-2xl font-bold">{new Date(app.date).getDate()}</p>
                    <p className="text-[8px] font-bold uppercase">{new Date(app.date).toLocaleDateString('it-IT', { month: 'short' })}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{app.services?.name}</h4>
                    <p className="text-xs text-gray-400">Ore {new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • Artist: {app.team_member_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALI */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[700] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-10 right-10 text-gray-400"><i className="fas fa-times text-xl"></i></button>
            <h3 className="text-3xl font-luxury font-bold mb-10 text-center">Riserva il Tuo Momento</h3>
            <AppointmentForm onSave={() => {}} onCancel={() => setIsFormOpen(false)} services={services} team={team} existingAppointments={appointments} isAdmin={isAdmin} profiles={profiles} />
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[700] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
            <TeamManagement member={editingMember} appointments={appointments} services={services} onSave={handleSaveTeamMember} onClose={() => setEditingMember(null)} />
          </div>
        </div>
      )}

      {isAddingMember && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[700] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
             <button onClick={() => setIsAddingMember(false)} className="absolute top-10 right-10 text-gray-400"><i className="fas fa-times text-xl"></i></button>
             <h3 className="text-3xl font-luxury font-bold mb-10 text-center">Nuovo Artista</h3>
             <form onSubmit={(e) => {
               e.preventDefault();
               const formData = new FormData(e.currentTarget);
               handleSaveTeamMember({
                 name: formData.get('name') as string,
                 role: formData.get('role') as string,
                 avatar: `https://ui-avatars.com/api/?name=${formData.get('name')}&background=random`,
                 work_start_time: '08:30',
                 work_end_time: '18:30'
               });
             }} className="space-y-6">
                <input name="name" required className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 font-bold" placeholder="Nome Artista" />
                <input name="role" required className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 font-bold" placeholder="Ruolo (es. Colorist Senior)" />
                <button type="submit" className="w-full py-5 bg-black text-white font-bold rounded-3xl shadow-2xl uppercase text-[10px] tracking-widest">Aggiungi al Team</button>
             </form>
          </div>
        </div>
      )}

      <AIAssistant user={user} />
    </Layout>
  );
};

export default App;

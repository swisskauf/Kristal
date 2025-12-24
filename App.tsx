
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
  
  // Stati Modali
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingHistory, setViewingHistory] = useState<User | null>(null);

  // Stati Selezione
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [selectedService, setSelectedService] = useState<Service | undefined>();
  const [teamViewMode, setTeamViewMode] = useState<'planning' | 'grid'>('planning');
  
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');
  const [clientSearch, setClientSearch] = useState('');
  const [editingTreatmentIndex, setEditingTreatmentIndex] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await handleSessionUser(session.user);
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await handleSessionUser(session.user);
        setIsAuthOpen(false);
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
    // Caricamento resiliente: se una tabella fallisce, le altre procedono
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

  const adminStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAppts = appointments.filter(a => a.date.startsWith(today));
    const revenue = todaysAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    const pendingCount = appointments.filter(a => new Date(a.date) >= new Date()).length;
    
    return {
      todayCount: todaysAppts.length,
      todayRevenue: revenue,
      totalPending: pendingCount
    };
  }, [appointments]);

  const saveAppointment = async (appData: Partial<Appointment>) => {
    if (!user) return;
    try {
      const appointmentToSave = {
        id: selectedAppointment?.id,
        client_id: user.role === 'admin' ? (appData.client_id || selectedAppointment?.client_id) : user.id,
        service_id: appData.service_id,
        team_member_name: appData.team_member_name,
        date: appData.date,
        status: 'confirmed'
      };
      await db.appointments.upsert(appointmentToSave);
      await refreshData();
      setIsFormOpen(false);
      setSelectedAppointment(undefined);
    } catch (e) {
      console.error("Save error:", e);
      alert("Errore nel salvataggio dell'appuntamento.");
    }
  };

  const handleSaveService = async (svcData: Partial<Service>) => {
    try {
      await db.services.upsert(svcData);
      await refreshData();
      setIsServiceFormOpen(false);
      setSelectedService(undefined);
    } catch (e: any) {
      console.error("Service save error:", e);
      alert("Errore nel salvataggio del servizio.");
    }
  };

  const handleSaveTeamMember = async (updatedMember: TeamMember) => {
    try {
      await db.team.upsert(updatedMember);
      await refreshData();
      setEditingMember(null);
      setIsAddingMember(false);
    } catch (e: any) {
      console.error("Team save error detail:", e);
      alert("Errore nel salvataggio del collaboratore.");
    }
  };

  const handleToggleVacationQuickly = async (memberName: string, date: string) => {
    const member = team.find(m => m.name === memberName);
    if (!member) return;
    const currentDates = member.unavailable_dates || [];
    const updatedDates = currentDates.includes(date) 
      ? currentDates.filter(d => d !== date)
      : [...currentDates, date].sort();
    const updatedMember = { ...member, unavailable_dates: updatedDates };
    try {
      await db.team.upsert(updatedMember);
      await refreshData();
    } catch (e) { console.error(e); }
  };

  const addOrUpdateTreatment = async () => {
    if (!viewingHistory || !newTreatment.service) return;
    try {
      const currentHistory = viewingHistory.treatment_history || [];
      const updatedHistory = editingTreatmentIndex !== null 
        ? currentHistory.map((t, idx) => idx === editingTreatmentIndex ? newTreatment : t)
        : [...currentHistory, newTreatment];

      await db.profiles.upsert({ ...viewingHistory, treatment_history: updatedHistory });
      setViewingHistory({ ...viewingHistory, treatment_history: updatedHistory });
      setNewTreatment({ date: new Date().toISOString().split('T')[0], service: '', notes: '' });
      setEditingTreatmentIndex(null);
      await refreshData();
    } catch (err) { console.error(err); }
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
      
      {/* MODALE AUTH */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[900] animate-in fade-in duration-500 overflow-y-auto">
          <button onClick={() => setIsAuthOpen(false)} className="absolute top-10 right-10 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 z-10"><i className="fas fa-times"></i></button>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD CLIENTE / HOME */}
      {activeTab === 'dashboard' && (
        <div className="space-y-20 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-4">
              <span className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] block border-l-2 border-amber-600 pl-4">Atelier di Bellezza</span>
              <h2 className="text-6xl font-luxury font-bold text-gray-900 tracking-tight">
                {user ? `${timeGreeting}, ${user.fullName.split(' ')[0]}` : "Benvenuti in Kristal"}
              </h2>
            </div>
            {!isAdmin && (
              <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-10 py-6 rounded-3xl font-bold shadow-2xl hover:bg-amber-700 hover:scale-105 transition-all uppercase tracking-widest text-[10px]">
                Riserva un Istante
              </button>
            )}
          </header>

          <section className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-gray-100 pb-8">
               <h3 className="text-3xl font-luxury font-bold text-gray-900">I Nostri Ritual</h3>
               <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                 {['Tutti', 'Donna', 'Colore', 'Trattamenti', 'Uomo', 'Estetica'].map(c => (
                   <button key={c} onClick={() => setFilterCategory(c)} className={`text-[10px] font-bold uppercase tracking-widest transition-all ${filterCategory === c ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-300 hover:text-gray-600'}`}>
                     {c}
                   </button>
                 ))}
               </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {services.filter(s => filterCategory === 'Tutti' || s.category === filterCategory).map(s => (
                <button key={s.id} onClick={() => { if(!user) setIsAuthOpen(true); else { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); } }} className="bg-white p-10 rounded-[3.5rem] border border-gray-50 flex justify-between items-center hover:shadow-xl hover:border-amber-200 transition-all group text-left">
                  <div className="flex-1 pr-6">
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-2">{s.category}</p>
                    <h4 className="font-bold text-2xl text-gray-900 mb-2 group-hover:text-amber-700">{s.name}</h4>
                    <p className="text-xs text-gray-400 font-light italic leading-relaxed line-clamp-2">{s.description}</p>
                  </div>
                  <div className="text-right border-l border-gray-50 pl-6 min-w-[100px]">
                     <p className="font-luxury font-bold text-2xl text-gray-900">CHF {s.price}</p>
                     <p className="text-[9px] text-gray-300 font-bold uppercase mt-2">{s.duration} MIN</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
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
             <TeamPlanning team={team} appointments={appointments} onToggleVacation={handleToggleVacationQuickly} />
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

      {/* CLIENTI E STORICO (ADMIN) */}
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

      {/* CALENDARIO / AGENDA */}
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

      {/* MODALE APPUNTAMENTO */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[700] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
            <button onClick={() => { setIsFormOpen(false); setSelectedAppointment(undefined); }} className="absolute top-10 right-10 text-gray-400 hover:text-black transition-colors"><i className="fas fa-times text-xl"></i></button>
            <h3 className="text-3xl font-luxury font-bold mb-10 text-center">Riserva il Tuo Momento</h3>
            <AppointmentForm onSave={saveAppointment} onCancel={() => { setIsFormOpen(false); setSelectedAppointment(undefined); }} initialData={selectedAppointment} services={services} team={team} existingAppointments={appointments} isAdmin={isAdmin} profiles={profiles} />
          </div>
        </div>
      )}

      {/* MODALE SERVIZIO */}
      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[700] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
            <button onClick={() => { setIsServiceFormOpen(false); setSelectedService(undefined); }} className="absolute top-10 right-10 text-gray-400 hover:text-black transition-colors"><i className="fas fa-times text-xl"></i></button>
            <h3 className="text-3xl font-luxury font-bold mb-10 text-center">{selectedService ? 'Modifica Ritual' : 'Nuovo Ritual'}</h3>
            <ServiceForm onSave={handleSaveService} onCancel={() => { setIsServiceFormOpen(false); setSelectedService(undefined); }} initialData={selectedService} />
          </div>
        </div>
      )}

      {/* MODALE TEAM (MODIFICA) */}
      {editingMember && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[700] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-4xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
            <TeamManagement member={editingMember} appointments={appointments} services={services} onSave={handleSaveTeamMember} onClose={() => setEditingMember(null)} />
          </div>
        </div>
      )}

      {/* MODALE TEAM (AGGIUNTA) */}
      {isAddingMember && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[700] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
             <button onClick={() => setIsAddingMember(false)} className="absolute top-10 right-10 text-gray-400 hover:text-black"><i className="fas fa-times text-xl"></i></button>
             <h3 className="text-3xl font-luxury font-bold mb-10 text-center">Nuovo Artista</h3>
             <form onSubmit={(e) => {
               e.preventDefault();
               const formData = new FormData(e.currentTarget);
               handleSaveTeamMember({
                 name: formData.get('name') as string,
                 role: formData.get('role') as string,
                 bio: formData.get('bio') as string,
                 avatar: `https://ui-avatars.com/api/?name=${formData.get('name')}&background=random`,
                 unavailable_dates: [],
                 start_hour: 8,
                 end_hour: 19
               });
             }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block ml-1">Nome</label>
                  <input name="name" required className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 font-bold text-sm" placeholder="es. Stefano" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block ml-1">Ruolo</label>
                  <input name="role" required className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 font-bold text-sm" placeholder="es. Stylist Senior" />
                </div>
                <button type="submit" className="w-full py-5 bg-black text-white font-bold rounded-3xl shadow-2xl uppercase text-[10px] tracking-widest">Aggiungi al Team</button>
             </form>
          </div>
        </div>
      )}

      {/* STORICO TRATTAMENTI */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[800] flex items-center justify-center p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative">
            <button onClick={() => setViewingHistory(null)} className="absolute top-8 right-8 text-gray-400"><i className="fas fa-times text-xl"></i></button>
            <h3 className="text-3xl font-luxury font-bold mb-10 text-center">Diario di Bellezza: {viewingHistory.fullName}</h3>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl text-sm" value={newTreatment.date} onChange={e => setNewTreatment({...newTreatment, date: e.target.value})} />
                <input placeholder="Servizio..." className="w-full p-4 bg-gray-50 rounded-2xl text-sm" value={newTreatment.service} onChange={e => setNewTreatment({...newTreatment, service: e.target.value})} />
                <textarea placeholder="Note tecniche..." className="w-full p-4 bg-gray-50 rounded-2xl text-sm h-32" value={newTreatment.notes} onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})} />
                <button onClick={addOrUpdateTreatment} className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px]">Salva Nota</button>
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                {(viewingHistory.treatment_history || []).slice().reverse().map((r, i) => (
                  <div key={i} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 relative group">
                    <p className="text-[9px] font-bold text-amber-600 mb-1">{r.date}</p>
                    <p className="font-bold mb-2">{r.service}</p>
                    <p className="text-xs italic text-gray-500">"{r.notes}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AIAssistant user={user} />
    </Layout>
  );
};

export default App;

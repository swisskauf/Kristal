
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, TreatmentRecord, AppSettings, Appointment } from './types';
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
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');
  const [clientSearch, setClientSearch] = useState('');

  const [editingMember, setEditingMember] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<User | null>(null);
  const [editingTreatmentIndex, setEditingTreatmentIndex] = useState<number | null>(null);
  const [newOffDate, setNewOffDate] = useState('');

  // Fix: added missing 'isAdmin' definition
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
    try {
      const [appts, svcs, tm] = await Promise.all([
        db.appointments.getAll(),
        db.services.getAll(),
        db.team.getAll()
      ]);
      setAppointments(appts);
      if (svcs && svcs.length > 0) setServices(svcs);
      if (tm && tm.length > 0) setTeam(tm);
      if (user?.role === 'admin') {
        const prfs = await db.profiles.getAll();
        setProfiles(prfs);
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
      alert("Un piccolo imprevisto nel rituale. Ti invitiamo a riprovare.");
    }
  };

  // Fix: implemented 'addOrUpdateTreatment' to handle treatment record history saving
  const addOrUpdateTreatment = async () => {
    if (!viewingHistory || !newTreatment.service) return;

    try {
      const currentHistory = viewingHistory.treatment_history || [];
      const updatedHistory = [...currentHistory];
      
      if (editingTreatmentIndex !== null) {
        updatedHistory[editingTreatmentIndex] = newTreatment;
      } else {
        updatedHistory.push(newTreatment);
      }

      const dbProfile = {
        id: viewingHistory.id,
        full_name: viewingHistory.fullName,
        phone: viewingHistory.phone,
        role: viewingHistory.role,
        avatar: viewingHistory.avatar,
        treatment_history: updatedHistory
      };

      await db.profiles.upsert(dbProfile);
      
      setViewingHistory({
        ...viewingHistory,
        treatment_history: updatedHistory
      });
      
      setNewTreatment({ 
        date: new Date().toISOString().split('T')[0], 
        service: '', 
        notes: '' 
      });
      setEditingTreatmentIndex(null);
      await refreshData();
    } catch (err) {
      console.error("Errore salvataggio trattamento:", err);
      alert("Impossibile salvare la nota tecnica.");
    }
  };

  const nextClientAppointment = useMemo(() => {
    if (!user || user.role === 'admin') return null;
    const now = new Date();
    return appointments
      .filter(a => a.client_id === user.id && new Date(a.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [user, appointments]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAppts = appointments.filter(a => a.date.includes(today));
    const revenue = todaysAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return {
      count: todaysAppts.length,
      revenue,
      next: todaysAppts[0]
    };
  }, [appointments]);

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
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[500] animate-in fade-in duration-500">
          <button onClick={() => setIsAuthOpen(false)} className="absolute top-10 right-10 w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD CLIENTE */}
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

          {/* Sezione Prossimo Appuntamento (Solo Clienti Loggati) */}
          {nextClientAppointment && (
            <section className="bg-amber-50 p-10 rounded-[4rem] border border-amber-100 animate-in zoom-in-95 duration-700">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                  <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center shadow-md">
                    <i className="fas fa-calendar-star text-amber-600 text-2xl"></i>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Il vostro prossimo appuntamento</h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {new Date(nextClientAppointment.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} alle {new Date(nextClientAppointment.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                    <p className="text-xs text-amber-700 font-medium mt-1">Con {nextClientAppointment.team_member_name} per {nextClientAppointment.services?.name}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedAppointment(nextClientAppointment); setIsFormOpen(true); }} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">Sposta o Modifica</button>
              </div>
            </section>
          )}

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

      {/* DASHBOARD ADMIN */}
      {activeTab === 'admin_dashboard' && isAdmin && (
        <div className="space-y-16 animate-in fade-in duration-500 pb-20">
          <header>
             <h2 className="text-5xl font-luxury font-bold text-gray-900">Visione Atelier</h2>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Ospiti Oggi</p>
              <h4 className="text-6xl font-luxury font-bold text-amber-600">{stats.count}</h4>
            </div>
            <div className="bg-black p-10 rounded-[3rem] shadow-xl">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Volume Valore</p>
              <h4 className="text-5xl font-luxury font-bold text-white">CHF {stats.revenue}</h4>
            </div>
            <div className="bg-amber-50 p-10 rounded-[3rem] border border-amber-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-4">Prossimo Ospite</p>
                <h4 className="text-xl font-bold text-gray-900 truncate">{stats.next?.profiles?.full_name || "Nessuno"}</h4>
              </div>
              <button onClick={() => setActiveTab('calendar')} className="text-[9px] font-bold text-amber-600 uppercase tracking-widest hover:underline text-left mt-4">Vedi Agenda</button>
            </div>
          </div>
        </div>
      )}

      {/* Altre sezioni (Team, Clienti, Calendar) mantengono la struttura definita precedentemente */}
      {activeTab === 'team_schedule' && isAdmin && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
           <h2 className="text-5xl font-luxury font-bold">Il Team</h2>
           <div className="grid md:grid-cols-3 gap-8">
             {team.map(m => (
               <div key={m.name} className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm space-y-6 text-center">
                 <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-32 h-32 rounded-full mx-auto shadow-xl" />
                 <div>
                   <h4 className="text-2xl font-luxury font-bold">{m.name}</h4>
                   <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{m.role}</p>
                 </div>
                 <button onClick={() => setEditingMember(m)} className="text-[9px] font-bold text-gray-400 uppercase tracking-widest hover:text-black">Gestisci Turni</button>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'clients' && isAdmin && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
          <div className="flex items-center justify-between gap-8">
            <h2 className="text-5xl font-luxury font-bold">I Nostri Ospiti</h2>
            <input type="text" placeholder="Ricerca..." className="p-4 bg-white border border-gray-50 rounded-2xl text-sm" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
          </div>
          <div className="grid gap-6">
            {profiles.filter(p => p.full_name?.toLowerCase().includes(clientSearch.toLowerCase())).map(p => (
              <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex items-center justify-between group hover:border-amber-200 transition-all">
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

      {activeTab === 'calendar' && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
          <h2 className="text-5xl font-luxury font-bold">{isAdmin ? 'Agenda Atelier' : 'I Vostri Ritual'}</h2>
          <div className="grid gap-6">
            {(isAdmin ? appointments : appointments.filter(a => a.client_id === user?.id)).map(app => (
              <div key={app.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                {isAdmin && (
                  <button onClick={async () => { if(confirm('Annullare rituale?')) { await db.appointments.delete(app.id); refreshData(); }}} className="text-red-400 text-sm"><i className="fas fa-trash"></i></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[600] overflow-y-auto p-6 flex items-center justify-center animate-in fade-in duration-500">
          <div className="w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative">
            <button onClick={() => { setIsFormOpen(false); setSelectedAppointment(undefined); }} className="absolute top-10 right-10 text-gray-400 hover:text-black"><i className="fas fa-times text-xl"></i></button>
            <h3 className="text-3xl font-luxury font-bold mb-10 text-center">Riserva il Tuo Momento</h3>
            <AppointmentForm 
              onSave={saveAppointment} 
              onCancel={() => { setIsFormOpen(false); setSelectedAppointment(undefined); }} 
              initialData={selectedAppointment}
              services={services}
              team={team}
              existingAppointments={appointments}
              isAdmin={isAdmin}
              profiles={profiles}
            />
          </div>
        </div>
      )}

      <AIAssistant user={user} />

      {/* SCHEDA TECNICA MODAL (viewingHistory) */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[700] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 relative animate-in zoom-in-95">
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
                    <button 
                      onClick={() => {
                        setNewTreatment(r);
                        setEditingTreatmentIndex((viewingHistory.treatment_history || []).length - 1 - i);
                      }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-[8px] font-bold uppercase text-amber-600 transition-opacity"
                    >
                      Modifica
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

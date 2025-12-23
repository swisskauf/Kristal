
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

  const [editingService, setEditingService] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [newOffDate, setNewOffDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await handleSessionUser(session.user);
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
        await handleSessionUser(session.user);
        setIsAuthOpen(false);
      } else {
        setUser(null);
      }
      setLoading(false);
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
          full_name: metadata.full_name || metadata.name || 'Nuovo Cliente',
          phone: metadata.phone || '',
          role: metadata.role || 'client'
        });
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: profile?.full_name || 'Utente',
        phone: profile?.phone || '',
        role: profile?.role || 'client'
      });
    } catch (err) {
      console.error("Errore profilo:", err);
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
      
      // Fallback ai servizi predefiniti se il DB è vuoto
      if (svcs && svcs.length > 0) {
        setServices(svcs);
      } else {
        setServices(DEFAULT_SERVICES);
      }

      // Fallback al team predefinito se il DB è vuoto
      if (tm && tm.length > 0) {
        setTeam(tm);
      } else {
        setTeam(DEFAULT_TEAM);
      }

      if (user?.role === 'admin') {
        const prfs = await db.profiles.getAll();
        setProfiles(prfs);
        if (activeTab === 'dashboard') setActiveTab('admin_dashboard');
      }
    } catch (err) {
      console.error("Errore caricamento dati:", err);
      // In caso di errore di rete o DB, restiamo con i default
      setServices(DEFAULT_SERVICES);
      setTeam(DEFAULT_TEAM);
    }
  };

  const syncWithDefaults = async () => {
    if (!confirm("Sincronizzare il database con il listino predefinito? I servizi esistenti verranno mantenuti, quelli mancanti aggiunti.")) return;
    setIsSyncing(true);
    try {
      for (const s of DEFAULT_SERVICES) {
        await db.services.upsert(s);
      }
      for (const t of DEFAULT_TEAM) {
        await db.team.upsert(t);
      }
      alert("Database sincronizzato con successo!");
      await refreshData();
    } catch (e) {
      alert("Errore durante la sincronizzazione.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.services.upsert(editingService);
    setEditingService(null);
    refreshData();
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.team.upsert(editingMember);
    setEditingMember(null);
    refreshData();
  };

  const addOffDate = async (memberName: string) => {
    if (!newOffDate) return;
    const member = team.find(m => m.name === memberName);
    if (!member) return;

    const currentDates = member.unavailable_dates || [];
    if (!currentDates.includes(newOffDate)) {
      const updated = { ...member, unavailable_dates: [...currentDates, newOffDate] };
      await db.team.upsert(updated);
      setNewOffDate('');
      refreshData();
    }
  };

  const removeOffDate = async (memberName: string, date: string) => {
    const member = team.find(m => m.name === memberName);
    if (!member) return;

    const updated = { 
      ...member, 
      unavailable_dates: (member.unavailable_dates || []).filter(d => d !== date) 
    };
    await db.team.upsert(updated);
    refreshData();
  };

  const saveAppointment = async (appData: any) => {
    if (!user) return;
    try {
      const appointmentToSave = {
        id: selectedAppointment?.id,
        client_id: user.role === 'admin' ? (appData.clientId || selectedAppointment?.client_id) : user.id,
        service_id: appData.serviceId,
        team_member_name: appData.teamMember,
        date: appData.date,
        status: 'confirmed'
      };
      
      await db.appointments.upsert(appointmentToSave);
      await refreshData();
      setIsFormOpen(false);
      setSelectedAppointment(undefined);
    } catch (e) {
      alert("Errore durante il salvataggio.");
    }
  };

  const handleBookingClick = (svcId?: string) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setSelectedAppointment(svcId ? { service_id: svcId } : undefined);
    setIsFormOpen(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const userAppointments = user?.role === 'admin' ? appointments : appointments.filter(a => a.client_id === user?.id);
  const revenue = appointments.reduce((acc, app) => acc + (app.services?.price || 0), 0);
  const teamPerformance = team.map(member => ({
    name: member.name,
    bookings: appointments.filter(a => a.team_member_name === member.name).length
  }));

  const filteredServices = filterCategory === 'Tutti' 
    ? services 
    : services.filter(s => s.category === filterCategory);

  const categories = ['Tutti', ...Array.from(new Set(services.map(s => s.category)))];

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onLoginClick={() => setIsAuthOpen(true)}
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      
      {/* AUTH MODAL PER GUEST */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-white z-[300] overflow-y-auto">
          <div className="absolute top-6 right-6">
            <button onClick={() => setIsAuthOpen(false)} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD (SERVIZI) - VISIBILE A TUTTI */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-4xl font-luxury font-bold leading-tight">
                {user ? `Ciao, ${user.fullName.split(' ')[0]}!` : "Benvenuti da Kristal"}<br/>
                <span className="text-amber-500">Luxury Beauty Salon</span>
              </h2>
              <p className="text-gray-400 mt-2">Scopri i nostri trattamenti signature ed esclusivi.</p>
            </div>
            <button onClick={() => handleBookingClick()} className="bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all">Prenota Ora</button>
          </header>

          <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map(c => (
              <button 
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  filterCategory === c ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white border border-gray-100 text-gray-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {filteredServices.length === 0 ? (
              <div className="bg-gray-50 rounded-[3rem] p-16 text-center border border-dashed border-gray-200">
                <i className="fas fa-spa text-3xl text-gray-200 mb-4 block"></i>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nessun servizio disponibile in questa categoria</p>
              </div>
            ) : (
              filteredServices.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => handleBookingClick(s.id)}
                  className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex justify-between items-center hover:shadow-lg hover:translate-x-1 transition-all group text-left"
                >
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{s.category}</p>
                    <h4 className="font-bold text-lg group-hover:text-amber-600 transition-colors">{s.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-1 mr-4">{s.description}</p>
                  </div>
                  <div className="text-right">
                     <p className="font-bold text-xl text-gray-900">CHF {s.price}</p>
                     <p className="text-[10px] text-gray-300 font-bold uppercase">{s.duration} min</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADMIN: DASHBOARD STATS */}
      {activeTab === 'admin_dashboard' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-luxury font-bold">Pannello Kristal</h2>
              <p className="text-gray-500">Analisi gestionale.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={syncWithDefaults} 
                disabled={isSyncing}
                className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isSyncing ? "Sincronizzazione..." : "Sincronizza Listino"}
              </button>
              <button onClick={() => handleBookingClick()} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg shadow-amber-200">
                <i className="fas fa-plus mr-2"></i> Prenotazione Manuale
              </button>
            </div>
          </header>
          {/* ... (rest of admin_dashboard UI remains same) ... */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Entrate</p>
              <h3 className="text-2xl font-bold">CHF {revenue}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Appuntamenti</p>
              <h3 className="text-2xl font-bold">{appointments.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Clienti</p>
              <h3 className="text-2xl font-bold">{profiles.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Servizi</p>
              <h3 className="text-2xl font-bold">{services.length}</h3>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamPerformance}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ... (rest of the component tabs like team_schedule, services, calendar, form remain similar but with services state populated) ... */}
      
      {/* ADMIN: GESTIONE TEAM (AGENDA & DISPONIBILITA) */}
      {activeTab === 'team_schedule' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-luxury font-bold">Agenda Staff</h2>
            <button 
              onClick={() => setEditingMember({ name: '', role: '', bio: '', avatar: '', unavailable_dates: [] })}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs"
            >
              Nuovo Staff
            </button>
          </div>

          {editingMember && (
            <form onSubmit={saveMember} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nome" className="p-4 rounded-xl border-none text-sm font-bold" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
                <input placeholder="Ruolo" className="p-4 rounded-xl border-none text-sm" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} required />
              </div>
              <input placeholder="URL Avatar" className="w-full p-4 rounded-xl border-none text-sm" value={editingMember.avatar} onChange={e => setEditingMember({...editingMember, avatar: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs uppercase">Salva</button>
                <button type="button" onClick={() => setEditingMember(null)} className="bg-gray-200 px-6 py-3 rounded-xl font-bold text-xs uppercase">Annulla</button>
              </div>
            </form>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {team.map(m => (
              <div key={m.name} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-16 h-16 rounded-full border-2 border-amber-50 object-cover" />
                    <div>
                      <h4 className="font-bold text-xl">{m.name}</h4>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{m.role}</p>
                    </div>
                  </div>
                  <button onClick={async () => { if(confirm('Rimuovere collaboratore?')) { await db.team.delete(m.name); refreshData(); }}} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button>
                </div>

                <div className="border-t pt-4">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Giorni non disponibili</h5>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {m.unavailable_dates?.map(date => (
                      <span key={date} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2">
                        {new Date(date).toLocaleDateString()}
                        <button onClick={() => removeOffDate(m.name, date)}><i className="fas fa-times-circle"></i></button>
                      </span>
                    ))}
                    {(!m.unavailable_dates || m.unavailable_dates.length === 0) && <p className="text-[10px] text-gray-300 italic">Nessun giorno di chiusura impostato</p>}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[10px] font-bold"
                      value={newOffDate}
                      onChange={(e) => setNewOffDate(e.target.value)}
                    />
                    <button 
                      onClick={() => addOffDate(m.name)}
                      className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase"
                    >
                      Blocca Giorno
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: GESTIONE SERVIZI */}
      {activeTab === 'services' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-luxury font-bold">Listino Servizi</h2>
            <button 
              onClick={() => setEditingService({ name: '', price: 0, duration: 30, category: 'Capelli', description: '' })}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs"
            >
              Nuovo Servizio
            </button>
          </div>

          {editingService && (
            <form onSubmit={saveService} className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 shadow-xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nome" className="p-4 rounded-xl border-none text-sm" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} required />
                <input type="number" placeholder="Prezzo (CHF)" className="p-4 rounded-xl border-none text-sm" value={editingService.price} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Durata (min)" className="p-4 rounded-xl border-none text-sm" value={editingService.duration} onChange={e => setEditingService({...editingService, duration: Number(e.target.value)})} required />
                <select className="p-4 rounded-xl border-none text-sm font-bold" value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value})}>
                  <option>Donna</option><option>Uomo</option><option>Colore</option><option>Trattamenti</option><option>Estetica</option>
                </select>
              </div>
              <textarea placeholder="Descrizione..." className="w-full p-4 rounded-xl border-none text-sm" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-xs">Salva</button>
                <button type="button" onClick={() => setEditingService(null)} className="bg-gray-200 px-6 py-3 rounded-xl font-bold text-xs">Annulla</button>
              </div>
            </form>
          )}

          <div className="grid gap-3">
            {services.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold">{s.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{s.category} • CHF {s.price}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingService(s)} className="p-3 text-amber-600 hover:bg-amber-50 rounded-full"><i className="fas fa-edit"></i></button>
                  <button onClick={async () => { if(confirm('Eliminare?')) { await db.services.delete(s.id); refreshData(); }}} className="p-3 text-red-400 hover:bg-red-50 rounded-full"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CALENDARIO (CLIENT & ADMIN) */}
      {activeTab === 'calendar' && user && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
             <h2 className="text-3xl font-luxury font-bold">{user.role === 'admin' ? 'Tutte le Prenotazioni' : 'I miei appuntamenti'}</h2>
          </div>
          <div className="space-y-4">
            {userAppointments.length === 0 ? (
              <div className="bg-gray-50 rounded-[3rem] p-16 text-center border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nessuna prenotazione attiva</p>
              </div>
            ) : (
              userAppointments.map(app => (
                <div key={app.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{app.services?.name || 'Servizio'}</span>
                      {user.role === 'admin' && <span className="text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{app.profiles?.full_name}</span>}
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{app.team_member_name}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400">{new Date(app.date).toLocaleDateString()}</p>
                      <p className="text-2xl font-bold tracking-tighter">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedAppointment(app); setIsFormOpen(true); }} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white transition-all flex items-center justify-center">
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                      <button onClick={async () => { if(confirm('Cancellare?')) { await db.appointments.delete(app.id); refreshData(); }}} className="w-10 h-10 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALE PRENOTAZIONE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-luxury font-bold mb-8">Dettagli Appuntamento</h3>
            <AppointmentForm 
              services={services} 
              team={team} 
              onSave={saveAppointment} 
              onCancel={() => { setIsFormOpen(false); setSelectedAppointment(undefined); }} 
              initialData={selectedAppointment}
              isAdmin={user?.role === 'admin'}
              profiles={profiles}
            />
          </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;

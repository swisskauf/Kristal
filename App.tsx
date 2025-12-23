
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabase, db } from './services/supabase';
import { Appointment, Service, User } from './types';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');

  const [editingService, setEditingService] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);

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
      console.error("Errore gestione profilo:", err);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: supabaseUser.user_metadata?.full_name || 'Utente',
        phone: '',
        role: 'client'
      });
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
      if (user.role === 'admin') setActiveTab('admin_dashboard');
    }
  }, [user]);

  const refreshData = async () => {
    try {
      const [appts, svcs, tm] = await Promise.all([
        db.appointments.getAll(),
        db.services.getAll(),
        db.team.getAll()
      ]);
      setAppointments(appts);
      setServices(svcs);
      setTeam(tm);

      if (user?.role === 'admin') {
        const prfs = await db.profiles.getAll();
        setProfiles(prfs);
      }
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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

  const deleteAppointment = async (id: string) => {
    if (window.confirm('Cancellare appuntamento?')) {
      await db.appointments.delete(id);
      refreshData();
    }
  };

  const openAdminNewBooking = () => {
    setSelectedAppointment(undefined);
    setIsFormOpen(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Auth onLogin={() => {}} />;

  const userAppointments = user.role === 'admin' ? appointments : appointments.filter(a => a.client_id === user.id);
  const revenue = appointments.reduce((acc, app) => acc + (app.services?.price || 0), 0);
  const teamPerformance = team.map(member => ({
    name: member.name,
    bookings: appointments.filter(a => a.team_member_name === member.name).length
  }));

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {/* ADMIN: DASHBOARD STATS */}
      {activeTab === 'admin_dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-luxury font-bold">Pannello Kristal</h2>
              <p className="text-gray-500">Analisi gestionale.</p>
            </div>
            <button onClick={openAdminNewBooking} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg shadow-amber-200">
              <i className="fas fa-plus mr-2"></i> Prenotazione Manuale
            </button>
          </header>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Entrate</p>
              <h3 className="text-2xl font-bold">€{revenue}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Totale Appuntamenti</p>
              <h3 className="text-2xl font-bold">{appointments.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Clienti Attivi</p>
              <h3 className="text-2xl font-bold">{profiles.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Servizi Online</p>
              <h3 className="text-2xl font-bold">{services.length}</h3>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h4 className="font-bold mb-6 text-sm">Distribuzione Carico Lavoro</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                  <Tooltip cursor={{fill: '#fcfcfc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="bookings" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN: GESTIONE SERVIZI */}
      {activeTab === 'services' && (
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
            <form onSubmit={saveService} className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nome" className="p-4 rounded-xl border-none outline-none text-sm" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} required />
                <input type="number" placeholder="Prezzo (€)" className="p-4 rounded-xl border-none outline-none text-sm" value={editingService.price} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Durata (min)" className="p-4 rounded-xl border-none outline-none text-sm" value={editingService.duration} onChange={e => setEditingService({...editingService, duration: Number(e.target.value)})} required />
                <select className="p-4 rounded-xl border-none outline-none text-sm font-bold" value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value})}>
                  <option>Capelli</option><option>Viso</option><option>Corpo</option><option>Unghie</option>
                </select>
              </div>
              <textarea placeholder="Breve descrizione del trattamento..." className="w-full p-4 rounded-xl border-none outline-none text-sm" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Salva</button>
                <button type="button" onClick={() => setEditingService(null)} className="bg-gray-200 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Annulla</button>
              </div>
            </form>
          )}

          <div className="grid gap-3">
            {services.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <h4 className="font-bold text-gray-900">{s.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.category} • €{s.price} • {s.duration} min</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingService(s)} className="w-10 h-10 flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded-full transition-colors"><i className="fas fa-edit text-xs"></i></button>
                  <button onClick={async () => { if(confirm('Eliminare definitivamente questo servizio?')) { await db.services.delete(s.id); refreshData(); }}} className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-full transition-colors"><i className="fas fa-trash text-xs"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: GESTIONE TEAM */}
      {activeTab === 'team_schedule' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-luxury font-bold">Agenda Staff</h2>
            <button 
              onClick={() => setEditingMember({ name: '', role: '', bio: '', avatar: '' })}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs"
            >
              Aggiungi Membro
            </button>
          </div>

          {editingMember && (
            <form onSubmit={saveMember} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nome e Cognome" className="p-4 rounded-xl border-none outline-none text-sm" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
                <input placeholder="Ruolo (es: Senior Colorist)" className="p-4 rounded-xl border-none outline-none text-sm" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} />
              </div>
              <input placeholder="Link Foto Avatar (Opzionale)" className="w-full p-4 rounded-xl border-none outline-none text-sm" value={editingMember.avatar} onChange={e => setEditingMember({...editingMember, avatar: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Salva Professionista</button>
                <button type="button" onClick={() => setEditingMember(null)} className="bg-gray-200 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Annulla</button>
              </div>
            </form>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {team.map(m => (
              <div key={m.name} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-100 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                    {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" /> : <span className="font-bold text-amber-600">{m.name[0]}</span>}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{m.name}</h4>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">{m.role}</p>
                    <p className="text-[10px] text-amber-500 font-bold mt-1">{appointments.filter(a => a.team_member_name === m.name).length} prenotazioni</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingMember(m)} className="text-amber-600 p-2 hover:bg-amber-50 rounded-full"><i className="fas fa-edit"></i></button>
                  <button onClick={async () => { if(confirm('Eliminare il profilo?')) { await db.team.delete(m.name); refreshData(); }}} className="text-red-400 p-2 hover:bg-red-50 rounded-full"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CALENDARIO: GESTIONE AUTONOMA APPUNTAMENTI */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
             <h2 className="text-3xl font-luxury font-bold">{user.role === 'admin' ? 'Registro Appuntamenti' : 'I miei appuntamenti'}</h2>
             {user.role === 'admin' && (
               <button onClick={openAdminNewBooking} className="bg-gray-100 p-3 rounded-full hover:bg-gray-200 transition-colors">
                 <i className="fas fa-plus"></i>
               </button>
             )}
          </div>
          <div className="space-y-4">
            {userAppointments.length === 0 ? (
              <div className="bg-gray-50 rounded-[3rem] p-16 text-center border border-dashed border-gray-200">
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nessun appuntamento in archivio</p>
              </div>
            ) : (
              userAppointments.map(app => (
                <div key={app.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow relative">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{app.services?.name || 'Servizio'}</span>
                      {user.role === 'admin' && <span className="text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{app.profiles?.full_name}</span>}
                    </div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{app.team_member_name}</p>
                    {user.role === 'admin' && app.profiles?.phone && <p className="text-[10px] text-gray-400 mt-1 italic"><i className="fas fa-phone mr-1"></i> {app.profiles.phone}</p>}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-400">{new Date(app.date).toLocaleDateString('it-IT', { day:'2-digit', month:'short' })}</p>
                      <p className="text-2xl font-bold tracking-tighter">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedAppointment(app); setIsFormOpen(true); }} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white transition-all flex items-center justify-center">
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                      <button onClick={() => deleteAppointment(app.id)} className="w-10 h-10 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
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

      {/* DASHBOARD CLIENTE */}
      {activeTab === 'dashboard' && user.role === 'client' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-4xl font-luxury font-bold leading-tight">Ciao, {user.fullName.split(' ')[0]}!<br/><span className="text-amber-500">Prenota la tua bellezza.</span></h2>
            </div>
            <button onClick={() => { setSelectedAppointment(undefined); setIsFormOpen(true); }} className="bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all">Prenota Ora</button>
          </header>
          <div className="grid gap-4">
            {services.map(s => (
              <button key={s.id} onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex justify-between items-center hover:shadow-lg hover:translate-x-1 transition-all group">
                <div className="text-left">
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{s.category}</p>
                  <h4 className="font-bold text-lg group-hover:text-amber-600 transition-colors">{s.name}</h4>
                  <p className="text-xs text-gray-300 font-medium">{s.duration} min</p>
                </div>
                <div className="text-right">
                   <p className="font-bold text-xl text-gray-900">€{s.price}</p>
                </div>
              </button>
            ))}
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
              isAdmin={user.role === 'admin'}
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

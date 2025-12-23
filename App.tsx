
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');

  // Stato per editing servizi/team (Admin)
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
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Logica Servizi
  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.services.upsert(editingService);
    setEditingService(null);
    refreshData();
  };

  // Logica Team
  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.team.upsert(editingMember);
    setEditingMember(null);
    refreshData();
  };

  const saveAppointment = async (appData: Partial<Appointment>) => {
    if (!user) return;
    try {
      const appointmentToSave = {
        id: selectedAppointment?.id,
        client_id: user.id,
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
          <header>
            <h2 className="text-3xl font-luxury font-bold">Amministrazione Kristal</h2>
            <p className="text-gray-500">Panoramica del salone.</p>
          </header>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Entrate</p>
              <h3 className="text-2xl font-bold">€{revenue}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Appuntamenti</p>
              <h3 className="text-2xl font-bold">{appointments.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Clienti</p>
              <h3 className="text-2xl font-bold">{[...new Set(appointments.map(a => a.client_id))].length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Servizi</p>
              <h3 className="text-2xl font-bold">{services.length}</h3>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm h-64">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ADMIN: GESTIONE SERVIZI */}
      {activeTab === 'services' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-luxury font-bold">Gestione Servizi</h2>
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
                <input placeholder="Nome" className="p-4 rounded-xl border-none outline-none" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} required />
                <input type="number" placeholder="Prezzo (€)" className="p-4 rounded-xl border-none outline-none" value={editingService.price} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Durata (min)" className="p-4 rounded-xl border-none outline-none" value={editingService.duration} onChange={e => setEditingService({...editingService, duration: Number(e.target.value)})} required />
                <select className="p-4 rounded-xl border-none outline-none" value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value})}>
                  <option>Capelli</option><option>Viso</option><option>Corpo</option><option>Unghie</option>
                </select>
              </div>
              <textarea placeholder="Descrizione" className="w-full p-4 rounded-xl border-none outline-none" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold">Salva</button>
                <button type="button" onClick={() => setEditingService(null)} className="bg-gray-200 px-6 py-3 rounded-xl font-bold">Annulla</button>
              </div>
            </form>
          )}

          <div className="grid gap-4">
            {services.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold">{s.name}</h4>
                  <p className="text-xs text-gray-400">{s.category} • €{s.price}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingService(s)} className="p-2 text-amber-600"><i className="fas fa-edit"></i></button>
                  <button onClick={async () => { if(confirm('Eliminare?')) { await db.services.delete(s.id); refreshData(); }}} className="p-2 text-red-400"><i className="fas fa-trash"></i></button>
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
            <h2 className="text-3xl font-luxury font-bold">Gestione Team</h2>
            <button 
              onClick={() => setEditingMember({ name: '', role: '', bio: '' })}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs"
            >
              Aggiungi Membro
            </button>
          </div>

          {editingMember && (
            <form onSubmit={saveMember} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-4">
              <input placeholder="Nome" className="w-full p-4 rounded-xl border-none" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
              <input placeholder="Ruolo (es: Hair Stylist)" className="w-full p-4 rounded-xl border-none" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} />
              <div className="flex gap-2">
                <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold">Salva</button>
                <button type="button" onClick={() => setEditingMember(null)} className="bg-gray-200 px-6 py-3 rounded-xl font-bold">Annulla</button>
              </div>
            </form>
          )}

          <div className="grid gap-4">
            {team.map(m => (
              <div key={m.name} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-600">
                    {m.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold">{m.name}</h4>
                    <p className="text-xs text-gray-400">{m.role}</p>
                  </div>
                </div>
                <button onClick={async () => { if(confirm('Eliminare?')) { await db.team.delete(m.name); refreshData(); }}} className="p-2 text-red-400"><i className="fas fa-trash"></i></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CALENDARIO (CLIENT & ADMIN) */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h2 className="text-3xl font-luxury font-bold">{user.role === 'admin' ? 'Tutti gli appuntamenti' : 'I miei appuntamenti'}</h2>
          <div className="space-y-4">
            {userAppointments.map(app => (
              <div key={app.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-xl">{app.services?.name || 'Trattamento'}</h4>
                  <p className="text-xs text-amber-500 font-bold uppercase tracking-widest">{app.team_member_name}</p>
                  {user.role === 'admin' && <p className="text-[10px] text-gray-400 mt-1">Cliente: {app.profiles?.full_name}</p>}
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400">{new Date(app.date).toLocaleDateString()}</p>
                    <p className="text-2xl font-bold">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                  <button onClick={() => deleteAppointment(app.id)} className="w-12 h-12 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
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
            <button onClick={() => setIsFormOpen(true)} className="bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all">Prenota Ora</button>
          </header>
          <div className="grid gap-4">
            {services.map(s => (
              <button key={s.id} onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex justify-between items-center hover:translate-x-1 transition-all">
                <div className="text-left">
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{s.category}</p>
                  <h4 className="font-bold text-lg">{s.name}</h4>
                </div>
                <p className="font-bold text-xl">€{s.price}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 animate-in slide-in-from-bottom-10">
            <h3 className="text-2xl font-luxury font-bold mb-8">Dettagli Appuntamento</h3>
            <AppointmentForm services={services} team={team} onSave={saveAppointment} onCancel={() => setIsFormOpen(false)} initialData={selectedAppointment} />
          </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;


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
      console.log("Auth event:", event);
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
      
      // Fallback: se il profilo non esiste ancora nel DB, lo creiamo forzatamente
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
      // Fallback estremo per non bloccare l'utente
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
      setActiveTab(user.role === 'admin' ? 'admin_dashboard' : 'dashboard');
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
      alert("Errore durante il salvataggio dell'appuntamento.");
    }
  };

  const canModify = (dateStr: string) => {
    if (user?.role === 'admin') return true;
    const appDate = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return (appDate - now) > (24 * 60 * 60 * 1000);
  };

  const deleteAppointment = async (id: string, dateStr: string) => {
    if (!canModify(dateStr)) {
      alert("Siamo spiacenti, non puoi modificare o cancellare un appuntamento a meno di 24 ore dall'inizio.");
      return;
    }
    if (window.confirm('Vuoi davvero cancellare questo appuntamento?')) {
      try {
        await db.appointments.delete(id);
        await refreshData();
      } catch (e) {
        alert("Errore durante la cancellazione.");
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Auth onLogin={() => {}} />;

  const userAppointments = appointments.filter(a => a.client_id === user.id);
  const revenue = appointments.reduce((acc, app) => acc + (app.services?.price || 0), 0);

  const teamPerformance = team.map(member => ({
    name: member.name,
    bookings: appointments.filter(a => a.team_member_name === member.name).length
  }));

  const filteredServices = filterCategory === 'Tutti' 
    ? services 
    : services.filter(s => s.category === filterCategory);

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {activeTab === 'admin_dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header>
            <h2 className="text-3xl font-luxury font-bold">Amministrazione Kristal</h2>
            <p className="text-gray-500">Analisi in tempo reale.</p>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Entrate</p>
              <h3 className="text-2xl font-bold">€{revenue}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Servizi</p>
              <h3 className="text-2xl font-bold">{services.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Team</p>
              <h3 className="text-2xl font-bold">{team.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Appuntamenti</p>
              <h3 className="text-2xl font-bold">{appointments.length}</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="font-bold mb-6">Attività Staff</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                  <Bar dataKey="bookings" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && user.role === 'client' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <header>
            <h2 className="text-4xl font-luxury font-bold leading-tight text-gray-900">Ciao, {user.fullName.split(' ')[0]}!<br/><span className="text-amber-500">Prenota la tua bellezza.</span></h2>
          </header>

          <div className="grid grid-cols-1 gap-4 mt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xl tracking-tight">Trattamenti Signature</h3>
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-gray-100 px-4 py-2 rounded-xl text-[10px] font-bold text-gray-600 outline-none uppercase tracking-widest"
              >
                {['Tutti', 'Capelli', 'Viso', 'Corpo', 'Unghie'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {filteredServices.length === 0 ? (
              <p className="text-center py-10 text-gray-400">Nessun servizio disponibile al momento.</p>
            ) : (
              filteredServices.map(s => (
                <button 
                  key={s.id}
                  onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }}
                  className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between text-left hover:shadow-xl hover:translate-x-1 transition-all shadow-sm group"
                >
                  <div className="flex-1 pr-4">
                    <p className="text-[9px] font-bold text-amber-500 uppercase mb-1 tracking-widest">{s.category}</p>
                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-amber-500 transition-colors">{s.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-1">{s.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-gray-900">€{s.price}</p>
                    <p className="text-[10px] text-gray-300 font-bold">{s.duration} min</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h2 className="text-3xl font-luxury font-bold">I miei appuntamenti</h2>
          {userAppointments.length === 0 ? (
            <div className="bg-gray-50 rounded-[3rem] p-12 text-center border border-dashed border-gray-200">
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Nessuna prenotazione attiva</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userAppointments.map(app => {
                const s = services.find(sv => sv.id === app.service_id);
                const isLocked = !canModify(app.date);
                return (
                  <div key={app.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="font-bold text-xl text-gray-900">{s?.name || 'Servizio'}</h4>
                        <p className="text-xs text-amber-500 font-bold uppercase tracking-[0.2em] mt-1">{app.team_member_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-400">{new Date(app.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}</p>
                        <p className="text-3xl font-bold text-gray-900 tracking-tighter">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => { if(!isLocked) { setSelectedAppointment(app); setIsFormOpen(true); } else alert("Le modifiche sono bloccate entro le 24h."); }}
                        className={`flex-1 py-4 rounded-[1.5rem] text-xs font-bold transition-all ${isLocked ? 'bg-gray-50 text-gray-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white'}`}
                      >
                        Modifica
                      </button>
                      <button 
                        onClick={() => deleteAppointment(app.id, app.date)}
                        className={`flex-1 py-4 rounded-[1.5rem] text-xs font-bold transition-all ${isLocked ? 'bg-gray-50 text-gray-200' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                      >
                        Cancella
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center">
          <div className="bg-white w-full max-w-xl rounded-t-[4rem] md:rounded-[4rem] shadow-2xl animate-in slide-in-from-bottom-20 duration-500 p-10 md:p-14">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-luxury font-bold">Prenota Slot</h3>
              <button onClick={() => setIsFormOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <AppointmentForm 
              initialData={selectedAppointment}
              onSave={saveAppointment}
              onCancel={() => setIsFormOpen(false)}
              services={services}
              team={team}
            />
          </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;

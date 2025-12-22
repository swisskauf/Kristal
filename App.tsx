
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

  // Admin Editing States
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingMember, setEditingMember] = useState<any | null>(null);

  useEffect(() => {
    // Gestione della sessione di Supabase
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await db.profiles.get(session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          fullName: profile?.full_name || 'Utente',
          phone: profile?.phone || '',
          role: profile?.role || 'client'
        });
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await db.profiles.get(session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          fullName: profile?.full_name || 'Utente',
          phone: profile?.phone || '',
          role: profile?.role || 'client'
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    const appointmentToSave = {
      id: selectedAppointment?.id, // Supabase genera UUID se undefined
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
  };

  const canModify = (dateStr: string) => {
    if (user?.role === 'admin') return true;
    const appDate = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return (appDate - now) > (24 * 60 * 60 * 1000);
  };

  const deleteAppointment = async (id: string, dateStr: string) => {
    if (!canModify(dateStr)) {
      alert("Siamo spiacenti, non puoi modificare o cancellare un appuntamento a meno di 24 ore dall'inizio. Contatta il salone telefonicamente.");
      return;
    }
    if (window.confirm('Vuoi davvero cancellare questo appuntamento?')) {
      await db.appointments.delete(id);
      await refreshData();
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      await db.services.upsert(editingService);
      setEditingService(null);
      await refreshData();
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      await db.team.upsert(editingMember);
      setEditingMember(null);
      await refreshData();
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Auth onLogin={() => {}} />; // Supabase gestisce setUser tramite listener

  const userAppointments = appointments.filter(a => a.client_id === user.id);
  const revenue = appointments.reduce((acc, app) => {
    return acc + (app.services?.price || 0);
  }, 0);

  const teamPerformance = team.map(member => ({
    name: member.name,
    bookings: appointments.filter(a => a.team_member_name === member.name).length
  }));

  const filteredServices = filterCategory === 'Tutti' 
    ? services 
    : services.filter(s => s.category === filterCategory);

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {/* ADMIN: DASHBOARD GENERALE */}
      {activeTab === 'admin_dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header>
            <h2 className="text-3xl font-luxury font-bold">Amministrazione Kristal</h2>
            <p className="text-gray-500">Sincronizzato in tempo reale con Supabase.</p>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Entrate Stimante</p>
              <h3 className="text-2xl font-bold">€{revenue}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Listino</p>
              <h3 className="text-2xl font-bold">{services.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Collaboratori</p>
              <h3 className="text-2xl font-bold">{team.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Prenotazioni</p>
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
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.05)'}} />
                  <Bar dataKey="bookings" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN: GESTIONE LISTINO */}
      {activeTab === 'services' && user.role === 'admin' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-luxury font-bold">Servizi Database</h2>
            <button 
              onClick={() => setEditingService({ name: '', price: 0, duration: 30, category: 'Capelli', description: '' })}
              className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-black transition-all"
            >
              + Aggiungi Nuovo
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-5">Nome Servizio</th>
                  <th className="px-6 py-5">Categoria</th>
                  <th className="px-6 py-5">Prezzo</th>
                  <th className="px-6 py-5 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map(s => (
                  <tr key={s.id} className="text-sm hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-gray-800">{s.name}</td>
                    <td className="px-6 py-4"><span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{s.category}</span></td>
                    <td className="px-6 py-4 font-bold">€{s.price}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setEditingService(s)} className="text-gray-300 hover:text-amber-500 mr-4 transition-colors"><i className="fas fa-edit"></i></button>
                      <button onClick={async () => { if(confirm('Eliminare definitivamente dal database?')) { await db.services.delete(s.id); refreshData(); } }} className="text-gray-300 hover:text-red-400 transition-colors"><i className="fas fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingService && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <form onSubmit={handleSaveService} className="bg-white p-10 rounded-[3rem] w-full max-w-md animate-in zoom-in-95 duration-300">
                <h3 className="text-2xl font-luxury font-bold mb-6">Scheda Servizio</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Nome" required value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Prezzo (€)" required value={editingService.price} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} className="p-4 bg-gray-50 rounded-2xl outline-none" />
                    <input type="number" placeholder="Durata (min)" required value={editingService.duration} onChange={e => setEditingService({...editingService, duration: Number(e.target.value)})} className="p-4 bg-gray-50 rounded-2xl outline-none" />
                  </div>
                  <select value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value as any})} className="w-full p-4 bg-gray-50 rounded-2xl outline-none">
                    <option>Capelli</option><option>Viso</option><option>Corpo</option><option>Unghie</option>
                  </select>
                </div>
                <div className="flex gap-4 mt-10">
                  <button type="button" onClick={() => setEditingService(null)} className="flex-1 py-4 text-gray-400 font-bold">Annulla</button>
                  <button type="submit" className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black shadow-xl">Salva</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* AGENDA TEAM */}
      {activeTab === 'team_schedule' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <header className="flex justify-between items-center">
             <h2 className="text-2xl font-luxury font-bold">Agenda Kristal</h2>
             <button 
               onClick={() => setEditingMember({ name: '', role: '', avatar: 'https://picsum.photos/seed/new/200' })}
               className="text-xs font-bold text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl"
             >
               + Nuovo Collaboratore
             </button>
           </header>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {team.map(member => (
               <div key={member.name} className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col group">
                 <div className="bg-gray-900 p-6 text-white flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <img src={member.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 shadow-lg" />
                     <div>
                       <p className="font-bold text-sm tracking-tight">{member.name}</p>
                       <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em]">{member.role}</p>
                     </div>
                   </div>
                   <button onClick={() => setEditingMember(member)} className="text-gray-600 group-hover:text-amber-500 transition-colors"><i className="fas fa-cog"></i></button>
                 </div>
                 <div className="p-5 flex-1 space-y-3 bg-gray-50/30 min-h-[400px]">
                   {appointments
                     .filter(a => a.team_member_name === member.name)
                     .map(app => (
                       <div key={app.id} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm animate-in slide-in-from-top-2">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded uppercase">
                                {new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                         </div>
                         <p className="text-sm font-bold text-gray-900">{app.profiles?.full_name || 'Cliente'}</p>
                         <p className="text-[10px] text-gray-400 mt-0.5">{app.services?.name}</p>
                       </div>
                     ))}
                   {appointments.filter(a => a.team_member_name === member.name).length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center opacity-20">
                       <i className="fas fa-calendar-check text-4xl mb-2"></i>
                       <p className="text-[10px] uppercase font-bold">Nessun impegno</p>
                     </div>
                   )}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* CLIENTE: PRENOTAZIONE */}
      {activeTab === 'dashboard' && user.role === 'client' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <header>
            <h2 className="text-4xl font-luxury font-bold leading-tight text-gray-900">Ciao, {user.fullName.split(' ')[0]}!<br/><span className="text-amber-500">La tua bellezza, qui.</span></h2>
            <p className="text-gray-400 text-sm mt-2">Prenotazione rapida sincronizzata in cloud.</p>
          </header>

          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            <div className="min-w-[150px] bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <p className="text-[9px] font-bold text-gray-300 uppercase mb-1">Appuntamenti</p>
              <p className="text-2xl font-bold text-gray-800">{userAppointments.length}</p>
            </div>
            <div className="min-w-[150px] bg-gray-900 p-5 rounded-[2.5rem] text-white shadow-2xl">
              <p className="text-[9px] font-bold text-amber-500 uppercase mb-1">Kristal Points</p>
              <p className="text-2xl font-bold">2.400</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl tracking-tight">Trattamenti Signature</h3>
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-gray-100 px-4 py-2 rounded-xl text-[10px] font-bold text-gray-600 outline-none uppercase tracking-widest"
              >
                {['Tutti', 'Capelli', 'Viso', 'Corpo', 'Unghie'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredServices.map(s => (
                <button 
                  key={s.id}
                  onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }}
                  className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between text-left hover:shadow-xl hover:translate-x-1 transition-all active:scale-95 shadow-sm group"
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
              ))}
            </div>
          </div>
        </div>
      )}

      {/* I MIEI APPUNTAMENTI */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h2 className="text-3xl font-luxury font-bold">Agenda Personale</h2>
          <div className="space-y-4">
            {userAppointments.map(app => {
              const s = services.find(sv => sv.id === app.service_id);
              const isLocked = !canModify(app.date);
              return (
                <div key={app.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                  {isLocked && <div className="absolute top-0 right-0 bg-amber-500 px-4 py-2 rounded-bl-[2rem] text-[9px] font-bold text-white uppercase tracking-widest shadow-lg"><i className="fas fa-lock mr-2"></i> Bloccato</div>}
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
                      className={`flex-1 py-4 rounded-[1.5rem] text-xs font-bold transition-all ${isLocked ? 'bg-gray-50 text-gray-200 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white'}`}
                    >
                      Modifica
                    </button>
                    <button 
                      onClick={() => deleteAppointment(app.id, app.date)}
                      className={`flex-1 py-4 rounded-[1.5rem] text-xs font-bold transition-all ${isLocked ? 'bg-gray-50 text-gray-200 cursor-not-allowed' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                    >
                      Cancella
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODALE FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white w-full max-w-xl rounded-t-[4rem] md:rounded-[4rem] shadow-2xl animate-in slide-in-from-bottom-20 duration-500 overflow-hidden">
            <div className="p-10 md:p-14">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-luxury font-bold">
                  {selectedAppointment?.id ? 'Riprogramma' : 'Nuovo Slot'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-amber-500 hover:text-white transition-all">
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
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;

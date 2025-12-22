
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabaseMock } from './services/supabaseMock';
import { Appointment, Service, User, TeamMember } from './types';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');

  // Admin Editing States
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingMember, setEditingMember] = useState<any | null>(null);

  useEffect(() => {
    const savedUser = supabaseMock.auth.getUser();
    if (savedUser) {
      setUser(savedUser);
      setActiveTab(savedUser.role === 'admin' ? 'admin_dashboard' : 'dashboard');
    }
    refreshData();
  }, []);

  const refreshData = () => {
    setAppointments(supabaseMock.appointments.getAll());
    setServices(supabaseMock.services.getAll());
    setTeam(supabaseMock.team.getAll());
  };

  const handleLogin = (u: User) => {
    const loggedUser = supabaseMock.auth.signIn(u);
    setUser(loggedUser);
    setActiveTab(loggedUser.role === 'admin' ? 'admin_dashboard' : 'dashboard');
    refreshData();
  };

  const handleLogout = () => {
    supabaseMock.auth.signOut();
    setUser(null);
  };

  const saveAppointment = (appData: Partial<Appointment>) => {
    if (!user) return;
    const newApp: Appointment = {
      id: selectedAppointment?.id || Math.random().toString(36).substr(2, 9),
      clientId: selectedAppointment?.clientId || user.id,
      clientName: selectedAppointment?.clientName || user.fullName,
      serviceId: appData.serviceId!,
      teamMember: appData.teamMember as any,
      date: appData.date!,
      status: 'confirmed'
    };
    supabaseMock.appointments.upsert(newApp);
    refreshData();
    setIsFormOpen(false);
    setSelectedAppointment(undefined);
  };

  const canModify = (dateStr: string) => {
    if (user?.role === 'admin') return true;
    const appDate = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return (appDate - now) > (24 * 60 * 60 * 1000);
  };

  const deleteAppointment = (id: string, dateStr: string) => {
    if (!canModify(dateStr)) {
      alert("Siamo spiacenti, non puoi modificare o cancellare un appuntamento a meno di 24 ore dall'inizio. Contatta il salone telefonicamente.");
      return;
    }
    if (window.confirm('Vuoi davvero cancellare questo appuntamento?')) {
      supabaseMock.appointments.delete(id);
      refreshData();
    }
  };

  // Service & Team Management Actions
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      supabaseMock.services.upsert({
        ...editingService,
        id: editingService.id || Math.random().toString(36).substr(2, 5)
      } as Service);
      setEditingService(null);
      refreshData();
    }
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      supabaseMock.team.upsert(editingMember);
      setEditingMember(null);
      refreshData();
    }
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  const userAppointments = appointments.filter(a => a.clientId === user.id);
  const revenue = appointments.reduce((acc, app) => {
    const s = services.find(sv => sv.id === app.serviceId);
    return acc + (s?.price || 0);
  }, 0);

  const teamPerformance = team.map(member => ({
    name: member.name,
    bookings: appointments.filter(a => a.teamMember === member.name).length
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
            <h2 className="text-3xl font-luxury font-bold">Gestione Kristal</h2>
            <p className="text-gray-500">Performance e strumenti amministrativi.</p>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fatturato</p>
              <h3 className="text-2xl font-bold">€{revenue}</h3>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Servizi Attivi</p>
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
            <h3 className="font-bold mb-6">Carico di lavoro del team</h3>
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
            <h2 className="text-2xl font-luxury font-bold">Configurazione Servizi</h2>
            <button 
              onClick={() => setEditingService({ name: '', price: 0, duration: 30, category: 'Capelli', description: '' })}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-black transition-all"
            >
              + Nuovo Servizio
            </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Prezzo</th>
                  <th className="px-6 py-4">Durata</th>
                  <th className="px-6 py-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map(s => (
                  <tr key={s.id} className="text-sm hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold">{s.name}</td>
                    <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded-lg text-[10px]">{s.category}</span></td>
                    <td className="px-6 py-4">€{s.price}</td>
                    <td className="px-6 py-4 text-gray-400">{s.duration} min</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setEditingService(s)} className="text-amber-500 mr-3"><i className="fas fa-edit"></i></button>
                      <button onClick={() => { if(confirm('Eliminare?')) { supabaseMock.services.delete(s.id); refreshData(); } }} className="text-red-400"><i className="fas fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingService && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form onSubmit={handleSaveService} className="bg-white p-8 rounded-[2.5rem] w-full max-w-md animate-in zoom-in-95">
                <h3 className="text-xl font-bold mb-6">Gestione Servizio</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Nome" required value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Prezzo (€)" required value={editingService.price} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} className="p-3 bg-gray-50 rounded-xl outline-none" />
                    <input type="number" placeholder="Durata (min)" required value={editingService.duration} onChange={e => setEditingService({...editingService, duration: Number(e.target.value)})} className="p-3 bg-gray-50 rounded-xl outline-none" />
                  </div>
                  <select value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value as any})} className="w-full p-3 bg-gray-50 rounded-xl outline-none">
                    <option>Capelli</option><option>Viso</option><option>Corpo</option><option>Unghie</option>
                  </select>
                  <textarea placeholder="Descrizione" value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none h-24" />
                </div>
                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setEditingService(null)} className="flex-1 py-3 text-gray-400 font-bold">Annulla</button>
                  <button type="submit" className="flex-1 py-3 bg-gray-900 text-white rounded-2xl font-bold">Salva</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ADMIN: AGENDA MULTI-STAFF */}
      {activeTab === 'team_schedule' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <header className="flex justify-between items-center">
             <h2 className="text-2xl font-luxury font-bold">Agenda Staff</h2>
             <button 
               onClick={() => setEditingMember({ name: '', role: '', bio: '', avatar: 'https://picsum.photos/seed/new/200' })}
               className="text-xs font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl"
             >
               + Aggiungi Membro
             </button>
           </header>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {team.map(member => (
               <div key={member.name} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                 <div className="bg-gray-900 p-5 text-white flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <img src={member.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-amber-500" />
                     <div>
                       <p className="font-bold text-sm">{member.name}</p>
                       <p className="text-[10px] text-gray-400 uppercase">{member.role}</p>
                     </div>
                   </div>
                   <button onClick={() => setEditingMember(member)} className="text-gray-400 hover:text-white"><i className="fas fa-cog"></i></button>
                 </div>
                 <div className="p-4 flex-1 space-y-3 bg-gray-50/50 min-h-[300px]">
                   {appointments
                     .filter(a => a.teamMember === member.name)
                     .map(app => (
                       <div key={app.id} className="bg-white p-4 rounded-2xl border-l-4 border-amber-500 shadow-sm">
                         <p className="text-[10px] font-bold text-amber-600 mb-1">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                         <p className="text-sm font-bold text-gray-800">{app.clientName}</p>
                         <p className="text-[10px] text-gray-400">{(services.find(s => s.id === app.serviceId))?.name}</p>
                       </div>
                     ))}
                 </div>
               </div>
             ))}
           </div>

           {editingMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form onSubmit={handleSaveMember} className="bg-white p-8 rounded-[2.5rem] w-full max-w-md animate-in zoom-in-95">
                <h3 className="text-xl font-bold mb-6">Profilo Membro Team</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Nome" required value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none" />
                  <input type="text" placeholder="Ruolo" required value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none" />
                  <textarea placeholder="Bio" value={editingMember.bio} onChange={e => setEditingMember({...editingMember, bio: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none h-20" />
                </div>
                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => { if(confirm('Rimuovere dal team?')) { supabaseMock.team.delete(editingMember.name); refreshData(); setEditingMember(null); } }} className="text-red-500 text-xs font-bold">Rimuovi</button>
                  <div className="flex-1 flex gap-2">
                    <button type="button" onClick={() => setEditingMember(null)} className="flex-1 py-3 text-gray-400 font-bold">Esci</button>
                    <button type="submit" className="flex-1 py-3 bg-gray-900 text-white rounded-2xl font-bold">Salva</button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* CLIENTE: PRENOTAZIONE MOBILE-FIRST */}
      {activeTab === 'dashboard' && user.role === 'client' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <header>
            <h2 className="text-4xl font-luxury font-bold leading-tight">Ciao, {user.fullName.split(' ')[0]}!<br/><span className="text-amber-500">Prenota la tua bellezza.</span></h2>
          </header>

          {/* Quick Stats Slider */}
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            <div className="min-w-[140px] bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Appuntamenti</p>
              <p className="text-2xl font-bold">{userAppointments.length}</p>
            </div>
            <div className="min-w-[140px] bg-amber-500 p-4 rounded-3xl text-white shadow-lg">
              <p className="text-[10px] font-bold text-white/70 uppercase mb-1">Punti Gold</p>
              <p className="text-2xl font-bold">1.250</p>
            </div>
          </div>

          {/* Service Selector - Mobile Optimized */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xl">Scegli Trattamento</h3>
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-amber-600 outline-none"
              >
                {['Tutti', 'Capelli', 'Viso', 'Corpo', 'Unghie'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredServices.map(s => (
                <button 
                  key={s.id}
                  onClick={() => { setSelectedAppointment({ serviceId: s.id } as Appointment); setIsFormOpen(true); }}
                  className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between text-left hover:scale-[1.02] transition-transform active:scale-95 shadow-sm"
                >
                  <div className="flex-1 pr-4">
                    <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">{s.category}</p>
                    <h4 className="font-bold text-gray-900">{s.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-1">{s.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">€{s.price}</p>
                    <p className="text-[10px] text-gray-400">{s.duration} min</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CLIENTE/ADMIN: I MIEI APPUNTAMENTI */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h2 className="text-2xl font-luxury font-bold">I Tuoi Appuntamenti</h2>
          <div className="space-y-4">
            {userAppointments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(app => {
              const s = services.find(sv => sv.id === app.serviceId);
              const isLocked = !canModify(app.date);
              return (
                <div key={app.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                  {isLocked && <div className="absolute top-0 right-0 bg-gray-100 px-3 py-1 rounded-bl-xl text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-lock mr-1"></i> Bloccato</div>}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{s?.name || 'Trattamento'}</h4>
                      <p className="text-xs text-amber-600 font-bold uppercase">{app.teamMember}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{new Date(app.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</p>
                      <p className="text-2xl font-bold text-gray-900">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-gray-50 pt-4 mt-2">
                    <button 
                      onClick={() => { if(!isLocked) { setSelectedAppointment(app); setIsFormOpen(true); } else alert("Modifica bloccata (mancano meno di 24 ore)."); }}
                      className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all ${isLocked ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      <i className="fas fa-edit mr-2"></i> Modifica
                    </button>
                    <button 
                      onClick={() => deleteAppointment(app.id, app.date)}
                      className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all ${isLocked ? 'bg-gray-50 text-gray-300' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                    >
                      <i className="fas fa-trash mr-2"></i> Elimina
                    </button>
                  </div>
                  {isLocked && <p className="text-[10px] text-gray-400 mt-3 italic text-center">Contatta il salone per modifiche last-minute.</p>}
                </div>
              );
            })}
            {userAppointments.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                <i className="fas fa-calendar-alt text-4xl text-gray-100 mb-4"></i>
                <p className="text-gray-400">Non hai ancora appuntamenti prenotati.</p>
                <button onClick={() => setActiveTab('dashboard')} className="mt-4 text-amber-500 font-bold text-sm">Prenota ora</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE PRENOTAZIONE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-xl rounded-t-[3rem] md:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-20 duration-300 overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-luxury font-bold">
                  {selectedAppointment?.id ? 'Aggiorna Appuntamento' : 'Completa Prenotazione'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 text-gray-400">
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

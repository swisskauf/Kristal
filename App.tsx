
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabaseMock } from './services/supabaseMock';
import { Appointment, Service, User, TeamMember } from './types';
import { SERVICES, TEAM } from './constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();

  useEffect(() => {
    const savedUser = supabaseMock.auth.getUser();
    if (savedUser) {
      setUser(savedUser);
      setActiveTab(savedUser.role === 'admin' ? 'admin_dashboard' : 'dashboard');
    }
    setAppointments(supabaseMock.appointments.getAll());
  }, []);

  const handleLogin = (u: User) => {
    const loggedUser = supabaseMock.auth.signIn(u);
    setUser(loggedUser);
    setActiveTab(loggedUser.role === 'admin' ? 'admin_dashboard' : 'dashboard');
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
      teamMember: appData.teamMember!,
      date: appData.date!,
      status: 'confirmed'
    };
    supabaseMock.appointments.upsert(newApp);
    setAppointments(supabaseMock.appointments.getAll());
    setIsFormOpen(false);
    setSelectedAppointment(undefined);
  };

  const deleteAppointment = (id: string) => {
    if (window.confirm('Sei sicuro di voler cancellare questo appuntamento?')) {
      supabaseMock.appointments.delete(id);
      setAppointments(supabaseMock.appointments.getAll());
    }
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // Stats Logic
  const salonAppointments = appointments;
  const userAppointments = appointments.filter(a => a.clientId === user.id);
  
  const revenue = appointments.reduce((acc, app) => {
    const s = SERVICES.find(sv => sv.id === app.serviceId);
    return acc + (s?.price || 0);
  }, 0);

  const teamPerformance = TEAM.map(member => ({
    name: member.name,
    bookings: appointments.filter(a => a.teamMember === member.name).length
  }));

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6'];

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {/* SEZIONE ADMIN: DASHBOARD */}
      {activeTab === 'admin_dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-luxury font-bold">Panoramica Salone</h2>
              <p className="text-gray-500">Dati e performance in tempo reale.</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-xs font-bold text-gray-400">
              OGGI: {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Entrate Totali</p>
              <h3 className="text-2xl font-bold">€{revenue}</h3>
              <div className="text-emerald-500 text-xs font-bold mt-2">
                <i className="fas fa-arrow-up mr-1"></i> +12.5%
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Prenotazioni</p>
              <h3 className="text-2xl font-bold">{appointments.length}</h3>
              <div className="text-gray-400 text-xs mt-2">Tutti i membri</div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Membro Top</p>
              <h3 className="text-2xl font-bold text-amber-600">
                {teamPerformance.sort((a,b) => b.bookings - a.bookings)[0]?.name || '-'}
              </h3>
              <div className="text-gray-400 text-xs mt-2">Per numero servizi</div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Nuovi Clienti</p>
              <h3 className="text-2xl font-bold">14</h3>
              <div className="text-amber-500 text-xs font-bold mt-2">Ultimi 30gg</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100">
              <h3 className="font-bold text-lg mb-8">Performance Team</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="bookings" radius={[8, 8, 0, 0]} barSize={40}>
                      {teamPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100">
              <h3 className="font-bold text-lg mb-6">Ultimi Appuntamenti</h3>
              <div className="space-y-4">
                {appointments.slice(-5).reverse().map(app => {
                  const service = SERVICES.find(s => s.id === app.serviceId);
                  return (
                    <div key={app.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">
                          {app.clientName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{app.clientName}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-medium">{service?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-amber-500">{new Date(app.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <p className="text-[10px] text-gray-400">{app.teamMember}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE ADMIN: AGENDA TEAM */}
      {activeTab === 'team_schedule' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className="flex justify-between items-center">
            <h2 className="text-3xl font-luxury font-bold">Agenda Staff</h2>
            <div className="flex space-x-2">
               <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><i className="fas fa-chevron-left"></i></button>
               <span className="bg-white px-4 py-2 rounded-xl border border-gray-100 text-sm font-bold self-center">Oggi</span>
               <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><i className="fas fa-chevron-right"></i></button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEAM.map(member => (
              <div key={member.name} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="bg-gray-900 p-4 text-white flex items-center space-x-3">
                  <img src={member.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-amber-500" />
                  <div>
                    <h4 className="font-bold text-sm">{member.name}</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{member.role}</p>
                  </div>
                </div>
                <div className="p-4 space-y-3 min-h-[400px] bg-gray-50/50">
                  {appointments
                    .filter(a => a.teamMember === member.name)
                    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(app => {
                      const service = SERVICES.find(s => s.id === app.serviceId);
                      return (
                        <div key={app.id} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-amber-500 group relative">
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">
                               {new Date(app.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                             <button 
                               onClick={() => deleteAppointment(app.id)}
                               className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                               <i className="fas fa-times-circle text-xs"></i>
                             </button>
                          </div>
                          <p className="text-sm font-bold text-gray-800 truncate">{app.clientName}</p>
                          <p className="text-[10px] text-gray-400">{service?.name}</p>
                          <p className="text-[10px] text-gray-400 mt-1 italic">Durata: {service?.duration} min</p>
                        </div>
                      );
                    })}
                  {appointments.filter(a => a.teamMember === member.name).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center pt-20 text-gray-300">
                      <i className="fas fa-calendar-day text-3xl mb-2"></i>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Nessun impegno</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEZIONE CLIENTE: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header>
            <h2 className="text-3xl font-luxury font-bold text-gray-900">Bentornato, {user.fullName}</h2>
            <p className="text-gray-500 mt-1">Cosa desideri prenotare oggi?</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-xl">
                <i className="fas fa-calendar-check"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">I tuoi appuntamenti</p>
                <h3 className="text-xl font-bold">{userAppointments.length}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-xl">
                <i className="fas fa-crown"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Punti Fedeltà</p>
                <h3 className="text-xl font-bold">1.250</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center text-xl">
                <i className="fas fa-gift"></i>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Premi disponibili</p>
                <h3 className="text-xl font-bold">2</h3>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-2xl font-luxury font-bold mb-2">Esperienza VIP Kristal</h3>
              <p className="text-gray-400 text-sm max-w-md mb-6">Prenota i nostri trattamenti esclusivi e lasciati coccolare dai migliori professionisti del settore.</p>
              <button 
                onClick={() => setActiveTab('services')}
                className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-amber-600 transition-all"
              >
                Scopri i Servizi
              </button>
            </div>
            <i className="fas fa-spa absolute -right-10 -bottom-10 text-[200px] text-white/5 rotate-12"></i>
          </div>
        </div>
      )}

      {/* SEZIONE CALENDARIO (CLIENTE O TUTTI PER ADMIN) */}
      {(activeTab === 'calendar' || activeTab === 'manage_appointments') && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-luxury font-bold">
              {activeTab === 'manage_appointments' ? 'Tutte le Prenotazioni' : 'I Miei Appuntamenti'}
            </h2>
            <button 
              onClick={() => {
                setSelectedAppointment(undefined);
                setIsFormOpen(true);
              }}
              className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-lg flex items-center"
            >
              <i className="fas fa-plus mr-2"></i>
              Nuovo Appuntamento
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Servizio</th>
                    <th className="px-6 py-4">Team</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(activeTab === 'manage_appointments' ? appointments : userAppointments).map(app => {
                    const service = SERVICES.find(s => s.id === app.serviceId);
                    return (
                      <tr key={app.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-800 text-sm">{app.clientName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{service?.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 uppercase">
                            {app.teamMember}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500 block">
                            {new Date(app.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs font-bold text-gray-900">
                            {new Date(app.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-1">
                            <button 
                              onClick={() => {
                                setSelectedAppointment(app);
                                setIsFormOpen(true);
                              }}
                              className="p-2 text-gray-300 hover:text-amber-500 transition-colors"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              onClick={() => deleteAppointment(app.id)}
                              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(activeTab === 'manage_appointments' ? appointments : userAppointments).length === 0 && (
                <div className="p-20 text-center text-gray-400">
                  <i className="fas fa-calendar-times text-4xl mb-4 text-gray-100"></i>
                  <p className="text-sm">Nessuna prenotazione presente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEZIONE SERVIZI */}
      {activeTab === 'services' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <header className="flex justify-between items-end">
             <div>
                <h2 className="text-2xl font-luxury font-bold">Listino Servizi</h2>
                <p className="text-gray-500">I nostri trattamenti signature.</p>
             </div>
             {user.role === 'admin' && (
                <button className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600">
                  Aggiungi Servizio
                </button>
             )}
           </header>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {SERVICES.map(service => (
               <div key={service.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all">
                 <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {service.category}
                    </span>
                    <span className="text-xl font-bold text-gray-900">€{service.price}</span>
                 </div>
                 <h3 className="font-bold text-lg text-gray-800 mb-2">{service.name}</h3>
                 <p className="text-xs text-gray-400 flex-1 mb-6 leading-relaxed">{service.description}</p>
                 <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                    <div className="flex items-center text-[10px] font-bold text-gray-400 uppercase">
                      <i className="far fa-clock mr-1.5 text-amber-500"></i>
                      {service.duration} min
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedAppointment({ serviceId: service.id } as Appointment);
                        setIsFormOpen(true);
                      }}
                      className="bg-gray-900 text-white text-[10px] font-bold px-4 py-2 rounded-xl hover:bg-amber-500 transition-colors"
                    >
                      Prenota
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* MODALE PRENOTAZIONE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-luxury font-bold">
                  {selectedAppointment?.id ? 'Modifica Appuntamento' : 'Prenota Trattamento'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors">
                  <i className="fas fa-times text-gray-400"></i>
                </button>
              </div>
              <AppointmentForm 
                initialData={selectedAppointment}
                onSave={saveAppointment}
                onCancel={() => setIsFormOpen(false)}
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

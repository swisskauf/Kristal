
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabaseMock } from './services/supabaseMock';
import { Appointment, Service, User, TeamMember } from './types';
import { SERVICES, TEAM } from './constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | undefined>();

  useEffect(() => {
    const savedUser = supabaseMock.auth.getUser();
    if (savedUser) setUser(savedUser);
    
    setAppointments(supabaseMock.appointments.getAll());
  }, []);

  const handleLogin = (u: User) => {
    const loggedUser = supabaseMock.auth.signIn(u);
    setUser(loggedUser);
  };

  const handleLogout = () => {
    supabaseMock.auth.signOut();
    setUser(null);
  };

  const saveAppointment = (appData: Partial<Appointment>) => {
    if (!user) return;
    const newApp: Appointment = {
      id: selectedAppointment?.id || Math.random().toString(36).substr(2, 9),
      clientId: user.id,
      clientName: user.fullName,
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
    supabaseMock.appointments.delete(id);
    setAppointments(supabaseMock.appointments.getAll());
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // Dashboard Stats
  const userAppointments = appointments.filter(a => a.clientId === user.id);
  const upcomingAppointments = userAppointments.filter(a => new Date(a.date) >= new Date());
  
  // Data for charts
  const chartData = [
    { name: 'Lun', bookings: 4 },
    { name: 'Mar', bookings: 7 },
    { name: 'Mer', bookings: 5 },
    { name: 'Gio', bookings: 12 },
    { name: 'Ven', bookings: 15 },
    { name: 'Sab', bookings: 18 },
    { name: 'Dom', bookings: 0 },
  ];

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <header>
            <h2 className="text-3xl font-luxury font-bold text-gray-900">Bentornato, {user.fullName}</h2>
            <p className="text-gray-500 mt-1">Ecco una panoramica della tua agenda Kristal.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-calendar-check text-xl"></i>
              </div>
              <p className="text-gray-400 text-sm font-medium">Appuntamenti Totali</p>
              <h3 className="text-2xl font-bold mt-1">{userAppointments.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-clock text-xl"></i>
              </div>
              <p className="text-gray-400 text-sm font-medium">Prossimi Appuntamenti</p>
              <h3 className="text-2xl font-bold mt-1">{upcomingAppointments.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-tag text-xl"></i>
              </div>
              <p className="text-gray-400 text-sm font-medium">Punti Kristal</p>
              <h3 className="text-2xl font-bold mt-1">450</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-6 flex items-center">
                <i className="fas fa-chart-area mr-2 text-amber-500"></i>
                Trend Prenotazioni Salone
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorBook" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Area type="monotone" dataKey="bookings" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBook)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Il nostro Team</h3>
              </div>
              <div className="space-y-4">
                {TEAM.map(member => (
                  <div key={member.name} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                    <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-amber-400" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{member.name}</h4>
                      <p className="text-xs text-gray-400">{member.role}</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full">
                      DISPONIBILE
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-luxury font-bold">I Tuoi Appuntamenti</h2>
            <button 
              onClick={() => {
                setSelectedAppointment(undefined);
                setIsFormOpen(true);
              }}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-all shadow-lg flex items-center"
            >
              <i className="fas fa-plus mr-2"></i>
              Prenota ora
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {userAppointments.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200">
                  <i className="fas fa-calendar-times text-4xl"></i>
                </div>
                <h3 className="text-gray-500 font-medium">Nessuna prenotazione trovata</h3>
                <p className="text-gray-400 text-sm mt-1">Inizia subito prenotando il tuo primo trattamento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Servizio</th>
                      <th className="px-6 py-4">Professionista</th>
                      <th className="px-6 py-4">Data & Ora</th>
                      <th className="px-6 py-4">Stato</th>
                      <th className="px-6 py-4 text-right">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {userAppointments.map(app => {
                      const service = SERVICES.find(s => s.id === app.serviceId);
                      return (
                        <tr key={app.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-700 block">{service?.name}</span>
                            <span className="text-xs text-gray-400">{service?.category}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-[10px] font-bold">
                                {app.teamMember[0]}
                              </div>
                              <span className="text-sm font-medium text-gray-600">{app.teamMember}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 block">
                              {new Date(app.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                            </span>
                            <span className="text-xs text-amber-500 font-bold">
                              {new Date(app.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                              Confermato
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setSelectedAppointment(app);
                                  setIsFormOpen(true);
                                }}
                                className="p-2 text-gray-400 hover:text-amber-500"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                onClick={() => deleteAppointment(app.id)}
                                className="p-2 text-gray-400 hover:text-red-500"
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
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
           <header className="flex justify-between items-end">
             <div>
                <h2 className="text-2xl font-luxury font-bold">Menu Servizi</h2>
                <p className="text-gray-500">Trattamenti di lusso per la tua bellezza.</p>
             </div>
             <div className="flex space-x-2">
                {['Capelli', 'Viso', 'Corpo', 'Unghie'].map(cat => (
                  <button key={cat} className="px-4 py-2 text-xs font-bold rounded-full border border-gray-200 hover:bg-gray-900 hover:text-white transition-all">
                    {cat}
                  </button>
                ))}
             </div>
           </header>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {SERVICES.map(service => (
               <div key={service.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all">
                 <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded uppercase tracking-wider">
                      {service.category}
                    </span>
                    <span className="text-xl font-bold text-gray-900">€{service.price}</span>
                 </div>
                 <h3 className="font-bold text-lg text-gray-800 mb-2">{service.name}</h3>
                 <p className="text-sm text-gray-500 flex-1 mb-6 leading-relaxed">{service.description}</p>
                 <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                    <div className="flex items-center text-xs text-gray-400">
                      <i className="far fa-clock mr-1.5"></i>
                      {service.duration} min
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedAppointment({ serviceId: service.id } as Appointment);
                        setIsFormOpen(true);
                      }}
                      className="text-amber-500 font-bold text-sm hover:underline"
                    >
                      Prenota
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 rounded-full bg-amber-500 mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-amber-100">
              {user.fullName.charAt(0)}
            </div>
            <h2 className="text-2xl font-luxury font-bold text-gray-900">{user.fullName}</h2>
            <p className="text-gray-400">{user.email}</p>
            <div className="mt-6 flex justify-center space-x-2">
              <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-xs font-bold">Cliente VIP</span>
              <span className="bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full text-xs font-bold">Membro da Gen 2024</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="font-bold">Dati Personali</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Cellulare</span>
                <span className="text-sm font-semibold">{user.phone}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-400">Preferenza Stylist</span>
                <span className="text-sm font-semibold">Maurizio</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-400">Notifiche SMS</span>
                <span className="text-emerald-500 font-bold text-xs">ATTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-luxury font-bold text-gray-900">
                  {selectedAppointment?.id ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="fas fa-times text-xl"></i>
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

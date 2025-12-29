
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import RequestManagement from './components/RequestManagement';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import NewGuestForm from './components/NewGuestForm';
import VisionAnalytics from './components/VisionAnalytics';
import AIAssistant from './components/AIAssistant';
import { supabase, db, useMock } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest, SalonClosure } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [salonClosures, setSalonClosures] = useState<SalonClosure[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedMemberToManage, setSelectedMemberToManage] = useState<TeamMember | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<any | null>(null);
  const [selectedServiceToEdit, setSelectedServiceToEdit] = useState<Service | undefined>(undefined);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const refreshData = useCallback(async () => {
    try {
      const [svcs, tm, appts, reqs, profs, closures] = await Promise.all([
        db.services.getAll().catch(() => DEFAULT_SERVICES),
        db.team.getAll().catch(() => DEFAULT_TEAM),
        db.appointments.getAll().catch(() => []),
        db.requests.getAll().catch(() => []),
        db.profiles.getAll().catch(() => []),
        db.salonClosures.getAll().catch(() => [])
      ]);
      
      setServices(svcs || []);
      setTeam(tm || []);
      setAppointments(appts || []);
      setRequests(reqs || []);
      setProfiles(profs || []);
      setSalonClosures(closures || []);

      if (user) {
        const myProfile = profs.find((p: any) => p.id === user.id);
        if (myProfile) {
          setUser(prev => prev ? { 
            ...prev, 
            fullName: myProfile.full_name, 
            avatar: myProfile.avatar, 
            phone: myProfile.phone, 
            technical_sheets: myProfile.technical_sheets || [],
            treatment_history: myProfile.treatment_history || []
          } : null);
        }
      }
    } catch (e) {
      console.error("Data Refresh Error", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppointments([]);
        setActiveTab('dashboard');
      } else if (session?.user) {
        const profile = await db.profiles.get(session.user.id).catch(() => null);
        const email = session.user.email?.toLowerCase();
        let role: any = profile?.role || 'client';
        if (email === 'serop.serop@outlook.com') role = 'admin';
        else if (email === 'sirop.sirop@outlook.sa') role = 'collaborator';
        
        setUser({ 
          id: session.user.id, 
          email: session.user.email!, 
          fullName: profile?.full_name || 'Ospite', 
          phone: profile?.phone || '', 
          role, 
          avatar: profile?.avatar,
          technical_sheets: profile?.technical_sheets || [],
          treatment_history: profile?.treatment_history || []
        });
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) refreshData();
  }, [loading, refreshData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const currentMember = useMemo(() => {
    if (!user) return null;
    return team.find(m => m.profile_id === user.id || m.name.toLowerCase() === user.fullName.split(' ')[0].toLowerCase());
  }, [user, team]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(services.map(s => s.category)));
    return cats.length > 0 ? cats : ['Donna', 'Colore', 'Trattamenti', 'Uomo', 'Estetica'];
  }, [services]);

  const myClientAppointments = useMemo(() => {
    if (!user) return [];
    return appointments
      .filter(a => a.client_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [appointments, user]);

  const upcomingAppointments = myClientAppointments.filter(a => a.status !== 'cancelled' && new Date(a.date) >= new Date());
  const pastAppointments = myClientAppointments.filter(a => a.status === 'cancelled' || new Date(a.date) < new Date());

  const handleOpenSlotForm = (memberName: string, date: string, hour: string) => {
    setFormInitialData({
      team_member_name: memberName,
      date: `${date}T${hour}:00`
    });
    setIsFormOpen(true);
  };

  const handleAppointmentClick = (appt: Appointment) => {
    if (isAdmin || isCollaborator) {
      setSelectedAppointmentDetail(appt);
    }
  };

  const handleServiceClick = (service: Service) => {
    if (isGuest) {
      setIsAuthOpen(true);
    } else if (!isAdmin && !isCollaborator) {
      setFormInitialData({ service_id: service.id });
      setIsFormOpen(true);
    }
  };

  const handleSaveSalonClosures = async (closures: SalonClosure[]) => {
    try {
      await db.salonClosures.save(closures);
      setSalonClosures(closures);
      showToast("Agenda Atelier sincronizzata: Festività aggiornate.");
    } catch (e) {
      showToast("Errore nel salvataggio.", "error");
    }
  };

  // Fixed: Implemented missing handleUpdateAppointmentStatus function
  const handleUpdateAppointmentStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      const appt = appointments.find(a => a.id === id);
      if (appt) {
        await db.appointments.upsert({ ...appt, status });
        showToast(`Rituale ${status === 'confirmed' ? 'confermato' : 'annullato'}.`);
        refreshData();
        setSelectedAppointmentDetail(null);
      }
    } catch (e) {
      console.error("Status Update Error", e);
      showToast("Errore durante l'aggiornamento.", "error");
    }
  };

  const closureDatesOnly = useMemo(() => salonClosures.map(c => c.date), [salonClosures]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h1 className="text-2xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal Atelier</h1>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.4em]">Sincronizzazione Agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 duration-500 w-full max-w-md px-4">
          <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-md ${
            toast.type === 'error' ? 'bg-red-900/90 text-white border-red-800' : 
            toast.type === 'info' ? 'bg-slate-900/90 text-white border-slate-800' : 
            'bg-black/90 text-white border-amber-500/30'
          }`}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle text-red-400' : 'fa-bell text-amber-500'} text-lg`}></i>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-12">
            {isAdmin ? (
               <div className="animate-in fade-in"><VisionAnalytics team={team} appointments={appointments} services={services} /></div>
            ) : (
              <>
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">
                      {isGuest ? 'Atelier Kristal' : isCollaborator ? 'Workspace' : `Kristal Boutique`}
                    </h2>
                  </div>
                </header>

                {isCollaborator && currentMember ? (
                  <CollaboratorDashboard 
                    member={currentMember} appointments={appointments} requests={requests} user={user!} 
                    onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(); }}
                    onUpdateProfile={async (p) => { await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p }); refreshData(); }}
                    onAddManualAppointment={() => { setFormInitialData(null); setIsFormOpen(true); }}
                  />
                ) : (
                  <div className="space-y-16 animate-in fade-in duration-1000">
                    <header className="text-center space-y-4">
                      <h2 className="text-6xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal</h2>
                      <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em]">L'Eccellenza è un Rituale</p>
                    </header>

                    <div className="grid md:grid-cols-2 gap-10">
                      {categories.map(cat => (
                        <div key={cat} className="space-y-6">
                          <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-4">{cat}</h4>
                          <div className="space-y-4">
                            {services.filter(s => s.category === cat).map(s => (
                              <div 
                                key={s.id} 
                                className="group p-6 bg-white rounded-[2.5rem] border border-gray-50 hover:shadow-xl transition-all flex justify-between items-center cursor-pointer active:scale-95" 
                                onClick={() => handleServiceClick(s)}
                              >
                                <div className="flex-1">
                                  <h5 className="font-bold text-lg text-gray-900 group-hover:text-amber-600 transition-colors">{s.name}</h5>
                                  <p className="text-[10px] text-gray-400 font-medium">{s.duration} minuti</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-luxury font-bold text-gray-900">CHF {s.price}</p>
                                  <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-1">Prenota</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'my_rituals' && user && (
          <div className="space-y-12 animate-in fade-in">
            <header>
               <h2 className="text-4xl font-luxury font-bold">I Miei Ritual</h2>
            </header>

            <section className="space-y-8">
               <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600 border-b border-amber-50 pb-4">Prossimi Appuntamenti</h4>
               {upcomingAppointments.length > 0 ? (
                 <div className="grid md:grid-cols-2 gap-6">
                    {upcomingAppointments.map(app => (
                      <div key={app.id} className="p-10 bg-black text-white rounded-[4rem] shadow-2xl relative group hover:scale-[1.02] transition-all">
                        <div className="absolute top-8 right-8 px-4 py-1.5 bg-amber-600 rounded-full text-[8px] font-bold uppercase tracking-widest">
                           {app.status === 'confirmed' ? 'Confermato' : 'In Attesa'}
                        </div>
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">
                           {new Date(app.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <h5 className="text-3xl font-luxury font-bold mb-6">{app.services?.name}</h5>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
                              <i className="far fa-clock text-amber-500 text-xs"></i>
                              <span className="text-[11px] font-bold">{new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <i className="far fa-user text-amber-500 text-xs"></i>
                              <span className="text-[11px] font-bold">Con {app.team_member_name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="p-12 bg-white rounded-[3rem] border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Nessun rituale attivo.</p>
                 </div>
               )}
            </section>
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Agenda Atelier</h2>
            <TeamPlanning 
              team={team} 
              appointments={appointments} 
              onToggleVacation={() => {}} 
              onSlotClick={handleOpenSlotForm}
              onAppointmentClick={handleAppointmentClick}
              currentUserMemberName={currentMember?.name} 
              isCollaborator={isCollaborator}
              salonClosures={closureDatesOnly}
            />
          </div>
        )}

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-4xl font-luxury font-bold">Menu Ritual</h2>
               <button onClick={() => { setSelectedServiceToEdit(undefined); setIsServiceFormOpen(true); }} className="px-8 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest">Crea Ritual</button>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {services.length > 0 ? services.map(s => (
                 <div key={s.id} onClick={() => { setSelectedServiceToEdit(s); setIsServiceFormOpen(true); }} className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                   <h4 className="font-bold text-xl mb-1">{s.name}</h4>
                   <p className="text-[10px] text-amber-600 font-bold uppercase mb-4 tracking-widest">{s.category}</p>
                   <div className="flex justify-between items-end">
                     <p className="text-2xl font-luxury font-bold">CHF {s.price}</p>
                     <p className="text-[10px] text-gray-400 font-bold">{s.duration} min</p>
                   </div>
                 </div>
               )) : (
                 <div className="col-span-full p-20 bg-white rounded-[4rem] border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nessun servizio caricato dal database SQL.</p>
                 </div>
               )}
             </div>
          </div>
        )}

        {activeTab === 'vacation_planning' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
            <header>
               <h2 className="text-4xl font-luxury font-bold text-gray-900 tracking-tighter">Agenda Atelier Admin</h2>
               <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">Gestione festività e congedi staff</p>
            </header>

            <div className="grid lg:grid-cols-3 gap-10">
               <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8 lg:col-span-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-b pb-4 flex items-center gap-3">
                     <i className="fas fa-ribbon text-amber-600"></i> Nuova Festività
                  </h4>
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nome Festività</label>
                        <input id="holiday-name" type="text" placeholder="es. Natale..." className="w-full p-5 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Data</label>
                        <input id="holiday-date" type="date" className="w-full p-5 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
                     </div>
                     <button 
                       onClick={() => {
                         const n = (document.getElementById('holiday-name') as HTMLInputElement).value;
                         const d = (document.getElementById('holiday-date') as HTMLInputElement).value;
                         if (n && d) {
                           handleSaveSalonClosures([...salonClosures, { date: d, name: n }]);
                           (document.getElementById('holiday-name') as HTMLInputElement).value = '';
                           (document.getElementById('holiday-date') as HTMLInputElement).value = '';
                         }
                       }}
                       className="w-full py-5 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 shadow-xl"
                     >
                       Sincronizza
                     </button>

                     <div className="pt-8 border-t border-gray-50">
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                           {salonClosures.map(c => (
                             <div key={c.date} className="bg-gray-50 px-6 py-5 rounded-[2rem] flex justify-between items-center group border border-transparent hover:border-amber-100 transition-all">
                               <div>
                                 <p className="text-[11px] font-bold text-gray-900">{c.name}</p>
                                 <p className="text-[9px] font-bold text-amber-600 uppercase">{new Date(c.date).toLocaleDateString('it-IT')}</p>
                               </div>
                               <button onClick={() => handleSaveSalonClosures(salonClosures.filter(x => x.date !== c.date))} className="text-gray-300 hover:text-red-500">
                                 <i className="fas fa-trash-alt text-xs"></i>
                               </button>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-2 space-y-10">
                  <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
                     <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-b pb-4 mb-8 flex items-center gap-3">
                        <i className="fas fa-user-friends text-amber-600"></i> Stato Collaboratori
                     </h4>
                     <div className="grid md:grid-cols-2 gap-4">
                        {team.map(m => (
                             <div key={m.name} className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-5">
                                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-14 h-14 rounded-[1.5rem] object-cover border-2 border-white shadow-md" />
                                      <div>
                                         <h5 className="font-bold text-lg text-gray-900">{m.name}</h5>
                                         <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{m.role}</p>
                                      </div>
                                   </div>
                                   <button onClick={() => setSelectedMemberToManage(m)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 hover:bg-black hover:text-white transition-all shadow-sm">
                                     <i className="fas fa-cog text-xs"></i>
                                   </button>
                                </div>
                             </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
                     <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b pb-4 mb-8">Approvazione Richieste Staff</h4>
                     <RequestManagement requests={requests} onAction={async (id, action) => {
                       await db.requests.update(id, { status: action });
                       if (action === 'approved') {
                          const req = requests.find(r => r.id === id);
                          if (req) {
                             const member = team.find(m => m.name === req.member_name);
                             if (member) {
                                const updatedAbsences = [...(member.absences_json || []), {
                                   id: req.id,
                                   startDate: req.start_date,
                                   endDate: req.end_date,
                                   type: req.type,
                                   isFullDay: req.is_full_day,
                                   notes: req.notes
                                }];
                                await db.team.upsert({ ...member, absences_json: updatedAbsences });
                             }
                          }
                       }
                       refreshData();
                       showToast(`Richiesta aggiornata.`);
                     }} />
                  </div>
               </div>
            </div>
          </div>
        )}
      </Layout>

      {/* Integrated Gemini AI Beauty Assistant */}
      <AIAssistant />

      {/* Appointment Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <AppointmentForm 
               services={services} 
               team={team} 
               existingAppointments={appointments} 
               onSave={async (a) => { 
                 await db.appointments.upsert({ ...a, client_id: isAdmin || isCollaborator ? (a.client_id || user?.id) : user?.id }); 
                 setIsFormOpen(false); setFormInitialData(null); refreshData(); 
                 showToast("Ritual programmato con successo.");
                 setActiveTab(isAdmin || isCollaborator ? 'team_schedule' : 'my_rituals');
               }} 
               onCancel={() => { setIsFormOpen(false); setFormInitialData(null); }} 
               isAdminOrStaff={isAdmin || isCollaborator} 
               profiles={profiles}
               initialData={formInitialData}
             />
          </div>
        </div>
      )}

      {/* Service Management Modal */}
      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => setIsServiceFormOpen(false)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <h3 className="text-3xl font-luxury font-bold mb-10">{selectedServiceToEdit ? 'Modifica Ritual' : 'Nuovo Ritual'}</h3>
             <ServiceForm 
               initialData={selectedServiceToEdit}
               onSave={async (s) => {
                 await db.services.upsert(s);
                 setIsServiceFormOpen(false);
                 refreshData();
                 showToast("Servizio sincronizzato con il database.");
               }}
               onCancel={() => setIsServiceFormOpen(false)}
             />
          </div>
        </div>
      )}

      {/* Other Modals (Auth, Team, Client, Appt Detail) */}
      {selectedAppointmentDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setSelectedAppointmentDetail(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <header className="mb-10 text-center">
               <p className="text-amber-600 font-bold text-[9px] uppercase tracking-widest mb-2">Gestione Ritual</p>
               <h3 className="text-3xl font-luxury font-bold">{(selectedAppointmentDetail as any).services?.name}</h3>
               <p className="text-sm font-bold mt-2 text-gray-500">Ospite: {(selectedAppointmentDetail as any).profiles?.full_name}</p>
             </header>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => { setFormInitialData(selectedAppointmentDetail); setSelectedAppointmentDetail(null); setIsFormOpen(true); }} className="py-4 bg-gray-50 text-black border border-gray-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest">Riprogramma</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'cancelled')} className="py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest">Annulla</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'confirmed')} className="col-span-2 py-5 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl">Conferma Ritual</button>
             </div>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative animate-in zoom-in-95">
            <button onClick={() => setIsAuthOpen(false)} className="absolute -top-12 right-0 text-white/50 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(); }} />
          </div>
        </div>
      )}

      {selectedMemberToManage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedMemberToManage(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-2xl"></i></button>
            <TeamManagement member={selectedMemberToManage} appointments={appointments} services={services} profiles={profiles} onSave={async (m) => { await db.team.upsert(m); refreshData(); setSelectedMemberToManage(null); showToast("Dati sincronizzati."); }} onClose={() => setSelectedMemberToManage(null)} />
          </div>
        </div>
      )}
    </>
  );
};

export default App;

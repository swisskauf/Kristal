
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import RequestManagement from './components/RequestManagement';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import VisionAnalytics from './components/VisionAnalytics';
import AIAssistant from './components/AIAssistant';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest, SalonClosure } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Feature Settings
  const [settings, setSettings] = useState({
    aiAssistantEnabled: false,
    instagramIntegrationEnabled: false,
    emailNotificationsEnabled: true
  });

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
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<any | null>(null);
  const [selectedServiceToEdit, setSelectedServiceToEdit] = useState<Service | undefined>(undefined);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Caricamento impostazioni da localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('kristal_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('kristal_settings', JSON.stringify(newSettings));
    showToast("Impostazioni salvate con successo.");
  };

  // Sistema di notifica (Simulato per frontend)
  const sendEmailNotification = (appointment: any, type: 'new' | 'update') => {
    if (!settings.emailNotificationsEnabled) return;

    const profile = profiles.find(p => p.id === appointment.client_id);
    const guestName = profile?.full_name || 'Ospite';
    const guestEmail = profile?.email || 'email@kristal-atelier.com';
    const date = new Date(appointment.date).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    const stylist = appointment.team_member_name;

    // Logica di invio simulata
    console.log(`%c [MAIL SERVER] Invio a: ${guestEmail}`, 'background: #000; color: #bada55');
    console.log(`Oggetto: ${type === 'new' ? 'Conferma Prenotazione' : 'Aggiornamento Appuntamento'}`);
    console.log(`Messaggio: Gentile ${guestName}, il tuo rituale del ${date} con ${stylist} è stato ${type === 'new' ? 'confermato' : 'aggiornato'}.`);

    showToast(`Email di ${type === 'new' ? 'conferma' : 'aggiornamento'} inviata a ${guestName}.`, 'info');
  };

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  // Added currentMember useMemo to fix errors on lines 239, 241, 242, 292
  const currentMember = useMemo(() => {
    if (!user || user.role !== 'collaborator') return null;
    return team.find(m => m.profile_id === user.id || m.name === user.fullName);
  }, [team, user]);

  // Added categories useMemo to fix error on line 254
  const categories = useMemo(() => {
    const cats = services.map(s => s.category);
    return Array.from(new Set(cats));
  }, [services]);

  const ensureDataSeeding = useCallback(async () => {
    try {
      const existingServices = await db.services.getAll();
      if (!existingServices || existingServices.length === 0) {
        for (const s of DEFAULT_SERVICES) await db.services.upsert(s);
      }
      const existingTeam = await db.team.getAll();
      if (!existingTeam || existingTeam.length === 0) {
        for (const m of DEFAULT_TEAM) await db.team.upsert(m);
      }
    } catch (e) {
      console.warn("Seeding error:", e);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      await ensureDataSeeding();
      const [svcs, tm, appts, reqs, profs, closures] = await Promise.all([
        db.services.getAll(),
        db.team.getAll(),
        db.appointments.getAll(),
        db.requests.getAll(),
        db.profiles.getAll(),
        db.salonClosures.getAll()
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
          setUser(prev => prev ? { ...prev, fullName: myProfile.full_name, avatar: myProfile.avatar, phone: myProfile.phone } : null);
        }
      }
    } catch (e) {
      console.error("Data Refresh Error", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, ensureDataSeeding]);

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
          fullName: profile?.full_name || 'Ospite Kristal', 
          phone: profile?.phone || '', 
          role, 
          avatar: profile?.avatar 
        });
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) refreshData();
  }, [loading, refreshData]);

  const handleUpdateAppointmentStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      const appt = appointments.find(a => a.id === id);
      if (appt) {
        const updated = await db.appointments.upsert({ ...appt, status });
        showToast(`Rituale ${status === 'confirmed' ? 'confermato' : 'annullato'} con successo.`);
        if (isAdmin || isCollaborator) sendEmailNotification(appt, 'update');
        refreshData();
        setSelectedAppointmentDetail(null);
      }
    } catch (e) {
      showToast("Errore durante l'aggiornamento.", "error");
    }
  };

  const handleServiceClick = (service: Service) => {
    if (isGuest) setIsAuthOpen(true);
    else {
      setFormInitialData({ service_id: service.id });
      setIsFormOpen(true);
    }
  };

  const handleOpenSlotForm = (memberName: string, date: string, hour: string) => {
    setFormInitialData({
      team_member_name: memberName,
      date: new Date(`${date}T${hour}:00`).toISOString()
    });
    setIsFormOpen(true);
  };

  const handleSaveSalonClosures = async (closures: SalonClosure[]) => {
    try {
      await db.salonClosures.save(closures);
      setSalonClosures(closures);
      showToast("Chiusure atelier salvate.");
    } catch (e) {
      showToast("Errore salvataggio chiusure.", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h1 className="text-2xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal Atelier</h1>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.4em]">Caricamento Ritual...</p>
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
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : toast.type === 'info' ? 'fa-paper-plane' : 'fa-check-circle'} text-amber-500`}></i>
            <p className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</p>
          </div>
        </div>
      )}

      <Layout user={user} onLogout={() => supabase.auth.signOut()} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-12">
            {isAdmin ? (
               <div className="animate-in fade-in"><VisionAnalytics team={team} appointments={appointments} services={services} /></div>
            ) : isCollaborator && currentMember ? (
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
              onAppointmentClick={(a) => setSelectedAppointmentDetail(a)}
              currentUserMemberName={currentMember?.name} 
              isCollaborator={isCollaborator}
              salonClosures={salonClosures.map(c => c.date)}
            />
          </div>
        )}

        {activeTab === 'vacation_planning' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
            <header>
               <h2 className="text-4xl font-luxury font-bold">Vacanze & Chiusure</h2>
               <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">Gestione ferie staff e festività atelier</p>
            </header>

            <div className="grid lg:grid-cols-2 gap-10">
               <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-b pb-4 flex items-center gap-3">
                     <i className="fas fa-ribbon text-amber-600"></i> Nuova Festività Atelier
                  </h4>
                  <div className="space-y-6">
                    <input id="h-name" type="text" placeholder="Nome Festività" className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
                    <input id="h-date" type="date" className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
                    <button onClick={() => {
                      const n = (document.getElementById('h-name') as HTMLInputElement).value;
                      const d = (document.getElementById('h-date') as HTMLInputElement).value;
                      if(n && d) handleSaveSalonClosures([...salonClosures, { name: n, date: d }]);
                    }} className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest">Aggiungi Chiusura</button>
                    
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                       {salonClosures.map(c => (
                         <div key={c.date} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                            <div>
                               <p className="text-[10px] font-bold">{c.name}</p>
                               <p className="text-[8px] text-amber-600 uppercase font-bold">{new Date(c.date).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => handleSaveSalonClosures(salonClosures.filter(x => x.date !== c.date))} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash"></i></button>
                         </div>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b pb-4">Approvazione Richieste Staff</h4>
                  <RequestManagement requests={requests} onAction={async (id, action) => {
                    await db.requests.update(id, { status: action });
                    if (action === 'approved') {
                      const req = requests.find(r => r.id === id);
                      if (req) {
                        const member = team.find(m => m.name === req.member_name);
                        if (member) {
                          const updatedAbsences = [...(member.absences_json || []), {
                            id: req.id, startDate: req.start_date, endDate: req.end_date, type: req.type, isFullDay: req.is_full_day
                          }];
                          await db.team.upsert({ ...member, absences_json: updatedAbsences });
                        }
                      }
                    }
                    refreshData();
                    showToast("Richiesta aggiornata.");
                  }} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'impostazioni' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <header>
               <h2 className="text-4xl font-luxury font-bold">Impostazioni</h2>
               <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">Configurazione Funzionalità Atelier</p>
             </header>

             <div className="max-w-2xl bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center">
                        <i className="fas fa-sparkles"></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Kristal AI Assistant</p>
                        <p className="text-[9px] text-gray-400 uppercase font-bold">Supporto prenotazioni intelligente</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings({...settings, aiAssistantEnabled: !settings.aiAssistantEnabled})}
                      className={`w-14 h-8 rounded-full transition-all relative ${settings.aiAssistantEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.aiAssistantEnabled ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 text-white rounded-2xl flex items-center justify-center">
                        <i className="fab fa-instagram"></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Integrazione Instagram</p>
                        <p className="text-[9px] text-gray-400 uppercase font-bold">Visualizza portfolio lavori</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings({...settings, instagramIntegrationEnabled: !settings.instagramIntegrationEnabled})}
                      className={`w-14 h-8 rounded-full transition-all relative ${settings.instagramIntegrationEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.instagramIntegrationEnabled ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Notifiche Email</p>
                        <p className="text-[9px] text-gray-400 uppercase font-bold">Invia conferme automatiche agli ospiti</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings({...settings, emailNotificationsEnabled: !settings.emailNotificationsEnabled})}
                      className={`w-14 h-8 rounded-full transition-all relative ${settings.emailNotificationsEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.emailNotificationsEnabled ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Altri tab: services_management, team_management, clients ... */}
        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-4xl font-luxury font-bold">Menu Ritual</h2>
               <button onClick={() => { setSelectedServiceToEdit(undefined); setIsServiceFormOpen(true); }} className="px-8 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest">Crea Ritual</button>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {services.map(s => (
                 <div key={s.id} onClick={() => { setSelectedServiceToEdit(s); setIsServiceFormOpen(true); }} className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                   <h4 className="font-bold text-xl mb-1">{s.name}</h4>
                   <p className="text-[10px] text-amber-600 font-bold uppercase mb-4 tracking-widest">{s.category}</p>
                   <div className="flex justify-between items-end">
                     <p className="text-2xl font-luxury font-bold">CHF {s.price}</p>
                     <p className="text-[10px] text-gray-400 font-bold">{s.duration} min</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </Layout>

      {settings.aiAssistantEnabled && <AIAssistant />}

      {/* Modale Appuntamento */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <AppointmentForm 
               services={services} team={team} existingAppointments={appointments} 
               onSave={async (a) => { 
                 const client_id = (isAdmin || isCollaborator) ? (a.client_id || formInitialData?.client_id || user?.id) : user?.id;
                 const isUpdate = !!a.id;
                 await db.appointments.upsert({ ...a, client_id }); 
                 setIsFormOpen(false); setFormInitialData(null); await refreshData(); 
                 showToast(isUpdate ? "Ritual aggiornato." : "Ritual programmato.");
                 sendEmailNotification(a, isUpdate ? 'update' : 'new');
                 setActiveTab(isAdmin || isCollaborator ? 'team_schedule' : 'dashboard');
               }} 
               onCancel={() => { setIsFormOpen(false); setFormInitialData(null); }} 
               isAdminOrStaff={isAdmin || isCollaborator} profiles={profiles} initialData={formInitialData}
             />
          </div>
        </div>
      )}

      {selectedAppointmentDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setSelectedAppointmentDetail(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <header className="mb-10 text-center">
               <p className="text-amber-600 font-bold text-[9px] uppercase tracking-widest mb-2">Dettaglio Ritual</p>
               <h3 className="text-3xl font-luxury font-bold">{(selectedAppointmentDetail as any).services?.name}</h3>
               <p className="text-sm font-bold mt-2 text-gray-500">Ospite: {(selectedAppointmentDetail as any).profiles?.full_name}</p>
             </header>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => { setFormInitialData(selectedAppointmentDetail); setSelectedAppointmentDetail(null); setIsFormOpen(true); }} className="py-4 bg-gray-50 text-black border border-gray-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest">Modifica</button>
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

      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative">
             <button onClick={() => setIsServiceFormOpen(false)} className="absolute top-8 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-2xl"></i></button>
             <h3 className="text-3xl font-luxury font-bold mb-10">Ritual Menu</h3>
             <ServiceForm initialData={selectedServiceToEdit} onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(); showToast("Servizio aggiornato."); }} onCancel={() => setIsServiceFormOpen(false)} />
          </div>
        </div>
      )}

      {selectedMemberToManage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedMemberToManage(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-2xl"></i></button>
            <TeamManagement member={selectedMemberToManage} appointments={appointments} services={services} profiles={profiles} onSave={async (m) => { await db.team.upsert(m); refreshData(); setSelectedMemberToManage(null); showToast("Staff aggiornato."); }} onClose={() => setSelectedMemberToManage(null)} />
          </div>
        </div>
      )}
    </>
  );
};

export default App;

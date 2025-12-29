
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
import { Service, User, TeamMember, Appointment, LeaveRequest } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNewGuestOpen, setIsNewGuestOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any | null>(null);
  const [selectedMemberToManage, setSelectedMemberToManage] = useState<TeamMember | null>(null);
  const [selectedClientDetail, setSelectedClientDetail] = useState<any | null>(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<any | null>(null);
  
  // Sistema di notifiche Toast
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const ensureSeedData = useCallback(async () => {
    if (useMock) return;
    try {
      const [svcs, tm] = await Promise.all([
        db.services.getAll(),
        db.team.getAll()
      ]);

      if (!svcs || svcs.length === 0) {
        await Promise.all(DEFAULT_SERVICES.map(s => db.services.upsert(s)));
      }
      if (!tm || tm.length === 0) {
        await Promise.all(DEFAULT_TEAM.map(m => db.team.upsert(m)));
      }
    } catch (err) {
      console.warn("Seed data process skipped or partial:", err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      if (!useMock) await ensureSeedData();

      const [svcs, tm, appts, reqs, profs] = await Promise.all([
        db.services.getAll().catch(() => DEFAULT_SERVICES),
        db.team.getAll().catch(() => DEFAULT_TEAM),
        db.appointments.getAll().catch(() => []),
        db.requests.getAll().catch(() => []),
        db.profiles.getAll().catch(() => [])
      ]);
      
      setServices(svcs && svcs.length ? svcs : DEFAULT_SERVICES);
      setTeam(tm && tm.length ? tm : DEFAULT_TEAM);
      setAppointments(appts || []);
      setRequests(reqs || []);
      setProfiles(profs || []);

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
  }, [user?.id, ensureSeedData]);

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

  // Ordinamento: Per Cliente -> Prenotazione più recente in alto (created_at)
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

  const handleUpdateAppointmentStatus = async (id: string, status: any) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    
    try {
      await db.appointments.upsert({ ...appt, status });
      const client = profiles.find(p => p.id === appt.client_id);
      
      if (status === 'cancelled') {
        showToast(`Ritual di ${client?.full_name} cancellato. Notifica inviata via mail.`, 'info');
      } else {
        showToast(`Stato Ritual aggiornato per ${client?.full_name}. Feedback inviato.`);
      }
      
      setSelectedAppointmentDetail(null);
      await refreshData();
    } catch (e) {
      showToast("Errore durante l'aggiornamento.", "error");
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
      {/* Sistema Toast Luxury */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 duration-500">
          <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border ${
            toast.type === 'error' ? 'bg-red-900 text-white border-red-800' : 
            toast.type === 'info' ? 'bg-slate-900 text-white border-slate-800' : 
            'bg-black text-white border-amber-500/30'
          }`}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle text-red-400' : 'fa-check-circle text-amber-500'} text-lg`}></i>
            <span className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</span>
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
                      {['Donna', 'Colore', 'Trattamenti', 'Uomo', 'Estetica'].map(cat => (
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
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Prenotazioni ordinate per data di creazione</p>
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
                          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest">
                              Prenotato il: {new Date(app.created_at).toLocaleString('it-IT')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="p-12 bg-white rounded-[3rem] border border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 text-[10px] font-bold uppercase">Nessun rituale attivo.</p>
                    <button onClick={() => setActiveTab('dashboard')} className="mt-4 text-amber-600 font-bold text-[9px] uppercase tracking-widest">Esplora il Menu</button>
                 </div>
               )}
            </section>

            {pastAppointments.length > 0 && (
              <section className="space-y-6">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-4">Storico & Cancellati</h4>
                <div className="space-y-4">
                   {pastAppointments.map(app => (
                     <div key={app.id} className={`flex justify-between items-center p-8 rounded-[3rem] border border-gray-50 transition-opacity ${app.status === 'cancelled' ? 'bg-red-50/20 opacity-40' : 'bg-white opacity-60 hover:opacity-100'}`}>
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${app.status === 'cancelled' ? 'bg-red-100 text-red-400' : 'bg-gray-100 text-gray-400'}`}>
                             <i className={`fas ${app.status === 'cancelled' ? 'fa-times' : 'fa-check'}`}></i>
                           </div>
                           <div>
                              <h6 className="font-bold text-lg text-gray-900">{app.services?.name}</h6>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                {app.status === 'cancelled' ? 'ANNULLATO' : `Eseguito il ${new Date(app.date).toLocaleDateString()}`} • {app.team_member_name}
                              </p>
                              <p className="text-[7px] text-gray-300 font-bold uppercase mt-1">Prenotazione del {new Date(app.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <p className="text-lg font-luxury font-bold">CHF {app.services?.price}</p>
                     </div>
                   ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Atelier Planning</h2>
            <TeamPlanning 
              team={team} appointments={appointments} 
              onToggleVacation={() => {}} 
              onSlotClick={handleOpenSlotForm}
              onAppointmentClick={handleAppointmentClick}
              currentUserMemberName={currentMember?.name} 
              isCollaborator={isCollaborator}
            />
          </div>
        )}

        {/* ... Altri tab rimasti invariati ... */}
        {activeTab === 'clients' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Registro Ospiti</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {profiles.filter(p => p.role === 'client').map(p => {
                 const clientAppts = appointments.filter(a => a.client_id === p.id);
                 return (
                   <div key={p.id} onClick={() => setSelectedClientDetail(p)} className="bg-white p-10 rounded-[4rem] border border-gray-50 shadow-sm flex flex-col items-center gap-6 hover:shadow-xl transition-all cursor-pointer group">
                      <div className="relative">
                        <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-24 h-24 rounded-full object-cover shadow-2xl border-4 border-white" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-[10px] border-4 border-white">
                           {clientAppts.length}
                        </div>
                      </div>
                      <div className="text-center">
                         <h4 className="text-xl font-luxury font-bold group-hover:text-amber-600 transition-colors">{p.full_name}</h4>
                         <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{p.phone || 'Nessun telefono'}</p>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {activeTab === 'team_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Gestione Staff</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {team.map(m => (
                <button key={m.name} onClick={() => setSelectedMemberToManage(m)} className="bg-white p-10 rounded-[4rem] border border-gray-50 shadow-sm flex flex-col items-center gap-6 hover:shadow-xl transition-all">
                  <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-28 h-28 rounded-full object-cover shadow-2xl border-4 border-white" />
                  <div className="text-center">
                    <h4 className="text-xl font-luxury font-bold">{m.name}</h4>
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{m.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-4xl font-luxury font-bold">Menu Servizi</h2>
               <button onClick={() => setIsFormOpen(true)} className="px-8 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px]">Aggiungi Ritual</button>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {services.map(s => (
                 <div key={s.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
                   <h4 className="font-bold text-lg mb-1">{s.name}</h4>
                   <p className="text-[9px] text-amber-600 font-bold uppercase mb-4">{s.category}</p>
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

      <AIAssistant user={user} />

      {/* MODAL DETTAGLI OSPITE (Admin/Staff) */}
      {selectedClientDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
             <button onClick={() => setSelectedClientDetail(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             
             <header className="flex items-center gap-8 mb-12">
               <img src={selectedClientDetail.avatar || `https://ui-avatars.com/api/?name=${selectedClientDetail.full_name}`} className="w-24 h-24 rounded-[2rem] object-cover shadow-2xl border-4 border-white" />
               <div>
                 <h3 className="text-4xl font-luxury font-bold">{selectedClientDetail.full_name}</h3>
                 <p className="text-amber-600 font-bold text-[10px] uppercase tracking-widest">{selectedClientDetail.email || 'Email non fornita'}</p>
               </div>
             </header>

             <div className="grid md:grid-cols-2 gap-8 mb-12">
               <div className="p-6 bg-gray-50 rounded-3xl">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contatti</p>
                  <p className="text-sm font-bold">{selectedClientDetail.phone || 'N/A'}</p>
               </div>
               <div className="p-6 bg-gray-50 rounded-3xl">
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Dati Anagrafici</p>
                  <p className="text-sm font-bold">
                    {selectedClientDetail.gender === 'F' ? 'Donna' : selectedClientDetail.gender === 'M' ? 'Uomo' : 'Altro'} 
                    {selectedClientDetail.dob ? ` • ${new Date(selectedClientDetail.dob).toLocaleDateString()}` : ''}
                  </p>
               </div>
             </div>

             <section className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b pb-3">Diario Tecnico Kristal</h4>
                <div className="space-y-4">
                  {selectedClientDetail.technical_sheets && selectedClientDetail.technical_sheets.length > 0 ? (
                    selectedClientDetail.technical_sheets.map((sheet: any, i: number) => (
                      <div key={i} className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[9px] font-bold text-amber-600 uppercase">{sheet.category}</span>
                           <span className="text-[9px] text-gray-400">{new Date(sheet.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed italic">"{sheet.content}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">Nessuna scheda tecnica registrata per questo ospite.</p>
                  )}
                </div>
             </section>
          </div>
        </div>
      )}

      {/* MODAL DETTAGLI APPUNTAMENTO (Admin/Staff) */}
      {selectedAppointmentDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setSelectedAppointmentDetail(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             
             <header className="mb-10">
               <p className="text-amber-600 font-bold text-[9px] uppercase tracking-widest mb-2">Gestione Ritual</p>
               <h3 className="text-3xl font-luxury font-bold">{(selectedAppointmentDetail as any).services?.name}</h3>
               <p className="text-sm font-bold mt-2">Ospite: {(selectedAppointmentDetail as any).profiles?.full_name}</p>
             </header>

             <div className="space-y-6 mb-12">
                <div className="flex items-center gap-4 text-sm font-bold">
                   <i className="fas fa-calendar text-amber-600"></i>
                   <span>{new Date(selectedAppointmentDetail.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-bold">
                   <i className="fas fa-clock text-amber-600"></i>
                   <span>{new Date(selectedAppointmentDetail.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-bold">
                   <i className="fas fa-user-check text-amber-600"></i>
                   <span>Artista: {selectedAppointmentDetail.team_member_name}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Registrato il</p>
                   <p className="text-[11px] font-bold text-gray-600">{new Date(selectedAppointmentDetail.created_at).toLocaleString('it-IT')}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <button 
                 onClick={() => {
                   setFormInitialData({
                     ...selectedAppointmentDetail,
                     client_id: selectedAppointmentDetail.client_id,
                   });
                   setSelectedAppointmentDetail(null);
                   setIsFormOpen(true);
                 }}
                 className="py-4 bg-gray-50 text-black border border-gray-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-gray-100"
               >
                 Modifica Ritual
               </button>
               <button 
                 onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'cancelled')}
                 className="py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
               >
                 Cancella Ritual
               </button>
               <button 
                 onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'confirmed')}
                 className="col-span-2 py-5 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 shadow-xl"
               >
                 Invia Feedback Stato
               </button>
             </div>
          </div>
        </div>
      )}

      {/* ... Altri modal Auth e Gestione ... */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative animate-in zoom-in-95">
            <button onClick={() => setIsAuthOpen(false)} className="absolute -top-12 right-0 text-white/50 hover:text-white">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(); }} />
          </div>
        </div>
      )}

      {selectedMemberToManage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedMemberToManage(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <TeamManagement
              member={selectedMemberToManage}
              appointments={appointments}
              services={services}
              profiles={profiles}
              onSave={async (m) => {
                await db.team.upsert(m);
                await refreshData();
                setSelectedMemberToManage(null);
                showToast("Dati Staff aggiornati.");
              }}
              onClose={() => setSelectedMemberToManage(null)}
            />
          </div>
        </div>
      )}

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
                 const finalData = { 
                   ...a, 
                   client_id: isAdmin || isCollaborator ? (a.client_id || user?.id) : user?.id,
                   created_at: a.created_at || new Date().toISOString()
                 };
                 await db.appointments.upsert(finalData); 
                 setIsFormOpen(false); 
                 setFormInitialData(null);
                 await refreshData(); 
                 
                 const client = profiles.find(p => p.id === finalData.client_id);
                 showToast(`Ritual ${a.id ? 'modificato' : 'confermato'} per ${client?.full_name}.`);
                 
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

      {(isNewGuestOpen || editingGuest) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setIsNewGuestOpen(false); setEditingGuest(null); }} className="absolute top-8 right-10 text-gray-300 hover:text-black">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <NewGuestForm 
              initialData={editingGuest}
              onSave={async (guest) => {
                await db.profiles.upsert(guest);
                setIsNewGuestOpen(false);
                setEditingGuest(null);
                refreshData();
                showToast("Ospite registrato con successo.");
              }} 
              onCancel={() => { setIsNewGuestOpen(false); setEditingGuest(null); }} 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default App;

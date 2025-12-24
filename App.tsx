
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import RequestManagement from './components/RequestManagement';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import QuickRequestModal from './components/QuickRequestModal';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest, AbsenceType } from './types';
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  // Fix: Added state for the service currently being edited to resolve setEditingService error
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedMemberToManage, setSelectedMemberToManage] = useState<TeamMember | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [clientSearch, setClientSearch] = useState('');

  const [quickRequestData, setQuickRequestData] = useState<{ date: string, memberName: string } | null>(null);

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';

  const currentMember = useMemo(() => {
    if (!user) return null;
    return team.find(m => m.profile_id === user.id);
  }, [user, team]);

  const businessStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const confirmed = appointments.filter(a => a.status === 'confirmed');
    const getRevenue = (appts: any[]) => appts.reduce((acc, a) => acc + (a.services?.price || 0), 0);

    return {
      global: {
        daily: getRevenue(confirmed.filter(a => a.date.startsWith(todayStr))),
        monthly: getRevenue(confirmed.filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }))
      }
    };
  }, [appointments]);

  // Fix: Defined timeGreeting for the dashboard header to resolve name reference error
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon Pomeriggio';
    return 'Buonasera';
  }, []);

  /**
   * Sync di Sistema: 
   * 1. Ruoli Protetti
   * 2. Collegamento Maurizio -> sirop.sirop@outlook.sa
   */
  const performSystemSync = async (allProfiles: any[], allTeam: TeamMember[]) => {
    const ADMIN_EMAIL = 'serop.serop@outlook.com';
    const COLLAB_EMAIL = 'sirop.sirop@outlook.sa';

    let localProfiles = [...allProfiles];
    let localTeam = [...allTeam];
    let changed = false;

    // 1. Allineamento Profili
    for (const p of localProfiles) {
      const email = p.email?.toLowerCase();
      if (email === ADMIN_EMAIL && p.role !== 'admin') {
        const updated = await db.profiles.upsert({ ...p, role: 'admin' });
        localProfiles = localProfiles.map(lp => lp.id === p.id ? updated : lp);
        changed = true;
      }
      if (email === COLLAB_EMAIL && p.role !== 'collaborator') {
        const updated = await db.profiles.upsert({ ...p, role: 'collaborator' });
        localProfiles = localProfiles.map(lp => lp.id === p.id ? updated : lp);
        changed = true;
      }
    }

    // 2. Collegamento Maurizio
    const maurizioProfile = localProfiles.find(p => p.email?.toLowerCase() === COLLAB_EMAIL);
    const maurizioMember = localTeam.find(m => m.name === 'Maurizio');
    
    if (maurizioProfile && maurizioMember && maurizioMember.profile_id !== maurizioProfile.id) {
      console.log("[Kristal] Linking Maurizio to profile", maurizioProfile.id);
      const updatedM = await db.team.upsert({ ...maurizioMember, profile_id: maurizioProfile.id });
      localTeam = localTeam.map(m => m.name === 'Maurizio' ? updatedM : m);
      changed = true;
    }

    if (changed) {
      setProfiles(localProfiles);
      setTeam(localTeam);
      
      // Se l'utente corrente è coinvolto, aggiorna lo stato locale
      const currentUserProfile = localProfiles.find(p => p.id === user?.id);
      if (currentUserProfile && currentUserProfile.role !== user?.role) {
        setUser(prev => prev ? { ...prev, role: currentUserProfile.role } : null);
      }
    }
  };

  const refreshData = async () => {
    try {
      const [svcs, tm, appts, reqs, profs] = await Promise.all([
        db.services.getAll().catch(() => []),
        db.team.getAll().catch(() => []),
        db.appointments.getAll().catch(() => []),
        db.requests.getAll().catch(() => []),
        db.profiles.getAll().catch(() => [])
      ]);
      
      const currentServices = svcs.length ? svcs : DEFAULT_SERVICES;
      const currentTeam = tm.length ? tm : DEFAULT_TEAM;
      
      setServices(currentServices);
      setTeam(currentTeam);
      setAppointments(appts);
      setRequests(reqs);
      setProfiles(profs);

      await performSystemSync(profs, currentTeam);
    } catch (e) {
      console.error("Refresh Data error", e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await db.profiles.get(session.user.id);
          const email = session.user.email?.toLowerCase();
          
          let role: 'admin' | 'collaborator' | 'client' = profile?.role || 'client';
          if (email === 'serop.serop@outlook.com') role = 'admin';
          else if (email === 'sirop.sirop@outlook.sa') role = 'collaborator';

          setUser({
            id: session.user.id,
            email: session.user.email!,
            fullName: profile?.full_name || 'Ospite Kristal',
            phone: profile?.phone || '',
            role: role,
            avatar: profile?.avatar
          });
        }
      } catch (e) {
        console.error("Auth init error", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await db.profiles.get(session.user.id);
        const email = session.user.email?.toLowerCase();
        
        let role: 'admin' | 'collaborator' | 'client' = profile?.role || 'client';
        if (email === 'serop.serop@outlook.com') role = 'admin';
        else if (email === 'sirop.sirop@outlook.sa') role = 'collaborator';

        setUser({
          id: session.user.id,
          email: session.user.email!,
          fullName: profile?.full_name || 'Ospite Kristal',
          phone: profile?.phone || '',
          role: role,
          avatar: profile?.avatar
        });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) refreshData();
  }, [loading, user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleUpdateUserRole = async (profileId: string, newRole: 'client' | 'admin' | 'collaborator') => {
    try {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) return;
      
      const emailLower = profile.email?.toLowerCase();
      if ((emailLower === 'serop.serop@outlook.com' && newRole !== 'admin') ||
          (emailLower === 'sirop.sirop@outlook.sa' && newRole !== 'collaborator')) {
        alert("Questo account ha privilegi di sistema e non può essere modificato.");
        return;
      }

      await db.profiles.upsert({ ...profile, role: newRole });
      alert(`Ruolo per ${profile.full_name} aggiornato a ${newRole}.`);
      await refreshData();
    } catch (e: any) {
      alert("Errore SQL: " + e.message);
    }
  };

  const handleToggleVacation = async (memberName: string, date: string) => {
    const member = team.find(m => m.name === memberName);
    if (!member) return;
    
    // Admin può gestire tutti, Collaboratore solo se stesso
    if (isAdmin || (isCollaborator && member.profile_id === user?.id)) {
      setQuickRequestData({ date, memberName });
    } else {
      alert("Azione consentita solo per il proprio profilo.");
    }
  };

  const handleQuickRequestAction = async (action: 'create' | 'cancel' | 'revoke', data?: any) => {
    if (!quickRequestData) return;
    try {
      if (action === 'create' && data) {
        // Se è l'admin, creiamo una richiesta già approvata o la mandiamo nel flusso
        await db.requests.create({
          member_name: quickRequestData.memberName,
          type: data.type,
          start_date: quickRequestData.date,
          end_date: quickRequestData.date,
          is_full_day: data.isFullDay,
          start_time: data.startTime,
          end_time: data.endTime,
          status: isAdmin ? 'approved' : 'pending',
          notes: data.notes || (isAdmin ? 'Inserito dalla Direzione' : 'Richiesta rapida.')
        });

        // Se approvato (admin), aggiorniamo subito il team
        if (isAdmin) {
          const member = team.find(m => m.name === quickRequestData.memberName);
          if (member) {
            const entry = { id: Math.random().toString(), startDate: quickRequestData.date, endDate: quickRequestData.date, isFullDay: data.isFullDay, type: data.type };
            let absences = [...(member.absences_json || []), entry];
            let dates = [...(member.unavailable_dates || [])];
            if (data.isFullDay && !dates.includes(quickRequestData.date)) dates.push(quickRequestData.date);
            await db.team.upsert({ ...member, absences_json: absences, unavailable_dates: dates });
          }
        }
      } else if (action === 'cancel') {
        const req = requests.find(r => r.member_name === quickRequestData.memberName && r.start_date === quickRequestData.date && r.status === 'pending');
        if (req) await db.requests.delete(req.id);
      }
      await refreshData();
    } catch (e) { console.error(e); }
    setQuickRequestData(null);
  };

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await db.requests.update(requestId, { status });
      if (status === 'approved') {
        const req = requests.find(r => r.id === requestId);
        const member = team.find(m => m.name === req?.member_name);
        if (member && req) {
          const entry = { id: req.id, startDate: req.start_date, endDate: req.end_date, isFullDay: req.is_full_day, type: req.type, notes: req.notes };
          let absences = [...(member.absences_json || []), entry];
          let dates = [...(member.unavailable_dates || [])];
          if (req.is_full_day && !dates.includes(req.start_date)) dates.push(req.start_date);
          await db.team.upsert({ ...member, absences_json: absences, unavailable_dates: dates });
        }
      }
      await refreshData();
    } catch (e) { alert("Errore."); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Kristal</p>
      </div>
    </div>
  );

  return (
    <>
      <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col">
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">{timeGreeting}</p>
                <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">
                  {user ? user.fullName.split(' ')[0] : 'Benvenuti'}
                </h2>
              </div>
              {isAdmin && (
                <div className="flex gap-4">
                  <div className="bg-black text-white px-6 py-3 rounded-2xl shadow-xl border border-amber-500/20">
                    <p className="text-[7px] font-bold uppercase tracking-widest text-amber-500">Oggi</p>
                    <p className="text-lg font-luxury font-bold">CHF {businessStats.global.daily}</p>
                  </div>
                  <button onClick={refreshData} className="p-4 bg-white border border-gray-100 rounded-2xl hover:text-amber-600 transition-all shadow-sm">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>
              )}
            </header>

            {!isCollaborator && (
              <div className="grid md:grid-cols-3 gap-8">
                <div className="col-span-2 bg-white p-8 md:p-10 rounded-[3rem] border border-gray-50 shadow-sm">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Collezioni & Ritual</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {services.slice(0, 4).map(s => (
                      <button key={s.id} onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }} className="p-6 bg-gray-50 rounded-[2rem] hover:bg-amber-50 transition-all text-left group">
                        <p className="text-[8px] font-bold text-amber-600 uppercase mb-1">{s.category}</p>
                        <h4 className="font-bold text-sm mb-1 group-hover:text-amber-900">{s.name}</h4>
                        <p className="text-xs font-luxury font-bold text-gray-900">CHF {s.price}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-luxury font-bold mb-4">L'Atelier</h3>
                    <p className="text-[11px] leading-relaxed text-gray-400 italic">"Un rifugio di lusso dedicato alla cura del sé. Ogni servizio è un rituale sartoriale unico."</p>
                  </div>
                  <button onClick={() => user ? setIsFormOpen(true) : setIsAuthOpen(true)} className="w-full mt-10 py-4 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-xl">Riserva ora</button>
                </div>
              </div>
            )}

            {isCollaborator && (
              <div className="animate-in slide-in-from-bottom-5">
                 {currentMember ? (
                  <CollaboratorDashboard 
                    member={currentMember} 
                    appointments={appointments} 
                    requests={requests} 
                    user={user!}
                    onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(); }}
                    onUpdateProfile={async (p) => { 
                      await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p });
                      refreshData(); 
                    }}
                  />
                ) : (
                  <div className="p-16 bg-white rounded-[3rem] border border-dashed border-gray-200 text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-id-badge text-amber-600 text-2xl"></i>
                    </div>
                    <p className="text-gray-900 font-bold uppercase text-xs tracking-widest mb-2">Profilo artista non collegato</p>
                    <p className="text-gray-400 text-[10px] max-w-xs mx-auto">La direzione deve collegare il tuo ID ({user?.id.slice(0,8)}...) a un membro del team.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB OSPITI (ADMIN) */}
        {activeTab === 'clients' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-luxury font-bold text-gray-900">Registro Ospiti</h2>
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">Sincronizzazione SQL • {profiles.length} Profili</p>
              </div>
              <button onClick={refreshData} className="px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-sm">
                <i className="fas fa-sync-alt mr-2"></i> Aggiorna
              </button>
            </div>
            <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
              <div className="relative mb-10">
                <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input type="text" placeholder="Cerca ospite per nome o email..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="w-full p-5 pl-14 bg-gray-50 rounded-2xl outline-none border-none text-sm font-bold shadow-inner" />
              </div>
              <div className="grid gap-4">
                {profiles
                  .filter(p => !clientSearch || p.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) || p.email?.toLowerCase().includes(clientSearch.toLowerCase()))
                  .map(p => {
                    const isSystemAcc = p.email?.toLowerCase() === 'serop.serop@outlook.com' || p.email?.toLowerCase() === 'sirop.sirop@outlook.sa';
                    return (
                      <div key={p.id} className={`p-6 bg-gray-50 rounded-3xl flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-300 ${isSystemAcc ? 'border-l-4 border-amber-500 shadow-md' : ''}`}>
                        <div className="flex items-center gap-6">
                          <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}&background=000&color=fff`} className="w-14 h-14 rounded-2xl shadow-md object-cover" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-gray-900">{p.full_name}</h4>
                              {isSystemAcc && <i className="fas fa-crown text-amber-500 text-[10px]" title="Account di Sistema"></i>}
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium tracking-tight mb-1">{p.email}</p>
                            <span className={`px-2 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-widest ${p.role === 'admin' ? 'bg-amber-100 text-amber-600' : p.role === 'collaborator' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                              {p.role === 'admin' ? 'Direzione' : p.role === 'collaborator' ? 'Artista' : 'Ospite'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <label className="text-[7px] font-bold text-gray-300 uppercase tracking-widest mr-2">Ruolo Atelier</label>
                          <select 
                            value={p.role} 
                            disabled={isSystemAcc}
                            onChange={(e) => handleUpdateUserRole(p.id, e.target.value as any)}
                            className={`bg-white shadow-sm border border-gray-100 rounded-xl text-[10px] font-bold text-amber-600 uppercase outline-none py-2 px-4 ${isSystemAcc ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-amber-500'}`}
                          >
                            <option value="client">Ospite</option>
                            <option value="collaborator">Artista</option>
                            <option value="admin">Direzione</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                {profiles.length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase text-[10px]">Nessun profilo trovato nel database.</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB TEAM E PLANNING (ADMIN/COLLAB) */}
        {(activeTab === 'team_schedule' || activeTab === 'collab_dashboard') && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold text-gray-900">Planning Atelier</h2>
              {isAdmin && (
                <div className="flex gap-4">
                   <div className="flex -space-x-3">
                      {team.map(m => (
                        <button key={m.name} onClick={() => setSelectedMemberToManage(m)} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-md hover:scale-110 transition-transform">
                          <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>
            
            {isAdmin && <RequestManagement requests={requests} onAction={handleRequestAction} />}
            
            <TeamPlanning 
              team={team} 
              appointments={appointments} 
              onToggleVacation={handleToggleVacation} 
              currentUserMemberName={currentMember?.name} 
              requests={requests} 
            />
          </div>
        )}

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold text-gray-900">Menu Ritual</h2>
              <button onClick={() => { setEditingService(null); setIsServiceFormOpen(true); }} className="px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all">Nuovo Ritual</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex justify-between items-center group shadow-sm hover:shadow-lg transition-all">
                  <div>
                    <p className="text-amber-600 text-[8px] font-bold uppercase mb-1">{s.category}</p>
                    <h4 className="font-bold text-lg">{s.name}</h4>
                    <p className="text-xs text-gray-400">{s.duration} min • CHF {s.price}</p>
                  </div>
                  <button onClick={() => { setEditingService(s); setIsServiceFormOpen(true); }} className="p-4 bg-gray-50 rounded-full hover:bg-black hover:text-white transition-all text-gray-400 shadow-sm"><i className="fas fa-edit text-xs"></i></button>
                </div>
              ))}
            </div>
          </div>
        )}

      </Layout>

      {/* MODALI */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-white z-[2001] transition-transform hover:rotate-90">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(); }} />
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
             <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={async (a) => { await db.appointments.upsert({ ...a, client_id: isAdmin ? a.client_id : user?.id }); setIsFormOpen(false); refreshData(); }} onCancel={() => setIsFormOpen(false)} isAdmin={isAdmin} profiles={profiles} initialData={selectedAppointment} />
          </div>
        </div>
      )}

      {/* Fix: Added missing ServiceForm modal to handle isServiceFormOpen and editingService state usage */}
      {isServiceFormOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <ServiceForm 
              initialData={editingService || undefined} 
              onSave={async (s) => { 
                await db.services.upsert(s); 
                setIsServiceFormOpen(false); 
                setEditingService(null);
                refreshData(); 
              }} 
              onCancel={() => { 
                setIsServiceFormOpen(false); 
                setEditingService(null);
              }} 
            />
          </div>
        </div>
      )}

      {selectedMemberToManage && isAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl">
             <TeamManagement 
              member={selectedMemberToManage} 
              appointments={appointments} 
              services={services} 
              profiles={profiles} 
              onClose={() => setSelectedMemberToManage(null)} 
              onSave={async (m) => { await db.team.upsert(m); setSelectedMemberToManage(null); refreshData(); }}
            />
          </div>
        </div>
      )}

      {quickRequestData && (
        <QuickRequestModal 
          date={quickRequestData.date} 
          memberName={quickRequestData.memberName} 
          onClose={() => setQuickRequestData(null)}
          onAction={handleQuickRequestAction}
          existingRequest={requests.find(r => r.member_name === quickRequestData.memberName && r.start_date === quickRequestData.date && r.status === 'pending')}
          existingAbsence={team.find(m => m.name === quickRequestData.memberName)?.absences_json?.find(a => a.startDate === quickRequestData.date)}
        />
      )}

      <AIAssistant user={user} />
    </>
  );
};

export default App;

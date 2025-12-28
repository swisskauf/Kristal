import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import RequestManagement from './components/RequestManagement';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import QuickRequestModal from './components/QuickRequestModal';
import NewGuestForm from './components/NewGuestForm';
import VisionAnalytics from './components/VisionAnalytics';
import AIAssistant from './components/AIAssistant';
import { supabase, db, useMock } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

const toDateKeyLocal = (d: Date) =>
  `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate()
    .toString()
    .padStart(2, '0')}`;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  
  // UI Control States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNewGuestOpen, setIsNewGuestOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any | null>(null);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [selectedMemberToManage, setSelectedMemberToManage] = useState<TeamMember | null>(null);
  const [selectedClientToManage, setSelectedClientToManage] = useState<any | null>(null);
  
  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const normalizeTeam = (list: any[]) =>
    (list || []).map((m) => ({
      ...m,
      weekly_closures: Array.isArray(m.weekly_closures) ? m.weekly_closures.map(Number) : [],
    }));

  const ensureSeedData = useCallback(async () => {
    if (useMock) return;
    try {
      const [svcs, tm] = await Promise.all([
        db.services.getAll(),
        db.team.getAll()
      ]);

      if (!svcs.length) {
        await Promise.all(DEFAULT_SERVICES.map(s => db.services.upsert(s)));
      }
      if (!tm.length) {
        await Promise.all(DEFAULT_TEAM.map(m => db.team.upsert(m)));
      }
    } catch (err) {
      console.error("Seed data error:", err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      await ensureSeedData();

      const [svcs, tm, appts, reqs, profs] = await Promise.all([
        db.services.getAll().catch(() => []),
        db.team.getAll().catch(() => []),
        db.appointments.getAll().catch(() => []),
        db.requests.getAll().catch(() => []),
        db.profiles.getAll().catch(() => [])
      ]);
      
      setServices(svcs.length ? svcs : DEFAULT_SERVICES);
      setTeam(tm.length ? normalizeTeam(tm) : normalizeTeam(DEFAULT_TEAM));
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
            technical_sheets: myProfile.technical_sheets 
          } : null);
        }
      }
    } catch (e) {
      console.error("Data Refresh Error", e);
    }
  }, [user?.id, ensureSeedData]);

  // Auth listener
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
          technical_sheets: profile?.technical_sheets || []
        });
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Realtime appointments
  useEffect(() => {
    if (useMock) return;
    const anySupabase: any = supabase as any;
    if (!anySupabase.channel) return;

    const channel = anySupabase
      .channel('realtime:appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          refreshData();
        }
      )
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch {}
    };
  }, [refreshData]);

  useEffect(() => { if (!loading) refreshData(); }, [loading, refreshData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const currentMember = useMemo(() => {
    if (!user) return null;
    return team.find(m => m.profile_id === user.id);
  }, [user, team]);

  const handleOpenSlotForm = (memberName: string, date: string, hour: string) => {
    setFormInitialData({
      team_member_name: memberName,
      date: `${date}T${hour}:00.000Z`
    });
    setIsFormOpen(true);
  };

  const handleServiceClick = (service: Service) => {
    if (isGuest) {
      setIsAuthOpen(true);
    } else if (!isAdmin && !isCollaborator) {
      setFormInitialData({ service_id: service.id });
      setIsFormOpen(true);
    }
  };

  const renderServiceList = () => (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="text-center space-y-4">
        <h2 className="text-6xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal</h2>
        <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em]">Atelier Salone | salonekristal.ch</p>
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
  );

  return (
    <>
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
                      {isGuest ? 'Salone' : isCollaborator ? 'Mio Workspace' : `Benvenuta, ${user?.fullName.split(' ')[0]}`}
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
                  renderServiceList()
                )}
              </>
            )}

            {(isAdmin || isCollaborator) && (
              <div className="flex flex-col md:flex-row justify-end gap-4 pt-10">
                 <button onClick={() => setIsNewGuestOpen(true)} className="px-10 py-5 bg-white text-black border border-gray-100 rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-lg hover:shadow-xl transition-all">
                   Nuovo Ospite
                 </button>
                 <button onClick={() => { setFormInitialData(null); setIsFormOpen(true); }} className="px-10 py-5 bg-black text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-amber-600 transition-all">
                   Nuovo Ritual
                 </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Planning Atelier</h2>
            <TeamPlanning 
              team={team} appointments={appointments} 
              onToggleVacation={() => {}} 
              onSlotClick={handleOpenSlotForm}
              currentUserMemberName={currentMember?.name} 
              isCollaborator={isCollaborator}
            />
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
      </Layout>

      <AIAssistant user={user} />

      {/* MODALS */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative animate-in zoom-in-95">
            <button onClick={() => setIsAuthOpen(false)} className="absolute -top-12 right-0 text-white/50 hover:text-white transition-all transform hover:rotate-90">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(); }} />
          </div>
        </div>
      )}

      {selectedMemberToManage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
            <button onClick={() => setSelectedMemberToManage(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black transition-all">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <TeamManagement
              member={selectedMemberToManage}
              appointments={appointments}
              services={services}
              profiles={profiles}
              onSave={async (m) => {
                try {
                  await db.team.upsert(m);
                  await refreshData();
                  setSelectedMemberToManage(null);
                } catch (err: any) {
                  console.error("Errore salvataggio team:", err);
                  alert("Errore nel salvataggio delle indisponibilità: " + (err?.message || "sconosciuto"));
                }
              }}
              onClose={() => setSelectedMemberToManage(null)}
            />
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <AppointmentForm 
               services={services} 
               team={team} 
               existingAppointments={appointments} 
               onSave={async (a) => { 
                 try {
                   const finalData = { 
                     ...a, 
                     client_id: (isAdmin || isCollaborator) ? (a.client_id || user?.id) : user?.id,
                     status: 'confirmed'
                   };
                   const saved = await db.appointments.upsert(finalData); 
                   if (!saved) throw new Error("Salvataggio appuntamento fallito");
                   setIsFormOpen(false); 
                   setFormInitialData(null);
                   await refreshData(); 
                 } catch (err) {
                   console.error("Errore salvataggio appuntamento:", err);
                   alert("Errore nel salvataggio dell'appuntamento. Controlla che il team e i servizi esistano in Supabase.");
                 }
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
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
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


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
import { supabase, db, useMock } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

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
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [selectedMemberToManage, setSelectedMemberToManage] = useState<TeamMember | null>(null);
  const [selectedClientToManage, setSelectedClientToManage] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [quickRequestData, setQuickRequestData] = useState<{ date: string, memberName: string } | null>(null);

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';

  const refreshData = useCallback(async () => {
    try {
      const [svcs, tm, appts, reqs, profs] = await Promise.all([
        db.services.getAll().catch(() => []),
        db.team.getAll().catch(() => []),
        db.appointments.getAll().catch(() => []),
        db.requests.getAll().catch(() => []),
        db.profiles.getAll().catch(() => [])
      ]);
      
      setServices(svcs.length ? svcs : DEFAULT_SERVICES);
      setTeam(tm.length ? tm : DEFAULT_TEAM);
      setAppointments(appts || []);
      setRequests(reqs || []);
      setProfiles(profs || []);
    } catch (e) {
      console.error("Data Refresh Error", e);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await db.profiles.get(session.user.id);
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
            avatar: profile?.avatar,
            gender: profile?.gender,
            dob: profile?.dob,
            technical_sheets: profile?.technical_sheets || []
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
        let role: any = profile?.role || 'client';
        if (email === 'serop.serop@outlook.com') role = 'admin';
        else if (email === 'sirop.sirop@outlook.sa') role = 'collaborator';
        setUser({ id: session.user.id, email: session.user.email!, fullName: profile?.full_name || 'Ospite', phone: profile?.phone || '', role, avatar: profile?.avatar });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (!loading) refreshData(); }, [loading, refreshData]);

  const handleLogout = async () => {
    setIsAuthOpen(false);
    await supabase.auth.signOut();
    setUser(null);
    setAppointments([]);
    setActiveTab('dashboard');
  };

  const currentMember = useMemo(() => {
    if (!user) return null;
    return team.find(m => m.profile_id === user.id);
  }, [user, team]);

  const handleQuickRequestAction = async (action: 'create' | 'cancel' | 'revoke', data?: any) => {
    if (!quickRequestData) return;
    try {
      if (action === 'create' && data) {
        await db.requests.create({
          member_name: quickRequestData.memberName,
          type: data.type,
          start_date: quickRequestData.date,
          end_date: quickRequestData.date,
          notes: data.notes,
          is_full_day: data.isFullDay,
          start_time: data.startTime,
          end_time: data.endTime,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      } else if (action === 'cancel') {
        const req = requests.find(r => 
          r.member_name === quickRequestData.memberName && 
          r.start_date === quickRequestData.date && 
          r.status === 'pending'
        );
        if (req) {
          await db.requests.delete(req.id);
        }
      } else if (action === 'revoke' && data) {
        await db.requests.create({
          member_name: quickRequestData.memberName,
          type: 'availability_change',
          start_date: quickRequestData.date,
          end_date: quickRequestData.date,
          notes: data.notes,
          is_full_day: true,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }
      setQuickRequestData(null);
      await refreshData();
    } catch (e) {
      console.error("Error handling quick request action", e);
    }
  };

  const handleOpenSlotForm = (memberName: string, date: string, hour: string) => {
    setFormInitialData({
      team_member_name: memberName,
      date: `${date}T${hour}:00.000Z`,
    });
    setIsFormOpen(true);
  };

  const visionAnalytics = useMemo(() => {
    if (!isAdmin) return null;
    const stats = team.map(m => {
      const appts = appointments.filter(a => a.team_member_name === m.name && a.status === 'confirmed');
      const revenue = appts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
      const absences = m.absences_json || [];
      return {
        name: m.name,
        revenue,
        vacation: absences.filter(a => a.type === 'vacation').length,
        sick: absences.filter(a => a.type === 'sick').length,
        injury: absences.filter(a => a.type === 'injury').length,
      };
    });
    const totalRev = stats.reduce((acc, s) => acc + s.revenue, 0);
    return { stats, totalRev };
  }, [team, appointments, isAdmin]);

  return (
    <>
      <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-widest mb-2">Kristal Vision</p>
                <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">
                  {isAdmin ? 'Amministrazione' : isCollaborator ? 'Mio Workspace' : 'Il Tuo Rituale'}
                </h2>
              </div>
              {isAdmin && visionAnalytics && (
                <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl">
                  <p className="text-[9px] text-amber-500 font-bold uppercase mb-1">Entrate Atelier</p>
                  <p className="text-2xl font-luxury font-bold">CHF {visionAnalytics.totalRev}</p>
                </div>
              )}
            </header>

            {isAdmin && visionAnalytics && (
              <div className="grid md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-5">
                {visionAnalytics.stats.map(s => (
                  <div key={s.name} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                    <h4 className="font-luxury font-bold text-xl mb-4 group-hover:text-amber-600 transition-colors">{s.name}</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="text-gray-400">Valore Ritual</span>
                        <span className="text-gray-900">CHF {s.revenue}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="text-gray-400">Assenze</span>
                        <span className="text-amber-700">{s.vacation + s.sick + s.injury} gg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isCollaborator && currentMember && (
              <CollaboratorDashboard 
                member={currentMember} appointments={appointments} requests={requests} user={user!} 
                onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(); }}
                onUpdateProfile={async (p) => { await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p }); refreshData(); }}
                onAddManualAppointment={() => { setFormInitialData(null); setIsFormOpen(true); }}
              />
            )}
            
            {(isAdmin || isCollaborator) && (
              <div className="flex flex-col md:flex-row justify-end gap-4 pt-10">
                 <button onClick={() => setIsNewGuestOpen(true)} className="px-10 py-5 bg-white text-black border border-gray-100 rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-50 transition-all">Nuovo Ospite</button>
                 <button onClick={() => { setFormInitialData(null); setIsFormOpen(true); }} className="px-10 py-5 bg-black text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:bg-amber-700 transition-all">Rituale Manuale</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-10 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold">Menu Ritual</h2>
              <button onClick={() => setIsServiceFormOpen(true)} className="px-6 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Nuovo Servizio</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex justify-between items-center shadow-sm hover:shadow-lg transition-all">
                  <div>
                    <p className="text-amber-600 text-[8px] font-bold uppercase mb-1">{s.category}</p>
                    <h4 className="font-bold text-lg">{s.name}</h4>
                    <p className="text-xs text-gray-400 font-medium">{s.duration} min • CHF {s.price}</p>
                  </div>
                  <button className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 hover:text-black transition-colors"><i className="fas fa-edit"></i></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Planning {isCollaborator ? 'Personale' : 'Atelier'}</h2>
            {isAdmin && <RequestManagement requests={requests} onAction={async (id, action) => {
              const req = requests.find(r => r.id === id);
              if (req && action === 'approved') {
                const member = team.find(m => m.name === req.member_name);
                if (member) {
                  const updatedAbsences = req.type === 'availability_change' 
                    ? (member.absences_json || []).filter(a => a.startDate !== req.start_date)
                    : [...(member.absences_json || []), { id: Math.random().toString(36).substr(2, 9), startDate: req.start_date, endDate: req.end_date, type: req.type, notes: req.notes, isFullDay: req.is_full_day }];
                  await db.team.upsert({ ...member, absences_json: updatedAbsences });
                }
              }
              await db.requests.update(id, { status: action });
              refreshData();
            }} />}
            <TeamPlanning 
              team={team} 
              appointments={appointments} 
              onToggleVacation={(m, d) => setQuickRequestData({ date: d, memberName: m })} 
              onSlotClick={handleOpenSlotForm}
              currentUserMemberName={currentMember?.name} 
              requests={requests} 
              isCollaborator={isCollaborator}
            />
          </div>
        )}

        {activeTab === 'clients' && (isAdmin || isCollaborator) && (
          <div className="space-y-10 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold">Registro Ospiti</h2>
              <button onClick={() => setIsNewGuestOpen(true)} className="px-6 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Registra Ospite</button>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm">
               <input type="text" placeholder="Cerca ospite..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="w-full p-5 bg-gray-50 rounded-2xl mb-8 outline-none border-none text-sm font-bold shadow-inner" />
               <div className="grid gap-4">
                  {profiles.filter(p => p.role === 'client' && (!clientSearch || p.full_name?.toLowerCase().includes(clientSearch.toLowerCase()))).map(p => {
                    const clientAppts = appointments.filter(a => a.client_id === p.id);
                    return (
                      <button key={p.id} onClick={() => setSelectedClientToManage(p)} className="p-6 bg-gray-50 rounded-3xl flex justify-between items-center hover:bg-white hover:shadow-xl transition-all group">
                        <div className="flex items-center gap-4 text-left">
                          <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-14 h-14 rounded-2xl object-cover shadow-md" />
                          <div>
                            <h5 className="font-bold text-sm text-gray-900 group-hover:text-amber-600 transition-colors">{p.full_name}</h5>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{clientAppts.length} Ritual Totali</p>
                          </div>
                        </div>
                        <i className="fas fa-chevron-right text-gray-200 group-hover:text-amber-500 transition-all"></i>
                      </button>
                    );
                  })}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'team_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold">Gestione Staff</h2>
              <button onClick={() => setSelectedMemberToManage({ name: 'Nuovo', role: 'Artist' } as any)} className="px-6 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Nuovo Collaboratore</button>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {team.map(m => (
                <button key={m.name} onClick={() => setSelectedMemberToManage(m)} className="bg-white p-10 rounded-[4rem] border border-gray-50 shadow-sm flex flex-col items-center gap-6 hover:shadow-2xl transition-all group">
                  <div className="relative">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-28 h-28 rounded-full object-cover shadow-2xl border-4 border-white group-hover:border-amber-500 transition-all" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-black text-white rounded-full text-[7px] font-bold uppercase tracking-widest">Setup</div>
                  </div>
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

      {isNewGuestOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
            <button onClick={() => setIsNewGuestOpen(false)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <NewGuestForm onSave={async (guest) => {
              await db.profiles.upsert({ ...guest, role: 'client' });
              setIsNewGuestOpen(false);
              refreshData();
            }} onCancel={() => setIsNewGuestOpen(false)} />
          </div>
        </div>
      )}

      {selectedMemberToManage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
            <button onClick={() => setSelectedMemberToManage(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black transition-all">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <TeamManagement member={selectedMemberToManage} appointments={appointments} services={services} profiles={profiles} onSave={async (m) => { await db.team.upsert(m); setSelectedMemberToManage(null); refreshData(); }} onClose={() => setSelectedMemberToManage(null)} />
          </div>
        </div>
      )}

      {selectedClientToManage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
            <button onClick={() => setSelectedClientToManage(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black transition-all">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <div className="flex items-center gap-8 mb-12 border-b border-gray-50 pb-8">
               <img src={selectedClientToManage.avatar || `https://ui-avatars.com/api/?name=${selectedClientToManage.full_name}`} className="w-24 h-24 rounded-3xl shadow-xl object-cover" />
               <div>
                  <h3 className="text-4xl font-luxury font-bold text-gray-900">{selectedClientToManage.full_name}</h3>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Ospite Premium</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedClientToManage.gender === 'F' ? 'Donna' : 'Uomo'}</span>
                  </div>
               </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Contatti</h4>
                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase"><span>Email</span><span className="text-gray-400">{selectedClientToManage.email}</span></div>
                  <div className="flex justify-between text-[10px] font-bold uppercase"><span>Telefono</span><span className="text-gray-400">{selectedClientToManage.phone}</span></div>
                  <div className="flex justify-between text-[10px] font-bold uppercase"><span>Nato il</span><span className="text-gray-400">{selectedClientToManage.dob}</span></div>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Rituali Eseguiti</h4>
                <div className="p-8 bg-amber-50 rounded-[3rem] border border-amber-100 text-center shadow-inner">
                  <p className="text-[9px] font-bold text-amber-600 uppercase mb-2">Totale Ritual</p>
                  <p className="text-3xl font-luxury font-bold text-amber-900">{appointments.filter(a => a.client_id === selectedClientToManage.id).length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setIsServiceFormOpen(false)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
                <i className="fas fa-times text-2xl"></i>
              </button>
              <ServiceForm onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(); }} onCancel={() => setIsServiceFormOpen(false)} />
           </div>
        </div>
      )}

      {quickRequestData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-in zoom-in-95">
          <QuickRequestModal 
            date={quickRequestData.date} memberName={quickRequestData.memberName} 
            existingRequest={requests.find(r => r.member_name === quickRequestData.memberName && r.start_date === quickRequestData.date && r.status === 'pending')}
            existingAbsence={team.find(m => m.name === quickRequestData.memberName)?.absences_json?.find(a => a.startDate === quickRequestData.date)}
            onClose={() => setQuickRequestData(null)} 
            onAction={async (action, data) => {
              await handleQuickRequestAction(action, data);
            }}
          />
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <AppointmentForm 
               services={services} 
               team={team} 
               existingAppointments={appointments} 
               onSave={async (a) => { 
                 await db.appointments.upsert({ ...a, client_id: isAdmin || isCollaborator ? a.client_id : user?.id }); 
                 setIsFormOpen(false); 
                 setFormInitialData(null);
                 refreshData(); 
               }} 
               onCancel={() => { setIsFormOpen(false); setFormInitialData(null); }} 
               isAdminOrStaff={isAdmin || isCollaborator} 
               profiles={profiles}
               initialData={formInitialData}
             />
          </div>
        </div>
      )}
    </>
  );
};

export default App;

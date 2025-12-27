
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import RequestManagement from './components/RequestManagement';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import QuickRequestModal from './components/QuickRequestModal';
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
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

  const refreshData = async () => {
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
        setUser({ id: session.user.id, email: session.user.email!, fullName: profile?.full_name || 'Ospite', phone: profile?.phone || '', role, avatar: profile?.avatar });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (!loading) refreshData(); }, [loading, user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleQuickRequestAction = async (action: 'create' | 'cancel' | 'revoke', data?: any) => {
    if (!quickRequestData) return;
    try {
      if (isAdmin && action === 'create') {
        // Admin può forzare il congedo direttamente
        const member = team.find(m => m.name === quickRequestData.memberName);
        if (member) {
          const newAbsence = { id: Math.random().toString(36).substr(2, 9), startDate: quickRequestData.date, endDate: quickRequestData.date, type: data.type, notes: data.notes, isFullDay: data.isFullDay };
          const updatedAbsences = [...(member.absences_json || []), newAbsence];
          await db.team.upsert({ ...member, absences_json: updatedAbsences });
        }
      } else if (action === 'create') {
        await db.requests.create({ member_name: quickRequestData.memberName, type: data.type, start_date: quickRequestData.date, end_date: quickRequestData.date, notes: data.notes, is_full_day: data.isFullDay, status: 'pending', created_at: new Date().toISOString() });
      } else if (action === 'cancel') {
        const req = requests.find(r => r.member_name === quickRequestData.memberName && r.start_date === quickRequestData.date && r.status === 'pending');
        if (req) await db.requests.delete(req.id);
      } else if (action === 'revoke') {
        await db.requests.create({ member_name: quickRequestData.memberName, type: 'availability_change', start_date: quickRequestData.date, end_date: quickRequestData.date, notes: data.notes, is_full_day: true, status: 'pending', created_at: new Date().toISOString() });
      }
      await refreshData();
      setQuickRequestData(null);
    } catch (e) { console.error("QuickRequest Error:", e); }
  };

  const handleAdminRequestAction = async (id: string, action: 'approved' | 'rejected') => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    try {
      if (action === 'approved') {
        const member = team.find(m => m.name === req.member_name);
        if (member) {
          if (req.type === 'availability_change') {
            const updatedAbsences = (member.absences_json || []).filter(a => a.startDate !== req.start_date);
            await db.team.upsert({ ...member, absences_json: updatedAbsences });
          } else {
            const newAbsence = { id: Math.random().toString(36).substr(2, 9), startDate: req.start_date, endDate: req.end_date, type: req.type, notes: req.notes, isFullDay: req.is_full_day };
            const updatedAbsences = [...(member.absences_json || []), newAbsence];
            await db.team.upsert({ ...member, absences_json: updatedAbsences });
          }
        }
      }
      await db.requests.update(id, { status: action });
      await refreshData();
    } catch (e) { console.error("Admin Action Error:", e); }
  };

  const visionAnalytics = useMemo(() => {
    if (!isAdmin) return null;
    const now = new Date();
    const stats = team.map(m => {
      const appts = appointments.filter(a => a.team_member_name === m.name && a.status === 'confirmed');
      const revenue = appts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
      const absences = m.absences_json || [];
      return {
        name: m.name,
        revenue,
        apptsCount: appts.length,
        vacation: absences.filter(a => a.type === 'vacation').length,
        sick: absences.filter(a => a.type === 'sick').length,
        injury: absences.filter(a => a.type === 'injury').length,
      };
    });
    const totalRev = stats.reduce((acc, s) => acc + s.revenue, 0);
    return { stats, totalRev };
  }, [team, appointments, isAdmin]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <>
      <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in">
            <header className="flex justify-between items-end">
              <div>
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-widest mb-2">Benvenuti in Atelier</p>
                <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">{user ? user.fullName.split(' ')[0] : 'Kristal'}</h2>
              </div>
              {isAdmin && visionAnalytics && (
                <div className="bg-black p-6 rounded-3xl text-white shadow-2xl">
                  <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">Totale Visione</p>
                  <p className="text-xl font-luxury font-bold">CHF {visionAnalytics.totalRev}</p>
                </div>
              )}
            </header>

            {isCollaborator && currentMember && (
              <CollaboratorDashboard 
                member={currentMember} appointments={appointments} requests={requests} user={user!} 
                onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(); }}
                onUpdateProfile={async (p) => { await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p }); refreshData(); }}
              />
            )}

            {!isCollaborator && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm">
                  <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-8">Collezioni Disponibili</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.slice(0, 4).map(s => (
                      <button key={s.id} onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }} className="p-6 bg-gray-50 rounded-2xl hover:bg-amber-50 transition-all text-left">
                        <h4 className="font-bold text-sm mb-1">{s.name}</h4>
                        <p className="text-xs font-luxury font-bold">CHF {s.price}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-black text-white p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between">
                  <p className="text-lg font-luxury leading-relaxed italic">"L'eccellenza non è un atto, ma un'abitudine che coltiviamo in ogni rituale."</p>
                  <button onClick={() => user ? setIsFormOpen(true) : setIsAuthOpen(true)} className="w-full mt-10 py-4 bg-white text-black rounded-2xl font-bold uppercase text-[10px] tracking-widest">Riserva Ora</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && isAdmin && visionAnalytics && (
           <div className="mt-20 space-y-10 animate-in slide-in-from-bottom-5">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-b pb-4">Visione Analitica Staff</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {visionAnalytics.stats.map(s => (
                  <div key={s.name} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h4 className="font-luxury font-bold text-xl mb-4">{s.name}</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400"><span>Fatturato</span><span className="text-gray-900">CHF {s.revenue}</span></div>
                      <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400"><span>Vacanze</span><span className="text-blue-600">{s.vacation} gg</span></div>
                      <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400"><span>Malattia</span><span className="text-red-600">{s.sick} gg</span></div>
                      <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400"><span>Infortuni</span><span className="text-orange-600">{s.injury} gg</span></div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {activeTab === 'clients' && isAdmin && (
          <div className="space-y-10 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold">Registro Ospiti</h2>
              <button onClick={() => setIsAuthOpen(true)} className="px-6 py-3 bg-black text-white rounded-xl font-bold uppercase text-[9px] tracking-widest">Aggiungi Ospite</button>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm">
               <input type="text" placeholder="Cerca ospite..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="w-full p-5 bg-gray-50 rounded-2xl mb-8 outline-none border-none text-sm font-bold" />
               <div className="grid gap-4">
                  {profiles.filter(p => !clientSearch || p.full_name?.toLowerCase().includes(clientSearch.toLowerCase())).map(p => (
                    <div key={p.id} className="p-6 bg-gray-50 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-12 h-12 rounded-xl object-cover" />
                        <div><h5 className="font-bold text-sm">{p.full_name}</h5><p className="text-[10px] text-gray-400">{p.email}</p></div>
                      </div>
                      <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[8px] font-bold uppercase text-amber-600">{p.role}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Planning Atelier</h2>
            {isAdmin && <RequestManagement requests={requests} onAction={handleAdminRequestAction} />}
            <TeamPlanning team={team} appointments={appointments} onToggleVacation={(m, d) => setQuickRequestData({ date: d, memberName: m })} currentUserMemberName={currentMember?.name} requests={requests} />
          </div>
        )}

        {activeTab === 'team_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold">Gestione Staff</h2>
              <button onClick={() => setSelectedMemberToManage({ name: 'Nuovo Collaboratore', role: 'Stylist' } as any)} className="px-6 py-3 bg-black text-white rounded-xl font-bold uppercase text-[9px] tracking-widest">Aggiungi Artista</button>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {team.map(m => (
                <button key={m.name} onClick={() => setSelectedMemberToManage(m)} className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm flex flex-col items-center gap-4 hover:shadow-xl transition-all">
                  <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-white" />
                  <div className="text-center"><h4 className="text-xl font-luxury font-bold">{m.name}</h4><p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{m.role}</p></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Layout>

      {/* MODALI - RIMASTI INVARIATI MA GESTITI MEGLIO IN App.tsx PER STABILITA' */}
      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md relative">
            <button onClick={() => setIsAuthOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-white z-[2001]"><i className="fas fa-times text-2xl"></i></button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(); }} />
          </div>
        </div>
      )}

      {selectedMemberToManage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative">
            <TeamManagement member={selectedMemberToManage} appointments={appointments} services={services} profiles={profiles} onSave={async (m) => { await db.team.upsert(m); setSelectedMemberToManage(null); refreshData(); }} onClose={() => setSelectedMemberToManage(null)} />
          </div>
        </div>
      )}

      {quickRequestData && (
        <QuickRequestModal 
          date={quickRequestData.date} memberName={quickRequestData.memberName} 
          existingRequest={requests.find(r => r.member_name === quickRequestData.memberName && r.start_date === quickRequestData.date && r.status === 'pending')}
          existingAbsence={team.find(m => m.name === quickRequestData.memberName)?.absences_json?.find(a => a.startDate === quickRequestData.date)}
          onClose={() => setQuickRequestData(null)} onAction={handleQuickRequestAction}
        />
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
             <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={async (a) => { await db.appointments.upsert({ ...a, client_id: isAdmin ? a.client_id : user?.id }); setIsFormOpen(false); refreshData(); }} onCancel={() => setIsFormOpen(false)} isAdmin={isAdmin} profiles={profiles} initialData={selectedAppointment} />
          </div>
        </div>
      )}
    </>
  );
};

export default App;

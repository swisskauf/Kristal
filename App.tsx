
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
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
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
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);

    const confirmed = appointments.filter(a => a.status === 'confirmed');
    const getRevenue = (appts: any[]) => appts.reduce((acc, a) => acc + (a.services?.price || 0), 0);

    return {
      global: {
        daily: getRevenue(confirmed.filter(a => a.date.startsWith(todayStr))),
        weekly: getRevenue(confirmed.filter(a => new Date(a.date) >= startOfWeek)),
        monthly: getRevenue(confirmed.filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })),
        yearly: getRevenue(confirmed.filter(a => new Date(a.date).getFullYear() === now.getFullYear()))
      },
      team: team.map(m => {
        const mAppts = confirmed.filter(a => a.team_member_name === m.name);
        const vacationUsed = (m.absences_json || [])
          .filter(abs => abs.type === 'vacation')
          .reduce((acc, abs) => {
            const s = new Date(abs.startDate);
            const e = new Date(abs.endDate);
            return acc + (Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
          }, 0);

        return {
          name: m.name,
          avatar: m.avatar,
          daily: getRevenue(mAppts.filter(a => a.date.startsWith(todayStr))),
          monthly: getRevenue(mAppts.filter(a => {
            const d = new Date(a.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })),
          vacationRemaining: (m.total_vacation_days || 25) - vacationUsed,
          totalVacation: m.total_vacation_days || 25
        };
      })
    };
  }, [appointments, team]);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await db.profiles.get(session.user.id);
          if (profile) {
            setUser({
              id: session.user.id,
              email: profile.email || session.user.email!,
              fullName: profile.full_name || 'Ospite',
              phone: profile.phone || '',
              role: profile.role || 'client',
              avatar: profile.avatar
            });
          }
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
        if (profile) {
          setUser({
            id: session.user.id,
            email: profile.email || session.user.email!,
            fullName: profile.full_name || 'Ospite',
            phone: profile.phone || '',
            role: profile.role || 'client',
            avatar: profile.avatar
          });
        }
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
      setAppointments(appts);
      setRequests(reqs);
      setProfiles(profs);
    } catch (e) {
      console.error("Refresh Data error", e);
    }
  };

  useEffect(() => {
    if (!loading) refreshData();
  }, [loading, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleToggleVacation = async (memberName: string, date: string) => {
    const member = team.find(m => m.name === memberName);
    if (!member) return;

    if (isCollaborator) {
      if (member.profile_id === user?.id) {
        setQuickRequestData({ date, memberName });
      } else {
        alert("Azione non consentita sui colleghi.");
      }
      return;
    }

    if (isAdmin) {
      let updatedDates = [...(member.unavailable_dates || [])];
      if (updatedDates.includes(date)) {
        updatedDates = updatedDates.filter(d => d !== date);
      } else {
        updatedDates.push(date);
      }
      try {
        await db.team.upsert({ ...member, unavailable_dates: updatedDates });
        await refreshData();
      } catch (e) {
        alert("Errore salvataggio.");
      }
    }
  };

  const handleQuickRequestAction = async (action: 'create' | 'cancel' | 'revoke', data?: { type: AbsenceType, notes?: string, isFullDay: boolean, startTime?: string, endTime?: string }) => {
    if (!quickRequestData) return;
    const { date, memberName } = quickRequestData;

    try {
      if (action === 'create' && data) {
        await db.requests.create({
          member_name: memberName,
          type: data.type,
          start_date: date,
          end_date: date,
          start_time: data.isFullDay ? null : data.startTime,
          end_time: data.isFullDay ? null : data.endTime,
          is_full_day: data.isFullDay,
          status: 'pending',
          notes: data.notes || 'Richiesta rapida da Agenda.'
        });
        alert("Richiesta inviata.");
      } else if (action === 'cancel') {
        const reqToCancel = requests.find(r => r.member_name === memberName && r.start_date === date && r.status === 'pending');
        if (reqToCancel) {
          await db.requests.delete(reqToCancel.id);
          alert("Richiesta annullata.");
        }
      }
      await refreshData();
    } catch (e: any) {
      alert("Errore: " + (e.message || "Operazione fallita."));
    } finally {
      setQuickRequestData(null);
    }
  };

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    
    try {
      await db.requests.update(requestId, { status });
      if (status === 'approved') {
        const member = team.find(m => m.name === req.member_name);
        if (member) {
          const entry = {
            id: req.id,
            startDate: req.start_date,
            endDate: req.end_date,
            startTime: req.start_time,
            endTime: req.end_time,
            isFullDay: req.is_full_day,
            type: req.type,
            notes: req.notes
          };
          const absences = [...(member.absences_json || []), entry];
          const dates = [...(member.unavailable_dates || [])];
          
          if (req.is_full_day) {
            let curr = new Date(req.start_date);
            const end = new Date(req.end_date);
            while (curr <= end) {
              const dateStr = curr.toISOString().split('T')[0];
              if (!dates.includes(dateStr)) dates.push(dateStr);
              curr.setDate(curr.getDate() + 1);
            }
          }
          await db.team.upsert({ ...member, absences_json: absences, unavailable_dates: dates });
        }
      }
      await refreshData();
    } catch (e) {
      alert("Errore aggiornamento richiesta.");
    }
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
        
        {/* DASHBOARD CLIENTE / GUEST */}
        {activeTab === 'dashboard' && !isCollaborator && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">{timeGreeting}</p>
                <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">
                  {user ? user.fullName.split(' ')[0] : 'Benvenuti'}
                </h2>
              </div>
              {isAdmin && <span className="px-4 py-2 bg-gray-900 text-white text-[8px] font-bold uppercase rounded-full tracking-widest">Atelier Management</span>}
            </header>

            {isAdmin && (
              <div className="space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Fatturato Oggi', value: businessStats.global.daily, color: 'amber' },
                    { label: 'Settimana', value: businessStats.global.weekly, color: 'gray' },
                    { label: 'Mese Corrente', value: businessStats.global.monthly, color: 'gray' },
                    { label: 'Proiezione Anno', value: businessStats.global.yearly, color: 'black' },
                  ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border border-gray-50 shadow-sm transition-all hover:scale-[1.02] ${stat.color === 'black' ? 'bg-black text-white' : stat.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white'}`}>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mb-2 ${stat.color === 'black' ? 'text-amber-500' : 'text-gray-400'}`}>{stat.label}</p>
                      <h3 className="text-2xl font-luxury font-bold">CHF {stat.value}</h3>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-8">
              <div className="col-span-2 bg-white p-8 md:p-10 rounded-[3rem] border border-gray-50 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Collezioni & Ritual</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {services.slice(0, 6).map(s => (
                    <button key={s.id} onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }} className="p-6 bg-gray-50 rounded-[2rem] hover:bg-amber-50 transition-all text-left group">
                      <p className="text-[8px] font-bold text-amber-600 uppercase mb-1">{s.category}</p>
                      <h4 className="font-bold text-sm mb-1">{s.name}</h4>
                      <p className="text-xs font-luxury font-bold text-gray-900">CHF {s.price}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col justify-between h-full min-h-[300px]">
                <div>
                  <h3 className="text-xl font-luxury font-bold mb-4">L'Atelier</h3>
                  <p className="text-[11px] leading-relaxed text-gray-400 italic">"Un rifugio di lusso dedicato alla cura del sé. Ogni servizio è un rituale sartoriale unico."</p>
                </div>
                <button onClick={() => user ? setIsFormOpen(true) : setIsAuthOpen(true)} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-xl">Riserva un Momento</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB OSPITI (ADMIN) */}
        {activeTab === 'clients' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Gestione Ospiti</h2>
            <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
              <input type="text" placeholder="Cerca ospite per nome o email..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl mb-8 outline-none border-none text-sm font-bold" />
              <div className="grid gap-4">
                {profiles.filter(p => p.full_name?.toLowerCase().includes(clientSearch.toLowerCase())).map(p => (
                  <div key={p.id} className="p-6 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-12 h-12 rounded-full" />
                      <div>
                        <h4 className="font-bold text-sm">{p.full_name}</h4>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest">{p.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB SERVIZI (ADMIN) */}
        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold">Menu Ritual</h2>
              <button onClick={() => { setEditingService(null); setIsServiceFormOpen(true); }} className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Aggiungi Servizio</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex justify-between items-center group shadow-sm hover:shadow-lg transition-all">
                  <div>
                    <p className="text-amber-600 text-[8px] font-bold uppercase mb-1">{s.category}</p>
                    <h4 className="font-bold text-lg">{s.name}</h4>
                    <p className="text-xs text-gray-400">{s.duration} min • CHF {s.price}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingService(s); setIsServiceFormOpen(true); }} className="p-3 bg-gray-50 rounded-full hover:bg-black hover:text-white transition-all"><i className="fas fa-edit text-xs"></i></button>
                    <button onClick={async () => { if(confirm('Eliminare questo servizio?')) { await db.services.delete(s.id); refreshData(); } }} className="p-3 bg-gray-50 rounded-full hover:bg-red-500 hover:text-white transition-all text-red-400"><i className="fas fa-trash-alt text-xs"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COLLABORATOR DASHBOARD */}
        {(activeTab === 'collab_dashboard' || (activeTab === 'dashboard' && isCollaborator)) && isCollaborator && (
          <div className="animate-in fade-in duration-700">
            {currentMember ? (
              <CollaboratorDashboard 
                member={currentMember} 
                appointments={appointments} 
                requests={requests} 
                user={user!}
                onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(); }}
                onUpdateProfile={async (p) => { 
                  if (p.avatar || p.full_name || p.phone || p.email) {
                    await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p });
                  }
                  if (p.bio || p.avatar) {
                    await db.team.upsert({ ...currentMember, ...p });
                  }
                  refreshData(); 
                }}
              />
            ) : (
              <div className="bg-white p-12 rounded-[3rem] text-center border border-dashed border-gray-100">
                 <h2 className="text-2xl font-luxury font-bold mb-4 text-gray-900">Workspace in fase di attivazione...</h2>
                 <p className="text-sm text-gray-400 leading-relaxed italic mb-6">Il vostro profilo artista non è ancora collegato correttamente.</p>
                 <div className="p-6 bg-amber-50 rounded-2xl inline-block">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-2">Comunica questo ID all'amministratore:</p>
                    <code className="text-xs font-mono font-bold text-amber-900 bg-white px-4 py-2 rounded-lg">{user?.id}</code>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* TEAM PLANNING */}
        {(activeTab === 'team_schedule') && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Planning Atelier</h2>
            {isAdmin && <RequestManagement requests={requests} onAction={handleRequestAction} />}
            <TeamPlanning team={team} appointments={appointments} onToggleVacation={handleToggleVacation} currentUserMemberName={currentMember?.name} requests={requests} />
            {isAdmin && (
              <div className="grid md:grid-cols-3 gap-6">
                {team.map(m => (
                  <div key={m.name} className="bg-white p-8 rounded-[3rem] border border-gray-50 text-center shadow-sm hover:shadow-lg transition-all">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg border-2 border-white" />
                    <h4 className="text-xl font-luxury font-bold">{m.name}</h4>
                    <p className="text-[9px] text-amber-600 font-bold uppercase mb-4 tracking-widest">{m.role}</p>
                    <button onClick={() => setEditingMember(m)} className="w-full py-3 bg-gray-50 rounded-xl text-[9px] font-bold uppercase hover:bg-black hover:text-white transition-all tracking-widest">Configura</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </Layout>

      {/* MODAL SYSTEMS */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
             <TeamManagement profiles={profiles} member={editingMember} appointments={appointments} services={services} onSave={async (m) => { await db.team.upsert(m); setEditingMember(null); refreshData(); }} onClose={() => setEditingMember(null)} />
          </div>
        </div>
      )}

      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl">
             <h3 className="text-2xl font-luxury font-bold mb-8">{editingService ? 'Modifica Ritual' : 'Nuovo Ritual'}</h3>
             <ServiceForm initialData={editingService || undefined} onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(); }} onCancel={() => setIsServiceFormOpen(false)} />
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

      {quickRequestData && (
        <QuickRequestModal 
          date={quickRequestData.date} 
          memberName={quickRequestData.memberName}
          existingRequest={requests.find(r => r.member_name === quickRequestData.memberName && r.start_date === quickRequestData.date && r.status === 'pending')}
          existingAbsence={team.find(m => m.name === quickRequestData.memberName)?.absences_json?.find(a => a.startDate === quickRequestData.date)}
          onClose={() => setQuickRequestData(null)}
          onAction={handleQuickRequestAction}
        />
      )}

      <AIAssistant user={user} />
    </>
  );
};

export default App;

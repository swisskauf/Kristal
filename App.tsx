import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import AppointmentForm from './components/AppointmentForm';
import TeamPlanning from './components/TeamPlanning';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

const toDateKeyLocal = (d: Date) =>
  `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Appointment | null>(null);

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';

  const normalizeTeam = useCallback(
    (list: any[]) =>
      (list || []).map((m) => ({
        ...m,
        weekly_closures: Array.isArray(m.weekly_closures) ? m.weekly_closures.map(Number) : [],
      })),
    [],
  );

  const fetchData = useCallback(async () => {
    try {
      const [svcs, tm, appts, profs] = await Promise.all([
        db.services.getAll(),
        db.team.getAll(),
        db.appointments.getAll(),
        db.profiles.getAll(),
      ]);

      setServices(svcs.length ? svcs : DEFAULT_SERVICES);
      setTeam(tm.length ? normalizeTeam(tm) : normalizeTeam(DEFAULT_TEAM));
      setAppointments(appts || []);
      setProfiles(profs || []);
    } catch (error) {
      console.error("Errore durante l'aggiornamento dei dati:", error);
    }
  }, [normalizeTeam]);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppointments([]);
        setActiveTab('dashboard');
      } else if (session?.user) {
        const profile = profiles.find((p) => p.id === session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role: profile?.role || 'client',
          fullName: profile?.full_name || 'Ospite',
          avatar: profile?.avatar,
        });
      }
      setLoading(false);
    });
  }, [profiles]);

  useEffect(() => {
    if (!loading) fetchData();
  }, [loading, fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveAppointment = async (appointment: Appointment) => {
    try {
      const { data, error } = await db.appointments.upsert({
        ...appointment,
        client_id: appointment.client_id || user?.id,
        status: 'confirmed',
      });
      if (error || !data) throw error || new Error("Errore durante il salvataggio dell'appuntamento.");
      setAppointments((prev) => [...prev.filter((a) => a.id !== data.id), data]);
      setIsFormOpen(false);
      setFormInitialData(null);
    } catch (error) {
      console.error("Errore durante l'inserimento dell'appuntamento:", error);
    }
  };

  const renderForm = () => {
    if (!isFormOpen) return null;
    return (
      <AppointmentForm
        services={services}
        team={team}
        existingAppointments={appointments}
        isAdminOrStaff={isAdmin || isCollaborator}
        profiles={profiles}
        initialData={formInitialData}
        onCancel={() => setIsFormOpen(false)}
        onSave={handleSaveAppointment}
      />
    );
  };

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <CollaboratorDashboard
          appointments={appointments}
          team={team}
          user={user}
          onAddManualAppointment={() => setIsFormOpen(true)}
        />
      )}
      {activeTab === 'team_schedule' && (
        <TeamPlanning team={team} appointments={appointments} onSlotClick={() => setIsFormOpen(true)} />
      )}
      {renderForm()}
    </Layout>
  );
};

export default App;

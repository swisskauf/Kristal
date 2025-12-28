// ...import invariati...

const App: React.FC = () => {
  // ...stato invariato...

  const normalizeTeam = (list: any[]) =>
    (list || []).map((m) => ({
      ...m,
      weekly_closures: Array.isArray(m.weekly_closures) ? m.weekly_closures.map(Number) : [],
    }));

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

  // resto invariato...
};

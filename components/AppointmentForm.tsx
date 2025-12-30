
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Service, TeamMember, AbsenceEntry } from '../types';

interface AppointmentFormProps {
  onSave: (app: Partial<Appointment>) => void;
  onCancel: () => void;
  initialData?: Partial<Appointment>;
  services: Service[];
  team: TeamMember[];
  existingAppointments: Appointment[];
  isAdminOrStaff?: boolean;
  profiles?: Array<{
    id: string;
    full_name: string;
    email?: string | null;
    phone?: string | null;
  }>;
  salonClosures?: string[];
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSave,
  onCancel,
  initialData,
  services,
  team,
  existingAppointments,
  isAdminOrStaff = false,
  profiles = [],
  salonClosures = []
}) => {
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const [clientId, setClientId] = useState<string>(initialData?.client_id || '');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>(initialData?.service_id || '');
  const [teamMemberName, setTeamMemberName] = useState<string>(initialData?.team_member_name || '');
  const [selectedDate, setSelectedDate] = useState<string>(
    initialData?.date ? new Date(initialData.date).toLocaleDateString('en-CA') : todayStr
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    initialData?.date ? new Date(initialData.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (services.length > 0 && !serviceId) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  useEffect(() => {
    if (team.length > 0 && !teamMemberName) {
      setTeamMemberName(team[0].name);
    }
  }, [team, teamMemberName]);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const selectedMember = useMemo(() => team.find((t) => t.name === teamMemberName), [team, teamMemberName]);
  
  const filteredProfiles = useMemo(() => {
    return profiles
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          (p.email && p.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
          (p.phone && p.phone.includes(clientSearch)),
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [profiles, clientSearch]);

  const next21Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 21; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toLocaleDateString('en-CA'));
    }
    return days;
  }, []);

  const getSlotValidation = (timeStr: string) => {
    if (!selectedMember || !selectedDate || !selectedService) return { valid: false, reason: 'Dati incompleti' };

    // 0. Chiusura Globale Salone
    if (salonClosures && salonClosures.includes(selectedDate)) {
      return { valid: false, reason: 'Atelier Chiuso (Festività)' };
    }

    const dObj = new Date(`${selectedDate}T12:00:00`);
    
    // 1. Chiusura Settimanale Artista
    if ((selectedMember.weekly_closures || []).includes(dObj.getDay())) {
      return { valid: false, reason: `Giorno di riposo per ${selectedMember.name}` };
    }

    // 2. Ferie o Indisponibilità Artista
    if ((selectedMember.unavailable_dates || []).includes(selectedDate)) {
      return { valid: false, reason: `${selectedMember.name} non è in Atelier oggi` };
    }

    const [h, m] = timeStr.split(':').map(Number);
    const slotStart = h * 60 + m;
    const duration = selectedService.duration || 30;
    const slotEnd = slotStart + duration;

    // 3. Controllo Congedi Approvati (anche parziali)
    const activeAbsence = (selectedMember.absences_json || []).find(abs => {
      const absStart = new Date(abs.startDate).toISOString().split('T')[0];
      const absEnd = new Date(abs.endDate).toISOString().split('T')[0];
      if (selectedDate >= absStart && selectedDate <= absEnd) {
        if (abs.isFullDay) return true;
        if (abs.startTime && abs.endTime) {
          const [asH, asM] = abs.startTime.split(':').map(Number);
          const [aeH, aeM] = abs.endTime.split(':').map(Number);
          const absS = asH * 60 + asM;
          const absE = aeH * 60 + aeM;
          return slotStart < absE && slotEnd > absS;
        }
      }
      return false;
    });

    if (activeAbsence) {
      return { valid: false, reason: `${selectedMember.name} è in congedo (${activeAbsence.type})` };
    }

    // 4. Orari di lavoro standard
    const [whS, wmS] = (selectedMember.work_start_time || '08:30').split(':').map(Number);
    const [whE, wmE] = (selectedMember.work_end_time || '18:30').split(':').map(Number);
    const workStart = whS * 60 + wmS;
    const workEnd = whE * 60 + wmE;

    if (slotStart < workStart || slotEnd > workEnd) {
      return { valid: false, reason: 'Fuori orario lavorativo' };
    }

    // 5. Pausa pranzo
    if (selectedMember.break_start_time && selectedMember.break_end_time) {
      const [bsH, bsM] = selectedMember.break_start_time.split(':').map(Number);
      const [beH, beM] = selectedMember.break_end_time.split(':').map(Number);
      const bStart = bsH * 60 + bsM;
      const bEnd = beH * 60 + beM;
      if (slotStart < bEnd && slotEnd > bStart) {
        return { valid: false, reason: 'Pausa pranzo' };
      }
    }

    // 6. Conflitti con appuntamenti esistenti
    const conflict = existingAppointments.find((app) => {
      if (app.id === initialData?.id || app.status === 'cancelled') return false;
      if (app.team_member_name !== teamMemberName) return false;
      const appD = new Date(app.date).toLocaleDateString('en-CA');
      if (appD !== selectedDate) return false;

      const appDateObj = new Date(app.date);
      const appStart = appDateObj.getHours() * 60 + appDateObj.getMinutes();
      const appDuration = app.services?.duration || 30;
      const appEnd = appStart + appDuration;

      return slotStart < appEnd && slotEnd > appStart;
    });

    if (conflict) {
      return { valid: false, reason: 'Slot già occupato' };
    }

    return { valid: true };
  };

  const availableSlots = useMemo(() => {
    if (!selectedMember) return [];
    const slots: { time: string; valid: boolean; reason?: string }[] = [];
    for (let h = 8; h <= 19; h++) {
      for (const m of ['00', '30']) {
        const t = `${h.toString().padStart(2, '0')}:${m}`;
        const validation = getSlotValidation(t);
        if (isAdminOrStaff || validation.valid) {
          slots.push({ time: t, ...validation });
        }
      }
    }
    return slots;
  }, [selectedMember, selectedDate, selectedService, existingAppointments, isAdminOrStaff, salonClosures]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || isSubmitting) return;
    if (isAdminOrStaff && !clientId && !initialData?.id) { alert('Scegliere un Ospite.'); return; }
    if (!selectedTime) { alert('Scegliere un orario.'); return; }

    const validation = getSlotValidation(selectedTime);
    if (!validation.valid && !isAdminOrStaff) {
      alert(`Spiacenti: ${validation.reason}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const [y, mo, d] = selectedDate.split('-').map(Number);
      const [hh, mm] = selectedTime.split(':').map(Number);
      const finalDate = new Date(y, mo - 1, d, hh, mm, 0).toISOString();

      await onSave({
        id: initialData?.id,
        client_id: isAdminOrStaff ? (clientId || initialData?.client_id) : (initialData?.client_id || clientId),
        service_id: selectedService.id,
        team_member_name: teamMemberName,
        date: finalDate,
        status: initialData?.status || 'confirmed',
      });
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <form onSubmit={handleSubmit} className="space-y-10">
        <header className="mb-6">
          <h3 className="text-2xl font-luxury font-bold text-gray-900">{initialData?.id ? 'Aggiornamento Ritual' : 'Nuovo Ritual'}</h3>
          <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest mt-1">Prenotazione Luxury</p>
        </header>

        <div className="space-y-8">
          {isAdminOrStaff && !initialData?.id && (
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ospite</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cerca Ospite..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all mb-2"
                />
                <select
                  size={4}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="w-full p-4 rounded-3xl bg-white border border-gray-100 outline-none font-medium text-sm shadow-sm transition-all scrollbar-hide"
                >
                  <option value="" disabled>Seleziona...</option>
                  {filteredProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Ritual</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Artista</label>
              <select
                value={teamMemberName}
                onChange={(e) => setTeamMemberName(e.target.value)}
                className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm"
              >
                {team.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-1">Data del Ritual</label>
            <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide">
              {next21Days.map((day) => {
                const d = new Date(`${day}T12:00:00`);
                const isSelected = selectedDate === day;
                const isSalonClosed = salonClosures && salonClosures.includes(day);
                const isStaffClosed = selectedMember && (selectedMember.weekly_closures || []).includes(d.getDay());
                const isStaffAway = selectedMember && (selectedMember.unavailable_dates || []).includes(day);
                const isDisabled = isSalonClosed || isStaffClosed || isStaffAway;
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !isDisabled && setSelectedDate(day)}
                    className={`flex-shrink-0 w-16 h-20 rounded-[1.5rem] border-2 flex flex-col items-center justify-center transition-all ${
                      isDisabled
                        ? 'opacity-30 bg-gray-100 border-gray-100 cursor-not-allowed'
                        : isSelected
                        ? 'border-black bg-black text-white shadow-lg'
                        : 'border-gray-50 bg-white hover:border-amber-200'
                    }`}
                  >
                    <span className={`text-[7px] font-bold uppercase mb-1 ${isSelected ? 'text-amber-500' : 'text-gray-400'}`}>
                      {d.toLocaleDateString('it-IT', { weekday: 'short' })}
                    </span>
                    <span className="text-xl font-luxury font-bold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Orario</label>
              <p className="text-[9px] font-bold text-amber-600 uppercase">Seleziona uno slot</p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    className={`py-3 rounded-xl text-[10px] font-bold transition-all border-2 ${
                      selectedTime === slot.time 
                        ? 'bg-amber-600 border-amber-600 text-white shadow-md' 
                        : slot.valid
                        ? 'bg-white border-gray-100 text-gray-700 hover:border-amber-200'
                        : 'bg-red-50 border-red-100 text-red-300 opacity-60 cursor-not-allowed'
                    }`}
                    title={slot.valid ? 'Disponibile' : slot.reason}
                  >
                    {slot.time}
                  </button>
                ))
              ) : (
                <div className="col-span-full py-8 text-center bg-gray-50 rounded-2xl">
                  <p className="text-gray-400 text-[10px] font-bold uppercase">Nessuna disponibilità oggi</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-8 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Annulla</button>
          <button 
            type="submit" 
            disabled={isSubmitting || !selectedTime}
            className={`flex-[2] py-5 rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl transition-all ${
              isSubmitting ? 'bg-gray-200 text-gray-400' : 'bg-black text-white hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? <i className="fas fa-spinner animate-spin"></i> : (initialData?.id ? 'Salva Modifiche' : 'Conferma Ritual')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppointmentForm;

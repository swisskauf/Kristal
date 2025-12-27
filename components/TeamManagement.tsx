
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, Service } from '../types';

interface TeamManagementProps {
  member: TeamMember;
  appointments: Appointment[];
  services: Service[];
  profiles: any[];
  onSave: (updatedMember: TeamMember) => void;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ member, appointments, services, profiles, onSave, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'admin' | 'schedule' | 'closures'>('analytics');
  
  const [name, setName] = useState(member.name || '');
  const [role, setRole] = useState(member.role || 'Stylist');
  const [workStartTime, setWorkStartTime] = useState(member.work_start_time || '08:30');
  const [workEndTime, setWorkEndTime] = useState(member.work_end_time || '18:30');
  const [breakStartTime, setBreakStartTime] = useState(member.break_start_time || '13:00');
  const [breakEndTime, setBreakEndTime] = useState(member.break_end_time || '14:00');
  const [totalVacationDays, setTotalVacationDays] = useState(member.total_vacation_days || 25);
  const [unavailableDates, setUnavailableDates] = useState<string[]>(member.unavailable_dates || []);
  
  const [address, setAddress] = useState(member.address || '');
  const [avsNumber, setAvsNumber] = useState(member.avs_number || '');
  const [iban, setIban] = useState(member.iban || '');
  const [avatar, setAvatar] = useState<string | null>(member.avatar || null);

  const stats = useMemo(() => {
    const memberAppts = appointments.filter(a => a.team_member_name === member.name && a.status === 'confirmed');
    const revenue = memberAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return { revenue, count: memberAppts.length };
  }, [appointments, member.name]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = () => {
    if (!name || !role) {
      alert("Nome e Ruolo sono obbligatori.");
      return;
    }
    onSave({ 
      ...member, 
      name,
      role,
      avatar: avatar || undefined,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      break_start_time: breakStartTime,
      break_end_time: breakEndTime,
      total_vacation_days: Number(totalVacationDays),
      unavailable_dates: unavailableDates,
      address,
      avs_number: avsNumber,
      iban
    });
  };

  const addUnavailableDate = (date: string) => {
    if (date && !unavailableDates.includes(date)) {
      setUnavailableDates([...unavailableDates, date].sort());
    }
  };

  const removeUnavailableDate = (date: string) => {
    setUnavailableDates(unavailableDates.filter(d => d !== date));
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-8">
          <div className="relative group w-24 h-24">
            <img src={avatar || `https://ui-avatars.com/api/?name=${name || 'Kristal'}`} className="w-full h-full rounded-[2rem] shadow-xl border-4 border-white object-cover" />
            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20 rounded-[2rem]">
              <i className="fas fa-camera text-white"></i>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <div>
            <h3 className="text-3xl font-luxury font-bold text-gray-900">{name || 'Nuovo Artista'}</h3>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{role}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-10 border-b border-gray-100 mb-10 overflow-x-auto scrollbar-hide">
        {[
          { id: 'analytics', label: 'Performance', icon: 'fa-chart-pie' },
          { id: 'schedule', label: 'Orari & Pause', icon: 'fa-clock' },
          { id: 'closures', label: 'Chiusure', icon: 'fa-calendar-times' },
          { id: 'admin', label: 'Dati Sensibili', icon: 'fa-lock' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex items-center gap-2 pb-4 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${activeSubTab === tab.id ? 'text-black border-b-2 border-black' : 'text-gray-300'}`}>
            <i className={`fas ${tab.icon} text-xs`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-8 min-h-[300px]">
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
            <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Ricavi Totali</p>
              <h4 className="text-3xl font-luxury font-bold">CHF {stats.revenue}</h4>
            </div>
            <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100 text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Rituali</p>
              <h4 className="text-3xl font-luxury font-bold">{stats.count}</h4>
            </div>
          </div>
        )}

        {activeSubTab === 'schedule' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Servizio</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-gray-400 uppercase ml-1">Inizio</span>
                    <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} className="w-full p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-gray-400 uppercase ml-1">Fine</span>
                    <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} className="w-full p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                  </div>
                </div>
              </div>
              <div className="bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100 space-y-6">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Pausa</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-amber-600 uppercase ml-1">Inizio</span>
                    <input type="time" value={breakStartTime} onChange={e => setBreakStartTime(e.target.value)} className="w-full p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-amber-600 uppercase ml-1">Fine</span>
                    <input type="time" value={breakEndTime} onChange={e => setBreakEndTime(e.target.value)} className="w-full p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleUpdateProfile} className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">Applica Orari</button>
          </div>
        )}

        {activeSubTab === 'closures' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
             <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-4">Aggiungi Giorno non lavorativo</p>
                <div className="flex gap-4">
                  <input type="date" id="new-closure-date" className="flex-1 p-4 rounded-2xl bg-white border-none text-xs font-bold shadow-sm" />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('new-closure-date') as HTMLInputElement;
                      addUnavailableDate(input.value);
                      input.value = '';
                    }} 
                    className="px-6 py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-md"
                  >
                    Aggiungi
                  </button>
                </div>
                
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {unavailableDates.map(date => (
                    <div key={date} className="bg-white px-4 py-3 rounded-xl border border-gray-100 flex justify-between items-center group">
                      <span className="text-[10px] font-bold text-gray-600">{new Date(date).toLocaleDateString()}</span>
                      <button onClick={() => removeUnavailableDate(date)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <i className="fas fa-times-circle"></i>
                      </button>
                    </div>
                  ))}
                  {unavailableDates.length === 0 && (
                    <p className="col-span-full text-center py-6 text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">Nessun giorno di chiusura impostato</p>
                  )}
                </div>
             </div>
             <button onClick={handleUpdateProfile} className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">Salva Chiusure</button>
          </div>
        )}

        {activeSubTab === 'admin' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            <div className="grid md:grid-cols-2 gap-6">
               <input placeholder="Nome e Cognome" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
               <input placeholder="Ruolo Artistico" type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
            </div>
            <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 space-y-6">
              <input placeholder="Indirizzo" type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" />
              <div className="grid md:grid-cols-2 gap-6">
                <input placeholder="AVS" type="text" value={avsNumber} onChange={e => setAvsNumber(e.target.value)} className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" />
                <input placeholder="IBAN" type="text" value={iban} onChange={e => setIban(e.target.value)} className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" />
              </div>
            </div>
            <button onClick={handleUpdateProfile} className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">Salva Dati Artista</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;

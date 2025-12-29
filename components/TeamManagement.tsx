
import React, { useState, useMemo, useEffect } from 'react';
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
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'schedule' | 'closures' | 'admin'>('analytics');
  
  // Stati locali con sincronizzazione forzata
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [workStartTime, setWorkStartTime] = useState('08:30');
  const [workEndTime, setWorkEndTime] = useState('18:30');
  const [breakStartTime, setBreakStartTime] = useState('13:00');
  const [breakEndTime, setBreakEndTime] = useState('14:00');
  const [weeklyClosures, setWeeklyClosures] = useState<number[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [avsNumber, setAvsNumber] = useState('');
  const [iban, setIban] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setRole(member.role || '');
      setWorkStartTime(member.work_start_time || '08:30');
      setWorkEndTime(member.work_end_time || '18:30');
      setBreakStartTime(member.break_start_time || '13:00');
      setBreakEndTime(member.break_end_time || '14:00');
      setWeeklyClosures(Array.isArray(member.weekly_closures) ? member.weekly_closures : []);
      setUnavailableDates(Array.isArray(member.unavailable_dates) ? member.unavailable_dates : []);
      setAddress(member.address || '');
      setAvsNumber(member.avs_number || '');
      setIban(member.iban || '');
      setAvatar(member.avatar || null);
    }
  }, [member]);

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

  const stats = useMemo(() => {
    const memberAppts = appointments.filter(a => a.team_member_name === member.name && a.status === 'confirmed');
    const revenue = memberAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return { revenue, count: memberAppts.length };
  }, [appointments, member.name]);

  const toggleWeeklyClosure = (day: number) => {
    setWeeklyClosures(prev => {
      const exists = prev.includes(day);
      if (exists) return prev.filter(d => d !== day);
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const addVacationDate = (date: string) => {
    if (date && !unavailableDates.includes(date)) {
      setUnavailableDates(prev => [...prev, date].sort());
    }
  };

  const removeVacationDate = (date: string) => {
    setUnavailableDates(prev => prev.filter(d => d !== date));
  };

  const handleUpdateProfile = () => {
    const updated: TeamMember = { 
      ...member, 
      name,
      role,
      avatar: avatar || undefined,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      break_start_time: breakStartTime,
      break_end_time: breakEndTime,
      weekly_closures: [...weeklyClosures],
      unavailable_dates: [...unavailableDates],
      address,
      avs_number: avsNumber,
      iban
    };
    onSave(updated);
  };

  const DAYS = [
    { id: 1, label: 'Lun' }, { id: 2, label: 'Mar' }, { id: 3, label: 'Mer' }, 
    { id: 4, label: 'Gio' }, { id: 5, label: 'Ven' }, { id: 6, label: 'Sab' }, { id: 0, label: 'Dom' }
  ];

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-8">
          <div className="relative group cursor-pointer w-24 h-24">
            <img 
              src={avatar || `https://ui-avatars.com/api/?name=${name || 'K'}&background=f3f4f6&color=9ca3af`} 
              className="w-full h-full rounded-[2rem] shadow-xl border-4 border-white object-cover transition-all group-hover:opacity-80" 
            />
            <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20 rounded-[2rem]">
              <i className="fas fa-camera text-xl text-white"></i>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <div>
            <h3 className="text-3xl font-luxury font-bold text-gray-900">{name || 'Artista'}</h3>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{role}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-10 border-b border-gray-100 mb-10 overflow-x-auto scrollbar-hide">
        {['analytics', 'schedule', 'closures', 'admin'].map(t => (
          <button key={t} onClick={() => setActiveSubTab(t as any)} className={`pb-4 text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === t ? 'text-black border-b-2 border-black' : 'text-gray-300'}`}>
            {t === 'analytics' ? 'Performance' : t === 'schedule' ? 'Orari' : t === 'closures' ? 'Indisponibilità' : 'Anagrafica'}
          </button>
        ))}
      </div>

      <div className="space-y-8 min-h-[300px]">
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-2 gap-6">
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
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Turno Lavoro</p>
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" value={workStartTime} onChange={e => setWorkStartTime(e.target.value)} className="p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                  <input type="time" value={workEndTime} onChange={e => setWorkEndTime(e.target.value)} className="p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                </div>
              </div>
              <div className="bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100 space-y-6">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Pausa Pranzo</p>
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" value={breakStartTime} onChange={e => setBreakStartTime(e.target.value)} className="p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                  <input type="time" value={breakEndTime} onChange={e => setBreakEndTime(e.target.value)} className="p-3 rounded-xl border-none font-bold text-xs shadow-sm" />
                </div>
              </div>
            </div>
            <button onClick={handleUpdateProfile} className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">Salva Orari</button>
          </div>
        )}

        {activeSubTab === 'closures' && (
          <div className="space-y-10">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Chiusure Settimanali Ricorrenti</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button 
                    key={day.id} 
                    type="button"
                    onClick={() => toggleWeeklyClosure(day.id)} 
                    className={`px-4 py-3 rounded-xl text-[10px] font-bold uppercase transition-all border ${weeklyClosures.includes(day.id) ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-amber-200'}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Vacanze e Congedi (Giorni Singoli)</p>
              <div className="flex gap-4">
                <input type="date" id="vacation-picker" className="flex-1 p-4 rounded-xl bg-gray-50 border-none font-bold text-xs" />
                <button type="button" onClick={() => {
                  const input = document.getElementById('vacation-picker') as HTMLInputElement;
                  addVacationDate(input.value);
                  input.value = '';
                }} className="px-6 bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase">Aggiungi</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {unavailableDates.map(d => (
                  <div key={d} className="bg-gray-50 px-4 py-3 rounded-xl flex justify-between items-center group">
                    <span className="text-[10px] font-bold text-gray-600">{new Date(d).toLocaleDateString()}</span>
                    <button type="button" onClick={() => removeVacationDate(d)} className="text-gray-300 hover:text-red-500"><i className="fas fa-times-circle"></i></button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleUpdateProfile} className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">Salva Indisponibilità</button>
          </div>
        )}

        {activeSubTab === 'admin' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Indirizzo</label>
              <input placeholder="Indirizzo" type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">AVS</label>
                <input placeholder="AVS" type="text" value={avsNumber} onChange={e => setAvsNumber(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">IBAN</label>
                <input placeholder="IBAN" type="text" value={iban} onChange={e => setIban(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
              </div>
            </div>
            <button onClick={handleUpdateProfile} className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">Salva Anagrafica</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;

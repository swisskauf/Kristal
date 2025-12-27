
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, Service, AbsenceEntry, AbsenceType } from '../types';

interface TeamManagementProps {
  member: TeamMember;
  appointments: Appointment[];
  services: Service[];
  profiles: any[];
  onSave: (updatedMember: TeamMember) => void;
  onClose: () => void;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ member, appointments, services, profiles, onSave, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'admin' | 'vacations'>('analytics');
  
  const [name, setName] = useState(member.name || '');
  const [role, setRole] = useState(member.role || 'Stylist');
  const [workStartTime, setWorkStartTime] = useState(member.work_start_time || '08:30');
  const [workEndTime, setWorkEndTime] = useState(member.work_end_time || '18:30');
  const [totalVacationDays, setTotalVacationDays] = useState(member.total_vacation_days || 25);
  const [profileId, setProfileId] = useState(member.profile_id || '');
  
  // Dati Sensibili Obbligatori
  const [address, setAddress] = useState(member.address || '');
  const [avsNumber, setAvsNumber] = useState(member.avs_number || '');
  const [iban, setIban] = useState(member.iban || '');
  const [avatar, setAvatar] = useState(member.avatar || '');

  const stats = useMemo(() => {
    const memberAppts = appointments.filter(a => a.team_member_name === member.name && a.status === 'confirmed');
    const revenue = memberAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return { revenue, count: memberAppts.length };
  }, [appointments, member.name]);

  const handleUpdateProfile = () => {
    if (!name || !role || !address || !avsNumber || !iban) {
      alert("Tutti i campi amministrativi (Indirizzo, AVS, IBAN) sono obbligatori.");
      return;
    }
    onSave({ 
      ...member, 
      name,
      role,
      avatar,
      work_start_time: workStartTime,
      work_end_time: workEndTime,
      total_vacation_days: Number(totalVacationDays),
      profile_id: profileId || undefined,
      address,
      avs_number: avsNumber,
      iban
    });
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-8">
          <div className="relative">
            <img src={avatar || `https://ui-avatars.com/api/?name=${name || 'Kristal'}`} className="w-24 h-24 rounded-[2rem] shadow-xl border-4 border-white object-cover" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center border-2 border-white"><i className="fas fa-user-edit text-[10px]"></i></div>
          </div>
          <div>
            <h3 className="text-3xl font-luxury font-bold text-gray-900">{name || 'Nuovo Artista'}</h3>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{role}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-10 border-b border-gray-100 mb-10">
        {[
          { id: 'analytics', label: 'Performance', icon: 'fa-chart-pie' },
          { id: 'admin', label: 'Dati Sensibili', icon: 'fa-lock' },
          { id: 'vacations', label: 'Agenda', icon: 'fa-calendar' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex items-center gap-2 pb-4 text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'text-black border-b-2 border-black' : 'text-gray-300'}`}>
            <i className={`fas ${tab.icon} text-xs`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
            <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Ricavi Atelier</p>
              <h4 className="text-3xl font-luxury font-bold">CHF {stats.revenue}</h4>
            </div>
            <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Rituali Eseguiti</p>
              <h4 className="text-3xl font-luxury font-bold">{stats.count}</h4>
            </div>
          </div>
        )}

        {activeSubTab === 'admin' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nome Completo</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Ruolo Professionale</label>
                    <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                  </div>
               </div>
               
               <div className="bg-amber-50/50 p-8 rounded-[3rem] border border-amber-100 space-y-6">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-4">Dati HR & Amministrativi</p>
                  
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-gray-500 uppercase ml-2">Indirizzo di Residenza</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Via, Città, CAP" className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[8px] font-bold text-gray-500 uppercase ml-2">Numero AVS (Svizzera)</label>
                      <input type="text" value={avsNumber} onChange={e => setAvsNumber(e.target.value)} placeholder="756.xxxx.xxxx.xx" className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-bold text-gray-500 uppercase ml-2">IBAN per Salario</label>
                      <input type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder="CHxx xxxx xxxx xxxx xxxx x" className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-gray-500 uppercase ml-2">Foto Profilo (URL)</label>
                    <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" />
                  </div>
               </div>

               <button onClick={handleUpdateProfile} className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl hover:bg-amber-700 transition-all">
                 Salva Dati Artista
               </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;

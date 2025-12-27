
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
  
  const [workStartTime, setWorkStartTime] = useState(member.work_start_time || '08:30');
  const [workEndTime, setWorkEndTime] = useState(member.work_end_time || '18:30');
  const [totalVacationDays, setTotalVacationDays] = useState(member.total_vacation_days || 25);
  const [profileId, setProfileId] = useState(member.profile_id || '');
  
  // Nuovi Campi Sensibili
  const [address, setAddress] = useState(member.address || '');
  const [avsNumber, setAvsNumber] = useState(member.avs_number || '');
  const [iban, setIban] = useState(member.iban || '');

  const stats = useMemo(() => {
    const memberAppts = appointments.filter(a => a.team_member_name === member.name && a.status === 'confirmed');
    const revenue = memberAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return { revenue, count: memberAppts.length };
  }, [appointments, member.name]);

  const handleUpdateProfile = () => {
    onSave({ 
      ...member, 
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} className="w-20 h-20 rounded-2xl shadow-lg border-2 border-white object-cover" />
          <div>
            <h3 className="text-2xl font-luxury font-bold text-gray-900">{member.name}</h3>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{member.role}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-100 mb-8">
        {[
          { id: 'analytics', label: 'Performance', icon: 'fa-chart-line' },
          { id: 'admin', label: 'Contratto & Dati', icon: 'fa-user-shield' },
          { id: 'vacations', label: 'Assenze', icon: 'fa-calendar-alt' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex items-center gap-2 pb-3 text-[9px] font-bold uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-300'}`}>
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Ricavi Generati</p>
              <h4 className="text-2xl font-luxury font-bold">CHF {stats.revenue}</h4>
            </div>
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Rituali Totali</p>
              <h4 className="text-2xl font-luxury font-bold">{stats.count}</h4>
            </div>
          </div>
        )}

        {activeSubTab === 'admin' && (
          <div className="bg-gray-50 p-8 rounded-[3rem] space-y-6">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Account Portale</label>
                    <select value={profileId} onChange={e => setProfileId(e.target.value)} className="w-full p-4 rounded-2xl bg-white border border-gray-200 text-xs font-bold outline-none">
                      <option value="">Collega Profilo...</option>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Ferie Annuali (gg)</label>
                    <input type="number" value={totalVacationDays} onChange={e => setTotalVacationDays(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold text-xs" />
                  </div>
               </div>
               
               <div className="space-y-4 pt-4 border-t border-gray-200">
                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Dati Sensibili Staff</p>
                  <div className="space-y-2">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Indirizzo Residenza</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Via, Città, CAP" className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Numero AVS</label>
                      <input type="text" value={avsNumber} onChange={e => setAvsNumber(e.target.value)} placeholder="756.xxxx.xxxx.xx" className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">IBAN Bancario</label>
                      <input type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder="CHxx xxxx xxxx xxxx xxxx x" className="w-full p-4 rounded-2xl bg-white border border-gray-200 font-bold text-xs" />
                    </div>
                  </div>
               </div>
               <button onClick={handleUpdateProfile} className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Salva Dati Staff</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;

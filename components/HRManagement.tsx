
import React from 'react';
import { TeamMember, AbsenceEntry, AbsenceType } from '../types';

interface HRManagementProps {
  team: TeamMember[];
  onEditMember: (member: TeamMember) => void;
}

const HRManagement: React.FC<HRManagementProps> = ({ team, onEditMember }) => {
  
  const getMemberHRStats = (member: TeamMember) => {
    const absences = member.absences_json || [];
    const hoursPerDay = member.hours_per_day_contract || 8.5;
    
    const calculateDays = (type: AbsenceType) => {
      const hours = absences
        .filter(a => a.type === type)
        .reduce((acc, a) => acc + (a.hoursCount || 0), 0);
      return parseFloat((hours / hoursPerDay).toFixed(1));
    };

    const vacationUsed = calculateDays('vacation');
    const sickDays = calculateDays('sick');
    const injuryDays = calculateDays('injury');
    const trainingDays = calculateDays('training');
    const recoveryUsed = calculateDays('overtime_recovery');

    return {
      vacationUsed,
      vacationRemaining: parseFloat((member.total_vacation_days_per_year - vacationUsed).toFixed(1)),
      sickDays,
      injuryDays,
      trainingDays,
      recoveryUsed,
      overtimeBalance: member.overtime_balance_hours || 0,
      potentialRecoveryDays: Math.floor((member.overtime_balance_hours || 0) / hoursPerDay)
    };
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div>
          <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">HR & Talent Management</h2>
          <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Analisi Capitale Umano Kristal Atelier</p>
        </div>
        <div className="hidden md:flex gap-6">
           <div className="text-center">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Totale Team</p>
              <p className="text-2xl font-luxury font-bold">{team.length}</p>
           </div>
           <div className="h-10 w-px bg-gray-100"></div>
           <div className="text-center">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Ferie Tot. Rimanenti</p>
              <p className="text-2xl font-luxury font-bold text-amber-600">
                {team.reduce((acc, m) => acc + getMemberHRStats(m).vacationRemaining, 0).toFixed(0)}
              </p>
           </div>
        </div>
      </header>

      <div className="grid gap-8">
        {team.map((member, idx) => {
          const stats = getMemberHRStats(member);
          const vacationPercent = (stats.vacationUsed / member.total_vacation_days_per_year) * 100;

          return (
            <div 
              key={member.name}
              className="bg-white rounded-[4rem] border border-gray-50 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden animate-in slide-in-from-bottom-4"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="p-10 flex flex-col lg:flex-row gap-12 items-center">
                {/* Artist Profile & Main Actions */}
                <div className="flex flex-col items-center text-center space-y-4 min-w-[220px]">
                  <div className="relative">
                    <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=000&color=fff`} className="w-28 h-28 rounded-[3rem] object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-500" />
                    <button 
                      onClick={() => onEditMember(member)}
                      className="absolute -bottom-2 -right-2 w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-amber-600 transition-all active:scale-90"
                    >
                      <i className="fas fa-user-edit text-sm"></i>
                    </button>
                  </div>
                  <div>
                    <h4 className="text-2xl font-luxury font-bold text-gray-900">{member.name}</h4>
                    <p className="text-[9px] text-amber-600 font-bold uppercase tracking-[0.2em]">{member.role}</p>
                  </div>
                </div>

                {/* HR Metrics Grid */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
                  {/* Vacation Progress */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ferie Residue</p>
                      <p className={`text-xl font-luxury font-bold ${stats.vacationRemaining < 5 ? 'text-red-500' : 'text-gray-900'}`}>{stats.vacationRemaining} <span className="text-[10px] text-gray-300">gg</span></p>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${vacationPercent > 85 ? 'bg-amber-500' : 'bg-black'}`}
                        style={{ width: `${vacationPercent}%` }}
                      ></div>
                    </div>
                    <p className="text-[7px] text-gray-300 font-bold uppercase">Utilizzate: {stats.vacationUsed} / {member.total_vacation_days_per_year}</p>
                  </div>

                  {/* Overtime Gold Card */}
                  <div className="bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100/50 flex flex-col justify-between group/ot transition-all hover:bg-amber-100/50">
                    <div className="flex justify-between items-start">
                       <p className="text-[8px] font-bold text-amber-700 uppercase tracking-widest">Banca Ore</p>
                       <i className="fas fa-history text-[10px] text-amber-300"></i>
                    </div>
                    <div className="flex items-baseline gap-1 py-2">
                      <p className={`text-3xl font-luxury font-bold ${stats.overtimeBalance < 0 ? 'text-red-500' : 'text-gray-900'}`}>{stats.overtimeBalance}</p>
                      <p className="text-[11px] font-bold text-amber-600">h</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[7px] text-amber-800/60 font-bold uppercase">
                        ≈ {stats.potentialRecoveryDays} giorni di recupero
                      </p>
                    </div>
                  </div>

                  {/* Health Status */}
                  <div className="p-6 rounded-[2.5rem] border border-gray-50 flex flex-col justify-between bg-white shadow-inner">
                    <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">Salute & Infortuni</p>
                    <div className="py-2">
                       <p className="text-2xl font-luxury font-bold text-gray-900">{stats.sickDays + stats.injuryDays} <span className="text-[10px] text-gray-300">gg</span></p>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 h-1 rounded-full bg-rose-100">
                         <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min((stats.sickDays / 15) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                    <p className="text-[7px] text-gray-300 font-bold uppercase mt-1">
                      Malattia: {stats.sickDays} | Inf: {stats.injuryDays}
                    </p>
                  </div>

                  {/* Other Status */}
                  <div className="p-6 rounded-[2.5rem] border border-gray-50 flex flex-col justify-between bg-white shadow-inner">
                    <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Formazione</p>
                    <div className="py-2">
                       <p className="text-2xl font-luxury font-bold text-gray-900">{stats.trainingDays} <span className="text-[10px] text-gray-300">gg</span></p>
                    </div>
                    <p className="text-[7px] text-gray-400 font-bold uppercase">Aggiornamento Professionale</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-black text-white p-12 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="space-y-2 text-center md:text-left">
            <h4 className="text-3xl font-luxury font-bold">Policy Straordinari</h4>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed">Il sistema calcola automaticamente la conversione del tempo extra lavorato in giornate di congedo compensativo. Utilizzate i "Ritual di Recupero" per mantenere l'armonia nel team.</p>
         </div>
         <div className="flex gap-4">
            <button className="px-10 py-5 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">Esporta PDF Registro</button>
         </div>
      </div>
    </div>
  );
};

export default HRManagement;

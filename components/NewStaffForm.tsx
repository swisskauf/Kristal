
import React, { useState } from 'react';
import { TeamMember } from '../types';

interface NewStaffFormProps {
  onSave: (member: TeamMember) => void;
  onCancel: () => void;
}

const NewStaffForm: React.FC<NewStaffFormProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Senior Stylist');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [workStart, setWorkStart] = useState('08:30');
  const [workEnd, setWorkEnd] = useState('18:30');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [address, setAddress] = useState('');
  const [avs, setAvs] = useState('');
  const [iban, setIban] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    onSave({
      name,
      email: email.toLowerCase(),
      role,
      bio,
      avatar: avatar || `https://ui-avatars.com/api/?name=${name}&background=000&color=fff&bold=true`,
      work_start_time: workStart,
      work_end_time: workEnd,
      break_start_time: breakStart,
      break_end_time: breakEnd,
      address,
      avs_number: avs,
      iban,
      weekly_closures: [0], // Domenica chiuso di default
      unavailable_dates: [],
      absences_json: [],
      total_vacation_days_per_year: 25,
      hours_per_day_contract: 8.5,
      overtime_balance_hours: 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-h-[80vh] overflow-y-auto pr-4 scrollbar-hide">
      <header className="text-center mb-8 sticky top-0 bg-white z-10 pb-4 border-b border-gray-50">
        <h3 className="text-3xl font-luxury font-bold text-gray-900">Nuovo Artista</h3>
        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.4em] mt-2">Ingresso nel Team Kristal</p>
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer w-32 h-32">
          <img 
            src={avatar || `https://ui-avatars.com/api/?name=${name || 'Staff'}&background=f3f4f6&color=9ca3af`} 
            className="w-full h-full rounded-[2.5rem] object-cover border-4 border-white shadow-xl transition-all group-hover:opacity-80" 
          />
          <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20 rounded-[2.5rem]">
            <i className="fas fa-camera text-2xl text-white"></i>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
        <p className="text-[8px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Carica Foto Profilo</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Nome d'Arte</label>
          <input 
            required 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner focus:ring-2 focus:ring-amber-500 transition-all" 
            placeholder="es. Melk" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Email Aziendale / Privata</label>
          <input 
            required 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner focus:ring-2 focus:ring-amber-500 transition-all" 
            placeholder="staff@kristal.ch" 
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Ruolo</label>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner focus:ring-2 focus:ring-amber-500 transition-all appearance-none"
          >
            <option value="Senior Stylist">Senior Stylist</option>
            <option value="Creative Director">Creative Director</option>
            <option value="Color Specialist">Color Specialist</option>
            <option value="Master Esthetician">Master Esthetician</option>
            <option value="Receptionist Luxury">Receptionist Luxury</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Biografia d'Eccellenza</label>
        <textarea 
          rows={3} 
          value={bio} 
          onChange={e => setBio(e.target.value)} 
          className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner resize-none focus:ring-2 focus:ring-amber-500 transition-all" 
          placeholder="Descrivi la visione e il talento dell'artista..." 
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-4">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pianificazione Oraria</p>
          <div className="flex items-center gap-3">
            <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="flex-1 p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm" />
            <span className="text-gray-300">al</span>
            <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="flex-1 p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm" />
          </div>
        </div>
        <div className="bg-amber-50/20 p-6 rounded-[2.5rem] border border-amber-100/50 space-y-4">
          <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Intervallo Pausa</p>
          <div className="flex items-center gap-3">
            <input type="time" value={breakStart} onChange={e => setBreakStart(e.target.value)} className="flex-1 p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm" />
            <span className="text-gray-300">al</span>
            <input type="time" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} className="flex-1 p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm" />
          </div>
        </div>
      </div>

      <div className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100 space-y-6">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2">Informazioni Riservate</p>
        <input 
          placeholder="Indirizzo di Residenza" 
          type="text" 
          value={address} 
          onChange={e => setAddress(e.target.value)} 
          className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" 
        />
        <div className="grid md:grid-cols-2 gap-4">
          <input 
            placeholder="Numero AVS" 
            type="text" 
            value={avs} 
            onChange={e => setAvs(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" 
          />
          <input 
            placeholder="IBAN per Accredito" 
            type="text" 
            value={iban} 
            onChange={e => setIban(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-white border-none font-bold text-xs shadow-sm" 
          />
        </div>
      </div>

      <div className="flex gap-4 pt-8 sticky bottom-0 bg-white z-10 mt-4 border-t border-gray-50">
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-black transition-colors"
        >
          Annulla
        </button>
        <button 
          type="submit" 
          className="flex-[2] py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl hover:bg-amber-700 transition-all transform active:scale-95"
        >
          Crea Profilo e Invia Invito
        </button>
      </div>
    </form>
  );
};

export default NewStaffForm;


import React, { useState } from 'react';

interface NewGuestFormProps {
  onSave: (guest: any) => void;
  onCancel: () => void;
}

const NewGuestForm: React.FC<NewGuestFormProps> = ({ onSave, onCancel }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>('F');
  const [dob, setDob] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

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
    if (password !== confirmPassword) {
      alert("Le password non coincidono.");
      return;
    }
    onSave({
      full_name: `${firstName} ${lastName}`,
      email,
      phone,
      gender,
      dob,
      avatar,
      created_at: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <header className="text-center mb-8">
        <h3 className="text-3xl font-luxury font-bold text-gray-900">Nuovo Ospite</h3>
        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-2">Registrazione Eccellenza</p>
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer">
          <img 
            src={avatar || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=f3f4f6&color=9ca3af`} 
            className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-white shadow-xl transition-all group-hover:opacity-80" 
          />
          <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <i className="fas fa-camera text-2xl text-white drop-shadow-md"></i>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
        <p className="text-[8px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Carica Immagine dalla Galleria</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nome</label>
          <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Cognome</label>
          <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Email</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Telefono</label>
          <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Genere</label>
          <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs">
            <option value="F">Femmina</option>
            <option value="M">Maschio</option>
            <option value="Other">Altro</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Data di Nascita</label>
          <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Nuova Password</label>
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Conferma Password</label>
          <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
        </div>
      </div>

      <div className="flex gap-4 pt-8">
        <button type="button" onClick={onCancel} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Annulla</button>
        <button type="submit" className="flex-[2] py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl hover:bg-amber-700 transition-all">Sincronizza Ospite</button>
      </div>
    </form>
  );
};

export default NewGuestForm;

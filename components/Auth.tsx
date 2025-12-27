
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [regType, setRegType] = useState<'client' | 'collaborator'>('client');
  const [loading, setLoading] = useState(false);
  
  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>('F');
  const [dob, setDob] = useState('');
  const [avatar, setAvatar] = useState('');
  
  // Staff Extra Fields
  const [address, setAddress] = useState('');
  const [avs, setAvs] = useState('');
  const [iban, setIban] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isRegistering && password !== confirmPassword) {
      setErrorMsg("Le password non coincidono.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName, 
              phone, 
              role: regType, 
              gender, 
              dob, 
              avatar,
              address: regType === 'collaborator' ? address : undefined,
              avs_number: regType === 'collaborator' ? avs : undefined,
              iban: regType === 'collaborator' ? iban : undefined,
            },
          }
        });
        if (error) throw error;
        setEmailSent(true);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
          onLogin({
            id: data.user.id,
            email: data.user.email!,
            fullName: profile?.full_name || 'Ospite Kristal',
            phone: profile?.phone || '',
            role: profile?.role || 'client'
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante l\'autenticazione.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full bg-white rounded-[4rem] p-12 text-center shadow-2xl">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-600">
           <i className="fas fa-envelope-open-text text-3xl"></i>
        </div>
        <h2 className="text-3xl font-luxury font-bold mb-4">Email di Verifica Inviata</h2>
        <p className="text-gray-500 text-xs mb-10 leading-relaxed">Abbiamo inviato un link di conferma a <strong>{email}</strong>. Per favore, verificate la vostra identità per accedere ai rituali Kristal.</p>
        <button onClick={() => setEmailSent(false)} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest border border-amber-600 px-10 py-4 rounded-full hover:bg-amber-600 hover:text-white transition-all">Torna al Portale</button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[4rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      <div className="p-10 md:p-14 overflow-y-auto scrollbar-hide">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-luxury font-bold text-gray-900 tracking-tighter mb-2">KRISTAL</h1>
          <p className="text-amber-600 text-[9px] uppercase tracking-[0.4em] font-bold">L'Eccellenza è un Rituale</p>
        </div>

        {errorMsg && <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="space-y-6">
          {isRegistering && (
            <div className="flex bg-gray-50 p-1 rounded-2xl mb-6">
              <button type="button" onClick={() => setRegType('client')} className={`flex-1 py-3 text-[9px] font-bold uppercase rounded-xl transition-all ${regType === 'client' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Ospite</button>
              <button type="button" onClick={() => setRegType('collaborator')} className={`flex-1 py-3 text-[9px] font-bold uppercase rounded-xl transition-all ${regType === 'collaborator' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>Staff</button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {isRegistering && (
              <>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Nome Completo</label>
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Telefono</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Genere</label>
                  <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold">
                    <option value="F">Femmina</option>
                    <option value="M">Maschio</option>
                    <option value="Other">Altro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Data Nascita</label>
                  <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold" />
                </div>
              </>
            )}
            
            <div className="space-y-1 md:col-span-2">
              <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold" />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold" />
            </div>
            {isRegistering && (
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Conferma Password</label>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold" />
              </div>
            )}

            {isRegistering && regType === 'collaborator' && (
              <div className="md:col-span-2 grid gap-4 mt-4 p-6 bg-amber-50 rounded-3xl animate-in slide-in-from-top-4">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Dati Contrattuali Staff</p>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-amber-600 uppercase ml-2">Indirizzo Completo</label>
                  <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-4 rounded-2xl bg-white border-none outline-none text-xs font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-amber-600 uppercase ml-2">Numero AVS</label>
                    <input type="text" required value={avs} onChange={(e) => setAvs(e.target.value)} placeholder="756.xxxx.xxxx.xx" className="w-full p-4 rounded-2xl bg-white border-none outline-none text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-amber-600 uppercase ml-2">IBAN</label>
                    <input type="text" required value={iban} onChange={(e) => setIban(e.target.value)} placeholder="CHxx..." className="w-full p-4 rounded-2xl bg-white border-none outline-none text-xs font-bold" />
                  </div>
                </div>
              </div>
            )}

            {isRegistering && (
               <div className="space-y-1 md:col-span-2">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Foto Profilo (URL opzionale)</label>
                <input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold" />
              </div>
            )}
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-5 bg-black text-white font-bold rounded-3xl shadow-2xl hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest mt-6">
            {loading ? <i className="fas fa-spinner animate-spin"></i> : (isRegistering ? 'Crea Account Kristal' : 'Accedi al Portale')}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-[9px] font-bold text-gray-400 hover:text-amber-600 transition-colors uppercase tracking-[0.2em]">
            {isRegistering ? 'Hai già un account? Entra qui' : 'Nuovo Ospite? Registrati ora'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

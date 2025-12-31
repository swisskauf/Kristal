
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Fields Standard
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>('F');
  const [dob, setDob] = useState('');
  const [avatar, setAvatar] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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
        // REGISTRAZIONE AUTOMATICA
        // Passiamo TUTTI i dati nei metadata per il Trigger SQL
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName, 
              phone: String(phone || ''), 
              role: 'client',
              gender: gender || 'F', 
              dob: String(dob || ''), 
              avatar: avatar || ''
            },
          }
        });

        if (authError) throw authError;

        if (data.user) {
            // CRITICAL DOUBLE-TAP: Forza il salvataggio dei dati nel DB pubblico
            // Questo assicura che Telefono e Data di Nascita vengano salvati
            // anche se il Trigger SQL perde il colpo sui metadati.
            await supabase.from('profiles').upsert({
                id: data.user.id,
                email: email,
                full_name: fullName,
                phone: String(phone || ''),
                dob: String(dob || ''),
                gender: gender || 'F',
                role: 'client',
                avatar: avatar || ''
            });
        }

        // Se l'autologin è attivo su Supabase, effettuiamo subito il login logico nell'app
        if (data.user && !data.session) {
            setEmailSent(true); // Conferma email richiesta
        } else if (data.user && data.session) {
             // Login immediato post-registrazione
             onLogin({
                id: data.user.id,
                email: data.user.email!,
                fullName: fullName,
                phone: phone,
                role: 'client',
                avatar: avatar
             });
        }
      } else {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          // Recuperiamo il profilo aggiornato dal DB pubblico
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
          
          if (profile && profile.is_blocked) {
              await supabase.auth.signOut();
              throw new Error("Accesso negato. Contattare l'Atelier.");
          }

          onLogin({
            id: data.user.id,
            email: data.user.email!,
            fullName: profile?.full_name || 'Ospite Kristal',
            phone: profile?.phone || '',
            role: profile?.role || 'client',
            avatar: profile?.avatar
          });
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setErrorMsg(err.message || 'Errore durante l\'autenticazione.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full bg-white rounded-[4rem] p-12 text-center shadow-2xl">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-600">
           <i className="fas fa-check-circle text-3xl"></i>
        </div>
        <h2 className="text-3xl font-luxury font-bold mb-4">Profilo Creato</h2>
        <p className="text-gray-500 text-xs mb-10 leading-relaxed">
          Benvenuto <strong>{fullName}</strong>.<br/>
          Il tuo profilo è stato registrato.<br/>
          Controlla la tua email per confermare l'account.
        </p>
        <button onClick={() => { setEmailSent(false); setIsRegistering(false); }} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest border border-amber-600 px-10 py-4 rounded-full hover:bg-amber-600 hover:text-white transition-all">Torna al Login</button>
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

        {errorMsg && <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 flex items-center gap-2"><i className="fas fa-exclamation-circle"></i> {errorMsg}</div>}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {isRegistering && (
              <>
                <div className="space-y-1 md:col-span-2 flex flex-col items-center">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Creazione Profilo Ospite</p>
                   <div className="relative group cursor-pointer w-24 h-24 mb-4">
                      {avatar ? (
                        <img src={avatar} className="w-full h-full rounded-[2rem] object-cover border-2 border-amber-500 shadow-lg" />
                      ) : (
                        <div className="w-full h-full rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 group-hover:border-amber-400 group-hover:text-amber-500 transition-all">
                           <i className="fas fa-camera text-2xl"></i>
                        </div>
                      )}
                      <label className="absolute inset-0 flex items-center justify-center opacity-0 cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      <p className="text-[7px] font-bold text-center mt-2 text-gray-400 uppercase tracking-widest">{avatar ? 'Cambia Foto' : 'Carica Foto'}</p>
                   </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-fullname" className="text-[8px] font-bold text-gray-400 uppercase ml-2">Nome Completo</label>
                  <input id="reg-fullname" name="name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all" placeholder="Nome e Cognome" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-phone" className="text-[8px] font-bold text-gray-400 uppercase ml-2">Telefono</label>
                  <input id="reg-phone" name="tel" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all" placeholder="+41 79..." />
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-gender" className="text-[8px] font-bold text-gray-400 uppercase ml-2">Genere</label>
                  <select id="reg-gender" name="gender" value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all appearance-none">
                    <option value="F">Femmina</option>
                    <option value="M">Maschio</option>
                    <option value="Other">Altro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="reg-dob" className="text-[8px] font-bold text-gray-400 uppercase ml-2">Data Nascita</label>
                  <input id="reg-dob" name="bday" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all" />
                </div>
              </>
            )}
            
            <div className="space-y-1 md:col-span-2">
              <label htmlFor="auth-email" className="text-[8px] font-bold text-gray-400 uppercase ml-2">Email</label>
              <input id="auth-email" name="email" type="email" autoComplete="username email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all" placeholder="latua@email.com" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor="auth-password" className="text-[8px] font-bold text-gray-400 uppercase ml-2">Password</label>
              <input 
                id="auth-password" 
                name="password" 
                type="password" 
                autoComplete={isRegistering ? "new-password" : "current-password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all" 
                placeholder="••••••••"
              />
            </div>
            
            {isRegistering && (
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="reg-confirm-password" className="text-[8px] font-bold text-gray-400 uppercase ml-2">Conferma Password</label>
                <input id="reg-confirm-password" name="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold focus:ring-2 focus:ring-amber-500 transition-all" placeholder="••••••••" />
              </div>
            )}
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-5 bg-black text-white font-bold rounded-3xl shadow-2xl hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest mt-6 flex items-center justify-center gap-2">
            {loading ? <i className="fas fa-spinner animate-spin"></i> : (isRegistering ? 'Registra Ospite' : 'Accedi')}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-[9px] font-bold text-gray-400 hover:text-amber-600 transition-colors uppercase tracking-[0.2em]">
            {isRegistering ? 'Hai già un account? Entra' : 'Nuovo Ospite? Registrati qui'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

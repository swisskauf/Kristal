
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone, role: 'client' }
          }
        });
        if (error) throw error;
        if (data.user) {
          // Creiamo il profilo esplicito dopo il signup
          await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: fullName,
            phone: phone,
            role: 'client'
          });
          alert('Registrazione completata! Controlla la tua email per confermare l\'account.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          // Recuperiamo il ruolo dal profilo
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          onLogin({
            id: data.user.id,
            email: data.user.email!,
            fullName: profile?.full_name || 'Utente',
            phone: profile?.phone || '',
            role: profile?.role || 'client'
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="p-10 md:p-14">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-luxury font-bold tracking-tighter text-gray-900 mb-2">KRISTAL</h1>
            <p className="text-gray-400 text-xs uppercase tracking-[0.2em]">Luxury Experience</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl animate-shake">
              <i className="fas fa-exclamation-circle mr-2"></i> {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <>
                <input 
                  type="text" 
                  placeholder="Nome Completo"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm"
                />
                <input 
                  type="tel" 
                  placeholder="Cellulare"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm"
                />
              </>
            )}
            <input 
              type="email" 
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm"
            />
            <input 
              type="password" 
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm"
            />
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
            >
              {loading ? <i className="fas fa-circle-notch animate-spin"></i> : (isRegistering ? 'Crea Account' : 'Entra')}
            </button>
          </form>

          <div className="mt-8 relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] text-gray-300 uppercase tracking-widest font-bold">Oppure</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button onClick={signInWithGoogle} className="flex items-center justify-center space-x-2 py-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
              <i className="fab fa-google text-red-500"></i>
              <span className="text-xs font-bold">Google</span>
            </button>
            <button className="flex items-center justify-center space-x-2 py-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all opacity-50 cursor-not-allowed">
              <i className="fab fa-apple text-gray-900"></i>
              <span className="text-xs font-bold">Apple</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs font-bold text-gray-400 hover:text-amber-500 transition-colors uppercase tracking-widest">
              {isRegistering ? 'Hai già un account? Accedi' : 'Nuovo qui? Registrati'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

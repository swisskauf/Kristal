
import React, { useState } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering && step === 1) {
      setStep(2);
      return;
    }
    
    onLogin({
      id: 'usr_' + Math.random().toString(36).substr(2, 4),
      email: email || 'user@kristal.it',
      fullName: fullName || 'Cliente Kristal',
      phone: phone || '+39 123 456 7890',
      role: 'client'
    });
  };

  const loginAsAdmin = () => {
    onLogin({
      id: 'admin_1',
      email: 'admin@kristal.it',
      fullName: 'Gestore Kristal',
      phone: '+39 000 000 0000',
      role: 'admin'
    });
  };

  const handleSocialLogin = (provider: string) => {
    onLogin({
      id: 'social_' + provider,
      email: `${provider.toLowerCase()}@kristal.com`,
      fullName: `${provider} User`,
      phone: '+39 999 999 9999',
      role: 'client'
    });
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="p-8 md:p-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-luxury font-bold tracking-tighter text-gray-900 mb-2">KRISTAL</h1>
            <p className="text-gray-400 text-sm">Luxury Salon Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                {isRegistering && (
                  <>
                    <input 
                      type="text" 
                      placeholder="Nome Completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                    <input 
                      type="tel" 
                      placeholder="Cellulare"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                  </>
                )}
                <input 
                  type="email" 
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                />
                <input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                />
                
                <button 
                  type="submit"
                  className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg"
                >
                  {isRegistering ? 'Continua' : 'Entra'}
                </button>
              </>
            ) : (
              <div className="text-center space-y-4 animate-in slide-in-from-right-4">
                <p className="text-sm text-gray-500">Codice OTP inviato a {phone}</p>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <input key={i} type="text" maxLength={1} className="w-12 h-14 text-center bg-gray-100 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-xl font-bold" defaultValue={i+2} />
                  ))}
                </div>
                <button type="submit" className="w-full py-4 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all">
                  Verifica
                </button>
              </div>
            )}
          </form>

          {step === 1 && (
            <div className="mt-6 space-y-4">
              <button 
                onClick={loginAsAdmin}
                className="w-full py-3 bg-amber-50 text-amber-600 font-bold rounded-2xl border border-amber-100 hover:bg-amber-100 transition-all flex items-center justify-center space-x-2"
              >
                <i className="fas fa-user-shield"></i>
                <span>Accedi come Admin (Demo)</span>
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink mx-4 text-[10px] text-gray-300 uppercase tracking-widest">Social Login</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleSocialLogin('Google')} className="flex items-center justify-center space-x-2 py-3 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                  <i className="fab fa-google text-red-500"></i>
                  <span className="text-xs font-semibold">Google</span>
                </button>
                <button onClick={() => handleSocialLogin('Apple')} className="flex items-center justify-center space-x-2 py-3 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                  <i className="fab fa-apple text-gray-900"></i>
                  <span className="text-xs font-semibold">Apple</span>
                </button>
              </div>

              <div className="mt-6 text-center">
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-gray-500 hover:text-amber-600 transition-colors">
                  {isRegistering ? 'Hai già un account? Accedi' : 'Nuovo su Kristal? Registrati'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

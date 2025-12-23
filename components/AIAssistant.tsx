
import React, { useState, useRef, useEffect } from 'react';
import { getAIConsultation } from '../services/geminiService';
import { ChatMessage, User } from '../types';

interface AIAssistantProps {
  user?: User | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: `Benvenuta in Kristal${user ? `, ${user.fullName.split(' ')[0]}` : ''}. Sono la tua Beauty Concierge. Come posso esaltare la tua bellezza oggi?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const response = await getAIConsultation(userMsg, user || undefined);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-10 right-10 w-20 h-20 bg-black text-white rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-110 transition-all z-50 group border border-amber-500/30"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-magic'} text-2xl group-hover:text-amber-500 transition-colors`}></i>
      </button>

      {/* Chat Window - Luxury Refinement */}
      {isOpen && (
        <div className="fixed bottom-36 right-10 w-[400px] h-[600px] bg-white rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
          <div className="bg-black p-8 text-white flex items-center justify-between border-b border-amber-500/20">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center shadow-lg">
                <i className="fas fa-sparkles text-sm"></i>
              </div>
              <div>
                <span className="font-luxury font-bold text-lg block leading-none">Concierge Kristal</span>
                <span className="text-[9px] uppercase tracking-[0.3em] text-amber-500 font-bold">Personal Stylist AI</span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fcfcfc] custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-[13px] leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-amber-600 text-white rounded-br-none shadow-xl shadow-amber-100' 
                    : 'bg-white border border-gray-50 text-gray-700 shadow-sm rounded-bl-none font-light italic'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-full shadow-sm border border-gray-50">
                  <div className="flex space-x-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-gray-50 bg-white">
            <div className="flex space-x-3 bg-gray-50 p-2 rounded-[2rem] border border-gray-100 focus-within:border-amber-200 transition-all">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Cosa desideri oggi?"
                className="flex-1 text-[13px] px-5 py-3 bg-transparent outline-none font-medium text-gray-700"
              />
              <button 
                onClick={handleSend}
                className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition-all shadow-lg"
              >
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            </div>
            <p className="text-[9px] text-gray-300 text-center mt-4 font-bold uppercase tracking-widest">Eccellenza guidata dall'Intelligenza</p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;

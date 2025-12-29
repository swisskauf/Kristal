
import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini } from '../services/geminiService';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ensuring chat stays focused on the most recent message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    // Formatting conversation history for the SDK
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await chatWithGemini(userText, history);
    
    setMessages(prev => [...prev, { role: 'model', text: response || '' }]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-24 md:bottom-10 right-6 z-[3000]">
      {isOpen ? (
        <div className="bg-white w-[90vw] md:w-96 h-[550px] max-h-[75vh] rounded-[3.5rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
          <header className="bg-black p-8 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-sparkles"></i>
              </div>
              <div>
                <h4 className="text-white font-luxury font-bold text-lg tracking-tight">Kristal AI</h4>
                <p className="text-amber-500 text-[7px] font-bold uppercase tracking-[0.4em]">Beauty Expert</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
              <i className="fas fa-times text-xs"></i>
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-[#fcfcfc]">
            {messages.length === 0 && (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto text-amber-600 shadow-sm border border-gray-50">
                  <i className="fas fa-magic text-2xl"></i>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Sincronizzazione Kristal</p>
                  <p className="text-[9px] text-gray-400 font-medium px-6">Posso guidarvi nella scelta del vostro prossimo rituale di bellezza.</p>
                </div>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-5 rounded-[2.2rem] text-[11px] leading-relaxed font-medium shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-black text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-50 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white border border-gray-50 p-5 rounded-[2rem] rounded-tl-none flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-50 bg-white">
            <div className="flex gap-3 bg-gray-50 p-2 rounded-3xl border border-gray-100 shadow-inner">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Come posso aiutarvi?"
                className="flex-1 bg-transparent px-4 py-3 border-none text-[11px] font-bold outline-none placeholder:text-gray-300"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center hover:bg-amber-600 disabled:bg-gray-200 transition-all shadow-lg active:scale-95"
              >
                <i className="fas fa-paper-plane text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group relative border-4 border-white"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <i className="fas fa-comment-dots text-xl relative z-10"></i>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 border-2 border-white rounded-full animate-pulse"></span>
        </button>
      )}
    </div>
  );
};

export default AIAssistant;

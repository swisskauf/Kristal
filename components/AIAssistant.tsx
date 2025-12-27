import React, { useState, useRef, useEffect } from 'react';
import { getAIConsultation } from '../services/geminiService';
import { ChatMessage, User } from '../types';

interface AIAssistantProps {
  user?: User | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: `Benvenuta in **Kristal**${user ? `, ${user.fullName.split(' ')[0]}` : ''}. In che modo posso rendere unico il vostro momento di bellezza oggi?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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

  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('[') && part.includes('](')) {
        const title = part.match(/\[(.*?)\]/)?.[1];
        const url = part.match(/\((.*?)\)/)?.[1];
        return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-amber-600 underline hover:text-amber-700 mx-1">{title}</a>;
      }
      return part;
    });
  };

  return (
    <>
      {/* AI Trigger Button - Moved to Top Right to avoid covering nav */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 right-4 md:top-10 md:right-10 w-12 h-12 md:w-16 md:h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[600] border border-amber-500/20"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-sparkles'} text-base md:text-lg`}></i>
      </button>

      {isOpen && (
        <div className="fixed top-36 right-4 left-4 md:left-auto md:right-10 md:w-[400px] h-[70vh] md:h-[550px] bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col z-[600] overflow-hidden animate-in slide-in-from-top-8 duration-500">
          <div className="bg-white p-6 md:p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-600/20">
                <i className="fas fa-magic text-white text-[10px]"></i>
              </div>
              <div>
                <span className="font-luxury font-bold text-xs md:text-sm tracking-tight text-gray-900 block">Beauty Concierge</span>
                <span className="text-[7px] md:text-[8px] font-bold text-amber-600 uppercase tracking-widest">Kristal Atelier AI</span>
              </div>
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[#fdfdfd] scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] md:max-w-[85%] p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] text-[11px] md:text-[12px] leading-relaxed luxury-shadow ${
                  m.role === 'user' 
                    ? 'bg-black text-white rounded-tr-none' 
                    : 'bg-white border border-gray-50 text-gray-700 rounded-tl-none'
                }`}>
                  {renderContent(m.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2 rounded-full border border-gray-50 flex space-x-1 items-center">
                  <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                  <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 bg-white border-t border-gray-50">
            <div className="flex bg-gray-50 rounded-full p-1.5 border border-gray-100 items-center shadow-inner">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="In cosa posso aiutarvi?"
                className="flex-1 text-[11px] md:text-[12px] px-4 py-2 bg-transparent outline-none text-gray-700 placeholder-gray-300"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 md:w-10 md:h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-amber-600 disabled:opacity-20 transition-all shadow-lg"
              >
                <i className="fas fa-paper-plane text-[9px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;

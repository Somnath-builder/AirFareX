import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, X, Terminal, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { airfareService } from '../../services/airfareService';
import type { ChatMessageRecord } from '../../types';
import { cn } from '../layout/Layout';

export function CopilotHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([
    { role: 'system', content: 'AIRFAREX COPILOT INITIALIZED. STANDBY FOR QUERIES.', timestamp: new Date().toISOString() },
    { role: 'assistant', content: 'I am the AirFareX Intelligence Copilot. I can analyze route data, predict fare trends, and query the live index. How can I assist you today?', timestamp: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    
    // Add user message to UI
    const newUserMsg: ChatMessageRecord = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMsg]);
    setLoading(true);

    try {
      const response = await airfareService.chatWithCopilot({
        message: userMessage,
        conversation_id: conversationId
      });
      
      setConversationId(response.conversation_id);
      
      const assistantMsg: ChatMessageRecord = {
        role: 'assistant',
        content: response.message,
        timestamp: response.timestamp,
        tool_used: response.tool_used
      };
      
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'ERROR: FAILED TO CONNECT TO COPILOT NEURAL NET.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#0B1728] border border-[#06b6d4] shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center group overflow-hidden"
        >
          <div className="absolute inset-0 bg-[#06b6d4]/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          <Bot size={24} className="text-[#06b6d4] relative z-10" />
          <span className="absolute top-0 right-0 flex h-3 w-3 -mt-1 -mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ec4899] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ec4899]"></span>
          </span>
        </button>
      )}

      {/* Chat Panel */}
      <div 
        className={cn(
          "fixed bottom-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-l border-t border-[#06b6d4]/30 flex flex-col transition-all duration-300 ease-in-out shadow-[-10px_0_30px_rgba(0,0,0,0.5)]",
          isOpen ? "translate-y-0" : "translate-y-full",
          isExpanded ? "w-full md:w-[800px] h-screen md:h-[90vh]" : "w-full md:w-[400px] h-[500px]"
        )}
      >
        {/* Header */}
        <div className="h-12 border-b border-[#24344A] bg-[#0B1728] flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#ec4899]" />
            <span className="text-xs font-mono text-white tracking-widest uppercase">Copilot_Link</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#718198] hover:text-[#06b6d4] transition-colors hidden md:block"
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[#718198] hover:text-[#ec4899] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm scrollbar-thin scrollbar-thumb-[#24344A] scrollbar-track-transparent">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn(
              "flex flex-col max-w-[90%]",
              msg.role === 'user' ? "items-end self-end ml-auto" : "items-start self-start"
            )}>
              <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] uppercase">
                {msg.role === 'user' ? (
                  <><span>OP</span><User size={10} /></>
                ) : msg.role === 'system' ? (
                  <><Terminal size={10} className="text-[#ec4899]"/> <span className="text-[#ec4899]">SYS</span></>
                ) : (
                  <><Bot size={10} className="text-[#06b6d4]"/> <span className="text-[#06b6d4]">AI_CORE</span></>
                )}
              </div>
              
              <div className={cn(
                "p-3 relative",
                msg.role === 'user' 
                  ? "bg-[#24344A]/50 border border-[#24344A] text-white" 
                  : msg.role === 'system'
                    ? "bg-transparent border-l-2 border-[#ec4899] text-[#ec4899] text-xs"
                    : "bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-slate-200"
              )}>
                {msg.role === 'assistant' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#06b6d4] shadow-[0_0_10px_#06b6d4]"></div>
                )}
                {/* Render text with basic newlines */}
                {msg.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i !== msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
                
                {msg.tool_used && (
                  <div className="mt-2 pt-2 border-t border-[#06b6d4]/20 text-[10px] text-[#06b6d4] opacity-70">
                    [EXECUTED: {msg.tool_used}]
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex items-start max-w-[80%]">
              <div className="p-3 bg-[#06b6d4]/5 border border-[#06b6d4]/20 flex items-center gap-2 text-[#06b6d4]">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs animate-pulse">Processing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#0B1728] border-t border-[#24344A]">
          <form onSubmit={handleSend} className="relative flex items-center">
            <span className="absolute left-3 text-[#06b6d4] font-mono text-sm">{'>'}</span>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Query intelligence..."
              disabled={loading}
              className="w-full bg-[#030712] border border-[#24344A] pl-8 pr-12 py-3 text-sm font-mono text-white placeholder:text-[#24344A] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-1 focus:ring-[#06b6d4]/50 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="absolute right-2 p-1.5 text-[#06b6d4] hover:bg-[#06b6d4]/10 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

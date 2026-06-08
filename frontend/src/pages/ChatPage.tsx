import { useState, useRef, useEffect } from 'react';
import { chatApi, equipmentApi } from '../api';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  location?: string;
  plant_area?: string;
  criticality: string;
  is_active: boolean;
}
import { Send, Bot, User, Zap, Trash2, BookOpen, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownRenderer from '../components/MarkdownRenderer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent_type?: string;
  sources?: string[];
  follow_ups?: string[];
}

// Simple markdown-like renderer — replaced by MarkdownRenderer component


export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [userRole, setUserRole] = useState('engineer');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    equipmentApi.list().then(r => setEquipment(r.data));
    // Initial greeting
    setMessages([{
      role: 'assistant',
      content: `## Welcome to Maintenance Wizard AI\n\nI am your intelligent industrial maintenance assistant for Tata Steel.\n\nI can help you with:\n\n- Fault diagnosis — describe symptoms or provide sensor readings\n- Sensor data interpretation — vibration, temperature, pressure analysis\n- Maintenance procedures and SOPs — step-by-step guidance\n- Spare parts availability — stock levels and procurement lead times\n- Predictive maintenance insights — RUL estimation and failure risk\n\nSelect equipment from the panel on the left and describe your issue to get started.`,
      timestamp: new Date().toISOString(),
      agent_type: 'system',
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatApi.send({
        session_id: sessionId || undefined,
        message: messageText,
        equipment_id: selectedEquipment || undefined,
        user_role: userRole,
      });

      if (!sessionId) setSessionId(res.data.session_id);

      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.message,
        timestamp: res.data.timestamp,
        agent_type: res.data.agent_type,
        sources: res.data.sources,
        follow_ups: res.data.follow_up_suggestions,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to get response');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check the backend connection and try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `## Welcome to Maintenance Wizard AI\n\nChat cleared. How can I assist you with equipment maintenance?`,
      timestamp: new Date().toISOString(),
    }]);
    setSessionId('');
    setInput('');
  };

  const suggestedQueries = [
    'What are warning signs of bearing failure?',
    'How to perform vibration analysis?',
    'CCM mold maintenance procedure',
    'Blast furnace tuyere inspection steps',
    'Hydraulic oil contamination diagnosis',
    'Motor overheating root causes',
  ];

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 space-y-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Session Context</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Equipment (optional)</label>
              <select value={selectedEquipment} onChange={e => setSelectedEquipment(e.target.value)} className="input text-sm">
                <option value="">No specific equipment</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">User Role</label>
              <select value={userRole} onChange={e => setUserRole(e.target.value)} className="input text-sm">
                <option value="engineer">Maintenance Engineer</option>
                <option value="supervisor">Supervisor</option>
                <option value="operator">Operator</option>
                <option value="manager">Plant Manager</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Zap size={14} className="text-blue-400" />
            Quick Questions
          </h3>
          <div className="space-y-1.5">
            {suggestedQueries.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full text-left text-xs text-gray-400 hover:text-blue-300 hover:bg-gray-800 px-2.5 py-2 rounded-lg transition-colors border border-transparent hover:border-gray-700"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <button onClick={clearChat} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
          <Trash2 size={14} />
          Clear Chat
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 bg-gray-900/80">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Maintenance Wizard AI</div>
            <div className="text-xs text-green-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Online — Knowledge base active
            </div>
          </div>
          {messages.length > 1 && (
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Session active — {messages.filter(m => m.role === 'user').length} messages
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>

              <div className={`flex-1 max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-4 py-3 rounded-xl text-gray-200 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white ml-auto'
                    : 'bg-gray-800 border border-gray-700'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {msg.sources.map(s => (
                      <span key={s} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                        <BookOpen size={10} />
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Follow-up suggestions */}
                {msg.follow_ups && msg.follow_ups.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-600 mb-1">Suggested follow-ups:</p>
                    {msg.follow_ups.map(fq => (
                      <button
                        key={fq}
                        onClick={() => sendMessage(fq)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-300 hover:bg-gray-800 px-3 py-1.5 rounded border border-gray-800 hover:border-gray-700 transition-colors w-fit"
                      >
                        <ArrowRight size={10} className="flex-shrink-0" />
                        {fq.slice(0, 70)}
                      </button>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                  {msg.agent_type && msg.role === 'assistant' && (
                    <span className="text-blue-600">• {msg.agent_type}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center">
                <Bot size={14} className="text-gray-300" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-800">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about equipment issues, maintenance procedures, or failure analysis..."
              className="input flex-1"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn-primary px-4 flex items-center gap-2 flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Powered by Maintenance Wizard AI • Knowledge base: Steel plant equipment
          </p>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { sendAiMessage } from '../../services/ai';
import { Icon } from '../icons/Icon';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  sources?: { title: string; url?: string; score?: number; type?: string }[];
  intent?: string;
}

const STORAGE_KEY = 'elderassist-ai-chat';

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return arr.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string),
    }));
  } catch {
    return [];
  }
}

function saveHistory(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-50)));
  } catch { /* quota exceeded — silently ignore */ }
}

export function AiAssistant() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [loading, setLoading] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  // Save history whenever messages change
  useEffect(() => { if (messages.length > 0) saveHistory(messages); }, [messages]);

  // Show greeting only if no history
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting: ChatMessage = {
        id: 'greeting',
        role: 'ai',
        text: role === 'caregiver'
          ? "Hello! I'm ElderAssist AI. I can help you manage care, check on your elders, navigate the app, and answer health questions. What do you need?"
          : "Hello! I'm ElderAssist AI. I can help you with emergencies, appointments, medications, and health questions. Just ask me anything!",
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [open, messages.length, role]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendAiMessage(text);
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'ai',
        text: result.response,
        timestamp: new Date(),
        sources: result.sources,
        intent: result.intent,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (result.actions) {
        for (const action of result.actions) {
          if (action.startsWith('navigate:')) {
            setTimeout(() => navigate(action.replace('navigate:', '')), 800);
          }
        }
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'ai',
        text: "Sorry, I couldn't process that. Make sure the server is running (npm run dev:all). Try again!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    },
    [handleSend],
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <>
      {/* Inline web browser overlay */}
      {browserUrl && (
        <div className="ai-browser-overlay">
          <div className="ai-browser-header">
            <button className="ai-browser-back" onClick={() => setBrowserUrl(null)}>
              <Icon name="arrow-left" size={16} /> Back to chat
            </button>
            <span className="ai-browser-url">{browserUrl.length > 60 ? browserUrl.slice(0, 60) + '...' : browserUrl}</span>
            <a className="ai-browser-external" href={browserUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="external-link" size={14} /> Open
            </a>
          </div>
          <iframe
            src={browserUrl}
            className="ai-browser-frame"
            title="Web browser"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      )}

      {open && (
        <div className="ai-chat-panel" role="dialog" aria-label="AI Assistant">
          <div className="ai-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ai-chat-avatar">
                <Icon name="bot" size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>ElderAssist AI</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  {user?.name ? `Hi ${user.name.split(' ')[0]}` : 'Your assistant'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="ai-chat-clear" onClick={handleClearChat} title="Clear chat history">
                <Icon name="trash" size={14} />
              </button>
              <button className="ai-chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>

          <div className="ai-chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-chat-msg ai-chat-msg--${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="ai-chat-msg-avatar">
                    <Icon name="bot" size={14} />
                  </div>
                )}
                <div className="ai-chat-msg-bubble">
                  <div className="ai-chat-msg-text">{msg.text}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="ai-chat-sources">
                      {msg.sources.slice(0, 3).map((src, i) => (
                        src.url ? (
                          <button
                            key={i}
                            className="ai-chat-source-link"
                            onClick={() => setBrowserUrl(src.url!)}
                            title={src.title}
                          >
                            {src.title.length > 45 ? src.title.slice(0, 45) + '...' : src.title}
                          </button>
                        ) : (
                          <span key={i} className="ai-chat-source-tag">
                            {src.title.length > 35 ? src.title.slice(0, 35) + '...' : src.title}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                  <div className="ai-chat-msg-time">
                    {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    {msg.intent === 'web_search' && <span className="ai-chat-badge">web</span>}
                    {msg.intent === 'document_search' && <span className="ai-chat-badge">trained</span>}
                    {msg.intent === 'identity' && <span className="ai-chat-badge">identity</span>}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-chat-msg ai-chat-msg--ai">
                <div className="ai-chat-msg-avatar"><Icon name="bot" size={14} /></div>
                <div className="ai-chat-msg-bubble">
                  <div className="ai-chat-typing"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-area">
            <input
              ref={inputRef}
              type="text"
              className="ai-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={loading}
            />
            <button
              className="ai-chat-send"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        className={`ai-fab ${open ? 'ai-fab--open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? (
          <Icon name="close" size={22} />
        ) : (
          <div className="ai-fab-inner"><Icon name="bot" size={22} /></div>
        )}
      </button>
    </>
  );
}

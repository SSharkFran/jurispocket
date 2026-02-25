import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, FileText, Scale, Lightbulb, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ia } from '@/services/api';
import { toast } from 'sonner';

const sugestoes = [
  { icon: Scale, text: 'Analise o risco de recurso no processo 001234' },
  { icon: FileText, text: 'Gere uma petição inicial para ação trabalhista' },
  { icon: Lightbulb, text: 'Qual a jurisprudência sobre dano moral no TJSP?' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

const CopilotIAPage = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await ia.chat(input, sessionId);
      
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.resposta,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao comunicar com a IA');
      
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Texto copiado!');
  };

  const formatMessageContent = (content: string) => {
    // Remove markdown básico para renderização
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-xs">$1</code>');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center glow-accent">
          <Bot className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Copiloto Jurídico
            <Sparkles className="h-5 w-5 text-accent" />
          </h1>
          <p className="text-sm text-muted-foreground">IA especializada em direito brasileiro</p>
        </div>
      </motion.div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-16 w-16 text-accent/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Como posso ajudar?</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">
              Pergunte sobre processos, peça análises jurídicas ou gere documentos com inteligência artificial.
            </p>
            <div className="grid gap-3 w-full max-w-lg">
              {sugestoes.map(s => (
                <button key={s.text} onClick={() => setInput(s.text)}
                  className="glass-card-hover p-4 text-left flex items-center gap-3 text-sm"
                >
                  <s.icon className="h-5 w-5 text-accent shrink-0" />
                  <span className="text-muted-foreground">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-primary/10 border border-primary/20 text-foreground' 
                  : 'glass-card'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium text-accent">Copiloto IA</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(msg.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div 
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="glass-card max-w-[80%] rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium text-accent">Copiloto IA</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-card p-3 flex items-center gap-3">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)}
          placeholder="Pergunte ao Copiloto Jurídico..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim() && !isLoading) {
              handleSend();
            }
          }}
          disabled={isLoading}
        />
        <Button 
          size="icon" 
          className="h-9 w-9 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default CopilotIAPage;
